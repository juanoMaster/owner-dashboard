export const dynamic = "force-dynamic"

import { NextResponse } from "next/server"
import { getSupabaseAdmin } from "@/lib/supabase-server"
import { logAudit } from "@/lib/audit"
import { sendWhatsApp } from "@/lib/whatsapp"
import { getResend, emailReservaCancelada } from "@/lib/resend"
// Umbral de 3h flat (PLAN_NOCHE_TAKAI). Compartido con bank-info (countdown del
// turista) y recordatorio-transferencia para que las tres piezas no se contradigan.
// Para garantizar la ventana de 3h este endpoint debe invocarse cada ~15 min
// (pg_cron + pg_net, migración 011), no solo en el orquestador diario.
import { AUTO_CANCEL_HOURS } from "@/lib/auto-cancel"

export async function GET(req: Request) {
  // Acepta CRON_SECRET (Vercel Cron / orquestador diario) o PGCRON_SECRET
  // (pg_cron de Supabase, cadencia horaria — CRON_SECRET es Sensitive en Vercel
  // y no se puede leer para embeberlo en el job SQL).
  const authHeader = req.headers.get("authorization")
  const validTokens = [process.env.CRON_SECRET, process.env.PGCRON_SECRET].filter(Boolean)
  if (!validTokens.some((s) => authHeader === `Bearer ${s}`)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }

  const supabase = getSupabaseAdmin()

  const cancelled: string[] = []
  const errors: string[] = []

  try {
    // Obtener tenants activos con su timeout configurado
    const { data: tenants, error: tenantsErr } = await supabase
      .from("tenants")
      .select("id, transfer_timeout_hours, business_name")
      .eq("active", true)

    if (tenantsErr) throw tenantsErr
    if (!tenants || tenants.length === 0) {
      return NextResponse.json({ cancelled: 0, errors: [] })
    }

    for (const tenant of tenants) {
      const timeoutHours = AUTO_CANCEL_HOURS
      const cutoff = new Date(Date.now() - timeoutHours * 3600 * 1000).toISOString()

      // Reservas draft vencidas: status='draft', no eliminadas, sin comprobante,
      // y sin mp_preference_id (no cancelar flujos MP que esperan webhook)
      const { data: bookings, error: bookingsErr } = await supabase
        .from("bookings")
        .select("id, booking_code, cabin_id, check_in, check_out, guest_phone, guest_name, guest_email, cabins(name)")
        .eq("tenant_id", tenant.id)
        .eq("status", "draft")
        .is("deleted_at", null)
        .is("transfer_proof_received_at", null)
        .is("mp_preference_id", null)
        .lt("created_at", cutoff)

      if (bookingsErr) {
        errors.push(`tenant ${tenant.id}: ${bookingsErr.message}`)
        continue
      }

      if (!bookings || bookings.length === 0) continue

      for (const booking of bookings) {
        try {
          // Soft-delete booking
          await supabase
            .from("bookings")
            .update({ deleted_at: new Date().toISOString(), deleted_by: "cron_auto_cancel" })
            .eq("id", booking.id)
            .eq("tenant_id", tenant.id)

          // Eliminar calendar_blocks asociados
          await supabase
            .from("calendar_blocks")
            .delete()
            .eq("booking_id", booking.id)
            .eq("tenant_id", tenant.id)

          await logAudit({
            tenant_id: tenant.id,
            cabin_id: booking.cabin_id,
            action: "booking_auto_cancelled",
            entity_type: "booking",
            entity_id: booking.id,
            details: {
              booking_code: booking.booking_code,
              check_in: booking.check_in,
              check_out: booking.check_out,
              reason: `Sin comprobante en ${timeoutHours}h`,
            },
            performed_by: "cron_auto_cancel",
          })

          // WhatsApp al turista
          if (booking.guest_phone && booking.booking_code) {
            const cabinName = (booking.cabins as any)?.name || "la cabaña"
            const reservasUrl = process.env.NEXT_PUBLIC_RESERVAS_URL ?? "https://reservas.takai.cl"
            const msg = `Tu reserva ${booking.booking_code} en ${cabinName} fue cancelada automáticamente por no recibir comprobante de pago a tiempo.\nPuedes hacer una nueva reserva en: ${reservasUrl}`
            sendWhatsApp({ to: booking.guest_phone, message: msg, tenantId: tenant.id }).catch(() => {})
          }

          // Email al turista — el WhatsApp solo llega si tiene el número activo;
          // el email garantiza que siempre reciba el aviso de cancelación.
          if (booking.guest_email && booking.booking_code) {
            try {
              const cabinName = (booking.cabins as any)?.name || "Cabaña"
              const formatDate = (d: string) =>
                new Date(d + "T12:00:00").toLocaleDateString("es-CL", {
                  weekday: "long", year: "numeric", month: "long", day: "numeric",
                })
              await getResend().emails.send({
                from: tenant.business_name + " <reservas@takai.cl>",
                to: booking.guest_email,
                subject: "Reserva no confirmada — " + booking.booking_code + " | " + tenant.business_name,
                html: emailReservaCancelada({
                  business_name: tenant.business_name,
                  guest_name: booking.guest_name || "Huésped",
                  cabin_name: cabinName,
                  check_in: formatDate(booking.check_in),
                  check_out: formatDate(booking.check_out),
                  booking_code: booking.booking_code,
                }),
              })
            } catch (_) {}
          }

          cancelled.push(booking.booking_code ?? booking.id)
        } catch (err: any) {
          errors.push(`booking ${booking.id}: ${err.message}`)
        }
      }
    }

    return NextResponse.json({ cancelled: cancelled.length, cancelled_codes: cancelled, errors })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
