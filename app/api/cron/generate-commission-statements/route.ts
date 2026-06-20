export const dynamic = "force-dynamic"

import { NextResponse } from "next/server"
import { getSupabaseAdmin } from "@/lib/supabase-server"
import { logAudit } from "@/lib/audit"
import { getResend, emailCommissionStatement } from "@/lib/resend"
import { TAKAI_COMMISSION_RATE, TAKAI_GENERATED_SOURCES } from "@/lib/commission"

export async function GET(req: Request) {
  const authHeader = req.headers.get("authorization")
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }

  const supabase = getSupabaseAdmin()
  const resend = getResend()

  // Mes anterior
  const now = new Date()
  const prevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
  const year = prevMonth.getFullYear()
  const month = prevMonth.getMonth() + 1 // 1-12
  const periodStart = `${year}-${String(month).padStart(2, "0")}-01`
  const periodEnd = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`

  const created: string[] = []
  const skipped: string[] = []
  const errors: string[] = []

  // Crea el statement (si hay comisión > 0) y manda el email. Devuelve "created"
  // | "skipped". `onlyTakaiGenerated` decide qué reservas suman:
  //  - false (fundadores, billing_mode='commission'): TODAS las confirmadas (su trato heredado, NO cambia).
  //  - true  (suscripción): SOLO las generadas por Takai (directorio/agente/afiliado) × 10%.
  async function processTenant(tenantId: string, rate: number, onlyTakaiGenerated: boolean, performedBy: string): Promise<"created" | "skipped"> {
    const { data: existing } = await supabase
      .from("commission_statements")
      .select("id")
      .eq("tenant_id", tenantId)
      .eq("period_year", year)
      .eq("period_month", month)
      .eq("kind", "commission")
      .maybeSingle()
    if (existing) return "skipped"

    const { data: tenant } = await supabase
      .from("tenants")
      .select("business_name, owner_name, email_owner, currency, slug, manual_billing")
      .eq("id", tenantId)
      .single()
    if (!tenant) return "skipped"

    const currency = tenant.currency || "CLP"

    let q = supabase
      .from("bookings")
      .select("total_amount")
      .eq("tenant_id", tenantId)
      .eq("status", "confirmed")
      .is("deleted_at", null)
      .gte("check_in", periodStart)
      .lt("check_in", periodEnd)
    if (onlyTakaiGenerated) {
      q = q.in("booking_source", TAKAI_GENERATED_SOURCES as unknown as string[])
    }
    const { data: bookings } = await q

    const bookingsCount = bookings?.length ?? 0
    const bookingsTotal = bookings?.reduce((sum, b) => sum + (Number(b.total_amount) || 0), 0) ?? 0
    const commissionAmount = Math.round(bookingsTotal * (rate / 100) * 100) / 100

    if (bookingsCount === 0 || commissionAmount === 0) return "skipped"

    const { data: statement, error: insertErr } = await supabase
      .from("commission_statements")
      .insert([{
        tenant_id: tenantId,
        period_year: year,
        period_month: month,
        kind: "commission",
        bookings_count: bookingsCount,
        bookings_total: bookingsTotal,
        currency,
        commission_amount: commissionAmount,
        commission_rate: rate,
        status: "sent",
      }])
      .select("id")
      .single()

    if (insertErr) { errors.push(`insert ${tenantId}: ${insertErr.message}`); return "skipped" }

    await logAudit({
      tenant_id: tenantId,
      action: "commission_statement_generated",
      entity_type: "commission_statement",
      entity_id: statement!.id,
      details: { year, month, bookings_count: bookingsCount, bookings_total: bookingsTotal, commission_amount: commissionAmount, only_takai_generated: onlyTakaiGenerated },
      performed_by: performedBy,
    })

    if (commissionAmount > 0 && tenant.email_owner && !tenant.manual_billing) {
      const facturacionUrl = `${process.env.NEXT_PUBLIC_APP_URL ?? "https://owner-dashboard-navy.vercel.app"}/dashboard/facturacion`
      const mpEnabled = currency === "CLP" && !!process.env.MP_PLATFORM_ACCESS_TOKEN
      await resend.emails.send({
        from: "Takai <hola@takai.cl>",
        to: tenant.email_owner,
        subject: `Estado de cuenta Takai — ${monthName(month)} ${year}`,
        html: emailCommissionStatement({
          business_name: tenant.business_name,
          owner_name: tenant.owner_name,
          period_label: `${monthName(month)} ${year}`,
          bookings_count: bookingsCount,
          bookings_total: bookingsTotal,
          commission_amount: commissionAmount,
          commission_rate: rate,
          currency,
          statement_id: statement!.id,
          reference_code: `TAKAI-${tenant.slug.toUpperCase()}-${year}${String(month).padStart(2, "0")}`,
          facturacion_url: facturacionUrl,
          mp_enabled: mpEnabled,
          takai_bank_name: process.env.TAKAI_BANK_NAME ?? "",
          takai_bank_type: process.env.TAKAI_BANK_ACCOUNT_TYPE ?? "",
          takai_bank_number: process.env.TAKAI_BANK_ACCOUNT_NUMBER ?? "",
          takai_bank_holder: process.env.TAKAI_BANK_HOLDER_NAME ?? "",
          takai_bank_rut: process.env.TAKAI_BANK_HOLDER_RUT ?? "",
          takai_bank_email: process.env.TAKAI_BANK_EMAIL ?? "",
        }),
      })
    }
    return "created"
  }

  try {
    // ── Pasada 1: fundadores (billing_mode='commission') — TODAS sus reservas.
    //    Su trato NO cambia hasta que venzan sus plazos (decisión Juan 2026-06-19).
    const { data: commissionSubs } = await supabase
      .from("subscriptions")
      .select("tenant_id, commission_rate")
      .eq("billing_mode", "commission")
      .eq("status", "active")

    for (const sub of commissionSubs ?? []) {
      try {
        const r = await processTenant(sub.tenant_id, sub.commission_rate, false, "cron_commission")
        ;(r === "created" ? created : skipped).push(sub.tenant_id)
      } catch (e: any) { errors.push(`${sub.tenant_id}: ${e.message}`) }
    }

    // ── Pasada 2: clientes en suscripción — 10% SOLO sobre reservas generadas
    //    por Takai (directorio/agente/afiliado). El 10% incluye lo que se cede a
    //    afiliados (Takai paga al afiliado aparte). manual_billing nunca se factura.
    const { data: subSubs } = await supabase
      .from("subscriptions")
      .select("tenant_id")
      .eq("billing_mode", "subscription")
      .in("status", ["active", "trial", "past_due"])

    for (const sub of subSubs ?? []) {
      try {
        const r = await processTenant(sub.tenant_id, TAKAI_COMMISSION_RATE, true, "cron_commission_subscription")
        ;(r === "created" ? created : skipped).push(sub.tenant_id)
      } catch (e: any) { errors.push(`${sub.tenant_id}: ${e.message}`) }
    }

    return NextResponse.json({ year, month, created: created.length, skipped: skipped.length, errors })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

function monthName(m: number): string {
  return ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"][m - 1]
}
