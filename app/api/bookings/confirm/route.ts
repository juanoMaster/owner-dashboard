import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { logAudit } from "@/lib/audit"

export async function POST(req: Request) {
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
  try {
    const { booking_id, tenant_id } = await req.json()
    if (!booking_id || !tenant_id) return NextResponse.json({ error: "booking_id y tenant_id son requeridos" }, { status: 400 })
    const { data: booking, error: fetchErr } = await supabase.from("bookings").select("cabin_id, check_in, check_out, total_amount, notes, status").eq("id", booking_id).is("deleted_at", null).maybeSingle()
    if (fetchErr) return NextResponse.json({ error: "Error al buscar reserva: " + fetchErr.message }, { status: 500 })
    if (!booking) return NextResponse.json({ error: "Reserva no encontrada (id: " + booking_id + ")" }, { status: 404 })
    if (booking.status === "confirmed") return NextResponse.json({ success: true })
    const { data: conflicts } = await supabase.from("bookings").select("id").eq("cabin_id", booking.cabin_id).eq("status", "confirmed").neq("id", booking_id).is("deleted_at", null).lt("check_in", booking.check_out).gt("check_out", booking.check_in)
    if (conflicts && conflicts.length > 0) return NextResponse.json({ error: "Conflicto: ya existe una reserva confirmada para esas fechas en esta caba\u00f1a. Cancela la anterior primero." }, { status: 409 })
    const { error } = await supabase.from("bookings").update({ status: "confirmed" }).eq("id", booking_id)
    if (error) return NextResponse.json({ error: "Error al actualizar: " + error.message }, { status: 500 })
    await supabase.from("calendar_blocks").update({ reason: "system_booking" }).eq("booking_id", booking_id).neq("reason", "manual")
    await logAudit({ tenant_id, cabin_id: booking.cabin_id, action: "booking_confirmed", entity_type: "booking", entity_id: booking_id, details: { check_in: booking.check_in, check_out: booking.check_out, total_amount: booking.total_amount, notes: booking.notes }, performed_by: "owner_panel" })
    return NextResponse.json({ success: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}