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
    .select("name, tenant_id")
    .eq("id", cabinId)
    .maybeSingle()

  const { data: tenant } = cabin?.tenant_id
    ? await supabase.from("tenants").select("business_name").eq("id", cabin.tenant_id).maybeSingle()
    : { data: null }

  const { data: blocks, error } = await supabase
    .from("calendar_blocks")
    .select("id, start_date, end_date, booking_id, reason")
    .eq("cabin_id", cabinId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const bookingIds = Array.from(new Set((blocks || []).filter(b => b.booking_id).map(b => b.booking_id)))
  let confirmedSet = new Set<string>()
  let bookingDetailsMap: Record<string, any> = {}
  if (bookingIds.length > 0) {
    const { data: bookingRows } = await supabase
      .from("bookings")
      .select("id, status, total_amount, deposit_amount, balance_amount, nights, guests, notes")
      .in("id", bookingIds)
    ;(bookingRows || []).forEach((b: any) => {
      bookingDetailsMap[b.id] = b
      if (b.status === "confirmed") confirmedSet.add(b.id)
    })
  }

  const events = (blocks || []).map(b => ({
    id: b.id,
    start: b.start_date,
    end: b.end_date,
    reason: b.reason,
    has_booking: !!b.booking_id,
    booking_id: b.booking_id || null,
    is_confirmed: b.booking_id ? confirmedSet.has(b.booking_id) : false,
    booking: b.booking_id ? bookingDetailsMap[b.booking_id] || null : null,
  }))

  return NextResponse.json({
    events,
    cabin_name: cabin?.name || "Cabana",
    business_name: tenant?.business_name || "",
    tenant_id: cabin?.tenant_id || "",
  })
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
