import { getSupabaseAdmin } from "@/lib/supabase-server"

// El número saliente es SIEMPRE el compartido del sistema (TWILIO_WHATSAPP_FROM,
// el del agente IA). El único gate por tenant es whatsapp_enabled — así un cliente
// nuevo queda enlazado al agente desde el onboarding sin configuración extra.
// (tenants.twilio_whatsapp es legacy y ya no participa.)
export async function sendWhatsApp(params: {
  to: string
  message: string
  tenantId: string
  /** Skip the DB lookup if you already have the tenant's WhatsApp config */
  whatsappEnabled?: boolean
}): Promise<void> {
  const { to, message, tenantId, whatsappEnabled } = params

  let enabled: boolean

  if (whatsappEnabled !== undefined) {
    enabled = whatsappEnabled
  } else {
    const supabase = getSupabaseAdmin()
    const { data: tenant } = await supabase
      .from("tenants")
      .select("whatsapp_enabled")
      .eq("id", tenantId)
      .maybeSingle()
    enabled = tenant?.whatsapp_enabled ?? false
  }

  if (!enabled) return

  const accountSid = process.env.TWILIO_ACCOUNT_SID
  const authToken = process.env.TWILIO_AUTH_TOKEN
  const from = process.env.TWILIO_WHATSAPP_FROM

  if (!accountSid || !authToken || !from) return

  const toFormatted = to.startsWith("whatsapp:") ? to : `whatsapp:${to.startsWith("+") ? to : "+" + to.replace(/\D/g, "")}`

  const body = new URLSearchParams({
    From: from,
    To: toFormatted,
    Body: message,
  })

  try {
    await fetch(`https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`, {
      method: "POST",
      headers: {
        Authorization: "Basic " + Buffer.from(`${accountSid}:${authToken}`).toString("base64"),
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: body.toString(),
    })
  } catch (err) {
    console.error("[whatsapp] Error sending message:", err)
  }
}
