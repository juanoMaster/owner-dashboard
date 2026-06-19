export const dynamic = "force-dynamic"

import { NextResponse } from "next/server"
import crypto from "crypto"
import { getSupabaseAdmin } from "@/lib/supabase-server"
import { sendWhatsApp } from "@/lib/whatsapp"
import { logAudit } from "@/lib/audit"
import { runAgent, agentConfigured, AgentMsg } from "@/lib/agent"

function validateTwilioSignature(req: Request, rawBody: string): boolean {
  const authToken = process.env.TWILIO_AUTH_TOKEN
  if (!authToken) return false

  const twilioSig = req.headers.get("x-twilio-signature") ?? ""
  const params = new URLSearchParams(rawBody)
  const sortedKeys = Array.from(params.keys()).sort()

  let toSign = req.url
  for (const key of sortedKeys) {
    toSign += key + (params.get(key) ?? "")
  }

  const computed = crypto.createHmac("sha1", authToken).update(toSign).digest("base64")

  const a = Buffer.from(twilioSig)
  const b = Buffer.from(computed)
  if (a.length !== b.length) return false
  return crypto.timingSafeEqual(a, b)
}

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
  const text = await req.text()

  if (!validateTwilioSignature(req, text)) {
    return new NextResponse("Forbidden", { status: 403 })
  }

  const params = new URLSearchParams(text)
  const from = params.get("From") ?? ""
  const body = params.get("Body") ?? ""

  const supabase = getSupabaseAdmin()

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
  const guestPhone = from.replace("whatsapp:", "")

  // ── Agente IA (Fase 6) — solo si está configurado (LLM_API_KEY etc.) ──────
  // Identifica la cabaña por el tag [C:<uuid>] del mensaje pre-llenado del
  // botón click-to-WhatsApp, o por la memoria de conversación previa.
  // Todo es best-effort: si falta config, tabla o datos → handoff al dueño.
  if (agentConfigured()) {
    try {
      let cabinId: string | null = null
      const tag = body.match(/\[C:([0-9a-fA-F-]{36})\]/)
      if (tag) cabinId = tag[1]

      const { data: convo } = await supabase
        .from("whatsapp_conversations")
        .select("cabin_id, messages")
        .eq("phone", guestPhone)
        .maybeSingle()
      if (!cabinId && convo?.cabin_id) cabinId = convo.cabin_id as string

      if (cabinId) {
        const { data: cabin } = await supabase
          .from("cabins")
          .select("id, tenant_id, name, capacity, base_price_night, season_prices, pricing_tiers, description, amenities")
          .eq("id", cabinId)
          .eq("active", true)
          .maybeSingle()

        if (cabin) {
          const { data: tenant } = await supabase
            .from("tenants")
            .select("id, business_name, slug, currency, min_nights, agent_system_prompt, owner_whatsapp, dashboard_token")
            .eq("id", cabin.tenant_id)
            .maybeSingle()

          if (tenant) {
            const reservasBase = process.env.NEXT_PUBLIC_RESERVAS_URL ?? "https://reservas.takai.cl"
            const history = (Array.isArray(convo?.messages) ? convo!.messages : []) as AgentMsg[]
            const cleanMsg = body.replace(/\[C:[0-9a-fA-F-]{36}\]/, "").trim()

            const result = await runAgent({
              tenant: { id: tenant.id, business_name: tenant.business_name, slug: tenant.slug, currency: tenant.currency, min_nights: tenant.min_nights, agent_system_prompt: tenant.agent_system_prompt },
              cabin: { id: cabin.id, name: cabin.name, capacity: cabin.capacity, base_price_night: cabin.base_price_night, season_prices: cabin.season_prices, pricing_tiers: cabin.pricing_tiers, description: cabin.description, amenities: cabin.amenities },
              history,
              userMessage: cleanMsg || body,
              appBase: reservasBase,
            })

            if (result) {
              const newMessages = [...history, { role: "user", content: cleanMsg || body }, { role: "assistant", content: result.reply }].slice(-20)
              await supabase
                .from("whatsapp_conversations")
                .upsert({ tenant_id: tenant.id, phone: guestPhone, cabin_id: cabin.id, messages: newMessages, updated_at: new Date().toISOString() }, { onConflict: "tenant_id,phone" })

              // Handoff a humano si el turista lo pidió
              if (result.handoff && tenant.owner_whatsapp) {
                const panelUrl = tenant.dashboard_token ? `https://panel.takai.cl/?token=${tenant.dashboard_token}` : "https://panel.takai.cl"
                sendWhatsApp({ to: tenant.owner_whatsapp, message: `🙋 Un turista pide hablar contigo sobre ${cabin.name} (${guestPhone}):\n"${body.slice(0, 200)}"\n${panelUrl}`, tenantId: tenant.id }).catch(() => {})
              }

              return twimlResponse(result.reply)
            }
          }
        }
      }
    } catch {
      // cualquier fallo del agente → continuar al handoff de abajo
    }
  }

  // Intentar identificar el tenant por el teléfono del turista (handoff)
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
