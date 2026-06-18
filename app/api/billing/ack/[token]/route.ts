export const dynamic = "force-dynamic"

import { NextRequest, NextResponse } from "next/server"
import { getSupabaseAdmin } from "@/lib/supabase-server"
import { getResend } from "@/lib/resend"
import { logAudit } from "@/lib/audit"

export async function GET(
  _req: NextRequest,
  { params }: { params: { token: string } }
) {
  const supabase = getSupabaseAdmin()

  const { token } = params
  if (!token || token.length < 16) {
    return new NextResponse(htmlPage("Token inválido", "El link no es válido.", false), {
      headers: { "Content-Type": "text/html; charset=utf-8" },
    })
  }

  try {
    const { data: stmt } = await supabase
      .from("commission_statements")
      .select("id, tenant_id, commission_amount, currency, period_year, period_month, status, kind")
      .eq("ack_token", token)
      .maybeSingle()

    if (!stmt) {
      return new NextResponse(htmlPage("Link no válido", "Este link de acuse no existe o ya fue usado.", false), {
        headers: { "Content-Type": "text/html; charset=utf-8" },
      })
    }

    if (stmt.status === "paid") {
      return new NextResponse(htmlPage("Ya confirmado", `Este pago ya fue confirmado anteriormente.`, true), {
        headers: { "Content-Type": "text/html; charset=utf-8" },
      })
    }

    const now = new Date().toISOString()
    await supabase
      .from("commission_statements")
      .update({ status: "paid", paid_at: now, updated_at: now })
      .eq("id", stmt.id)

    await logAudit({
      tenant_id: stmt.tenant_id,
      action: "commission_paid_ack",
      entity_type: "commission_statement",
      entity_id: stmt.id,
      details: { amount: stmt.commission_amount, currency: stmt.currency, payment_method: "transfer" },
      performed_by: "admin_ack",
    })

    // Email de confirmación al tenant
    const { data: tenant } = await supabase
      .from("tenants")
      .select("business_name, owner_name, email_owner")
      .eq("id", stmt.tenant_id)
      .single()

    const monthLabel = `${String(stmt.period_month).padStart(2, "0")}/${stmt.period_year}`
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://panel.takai.cl"

    if (tenant?.email_owner) {
      getResend().emails.send({
        from: "Takai <hola@takai.cl>",
        to: tenant.email_owner,
        subject: `Pago confirmado — Comisión Takai ${monthLabel}`,
        html: `<!DOCTYPE html><html><body style="background:#0d0d0d;font-family:sans-serif;padding:40px 20px;">
          <table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;margin:0 auto;background:#111827;border:1px solid #1e2d40;border-radius:8px;">
            <tr><td style="background:#0a1520;padding:32px;text-align:center;">
              <p style="margin:0 0 8px;color:#C9A84C;font-size:11px;letter-spacing:3px;text-transform:uppercase;">TAKAI &middot; PAGO CONFIRMADO</p>
              <h2 style="margin:0;font-family:Georgia,serif;font-size:24px;font-weight:400;color:#e8e8e8;">¡Gracias, ${he(tenant.owner_name.split(" ")[0])}!</h2>
            </td></tr>
            <tr><td style="padding:32px;">
              <p style="color:#8892a4;font-size:14px;line-height:1.7;margin:0 0 16px;">
                Confirmamos la recepción de tu pago de comisión correspondiente al período <strong style="color:#e8e8e8;">${monthLabel}</strong>.<br>
                Monto: <strong style="color:#C9A84C;">${stmt.commission_amount} ${stmt.currency}</strong>
              </p>
              <a href="${appUrl}/dashboard/facturacion" style="display:inline-block;color:#C9A84C;font-size:13px;text-decoration:underline;">Ver historial de facturación</a>
            </td></tr>
          </table>
        </body></html>`,
      }).catch(() => {})
    }

    const monthStr = `${String(stmt.period_month).padStart(2, "0")}/${stmt.period_year}`
    return new NextResponse(
      htmlPage(
        "Pago confirmado",
        `Pago de ${tenant?.business_name ?? ""} por ${stmt.commission_amount} ${stmt.currency} (período ${monthStr}) confirmado correctamente. Se envió email de confirmación al tenant.`,
        true
      ),
      { headers: { "Content-Type": "text/html; charset=utf-8" } }
    )
  } catch (err: any) {
    return new NextResponse(htmlPage("Error", err.message, false), {
      status: 500,
      headers: { "Content-Type": "text/html; charset=utf-8" },
    })
  }
}

function he(s: string): string {
  return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;")
}

function htmlPage(title: string, message: string, success: boolean) {
  const color = success ? "#7ab87a" : "#e63946"
  return `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"><title>${he(title)}</title></head>
<body style="margin:0;padding:0;background:#0a1510;font-family:sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;">
  <div style="max-width:440px;padding:48px 32px;text-align:center;">
    <div style="font-size:48px;margin-bottom:16px;">${success ? "✓" : "✗"}</div>
    <h1 style="font-family:Georgia,serif;font-size:24px;font-weight:400;color:${color};margin:0 0 16px;">${he(title)}</h1>
    <p style="color:#5a7058;font-size:14px;line-height:1.6;margin:0;">${he(message)}</p>
    <p style="margin:32px 0 0;"><a href="https://panel.takai.cl" style="color:#7ab87a;font-size:12px;text-decoration:none;letter-spacing:2px;">VOLVER AL PANEL</a></p>
  </div>
</body></html>`
}
