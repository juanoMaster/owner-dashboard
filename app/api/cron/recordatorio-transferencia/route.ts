export const dynamic = "force-dynamic"

import { NextResponse } from "next/server"
import { getSupabaseAdmin } from "@/lib/supabase-server"
import { sendWhatsApp } from "@/lib/whatsapp"

export async function GET(req: Request) {
  const authHeader = req.headers.get("authorization")
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }

  const supabase = getSupabaseAdmin()

  const sent: string[] = []
  const errors: string[] = []

  try {
    const { data: tenants, error: tenantsErr } = await supabase
      .from("tenants")
      .select("id, transfer_timeout_hours")
      .eq("active", true)

    if (tenantsErr) throw tenantsErr
    if (!tenants || tenants.length === 0) {
      return NextResponse.json({ sent: 0, errors: [] })
    }

    const twilioFrom = (process.env.TWILIO_WHATSAPP_FROM ?? "").replace("whatsapp:", "")

    for (const tenant of tenants) {
      const timeoutHours = Number(tenant.transfer_timeout_hours) || 12

      // Ventana de recordatorio: entre el 75% y el 200% del timeout desde la creación
      // (evita recordar demasiado temprano o demasiado tarde)
      const windowStart = new Date(Date.now() - timeoutHours * 2 * 3600 * 1000).toISOString()
      const windowEnd   = new Date(Date.now() - timeoutHours * 0.75 * 3600 * 1000).toISOString()

      const { data: bookings, error: bookingsErr } = await supabase
        .from("bookings")
        .select("id, tenant_id, cabin_id, booking_code, guest_phone, guest_name")
        .eq("tenant_id", tenant.id)
        .eq("status", "draft")
        .is("deleted_at", null)
        .is("transfer_proof_received_at", null)
        .is("reminder_sent_at", null)
        .gte("created_at", windowStart)
        .lte("created_at", windowEnd)

      if (bookingsErr) {
        errors.push(`tenant ${tenant.id}: ${bookingsErr.message}`)
        continue
      }

      if (!bookings || bookings.length === 0) continue

      for (const booking of bookings) {
        try {
          if (!booking.guest_phone || !booking.booking_code) continue

          const msg =
            `⏰ Tu reserva ${booking.booking_code} vence pronto.\n` +
            `¿Ya realizaste la transferencia?\n` +
            (twilioFrom
              ? `Envía tu comprobante al WhatsApp ${twilioFrom} `
              : `Envía tu comprobante al WhatsApp del propietario `) +
            `con tu código ${booking.booking_code} para asegurar tu reserva.`

          sendWhatsApp({ to: booking.guest_phone, message: msg, tenantId: tenant.id }).catch(() => {})

          // Marcar para no enviar duplicados
          await supabase
            .from("bookings")
            .update({ reminder_sent_at: new Date().toISOString() })
            .eq("id", booking.id)
            .eq("tenant_id", tenant.id)

          sent.push(booking.booking_code)
        } catch (err: any) {
          errors.push(`booking ${booking.id}: ${err.message}`)
        }
      }
    }

    return NextResponse.json({ sent: sent.length, sent_codes: sent, errors })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
