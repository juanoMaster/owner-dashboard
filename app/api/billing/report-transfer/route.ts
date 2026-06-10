export const dynamic = "force-dynamic"

import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import crypto from "crypto"
import { getResend } from "@/lib/resend"
import { logAudit } from "@/lib/audit"

export async function POST(req: Request) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  )

  try {
    const { token, statement_id } = await req.json()
    if (!token || !statement_id) {
      return NextResponse.json({ error: "Faltan parámetros" }, { status: 400 })
    }

    const tokenHash = crypto.createHash("sha256").update(token, "utf8").digest("hex")
    const { data: link } = await supabase
      .from("dashboard_links")
      .select("tenant_id")
      .eq("token_hash", tokenHash)
      .eq("active", true)
      .maybeSingle()

    if (!link) return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    const tenant_id = link.tenant_id

    const { data: stmt } = await supabase
      .from("commission_statements")
      .select("id, commission_amount, currency, period_year, period_month, status, kind")
      .eq("id", statement_id)
      .eq("tenant_id", tenant_id)
      .maybeSingle()

    if (!stmt) return NextResponse.json({ error: "Estado de cuenta no encontrado" }, { status: 404 })
    if (stmt.status === "paid") return NextResponse.json({ error: "Ya está marcado como pagado" }, { status: 400 })

    // Generar token de acuse de recibo único
    const ackToken = crypto.randomBytes(32).toString("hex")

    await supabase
      .from("commission_statements")
      .update({
        status: "transfer_reported",
        ack_token: ackToken,
        payment_method: "transfer",
        updated_at: new Date().toISOString(),
      })
      .eq("id", stmt.id)

    const { data: tenant } = await supabase
      .from("tenants")
      .select("business_name, slug, email_owner")
      .eq("id", tenant_id)
      .single()

    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://panel.takai.cl"
    const ackUrl = `${appUrl}/api/billing/ack/${ackToken}`
    const monthLabel = `${String(stmt.period_month).padStart(2, "0")}/${stmt.period_year}`
    const adminEmail = process.env.ADMIN_EMAIL ?? "contacto@takai.cl"

    // Email al admin con link de acuse
    await getResend().emails.send({
      from: "Takai Billing <hola@takai.cl>",
      to: adminEmail,
      subject: `[ACUSE] Transferencia reportada — ${tenant?.business_name} (${monthLabel})`,
      html: `<!DOCTYPE html><html><body style="background:#0d0d0d;font-family:monospace;padding:40px 20px;">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;margin:0 auto;background:#111;border:1px solid #2a3e28;border-radius:8px;overflow:hidden;">
          <tr><td style="background:#0a1510;padding:24px 32px;border-bottom:1px solid #1e3a1e;">
            <p style="margin:0;color:#e8d5a3;font-size:13px;letter-spacing:2px;text-transform:uppercase;">TAKAI &middot; BILLING</p>
          </td></tr>
          <tr><td style="padding:32px;">
            <p style="color:#8a9e88;font-size:14px;margin:0 0 8px;">El tenant <strong style="color:#e8d5a3;">${tenant?.business_name ?? ""}</strong> reportó una transferencia.</p>
            <p style="color:#8a9e88;font-size:13px;margin:0 0 24px;">Período: ${monthLabel} &nbsp;|&nbsp; Monto: ${stmt.commission_amount} ${stmt.currency}</p>
            <p style="color:#8a9e88;font-size:13px;margin:0 0 16px;">Cuando verifiques la transferencia en tu banco, haz click para confirmar:</p>
            <a href="${ackUrl}" style="display:inline-block;background:#7ab87a;color:#0a1510;text-decoration:none;padding:14px 32px;border-radius:6px;font-size:14px;font-weight:700;letter-spacing:1px;">
              CONFIRMAR PAGO RECIBIDO &rarr;
            </a>
            <p style="color:#4a5a48;font-size:11px;margin:20px 0 0;">Este link es de un solo uso. Código: ${ackToken.slice(0, 8)}...</p>
          </td></tr>
        </table>
      </body></html>`,
    })

    await logAudit({
      tenant_id,
      action: "commission_transfer_reported",
      entity_type: "commission_statement",
      entity_id: stmt.id,
      details: { period: monthLabel, amount: stmt.commission_amount, currency: stmt.currency },
      performed_by: "owner_panel",
    })

    return NextResponse.json({ success: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
