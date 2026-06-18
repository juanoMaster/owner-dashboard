export const dynamic = "force-dynamic"

import { NextResponse } from "next/server"
import { getSupabaseAdmin } from "@/lib/supabase-server"
import { logAudit } from "@/lib/audit"
import { getResend, emailCommissionStatement } from "@/lib/resend"

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

  try {
    // Tenants activos con billing_mode = 'commission'
    const { data: subscriptions } = await supabase
      .from("subscriptions")
      .select("tenant_id, commission_rate, currency")
      .eq("billing_mode", "commission")
      .eq("status", "active")

    for (const sub of subscriptions ?? []) {
      try {
        // Idempotencia: saltar si ya existe el statement de este período
        const { data: existing } = await supabase
          .from("commission_statements")
          .select("id")
          .eq("tenant_id", sub.tenant_id)
          .eq("period_year", year)
          .eq("period_month", month)
          .eq("kind", "commission")
          .maybeSingle()

        if (existing) { skipped.push(sub.tenant_id); continue }

        // Obtener tenant
        const { data: tenant } = await supabase
          .from("tenants")
          .select("business_name, owner_name, email_owner, currency, slug, manual_billing")
          .eq("id", sub.tenant_id)
          .single()

        if (!tenant) continue

        const currency = tenant.currency || "CLP"

        // Sumar reservas CONFIRMADAS del período por check_in (fecha de estadía, no de creación)
        const { data: bookings } = await supabase
          .from("bookings")
          .select("total_amount")
          .eq("tenant_id", sub.tenant_id)
          .eq("status", "confirmed")
          .is("deleted_at", null)
          .gte("check_in", periodStart)
          .lt("check_in", periodEnd)

        const bookingsCount = bookings?.length ?? 0
        const bookingsTotal = bookings?.reduce((sum, b) => sum + (Number(b.total_amount) || 0), 0) ?? 0
        const commissionAmount = Math.round(bookingsTotal * (sub.commission_rate / 100) * 100) / 100

        // Sin reservas en el período → no crear statement (no hay nada que cobrar)
        if (bookingsCount === 0 || commissionAmount === 0) {
          skipped.push(sub.tenant_id)
          continue
        }

        const statementStatus = "sent"

        const { data: statement, error: insertErr } = await supabase
          .from("commission_statements")
          .insert([{
            tenant_id: sub.tenant_id,
            period_year: year,
            period_month: month,
            kind: "commission",
            bookings_count: bookingsCount,
            bookings_total: bookingsTotal,
            currency,
            commission_amount: commissionAmount,
            commission_rate: sub.commission_rate,
            status: statementStatus,
          }])
          .select("id")
          .single()

        if (insertErr) { errors.push(`insert ${sub.tenant_id}: ${insertErr.message}`); continue }

        await logAudit({
          tenant_id: sub.tenant_id,
          action: "commission_statement_generated",
          entity_type: "commission_statement",
          entity_id: statement!.id,
          details: { year, month, bookings_count: bookingsCount, bookings_total: bookingsTotal, commission_amount: commissionAmount },
          performed_by: "cron_commission",
        })

        // Enviar email con estado de cuenta si hay comisión > 0
        if (commissionAmount > 0 && tenant.email_owner && !tenant.manual_billing) {
          const facturacionUrl = `${process.env.NEXT_PUBLIC_APP_URL ?? "https://panel.takai.cl"}/dashboard/facturacion`
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
              commission_rate: sub.commission_rate,
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

        created.push(sub.tenant_id)
      } catch (e: any) {
        errors.push(`${sub.tenant_id}: ${e.message}`)
      }
    }

    return NextResponse.json({ year, month, created: created.length, skipped: skipped.length, errors })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

function monthName(m: number): string {
  return ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"][m - 1]
}
