import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: Request) {
  try {
    const { booking_id, tenant_id } = await req.json()

    if (!booking_id || !tenant_id) {
      return NextResponse.json(
        { error: "booking_id y tenant_id son requeridos" },
        { status: 400 }
      )
    }

    const { data: booking, error: fetchErr } = await supabase
      .from("bookings")
      .select("cabin_id, check_in, check_out")
      .eq("id", booking_id)
      .eq("tenant_id", tenant_id)
      .single()

    if (fetchErr || !booking) {
      return NextResponse.json({ error: "Reserva no encontrada" }, { status: 404 })
    }

    const { error } = await supabase
      .from("bookings")
      .update({ status: "confirmed", updated_at: new Date().toISOString() })
      .eq("id", booking_id)
      .eq("tenant_id", tenant_id)
      .eq("status", "draft")

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    await supabase
      .from("calendar_blocks")
      .update({ reason: "system_booking" })
      .eq("cabin_id", booking.cabin_id)
      .eq("tenant_id", tenant_id)
      .eq("reason", "transfer_pending")
      .gte("start_date", booking.check_in)
      .lte("end_date", booking.check_out)

    return NextResponse.json({ success: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}