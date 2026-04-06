import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
export async function POST(req: Request) {
  const adminToken = process.env.ADMIN_TOKEN
  const h = req.headers.get("x-admin-token")
  if (!adminToken || h !== adminToken) return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { global: { fetch: (url, options = {}) => fetch(url, { ...options, cache: "no-store" }) } })
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
      const q = supabase.from("cabins").update({
        name: body.name,
        capacity: Number(body.capacity) || 4,
        base_price_night: Number(body.base_price_night) || 0,
        cleaning_fee: Number(body.cleaning_fee) || 0,
      }).eq("id", id)
      if (body.tenant_id) q.eq("tenant_id", body.tenant_id)
      const { data, error } = await q.select().single()
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      return NextResponse.json({ success: true, cabin: data })
    }
    if (action === "toggle") {
      const q2 = supabase.from("cabins").update({ active: body.active }).eq("id", id)
      if (body.tenant_id) q2.eq("tenant_id", body.tenant_id)
      const { data, error } = await q2.select().single()
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      return NextResponse.json({ success: true, cabin: data })
    }
    return NextResponse.json({ error: "Accion desconocida" }, { status: 400 })
  } catch (e: any) { return NextResponse.json({ error: e.message }, { status: 500 }) }
}
