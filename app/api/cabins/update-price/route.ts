export const dynamic = "force-dynamic"

import { NextResponse } from "next/server"
import { getSupabaseAdmin, getSupabaseForTenant } from "@/lib/supabase-server"
import crypto from "crypto"
import { getBillingInfo, isBillingBlocked } from "@/lib/billing"

export async function PATCH(req: Request) {
  try {
    const { token, cabin_id, base_price_night } = await req.json()
    if (!token || !cabin_id || base_price_night === undefined) {
      return NextResponse.json({ error: "Faltan campos" }, { status: 400 })
    }

    const price = Number(base_price_night)
    if (isNaN(price) || price < 0) {
      return NextResponse.json({ error: "Precio inválido" }, { status: 400 })
    }

    const supabaseAdmin = getSupabaseAdmin()
    const tokenHash = crypto.createHash("sha256").update(token, "utf8").digest("hex")
    const { data: link } = await supabaseAdmin
      .from("dashboard_links")
      .select("tenant_id")
      .eq("token_hash", tokenHash)
      .eq("active", true)
      .maybeSingle()

    if (!link) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

    const billing = await getBillingInfo(link.tenant_id)
    if (isBillingBlocked(billing.billing_status, billing.manual_billing)) {
      return NextResponse.json(
        { error: "Tu suscripción está suspendida. Regulariza tu pago para editar precios." },
        { status: 403 }
      )
    }

    const supabase = await getSupabaseForTenant(link.tenant_id)

    const { data: cabin } = await supabase
      .from("cabins")
      .select("id")
      .eq("id", cabin_id)
      .eq("tenant_id", link.tenant_id)
      .maybeSingle()

    if (!cabin) return NextResponse.json({ error: "Cabaña no encontrada" }, { status: 404 })

    const { error } = await supabase
      .from("cabins")
      .update({ base_price_night: price })
      .eq("id", cabin_id)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ success: true })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
