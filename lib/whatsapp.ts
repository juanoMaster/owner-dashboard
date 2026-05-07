import { createClient } from "@supabase/supabase-js"

export async function sendWhatsApp(params: {
  to: string
  message: string
  tenantId: string
}): Promise<void> {
  const { to, message, tenantId } = params

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { global: { fetch: (url, options = {}) => fetch(url, { ...options, cache: "no-store" }) } }
  )

  const { data: tenant } = await supabase
    .from("tenants")
    .select("twilio_whatsapp")
    .eq("id", tenantId)
    .maybeSingle()

  if (!tenant?.twilio_whatsapp) return

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
