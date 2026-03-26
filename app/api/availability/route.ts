export const dynamic = 'force-dynamic'
import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

export async function GET(req: Request) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
  const { searchParams } = new URL(req.url)
  const cabin_id = searchParams.get("cabin_id")
  const check_in = searchParams.get("check_in")
  const check_out = searchParams.get("check_out")
  const visited = (searchParams.get("visited") || "").split(",").filter(Boolean)
  if (!cabin_id || !check_in || !check_out) {
    return NextResponse.json({ available: false, error: "Faltan parametros" }, { status: 400 })
  }
  const { data: cab } = await supabase.from("cabins").select("capacity, base_price_night, tenant_id").eq("id", cabin_id).single()
  if (!cab) return NextResponse.json({ available: false, alternative: null })
  const tenantId = cab.tenant_id
  const { data: bloques } = await supabase.from("calendar_blocks").select("id").eq("cabin_id", cabin_id).eq("tenant_id", tenantId).lt("start_date", check_out).gt("end_date", check_in)
  if (!bloques || bloques.length === 0) return NextResponse.json({ available: true })
  const todasVisitadas = [...visited, cabin_id]
  const { data: cabanas } = await supabase.from("cabins").select("id, name, capacity, base_price_night").eq("tenant_id", tenantId).eq("active", true).not("id", "in", "(" + todasVisitadas.join(",") + ")")
  if (!cabanas || cabanas.length === 0) return NextResponse.json({ available: false, red_takai: true })
  for (const alt of cabanas.filter(c => c.capacity === cab.capacity && c.base_price_night === cab.base_price_night)) {
    const { data: b } = await supabase.from("calendar_blocks").select("id").eq("cabin_id", alt.id).eq("tenant_id", tenantId).lt("start_date", check_out).gt("end_date", check_in)
    if (!b || b.length === 0) return NextResponse.json({ available: false, auto_assign: { cabin_id: alt.id, cabin_name: alt.name } })
  }
  for (const alt of cabanas) {
    const { data: b } = await supabase.from("calendar_blocks").select("id").eq("cabin_id", alt.id).eq("tenant_id", tenantId).lt("start_date", check_out).gt("end_date", check_in)
    if (!b || b.length === 0) return NextResponse.json({ available: false, suggest: { cabin_id: alt.id, cabin_name: alt.name, capacity: alt.capacity, price: alt.base_price_night } })
  }
  return NextResponse.json({ available: false, red_takai: true })
}
