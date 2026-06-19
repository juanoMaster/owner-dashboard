export const dynamic = "force-dynamic"

import { NextResponse } from "next/server"
import { getSupabaseAdmin } from "@/lib/supabase-server"
import { logAudit } from "@/lib/audit"
import { sendWhatsApp } from "@/lib/whatsapp"

// Fuente única de verdad del umbral de auto-cancelación.
// Los clientes pidieron 3h (antes el default por-tenant era 12h). El plan
// PLAN_NOCHE_TAKAI.md es autoridad y fija 3h flat. Para garantizar la ventana
// de 3h, este endpoint debe invocarse cada ~15 min (vía pg_cron + pg_net,
// migración 011), no solo en el orquestador diario.
const AUTO_CANCEL_HOURS = 3

export async function GET(req: Request) {
  const authHeader = req.headers.get("authorization")
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
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
        .select("id, booking_code, cabin_id, check_in, check_out, guest_phone, guest_name, cabins(name)")
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
