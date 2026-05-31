export const dynamic = "force-dynamic"

import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { sendWhatsApp } from "@/lib/whatsapp"
import { logAudit } from "@/lib/audit"

// Formato real de booking codes: RUK-KVT-3821, CAC-XNM-5047, TRI-BPL-1293
const BOOKING_CODE_RE = /\b([A-Z]{2,5}-[A-Z]{3}-\d{4})\b/i

function twimlResponse(message: string): NextResponse {
  const xml = `<?xml version="1.0" encoding="UTF-8"?><Response><Message>${message}</Message></Response>`
  return new NextResponse(xml, {
    status: 200,
    headers: { "Content-Type": "application/xml" },
  })
}

export async function POST(req: Request) {
  // Twilio envía form-urlencoded
  const text = await req.text()
  const params = new URLSearchParams(text)
  const from = params.get("From") ?? ""          // "whatsapp:+56912345678"
  const body = params.get("Body") ?? ""

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { global: { fetch: (url, options = {}) => fetch(url, { ...options, cache: "no-store" }) } }
  )

  const match = body.match(BOOKING_CODE_RE)
  const bookingCode = match ? match[1].toUpperCase() : null

  if (bookingCode) {
    // ── Caso: mensaje CON código de reserva ──────────────────────────────
    const { data: booking } = await supabase
      .from("bookings")
      .select("id, tenant_id, cabin_id, check_in, check_out, guest_name, booking_code, cabins(name)")
      .eq("booking_code", bookingCode)
      .is("deleted_at", null)
      .maybeSingle()

    if (!booking) {
      return twimlResponse(
        `No encontramos una reserva con el código ${bookingCode}. ` +
        `Verifica el código e intenta nuevamente.`
      )
    }

    // Marcar comprobante recibido
    await supabase
      .from("bookings")
      .update({ transfer_proof_received_at: new Date().toISOString() })
      .eq("id", booking.id)
      .eq("tenant_id", booking.tenant_id)

    await logAudit({
      tenant_id: booking.tenant_id,
      cabin_id: booking.cabin_id,
      action: "transfer_proof_received",
      entity_type: "booking",
      entity_id: booking.id,
      details: { from, booking_code: bookingCode },
      performed_by: "twilio_webhook",
    })

    // Notificar al dueño
    const { data: tenantMeta } = await supabase
      .from("tenants")
      .select("owner_whatsapp, dashboard_token, business_name")
      .eq("id", booking.tenant_id)
      .maybeSingle()

    if (tenantMeta?.owner_whatsapp) {
      const panelUrl = tenantMeta.dashboard_token
        ? `https://panel.takai.cl/?token=${tenantMeta.dashboard_token}`
        : "https://panel.takai.cl"
      const cabinName = (booking.cabins as any)?.name || "Cabaña"
      const ownerMsg =
        `📎 Comprobante recibido — Reserva ${bookingCode}\n` +
        `👤 ${booking.guest_name} — ${cabinName}\n` +
        `📅 ${booking.check_in} → ${booking.check_out}\n` +
        `✅ Confirmar pago: ${panelUrl}`
      sendWhatsApp({ to: tenantMeta.owner_whatsapp, message: ownerMsg, tenantId: booking.tenant_id }).catch(() => {})
    }

    return twimlResponse(
      `✅ Recibimos tu comprobante para la reserva ${bookingCode}. ` +
      `El propietario lo revisará en breve y recibirás confirmación.`
    )
  }

  // ── Caso: mensaje SIN código de reserva ──────────────────────────────────
  // Intentar identificar el tenant por el teléfono del turista
  const guestPhone = from.replace("whatsapp:", "")
  const { data: recentBooking } = await supabase
    .from("bookings")
    .select("tenant_id, guest_name")
    .eq("guest_phone", guestPhone)
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle()

  if (recentBooking) {
    const { data: tenantMeta } = await supabase
      .from("tenants")
      .select("owner_whatsapp, dashboard_token")
      .eq("id", recentBooking.tenant_id)
      .maybeSingle()

    if (tenantMeta?.owner_whatsapp) {
      const panelUrl = tenantMeta.dashboard_token
        ? `https://panel.takai.cl/?token=${tenantMeta.dashboard_token}`
        : "https://panel.takai.cl"
      const ownerMsg =
        `⚠️ Mensaje sin código de reserva de ${guestPhone}:\n` +
        `"${body.slice(0, 200)}"\n` +
        `Revisar manualmente en el panel: ${panelUrl}`
      sendWhatsApp({ to: tenantMeta.owner_whatsapp, message: ownerMsg, tenantId: recentBooking.tenant_id }).catch(() => {})
    }
  }

  return twimlResponse(
    `Recibimos tu mensaje. Para agilizar la confirmación, incluye tu código ` +
    `de reserva (formato RUK-ABC-1234) en el mensaje.`
  )
}
