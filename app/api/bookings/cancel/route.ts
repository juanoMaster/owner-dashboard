import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { logAudit } from "@/lib/audit"

export async function POST(req: Request) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
  try {
    const { booking_id, tenant_id } = await req.json()
    if (!booking_id || !tenant_id) {
      return NextResponse.json({ error: "booking_id y tenant_id son requeridos" }, { status: 400 })
    }
    const { data: booking, error: fetchErr } = await supabase
      .from("bookings")
      .select("cabin_id, check_in, check_out, total_amount, notes, status")
      .eq("id", booking_id)
      .eq("tenant_id", tenant_id)
      .single()
    if (fetchErr || !booking) {
      return NextResponse.json({ error: "Reserva no encontrada" }, { status: 404 })
    }
    await supabase.from("calendar_blocks").delete()
      .eq("cabin_id", booking.cabin_id)
      .eq("tenant_id", tenant_id)
      .gte("start_date", booking.check_in)
      .lte("end_date", booking.check_out)
    await supabase.from("bookings").delete()
      .eq("id", booking_id)
      .eq("tenant_id", tenant_id)
    await logAudit({
      tenant_id,
      cabin_id: booking.cabin_id,
      action: "booking_cancelled",
      entity_type: "booking",
      entity_id: booking_id,
      details: {
        check_in: booking.check_in,
        check_out: booking.check_out,
        total_amount: booking.total_amount,
        status_before: booking.status,
        notes: booking.notes
      },
      performed_by: "johanna"
    })
    return NextResponse.json({ success: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}