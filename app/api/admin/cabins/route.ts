import { NextResponse } from "next/server"
import { getSupabaseAdmin } from "@/lib/supabase-server"
export async function POST(req: Request) {
  const adminToken = process.env.ADMIN_TOKEN
  const h = req.headers.get("x-admin-token")
  if (!adminToken || h !== adminToken) return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  const supabase = getSupabaseAdmin()
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
        extra_person_price: Number(body.extra_person_price) || 0,
        extras: body.extras || [],
        amenities: body.amenities || null,
        description: body.description || null,
        pricing_tiers: body.pricing_tiers ?? [],
        season_prices: body.season_prices ?? [],
        active: true,
      }]).select().single()
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      return NextResponse.json({ success: true, cabin: data })
    }
    if (action === "update") {
      let q = supabase.from("cabins").update({
        name: body.name,
        capacity: Number(body.capacity) || 4,
        base_price_night: Number(body.base_price_night) || 0,
        cleaning_fee: Number(body.cleaning_fee) || 0,
        extra_person_price: Number(body.extra_person_price) || 0,
        extras: body.extras || [],
        amenities: body.amenities || null,
        description: body.description || null,
        pricing_tiers: body.pricing_tiers ?? [],
        season_prices: body.season_prices ?? [],
      }).eq("id", id)
      if (body.tenant_id) q = q.eq("tenant_id", body.tenant_id)
      const { data, error } = await q.select().single()
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      return NextResponse.json({ success: true, cabin: data })
    }
    if (action === "toggle") {
      let q2 = supabase.from("cabins").update({ active: body.active }).eq("id", id)
      if (body.tenant_id) q2 = q2.eq("tenant_id", body.tenant_id)
      const { data, error } = await q2.select().single()
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      return NextResponse.json({ success: true, cabin: data })
    }
    if (action === "delete") {
      // Limpiar fotos del storage antes de eliminar la cabaña
      const { data: cabinRow } = await supabase.from("cabins").select("photos").eq("id", id).single()
      if (cabinRow?.photos?.length) {
        const marker = "/cabin-photos/"
        const paths = (cabinRow.photos as string[]).map((url: string) => {
          const idx = url.indexOf(marker)
          return idx !== -1 ? url.slice(idx + marker.length) : null
        }).filter(Boolean) as string[]
        if (paths.length) {
          await supabase.storage.from("cabin-photos").remove(paths)
        }
      }
      await supabase.from("calendar_blocks").delete().eq("cabin_id", id)
      await supabase.from("bookings").update({ deleted_at: new Date().toISOString(), deleted_by: "admin_cabin_delete" }).eq("cabin_id", id).is("deleted_at", null)
      const { error } = await supabase.from("cabins").delete().eq("id", id)
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      return NextResponse.json({ success: true })
    }
    return NextResponse.json({ error: "Accion desconocida" }, { status: 400 })
  } catch (e: any) { return NextResponse.json({ error: e.message }, { status: 500 }) }
}
