import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
export async function POST(req: Request) {
  const adminToken = process.env.ADMIN_TOKEN
  const h = req.headers.get("x-admin-token")
  if (!adminToken || h !== adminToken) return NextResponse.json({ error: "No autorizado" }, { status: 401 })
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
