export const dynamic = "force-dynamic"

import { NextRequest, NextResponse } from "next/server"
import { getSupabaseAdmin } from "@/lib/supabase-server"
import { verifyMpSignature } from "@/lib/mp-verify"
import { syncBillingStatus } from "@/lib/billing"
import { logAudit } from "@/lib/audit"
import { getResend, emailSubscriptionActivated, emailPastDue } from "@/lib/resend"

// MP siempre requiere 200 o reintentará.
const OK = () => NextResponse.json({ received: true }, { status: 200 })

export async function POST(req: NextRequest) {
  const supabase = getSupabaseAdmin()

  try {
    const { searchParams } = new URL(req.url)
    const type = searchParams.get("type")
    const dataId = searchParams.get("data.id")

    if (!type || !dataId) return OK()

    // Verificar firma HMAC con el secret de la plataforma Takai
    const webhookSecret = process.env.MP_PLATFORM_WEBHOOK_SECRET
    if (webhookSecret) {
      const xSig = req.headers.get("x-signature") || ""
      const xReqId = req.headers.get("x-request-id") || ""
      if (!verifyMpSignature(webhookSecret, xSig, xReqId, dataId)) return OK()
    }

    const mpToken = process.env.MP_PLATFORM_ACCESS_TOKEN
    if (!mpToken) return OK()

    // ── Evento: pago de comisión único aprobado ───────────────────────────
    if (type === "payment") {
      const res = await fetch(`https://api.mercadopago.com/v1/payments/${dataId}`, {
        headers: { Authorization: `Bearer ${mpToken}` },
      })
      if (!res.ok) return OK()
      const data = await res.json()

      const extRef: string | undefined = data.external_reference
      if (!extRef?.startsWith("commission:")) return OK()

      const statementId = extRef.replace("commission:", "")
      if (data.status === "approved") {
        const now = new Date().toISOString()
        const { data: stmt } = await supabase
          .from("commission_statements")
          .select("id, tenant_id, commission_amount, currency, period_year, period_month")
          .eq("id", statementId)
          .maybeSingle()

        if (!stmt || !stmt.tenant_id) return OK()

        await supabase.from("commission_statements").update({
          status: "paid",
          payment_method: "card",
          paid_at: now,
          updated_at: now,
        }).eq("id", statementId)

        await logAudit({
          tenant_id: stmt.tenant_id,
          action: "commission_paid_card",
          entity_type: "commission_statement",
          entity_id: statementId,
          details: { mp_payment_id: dataId, amount: stmt.commission_amount, currency: stmt.currency },
          performed_by: "mp_billing_webhook",
        })

        // Email de confirmación al tenant
        const { data: tenant } = await supabase
          .from("tenants")
          .select("business_name, owner_name, email_owner")
          .eq("id", stmt.tenant_id).single()
        if (tenant?.email_owner) {
          const monthLabel = `${String(stmt.period_month).padStart(2, "0")}/${stmt.period_year}`
          getResend().emails.send({
            from: "Takai <hola@takai.cl>",
            to: tenant.email_owner,
            subject: `Pago confirmado — Comisión Takai ${monthLabel}`,
            html: `<p>Gracias ${tenant.owner_name.split(" ")[0]}, confirmamos el pago de tu comisión de ${stmt.commission_amount} ${stmt.currency} por tarjeta (período ${monthLabel}).</p>`,
          }).catch(() => {})
        }
      }
      return OK()
    }

    // ── Evento: cambio de estado en preapproval ───────────────────────────
    if (type === "preapproval") {
      const res = await fetch(`https://api.mercadopago.com/preapproval/${dataId}`, {
        headers: { Authorization: `Bearer ${mpToken}` },
      })
      if (!res.ok) return OK()
      const data = await res.json()

      const tenant_id: string | undefined = data.external_reference
      if (!tenant_id) return OK()

      const { data: sub } = await supabase
        .from("subscriptions")
        .select("id, failed_payments")
        .eq("tenant_id", tenant_id)
        .maybeSingle()

      if (!sub) return OK()

      let new_status: string | null = null
      if (data.status === "authorized") new_status = "active"
      else if (data.status === "cancelled") new_status = "cancelled"
      else if (data.status === "paused") new_status = "suspended"

      if (new_status) {
        const patch: Record<string, unknown> = {
          status: new_status,
          mp_preapproval_id: dataId,
          updated_at: new Date().toISOString(),
        }
        if (new_status === "active") patch.failed_payments = 0
        await supabase.from("subscriptions").update(patch).eq("tenant_id", tenant_id)
        await syncBillingStatus(tenant_id, new_status)
        await logAudit({
          tenant_id,
          action: "billing_status_changed",
          entity_type: "subscription",
          entity_id: tenant_id,
          details: { new_status, mp_preapproval_id: dataId, mp_event: "preapproval" },
          performed_by: "mp_billing_webhook",
        })

        // Email de bienvenida cuando la suscripción se activa
        if (new_status === "active") {
          const { data: tenant } = await supabase
            .from("tenants")
            .select("business_name, owner_name, email_owner")
            .eq("id", tenant_id).single()
          const { data: sub2 } = await supabase
            .from("subscriptions")
            .select("plan, amount").eq("tenant_id", tenant_id).single()
          if (tenant?.email_owner) {
            getResend().emails.send({
              from: "Takai <hola@takai.cl>",
              to: tenant.email_owner,
              subject: "Tu suscripción a Takai está activa",
              html: emailSubscriptionActivated({
                business_name: tenant.business_name,
                owner_name: tenant.owner_name,
                plan: sub2?.plan ?? "fundador",
                amount: sub2?.amount ?? 19990,
                facturacion_url: `${process.env.NEXT_PUBLIC_APP_URL ?? "https://panel.takai.cl"}/dashboard/facturacion`,
              }),
            }).catch(() => {})
          }
        }
      }
      return OK()
    }

    // ── Evento: pago recurrente (authorized_payment) ──────────────────────
    if (type === "authorized_payment") {
      const res = await fetch(`https://api.mercadopago.com/authorized_payments/${dataId}`, {
        headers: { Authorization: `Bearer ${mpToken}` },
      })
      if (!res.ok) return OK()
      const data = await res.json()

      const preapprovalId: string | undefined = data.preapproval_id
      if (!preapprovalId) return OK()

      const { data: sub } = await supabase
        .from("subscriptions")
        .select("id, tenant_id, failed_payments")
        .eq("mp_preapproval_id", preapprovalId)
        .maybeSingle()

      if (!sub) return OK()
      const tenant_id = sub.tenant_id

      if (data.status === "approved") {
        await supabase.from("subscriptions").update({
          status: "active",
          failed_payments: 0,
          last_payment_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }).eq("id", sub.id)
        await syncBillingStatus(tenant_id, "active")
        await logAudit({
          tenant_id,
          action: "billing_payment_approved",
          entity_type: "subscription",
          entity_id: tenant_id,
          details: { authorized_payment_id: dataId },
          performed_by: "mp_billing_webhook",
        })
      } else if (data.status === "rejected" || data.status === "cancelled") {
        const failed = (sub.failed_payments ?? 0) + 1
        const new_status = failed >= 2 ? "past_due" : "active"
        await supabase.from("subscriptions").update({
          failed_payments: failed,
          status: new_status,
          updated_at: new Date().toISOString(),
        }).eq("id", sub.id)
        await syncBillingStatus(tenant_id, new_status)
        await logAudit({
          tenant_id,
          action: "billing_payment_failed",
          entity_type: "subscription",
          entity_id: tenant_id,
          details: { authorized_payment_id: dataId, failed_payments: failed, new_status },
          performed_by: "mp_billing_webhook",
        })
        // Email de aviso de pago fallido
        const { data: tFail } = await supabase
          .from("tenants")
          .select("business_name, owner_name, email_owner")
          .eq("id", tenant_id).single()
        if (tFail?.email_owner) {
          getResend().emails.send({
            from: "Takai <hola@takai.cl>",
            to: tFail.email_owner,
            subject: "Problema con tu pago en Takai",
            html: emailPastDue({
              business_name: tFail.business_name,
              owner_name: tFail.owner_name,
              failed_payments: failed,
              facturacion_url: `${process.env.NEXT_PUBLIC_APP_URL ?? "https://panel.takai.cl"}/dashboard/facturacion`,
            }),
          }).catch(() => {})
        }
      }
      return OK()
    }

    return OK()
  } catch {
    return OK()
  }
}
