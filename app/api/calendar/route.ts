import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { logAudit } from "@/lib/audit"

const TENANT_ID = "11518e5f-6a0b-4bdc-bb6a-a1e142544579"

export async function GET(req: Request) {
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
  const { searchParams } = new URL(req.url)
  const cabinId = searchParams.get("cabin_id")
  if (!cabinId) return NextResponse.json({ error: "cabin_id requerido" }, { status: 400 })

  const hace24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
  await supabase.from("calendar_blocks").delete().eq("cabin_id", cabinId).eq("reason", "transfer_pending").lt("created_at", hace24h)

  const { data: blocks, error } = await supabase
    .from("calendar_blocks")
    .select("id, start_date, end_date, reason, booking_id, created_at")
    .eq("cabin_id", cabinId)
    .eq("tenant_id", TENANT_ID)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const bookingIds = (blocks || []).map(b => b.booking_id).filter(Boolean)
  let bookingsMap: Record<string, any> = {}
  if (bookingIds.length > 0) {
    const { data: bookings } = await supabase
      .from("bookings")
      .select("id, guests, nights, total_amount, deposit_amount, balance_amount, status, notes")
      .in("id", bookingIds)
    if (bookings) bookings.forEach(b => { bookingsMap[b.id] = b })
  }

  const events = (blocks || []).map(b => {
    const booking = b.booking_id ? bookingsMap[b.booking_id] : null
    return {
      id: b.id,
      start: b.start_date,
      end: b.end_date,
      reason: b.reason,
      booking_id: b.booking_id || null,
      booking: booking ? {
        guests: booking.guests,
        nights: booking.nights,
        total_amount: booking.total_amount,
        deposit_amount: booking.deposit_amount,
        balance_amount: booking.balance_amount,
        status: booking.status,
        notes: booking.notes
      } : null
    }
  })

  return NextResponse.json({ events })
}

export async function POST(req: Request) {
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
  try {
    const { start_date, end_date, cabin_id } = await req.json()
    if (!start_date || !end_date || !cabin_id) {
      return NextResponse.json({ error: "start_date, end_date y cabin_id son requeridos" }, { status: 400 })
    }
    const { data: block, error } = await supabase
      .from("calendar_blocks")
      .insert([{ start_date, end_date, reason: "manual", cabin_id, tenant_id: TENANT_ID }])
      .select("id")
      .single()
    if (error) throw error
    await logAudit({ tenant_id: TENANT_ID, cabin_id, action: "calendar_block_created", entity_type: "calendar_block", entity_id: block.id, details: { start_date, end_date, reason: "manual" }, performed_by: "johanna" })
    return NextResponse.json({ success: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
