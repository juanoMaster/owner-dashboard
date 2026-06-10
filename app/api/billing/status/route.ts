export const dynamic = "force-dynamic"

import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import crypto from "crypto"

export async function GET(req: Request) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  )

  try {
    const { searchParams } = new URL(req.url)
    const token = searchParams.get("token")
    if (!token) return NextResponse.json({ error: "Token requerido" }, { status: 400 })

    const tokenHash = crypto.createHash("sha256").update(token, "utf8").digest("hex")
    const { data: link } = await supabase
      .from("dashboard_links")
      .select("tenant_id")
      .eq("token_hash", tokenHash)
      .eq("active", true)
      .maybeSingle()

    if (!link) return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    const tenant_id = link.tenant_id

    const { data: tenant } = await supabase
      .from("tenants")
      .select("business_name, billing_status, manual_billing, currency, bank_name, bank_account_type, bank_account_number, bank_account_holder, bank_rut, bank_email")
      .eq("id", tenant_id)
      .single()

    const { data: sub } = await supabase
      .from("subscriptions")
      .select("plan, amount, currency, status, billing_mode, commission_rate, free_until, trial_ends_at, last_payment_at, next_billing_at, failed_payments, mp_preapproval_id")
      .eq("tenant_id", tenant_id)
      .maybeSingle()

    // Últimos 6 estados de cuenta
    const { data: statements } = await supabase
      .from("commission_statements")
      .select("id, period_year, period_month, kind, bookings_count, bookings_total, currency, commission_amount, commission_rate, status, payment_method, paid_at, created_at")
      .eq("tenant_id", tenant_id)
      .order("period_year", { ascending: false })
      .order("period_month", { ascending: false })
      .limit(6)

    return NextResponse.json({
      tenant_id,
      business_name: tenant?.business_name ?? "",
      billing_status: tenant?.billing_status ?? "trial",
      manual_billing: tenant?.manual_billing ?? false,
      currency: tenant?.currency ?? "CLP",
      bank: {
        bank_name: tenant?.bank_name ?? null,
        bank_account_type: tenant?.bank_account_type ?? null,
        bank_account_number: tenant?.bank_account_number ?? null,
        bank_account_holder: tenant?.bank_account_holder ?? null,
        bank_rut: tenant?.bank_rut ?? null,
        bank_email: tenant?.bank_email ?? null,
      },
      subscription: sub ?? null,
      statements: statements ?? [],
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
