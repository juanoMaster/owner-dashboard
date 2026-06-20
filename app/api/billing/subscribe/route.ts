export const dynamic = "force-dynamic"

import { NextResponse } from "next/server"
import { getSupabaseAdmin } from "@/lib/supabase-server"
import crypto from "crypto"
import { logAudit } from "@/lib/audit"

export async function POST(req: Request) {
  const supabase = getSupabaseAdmin()

  try {
    const { token } = await req.json()
    if (!token) return NextResponse.json({ error: "Token requerido" }, { status: 400 })

    // Resolver tenant desde token
    const tokenHash = crypto.createHash("sha256").update(token, "utf8").digest("hex")
    const { data: link } = await supabase
      .from("dashboard_links")
      .select("tenant_id")
      .eq("token_hash", tokenHash)
      .eq("active", true)
      .maybeSingle()

    if (!link) return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    const tenant_id = link.tenant_id

    // Cargar tenant
    const { data: tenant } = await supabase
      .from("tenants")
      .select("business_name, email_owner, manual_billing, billing_status, slug")
      .eq("id", tenant_id)
      .single()

    if (!tenant) return NextResponse.json({ error: "Tenant no encontrado" }, { status: 404 })

    if (tenant.manual_billing) {
      return NextResponse.json(
        { error: "Tu facturación está gestionada directamente con Takai. Contáctanos por WhatsApp." },
        { status: 400 }
      )
    }

    if (tenant.billing_status === "active") {
      return NextResponse.json({ error: "Tu suscripción ya está activa." }, { status: 400 })
    }

    // Cargar suscripción existente
    const { data: sub } = await supabase
      .from("subscriptions")
      .select("id, amount, currency, plan, billing_mode")
      .eq("tenant_id", tenant_id)
      .maybeSingle()

    if (sub?.billing_mode === "commission") {
      return NextResponse.json(
        { error: "Tu plan es de comisión — no requiere suscripción mensual." },
        { status: 400 }
      )
    }

    const amount = sub?.amount ?? 19990
    const currency = sub?.currency ?? "CLP"
    const plan = sub?.plan ?? "fundador"
    const backUrl = `${process.env.NEXT_PUBLIC_APP_URL ?? "https://owner-dashboard-navy.vercel.app"}/dashboard/facturacion`

    const mpToken = process.env.MP_PLATFORM_ACCESS_TOKEN
    if (!mpToken) return NextResponse.json({ error: "Billing no configurado" }, { status: 500 })

    // Crear preapproval en MercadoPago
    const mpRes = await fetch("https://api.mercadopago.com/preapproval", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${mpToken}`,
      },
      body: JSON.stringify({
        reason: `Takai ${plan.charAt(0).toUpperCase() + plan.slice(1)} — ${tenant.business_name}`,
        external_reference: tenant_id,
        payer_email: tenant.email_owner,
        auto_recurring: {
          frequency: 1,
          frequency_type: "months",
          transaction_amount: amount,
          currency_id: currency,
        },
        back_url: backUrl,
        status: "pending",
      }),
    })

    if (!mpRes.ok) {
      const err = await mpRes.text()
      console.error("[billing/subscribe] MP error:", err)
      return NextResponse.json({ error: "Error al crear suscripción en MercadoPago" }, { status: 500 })
    }

    const mpData = await mpRes.json()
    const { id: mp_preapproval_id, init_point } = mpData

    // Guardar preapproval_id y marcar pending
    if (sub) {
      await supabase
        .from("subscriptions")
        .update({ mp_preapproval_id, status: "pending", updated_at: new Date().toISOString() })
        .eq("tenant_id", tenant_id)
    } else {
      await supabase.from("subscriptions").insert([{
        tenant_id, mp_preapproval_id, plan, amount, currency, status: "pending",
      }])
    }

    await supabase
      .from("tenants")
      .update({ billing_status: "pending" })
      .eq("id", tenant_id)

    await logAudit({
      tenant_id,
      action: "billing_subscribe_initiated",
      entity_type: "subscription",
      entity_id: tenant_id,
      details: { mp_preapproval_id, plan, amount, currency },
      performed_by: "owner_panel",
    })

    return NextResponse.json({ init_point })
  } catch (err: any) {
    console.error("[billing/subscribe]", err.message)
    return NextResponse.json({ error: err.message || "Error interno" }, { status: 500 })
  }
}
