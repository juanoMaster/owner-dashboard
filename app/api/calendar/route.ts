import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const cabinId = searchParams.get("cabin_id")
  if (!cabinId) return NextResponse.json({ error: "cabin_id es requerido" }, { status: 400 })

  const { data: cabin } = await supabase
    .from("cabins")
    .select("name")
    .eq("id", cabinId)
    .maybeSingle()

  const { data: blocks, error } = await supabase
    .from("calendar_blocks")
    .select("id, start_date, end_date, booking_id")
    .eq("cabin_id", cabinId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Verificar cuáles bookings están confirmados (pagados)
  const bookingIds = Array.from(new Set((blocks || []).filter(b => b.booking_id).map(b => b.booking_id)))
  let confirmedSet = new Set<string>()
  if (bookingIds.length > 0) {
    const { data: confirmed } = await supabase
      .from("bookings")
      .select("id")
      .in("id", bookingIds)
      .eq("status", "confirmed")
    confirmedSet = new Set((confirmed || []).map((b: any) => b.id))
  }

  const events = (blocks || []).map(b => ({
    id: b.id,
    start: b.start_date,
    end: b.end_date,
    has_booking: !!b.booking_id,
    is_confirmed: b.booking_id ? confirmedSet.has(b.booking_id) : false,
  }))

  return NextResponse.json({ events, cabin_name: cabin?.name || "Cabana" })
}

export async function POST(req: Request) {
  try {
    const { date, cabin_id } = await req.json()
    if (!date || !cabin_id) {
      return NextResponse.json({ error: "date y cabin_id son requeridos" }, { status: 400 })
    }

    const { data: cabin } = await supabase
      .from("cabins")
      .select("tenant_id")
      .eq("id", cabin_id)
      .maybeSingle()

    if (!cabin) return NextResponse.json({ error: "Cabana no encontrada" }, { status: 404 })

    const { error } = await supabase.from("calendar_blocks").insert([{
      start_date: date,
      end_date: date,
      reason: "manual",
      cabin_id,
      tenant_id: cabin.tenant_id,
    }])

    if (error) throw error
    return NextResponse.json({ success: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
