export const dynamic = "force-dynamic"
import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { getResend } from "@/lib/resend"

export async function GET(req: NextRequest) {
  const secret = req.headers.get("authorization")?.replace("Bearer ", "")
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { global: { fetch: (url, options = {}) => fetch(url, { ...options, cache: "no-store" }) } }
  )

  const yesterday = new Date()
  yesterday.setDate(yesterday.getDate() - 1)
  const checkOutDate = yesterday.toISOString().split("T")[0]

  const { data: bookings, error } = await supabase
    .from("bookings")
    .select(`
      id, guest_name, guest_email, booking_code,
      tenants(business_name, google_review_url)
    `)
    .eq("status", "confirmed")
    .eq("check_out", checkOutDate)
    .is("review_sent_at", null)
    .is("deleted_at", null)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!bookings || bookings.length === 0) return NextResponse.json({ sent: 0 })

  let sent = 0
  const resend = getResend()

  for (const booking of bookings) {
    const t = booking.tenants as any
    if (!t?.google_review_url || !booking.guest_email) continue

    try {
      await resend.emails.send({
        from: `${t.business_name} <reservas@takai.cl>`,
        to: booking.guest_email,
        subject: `¿Cómo fue tu estadía en ${t.business_name}?`,
        html: buildReviewEmail({
          business_name: t.business_name,
          guest_name: booking.guest_name,
          review_url: t.google_review_url,
        }),
      })

      await supabase
        .from("bookings")
        .update({ review_sent_at: new Date().toISOString() })
        .eq("id", booking.id)

      sent++
    } catch {
      // fallo silencioso por reserva individual
    }
  }

  return NextResponse.json({ sent })
}

function buildReviewEmail(data: {
  business_name: string
  guest_name: string
  review_url: string
}) {
  const GOLD = "#C9A84C"
  const BG = "#0d1117"
  const CARD = "#1a2332"
  const DARK = "#111827"
  const MUTED = "#8892a4"
  const LIGHT = "#e8e8e8"
  const FONT_SANS = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif"
  const FONT = "Georgia, 'Times New Roman', serif"

  return `<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:${BG};font-family:${FONT_SANS};">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:${BG};padding:48px 20px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:${DARK};border-radius:8px;overflow:hidden;max-width:600px;width:100%;border:1px solid #1e2d40;">
        <tr>
          <td style="padding:40px 40px 24px;text-align:center;">
            <p style="margin:0 0 6px;font-family:${FONT_SANS};font-size:11px;color:${GOLD};text-transform:uppercase;letter-spacing:3px;">Tu opinión importa</p>
            <h2 style="margin:0 0 16px;font-family:${FONT};font-size:28px;font-weight:400;color:${LIGHT};">Hola, ${data.guest_name}</h2>
            <p style="margin:0;font-family:${FONT_SANS};font-size:15px;color:${MUTED};line-height:1.8;">
              Esperamos que hayas disfrutado tu estadía en
              <span style="color:${LIGHT};font-weight:600;">${data.business_name}</span>.
              Si tienes un momento, tu reseña nos ayuda a seguir mejorando.
            </p>
          </td>
        </tr>
        <tr>
          <td style="padding:0 40px 40px;text-align:center;">
            <table width="100%" cellpadding="0" cellspacing="0" style="background:${CARD};border-radius:6px;overflow:hidden;border:1px solid #1e2d40;margin-bottom:32px;">
              <tr>
                <td style="padding:32px;text-align:center;">
                  <p style="margin:0 0 8px;font-family:${FONT};font-size:36px;">⭐⭐⭐⭐⭐</p>
                  <p style="margin:0;font-family:${FONT_SANS};font-size:14px;color:${MUTED};line-height:1.6;">
                    Solo toma un minuto y significa mucho para nosotros.
                  </p>
                </td>
              </tr>
            </table>
            <a href="${data.review_url}" style="display:inline-block;background:${GOLD};color:#0a0700;text-decoration:none;padding:16px 48px;border-radius:4px;font-family:${FONT_SANS};font-weight:700;font-size:13px;letter-spacing:2px;text-transform:uppercase;">Dejar reseña en Google →</a>
            <p style="margin:32px 0 0;font-family:${FONT_SANS};font-size:13px;color:#2d3d50;">
              ¡Gracias por elegirnos! 🌿
            </p>
          </td>
        </tr>
        <tr>
          <td style="background:#0d1520;padding:28px 40px;text-align:center;border-top:1px solid #1e2d40;">
            <p style="margin:0;color:${GOLD};font-family:${FONT_SANS};font-size:12px;letter-spacing:3px;text-transform:uppercase;">TAKAI.CL</p>
            <p style="margin:8px 0 0;color:${MUTED};font-family:${FONT_SANS};font-size:11px;line-height:1.6;">
              Enviado en nombre de ${data.business_name}
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`
}
