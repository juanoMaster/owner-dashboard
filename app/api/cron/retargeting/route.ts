export const dynamic = "force-dynamic"

import { NextResponse } from "next/server"
import { getSupabaseAdmin } from "@/lib/supabase-server"
import { getResend } from "@/lib/resend"
import { logAudit } from "@/lib/audit"
import { unsubscribeUrl } from "@/lib/unsubscribe"

// Retargeting estacional: invita a volver a huéspedes cuyo check-out fue hace
// ~11 meses (cohorte de aniversario → pre-temporada). Un cohorte por día se
// auto-regula (mismo patrón que solicitar-review). Respeta opt-out y un cap de
// frecuencia de 90 días por email (vía audit_log).
const ANNIVERSARY_DAYS = 330
const FREQ_CAP_DAYS = 90

export async function GET(req: Request) {
  if (req.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }

  const supabase = getSupabaseAdmin()
  const appBase = process.env.NEXT_PUBLIC_APP_URL ?? "https://panel.takai.cl"
  const reservasBase = process.env.NEXT_PUBLIC_RESERVAS_URL ?? "https://reservas.takai.cl"

  const target = new Date()
  target.setDate(target.getDate() - ANNIVERSARY_DAYS)
  const targetStr = target.toISOString().split("T")[0]

  let sent = 0
  const skipped: string[] = []

  try {
    const { data: bookings } = await supabase
      .from("bookings")
      .select("id, tenant_id, cabin_id, guest_name, guest_email, tenants(business_name, slug, location_text)")
      .eq("status", "confirmed")
      .eq("check_out", targetStr)
      .is("deleted_at", null)

    if (!bookings || bookings.length === 0) return NextResponse.json({ sent: 0, target: targetStr })

    const resend = getResend()
    const capCutoff = new Date(Date.now() - FREQ_CAP_DAYS * 86400000).toISOString()

    for (const b of bookings) {
      const email = (b.guest_email || "").trim().toLowerCase()
      if (!email) { skipped.push("sin email"); continue }

      // Opt-out
      const { data: optedOut } = await supabase
        .from("email_opt_out").select("id").eq("email", email).maybeSingle()
      if (optedOut) { skipped.push("opt-out"); continue }

      // Cap de frecuencia: ¿ya se le envió retargeting en los últimos 90 días?
      const { data: recent } = await supabase
        .from("audit_log")
        .select("id")
        .eq("action", "retargeting_sent")
        .eq("performed_by", "cron_retargeting")
        .contains("details", { email })
        .gte("created_at", capCutoff)
        .limit(1)
      if (recent && recent.length > 0) { skipped.push("cap"); continue }

      const t = b.tenants as any
      const destino = t?.location_text || t?.business_name || "tu destino favorito"
      const link = `${reservasBase}/${t?.slug || ""}?source=directory`

      try {
        await resend.emails.send({
          from: `${t?.business_name || "Takai"} <reservas@takai.cl>`,
          to: email,
          subject: `¿Volvemos a ${destino}?`,
          html: buildRetargetEmail({
            guest_name: b.guest_name || "",
            business_name: t?.business_name || "",
            destino,
            link,
            unsubscribe: unsubscribeUrl(appBase, email),
          }),
        })

        await logAudit({
          tenant_id: b.tenant_id,
          cabin_id: b.cabin_id,
          action: "retargeting_sent",
          entity_type: "booking",
          entity_id: b.id,
          details: { email, destino },
          performed_by: "cron_retargeting",
        })
        sent++
      } catch {
        skipped.push("send fail")
      }
    }

    return NextResponse.json({ sent, skipped: skipped.length, target: targetStr })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;")
}

function buildRetargetEmail(d: { guest_name: string; business_name: string; destino: string; link: string; unsubscribe: string }) {
  const GOLD = "#C9A84C", BG = "#0d1117", DARK = "#111827", MUTED = "#8892a4", LIGHT = "#e8e8e8"
  const FS = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif"
  const FONT = "Georgia, 'Times New Roman', serif"
  const g = esc(d.guest_name), biz = esc(d.business_name), dest = esc(d.destino)
  const link = encodeURI(d.link).replace(/"/g, "%22")
  const unsub = encodeURI(d.unsubscribe).replace(/"/g, "%22")
  return `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:${BG};font-family:${FS};">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:${BG};padding:48px 20px;"><tr><td align="center">
    <table width="600" cellpadding="0" cellspacing="0" style="background:${DARK};border-radius:8px;max-width:600px;width:100%;border:1px solid #1e2d40;">
      <tr><td style="padding:40px;text-align:center;">
        <p style="margin:0 0 6px;font-size:11px;color:${GOLD};text-transform:uppercase;letter-spacing:3px;">Te extrañamos</p>
        <h2 style="margin:0 0 16px;font-family:${FONT};font-size:28px;font-weight:400;color:${LIGHT};">Hola, ${g}</h2>
        <p style="margin:0 0 28px;font-size:15px;color:${MUTED};line-height:1.8;">
          ¿Listo para volver a <span style="color:${LIGHT};font-weight:600;">${dest}</span>?
          Las fechas de temporada se llenan rápido. Reserva con anticipación en ${biz}.
        </p>
        <a href="${link}" style="display:inline-block;background:${GOLD};color:#0a0700;text-decoration:none;padding:16px 48px;border-radius:4px;font-weight:700;font-size:13px;letter-spacing:2px;text-transform:uppercase;">Ver disponibilidad →</a>
      </td></tr>
      <tr><td style="background:#0d1520;padding:24px 40px;text-align:center;border-top:1px solid #1e2d40;">
        <p style="margin:0;color:${GOLD};font-size:12px;letter-spacing:3px;">TAKAI.CL</p>
        <p style="margin:10px 0 0;color:${MUTED};font-size:11px;line-height:1.6;">
          Enviado en nombre de ${biz}. <a href="${unsub}" style="color:${MUTED};text-decoration:underline;">Darme de baja</a>
        </p>
      </td></tr>
    </table>
  </td></tr></table>
</body></html>`
}
