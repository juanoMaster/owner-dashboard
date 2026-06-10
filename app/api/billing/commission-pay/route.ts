export const dynamic = "force-dynamic"

import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import crypto from "crypto"
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

    // Autenticar tenant
    const tokenHash = crypto.createHash("sha256").update(token, "utf8").digest("hex")
    const { data: link } = await supabase
      .from("dashboard_links")
      .select("tenant_id")
      .eq("token_hash", tokenHash)
      .eq("active", true)
      .maybeSingle()

    if (!link) return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    const tenant_id = link.tenant_id

    // Cargar statement — verificar que pertenece al tenant y está pendiente
    const { data: stmt } = await supabase
      .from("commission_statements")
      .select("id, commission_amount, currency, period_year, period_month, status, kind")
      .eq("id", statement_id)
      .eq("tenant_id", tenant_id)
      .maybeSingle()

    if (!stmt) return NextResponse.json({ error: "Estado de cuenta no encontrado" }, { status: 404 })
    if (stmt.status === "paid") return NextResponse.json({ error: "Este estado de cuenta ya fue pagado" }, { status: 400 })
    if (stmt.currency !== "CLP") {
      return NextResponse.json({ error: "El pago con tarjeta solo está disponible en CLP" }, { status: 400 })
    }

    const mpToken = process.env.MP_PLATFORM_ACCESS_TOKEN
    if (!mpToken) return NextResponse.json({ error: "Pago con tarjeta no configurado" }, { status: 500 })

    const { data: tenant } = await supabase
      .from("tenants")
      .select("business_name, slug")
      .eq("id", tenant_id)
      .single()

    const backUrl = `${process.env.NEXT_PUBLIC_APP_URL ?? "https://panel.takai.cl"}/dashboard/facturacion`
    const monthLabel = `${stmt.period_year}-${String(stmt.period_month).padStart(2, "0")}`

    // Crear preference de pago único en MercadoPago
    const mpRes = await fetch("https://api.mercadopago.com/checkout/preferences", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${mpToken}`,
      },
      body: JSON.stringify({
        items: [{
          id: stmt.id,
          title: `Comisión Takai ${monthLabel} — ${tenant?.business_name ?? ""}`,
          quantity: 1,
          unit_price: Number(stmt.commission_amount),
          currency_id: "CLP",
        }],
        external_reference: `commission:${stmt.id}`,
        back_urls: { success: backUrl, failure: backUrl, pending: backUrl },
        auto_return: "approved",
      }),
    })

    if (!mpRes.ok) {
      const err = await mpRes.text()
      console.error("[commission-pay] MP error:", err)
      return NextResponse.json({ error: "Error al crear preferencia de pago" }, { status: 500 })
    }

    const mpData = await mpRes.json()
    const { id: mp_preference_id, init_point } = mpData

    await supabase
      .from("commission_statements")
      .update({ mp_preference_id, updated_at: new Date().toISOString() })
      .eq("id", stmt.id)

    await logAudit({
      tenant_id,
      action: "commission_pay_initiated",
      entity_type: "commission_statement",
      entity_id: stmt.id,
      details: { mp_preference_id, amount: stmt.commission_amount, period: monthLabel },
      performed_by: "owner_panel",
    })

    return NextResponse.json({ init_point })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
