const fs = require('fs')

const cancel = `import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { logAudit } from "@/lib/audit"

export async function POST(req: Request) {
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
  try {
    const { booking_id, tenant_id } = await req.json()
    if (!booking_id || !tenant_id) return NextResponse.json({ error: "booking_id y tenant_id son requeridos" }, { status: 400 })
    const { data: booking, error: fetchErr } = await supabase.from("bookings").select("cabin_id, check_in, check_out, total_amount, notes, status").eq("id", booking_id).eq("tenant_id", tenant_id).single()
    if (fetchErr || !booking) return NextResponse.json({ error: "Reserva no encontrada" }, { status: 404 })
    await supabase.from("calendar_blocks").delete().eq("cabin_id", booking.cabin_id).eq("tenant_id", tenant_id).gte("start_date", booking.check_in).lte("end_date", booking.check_out)
    await supabase.from("bookings").delete().eq("id", booking_id).eq("tenant_id", tenant_id)
    await logAudit({ tenant_id, cabin_id: booking.cabin_id, action: "booking_cancelled", entity_type: "booking", entity_id: booking_id, details: { check_in: booking.check_in, check_out: booking.check_out, total_amount: booking.total_amount, status_before: booking.status, notes: booking.notes }, performed_by: "johanna" })
    return NextResponse.json({ success: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}`

const confirm = `import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { logAudit } from "@/lib/audit"

export async function POST(req: Request) {
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
  try {
    const { booking_id, tenant_id } = await req.json()
    if (!booking_id || !tenant_id) return NextResponse.json({ error: "booking_id y tenant_id son requeridos" }, { status: 400 })
    const { data: booking, error: fetchErr } = await supabase.from("bookings").select("cabin_id, check_in, check_out, total_amount, notes").eq("id", booking_id).eq("tenant_id", tenant_id).single()
    if (fetchErr || !booking) return NextResponse.json({ error: "Reserva no encontrada" }, { status: 404 })
    const { error } = await supabase.from("bookings").update({ status: "confirmed", updated_at: new Date().toISOString() }).eq("id", booking_id).eq("tenant_id", tenant_id).eq("status", "draft")
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    await supabase.from("calendar_blocks").update({ reason: "system_booking" }).eq("cabin_id", booking.cabin_id).eq("tenant_id", tenant_id).eq("reason", "transfer_pending").gte("start_date", booking.check_in).lte("end_date", booking.check_out)
    await logAudit({ tenant_id, cabin_id: booking.cabin_id, action: "booking_confirmed", entity_type: "booking", entity_id: booking_id, details: { check_in: booking.check_in, check_out: booking.check_out, total_amount: booking.total_amount, notes: booking.notes }, performed_by: "johanna" })
    return NextResponse.json({ success: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}`

const calendar = `import { NextResponse } from "next/server"
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
  const { data: blocks, error } = await supabase.from("calendar_blocks").select("id, start_date, end_date, reason, booking_id, created_at").eq("cabin_id", cabinId).eq("tenant_id", TENANT_ID)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  const bookingIds = (blocks || []).map(b => b.booking_id).filter(Boolean)
  let bookingsMap: Record<string, any> = {}
  if (bookingIds.length > 0) {
    const { data: bookings } = await supabase.from("bookings").select("id, guests, nights, total_amount, deposit_amount, balance_amount, status, notes").in("id", bookingIds)
    if (bookings) bookings.forEach(b => { bookingsMap[b.id] = b })
  }
  const events = (blocks || []).map(b => {
    const booking = b.booking_id ? bookingsMap[b.booking_id] : null
    return { id: b.id, start: b.start_date, end: b.end_date, reason: b.reason, booking_id: b.booking_id || null, booking: booking ? { guests: booking.guests, nights: booking.nights, total_amount: booking.total_amount, deposit_amount: booking.deposit_amount, balance_amount: booking.balance_amount, status: booking.status, notes: booking.notes } : null }
  })
  return NextResponse.json({ events })
}

export async function POST(req: Request) {
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
  try {
    const { start_date, end_date, cabin_id } = await req.json()
    if (!start_date || !end_date || !cabin_id) return NextResponse.json({ error: "start_date, end_date y cabin_id son requeridos" }, { status: 400 })
    const { data: block, error } = await supabase.from("calendar_blocks").insert([{ start_date, end_date, reason: "manual", cabin_id, tenant_id: TENANT_ID }]).select("id").single()
    if (error) throw error
    await logAudit({ tenant_id: TENANT_ID, cabin_id, action: "calendar_block_created", entity_type: "calendar_block", entity_id: block.id, details: { start_date, end_date, reason: "manual" }, performed_by: "johanna" })
    return NextResponse.json({ success: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}`

fs.writeFileSync('app/api/bookings/cancel/route.ts', cancel, 'utf8')
fs.writeFileSync('app/api/bookings/confirm/route.ts', confirm, 'utf8')
fs.writeFileSync('app/api/calendar/route.ts', calendar, 'utf8')
console.log('OK - archivos escritos')