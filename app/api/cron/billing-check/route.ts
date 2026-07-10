export const dynamic = "force-dynamic"

import { NextResponse } from "next/server"
import { getSupabaseAdmin } from "@/lib/supabase-server"
import { logAudit } from "@/lib/audit"
import { getResend, emailTrialEnding, emailPastDue } from "@/lib/resend"
import { sendAlertEmail } from "@/lib/alertEmail"

export async function GET(req: Request) {
  const authHeader = req.headers.get("authorization")
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }

  const supabase = getSupabaseAdmin()
  const resend = getResend()

  // Decisión de Juan 2026-07-10: la suspensión es MANUAL (botones en /admin →
  // Billing). El cron solo detecta y avisa al admin. Setear BILLING_AUTO_SUSPEND=true
  // reactiva la suspensión automática de antes sin tocar código.
  const AUTO_SUSPEND = process.env.BILLING_AUTO_SUSPEND === "true"

  const now = new Date()
  const suspended: string[] = []
  const pendingManual: Array<{ tenant_id: string; reason: string }> = []
  const warned: string[] = []
  const errors: string[] = []

  try {
    // ── 1. Solo actúa sobre billing_mode = 'subscription' ─────────────────
    // Los modos 'commission' y 'manual' nunca se suspenden automáticamente.

    // Trials de subscripción vencidos sin preapproval
    const { data: expiredTrials } = await supabase
      .from("subscriptions")
      .select("id, tenant_id, trial_ends_at")
      .eq("status", "trial")
      .eq("billing_mode", "subscription")
      .is("mp_preapproval_id", null)
      .lt("trial_ends_at", now.toISOString())

    for (const sub of expiredTrials ?? []) {
      if (!AUTO_SUSPEND) {
        pendingManual.push({ tenant_id: sub.tenant_id, reason: `trial vencido el ${sub.trial_ends_at}` })
        continue
      }
      try {
        await supabase.from("subscriptions").update({
          status: "suspended",
          updated_at: now.toISOString(),
        }).eq("id", sub.id)

        await supabase.from("tenants").update({ billing_status: "suspended" }).eq("id", sub.tenant_id)

        await logAudit({
          tenant_id: sub.tenant_id,
          action: "billing_trial_expired",
          entity_type: "subscription",
          entity_id: sub.tenant_id,
          details: { trial_ends_at: sub.trial_ends_at },
          performed_by: "cron_billing_check",
        })
        suspended.push(sub.tenant_id)
      } catch (e: any) {
        errors.push(`trial expired ${sub.tenant_id}: ${e.message}`)
      }
    }

    // past_due de subscripción con >5 días sin pago
    const fiveDaysAgo = new Date(now.getTime() - 5 * 86400 * 1000).toISOString()
    const { data: pastDue } = await supabase
      .from("subscriptions")
      .select("id, tenant_id, last_payment_at")
      .eq("status", "past_due")
      .eq("billing_mode", "subscription")
      .or(`last_payment_at.is.null,last_payment_at.lt.${fiveDaysAgo}`)

    for (const sub of pastDue ?? []) {
      if (!AUTO_SUSPEND) {
        pendingManual.push({ tenant_id: sub.tenant_id, reason: `past_due sin pago desde ${sub.last_payment_at || "nunca"}` })
        continue
      }
      try {
        await supabase.from("subscriptions").update({
          status: "suspended",
          updated_at: now.toISOString(),
        }).eq("id", sub.id)

        await supabase.from("tenants").update({ billing_status: "suspended" }).eq("id", sub.tenant_id)

        await logAudit({
          tenant_id: sub.tenant_id,
          action: "billing_past_due_suspended",
          entity_type: "subscription",
          entity_id: sub.tenant_id,
          details: { last_payment_at: sub.last_payment_at },
          performed_by: "cron_billing_check",
        })
        suspended.push(sub.tenant_id)
      } catch (e: any) {
        errors.push(`past_due ${sub.tenant_id}: ${e.message}`)
      }
    }

    // Modo manual: un solo email al admin con los candidatos a suspensión.
    // Se repite cada día hasta que Juan actúe (suspender o resolver el pago).
    if (!AUTO_SUSPEND && pendingManual.length > 0) {
      try {
        const ids = pendingManual.map((p) => p.tenant_id)
        const { data: names } = await supabase
          .from("tenants")
          .select("id, business_name, slug")
          .in("id", ids)
        const nameById = new Map((names || []).map((t: any) => [t.id, `${t.business_name} (${t.slug})`]))
        const lines = pendingManual
          .map((p) => `- ${nameById.get(p.tenant_id) || p.tenant_id}: ${p.reason}`)
          .join("\n")
        await sendAlertEmail(
          `Billing: ${pendingManual.length} cliente(s) para suspender manualmente`,
          `Estos clientes en suscripción no tienen el pago al día:\n\n${lines}\n\n` +
          `La suspensión automática está APAGADA — decide y suspende manualmente desde ` +
          `el panel admin → tab Billing (botón "Suspender").`
        )
      } catch (e: any) {
        errors.push(`pending manual alert: ${e.message}`)
      }
    }

    // ── 2. free_until vencido → solo aviso al admin, sin suspensión ────────
    // La transición a mensualidad es decisión humana.
    const { data: expiredAgreements } = await supabase
      .from("subscriptions")
      .select("id, tenant_id, free_until")
      .eq("billing_mode", "commission")
      .not("free_until", "is", null)
      .lt("free_until", now.toISOString().split("T")[0])

    for (const sub of expiredAgreements ?? []) {
      try {
        const { data: tenant } = await supabase
          .from("tenants")
          .select("business_name, slug")
          .eq("id", sub.tenant_id)
          .single()

        if (tenant) {
          await sendAlertEmail(
            `Acuerdo sin mensualidad vencido: ${tenant.business_name}`,
            `El acuerdo de precio sin mensualidad del tenant "${tenant.business_name}" (slug: ${tenant.slug}) venció el ${sub.free_until}.\n\nEl tenant SIGUE ACTIVO — la transición a mensualidad es manual.\nAcción requerida: contactar al tenant para renegociar.`
          )
        }
      } catch (e: any) {
        errors.push(`free_until alert ${sub.tenant_id}: ${e.message}`)
      }
    }

    // ── 3. Aviso 5 días antes de fin de trial (solo subscription) ─────────
    const in5Days = new Date(now.getTime() + 5 * 86400 * 1000)
    const in6Days = new Date(now.getTime() + 6 * 86400 * 1000)

    const { data: trialEndingSoon } = await supabase
      .from("subscriptions")
      .select("id, tenant_id, trial_ends_at")
      .eq("status", "trial")
      .eq("billing_mode", "subscription")
      .is("trial_warning_sent_at", null)
      .gte("trial_ends_at", in5Days.toISOString())
      .lt("trial_ends_at", in6Days.toISOString())

    for (const sub of trialEndingSoon ?? []) {
      try {
        const { data: tenant } = await supabase
          .from("tenants")
          .select("business_name, owner_name, email_owner, manual_billing, currency")
          .eq("id", sub.tenant_id)
          .single()

        if (!tenant || tenant.manual_billing || !tenant.email_owner) continue

        const trialStart = new Date(now.getTime() - 25 * 86400 * 1000).toISOString()
        const { data: bookings } = await supabase
          .from("bookings")
          .select("total_amount")
          .eq("tenant_id", sub.tenant_id)
          .is("deleted_at", null)
          .gte("created_at", trialStart)

        const reservasCount = bookings?.length ?? 0
        const montoTotal = bookings?.reduce((sum, b) => sum + (b.total_amount ?? 0), 0) ?? 0
        const daysLeft = Math.max(0, Math.ceil((new Date(sub.trial_ends_at!).getTime() - now.getTime()) / 86400000))

        await resend.emails.send({
          from: "Takai <hola@takai.cl>",
          to: tenant.email_owner,
          subject: `Tu prueba gratuita de Takai termina en ${daysLeft} días`,
          html: emailTrialEnding({
            business_name: tenant.business_name,
            owner_name: tenant.owner_name,
            days_left: daysLeft,
            reservas_count: reservasCount,
            monto_total: montoTotal,
            currency: tenant.currency || "CLP",
            facturacion_url: `${process.env.NEXT_PUBLIC_APP_URL ?? "https://owner-dashboard-navy.vercel.app"}/dashboard/facturacion`,
          }),
        })

        await supabase.from("subscriptions").update({
          trial_warning_sent_at: now.toISOString(),
        }).eq("id", sub.id)

        warned.push(sub.tenant_id)
      } catch (e: any) {
        errors.push(`trial warning ${sub.tenant_id}: ${e.message}`)
      }
    }

    // ── 4. Email past_due se envía en el webhook de billing (no aquí) ─────

    return NextResponse.json({
      auto_suspend: AUTO_SUSPEND,
      suspended: suspended.length,
      suspended_ids: suspended,
      pending_manual_suspension: pendingManual.length,
      pending_manual_ids: pendingManual.map((p) => p.tenant_id),
      warned: warned.length,
      warned_ids: warned,
      free_until_expired: expiredAgreements?.length ?? 0,
      errors,
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
