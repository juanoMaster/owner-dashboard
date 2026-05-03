export const dynamic = "force-dynamic"

import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import crypto from "crypto"

export async function PATCH(req: Request) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { global: { fetch: (url, options = {}) => fetch(url, { ...options, cache: "no-store" }) } }
  )

  try {
    const { token, cabin_id, base_price_night } = await req.json()
    if (!token || !cabin_id || base_price_night === undefined) {
      return NextResponse.json({ error: "Faltan campos" }, { status: 400 })
    }

    const price = Number(base_price_night)
    if (isNaN(price) || price < 0) {
      return NextResponse.json({ error: "Precio inválido" }, { status: 400 })
    }

    const tokenHash = crypto.createHash("sha256").update(token, "utf8").digest("hex")
    const { data: link } = await supabase
      .from("dashboard_links")
      .select("tenant_id")
      .eq("token_hash", tokenHash)
      .eq("active", true)
      .maybeSingle()

    if (!link) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

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
