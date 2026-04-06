import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import crypto from "crypto"
export async function POST(req: Request) {
  const adminToken = process.env.ADMIN_TOKEN
  const h = req.headers.get("x-admin-token")
  if (!adminToken || h !== adminToken) return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { global: { fetch: (url, options = {}) => fetch(url, { ...options, cache: "no-store" }) } })
  const body = await req.json()
  const { action } = body
  try {
    if (action === "create") {
      const rawToken = crypto.randomBytes(32).toString("hex")
      const tokenHash = crypto.createHash("sha256").update(rawToken, "utf8").digest("hex")
      const { data, error } = await supabase.from("dashboard_links").insert([{
        tenant_id: body.tenant_id,
        token_hash: tokenHash,
        active: true,
      }]).select().single()
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      // Guardar el raw_token en tenants.dashboard_token para acceso rápido desde admin
      await supabase.from("tenants").update({ dashboard_token: rawToken }).eq("id", body.tenant_id)
      return NextResponse.json({ success: true, token: data, raw_token: rawToken })
    }
    if (action === "deactivate") {
      const { error } = await supabase.from("dashboard_links").update({ active: false }).eq("id", body.id)
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      return NextResponse.json({ success: true })
    }
    return NextResponse.json({ error: "Accion desconocida" }, { status: 400 })
  } catch (e: any) { return NextResponse.json({ error: e.message }, { status: 500 }) }
}