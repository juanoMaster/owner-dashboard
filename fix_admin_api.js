const fs = require("fs")
const path = require("path")

function ensure(p) { if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true }) }

function guard() {
  return `  const adminToken = process.env.ADMIN_TOKEN
  const h = req.headers.get("x-admin-token")
  if (!adminToken || h !== adminToken) return NextResponse.json({ error: "No autorizado" }, { status: 401 })`
}

// ── /api/admin/tenants ────────────────────
const TENANTS = `import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
export async function POST(req: Request) {
${guard()}
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
  const body = await req.json()
  const { action, id } = body
  try {
    if (action === "create") {
      const { data, error } = await supabase.from("tenants").insert([{
        business_name: body.business_name,
        owner_name: body.owner_name,
        owner_whatsapp: body.owner_whatsapp || null,
        deposit_percent: Number(body.deposit_percent) || 20,
        active: true,
      }]).select().single()
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      return NextResponse.json({ success: true, tenant: data })
    }
    if (action === "update") {
      const { data, error } = await supabase.from("tenants").update({
        business_name: body.business_name,
        owner_name: body.owner_name,
        owner_whatsapp: body.owner_whatsapp || null,
        deposit_percent: Number(body.deposit_percent) || 20,
      }).eq("id", id).select().single()
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      return NextResponse.json({ success: true, tenant: data })
    }
    if (action === "toggle") {
      const { data, error } = await supabase.from("tenants").update({ active: body.active }).eq("id", id).select().single()
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      return NextResponse.json({ success: true, tenant: data })
    }
    return NextResponse.json({ error: "Accion desconocida" }, { status: 400 })
  } catch (e: any) { return NextResponse.json({ error: e.message }, { status: 500 }) }
}
`

// ── /api/admin/cabins ─────────────────────
const CABINS = `import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
export async function POST(req: Request) {
${guard()}
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
  const body = await req.json()
  const { action, id } = body
  try {
    if (action === "create") {
      const { data, error } = await supabase.from("cabins").insert([{
        tenant_id: body.tenant_id,
        name: body.name,
        capacity: Number(body.capacity) || 4,
        base_price_night: Number(body.base_price_night) || 0,
        cleaning_fee: Number(body.cleaning_fee) || 0,
        active: true,
      }]).select().single()
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      return NextResponse.json({ success: true, cabin: data })
    }
    if (action === "update") {
      const { data, error } = await supabase.from("cabins").update({
        name: body.name,
        capacity: Number(body.capacity) || 4,
        base_price_night: Number(body.base_price_night) || 0,
        cleaning_fee: Number(body.cleaning_fee) || 0,
      }).eq("id", id).select().single()
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      return NextResponse.json({ success: true, cabin: data })
    }
    if (action === "toggle") {
      const { data, error } = await supabase.from("cabins").update({ active: body.active }).eq("id", id).select().single()
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      return NextResponse.json({ success: true, cabin: data })
    }
    return NextResponse.json({ error: "Accion desconocida" }, { status: 400 })
  } catch (e: any) { return NextResponse.json({ error: e.message }, { status: 500 }) }
}
`

// ── /api/admin/tokens ─────────────────────
const TOKENS = `import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import crypto from "crypto"
export async function POST(req: Request) {
${guard()}
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
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
`

const base = path.join(__dirname, "app", "api", "admin")
ensure(path.join(base, "tenants"))
ensure(path.join(base, "cabins"))
ensure(path.join(base, "tokens"))

fs.writeFileSync(path.join(base, "tenants", "route.ts"), TENANTS, "utf8")
console.log("Written: app/api/admin/tenants/route.ts")

fs.writeFileSync(path.join(base, "cabins", "route.ts"), CABINS, "utf8")
console.log("Written: app/api/admin/cabins/route.ts")

fs.writeFileSync(path.join(base, "tokens", "route.ts"), TOKENS, "utf8")
console.log("Written: app/api/admin/tokens/route.ts")
