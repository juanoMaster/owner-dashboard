import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { logAudit } from "@/lib/audit"

export async function POST(req: Request) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
  try {
    const { booking_id, tenant_id, performed_by } = await req.json()
    if (!booking_id || !tenant_id) {
      return NextResponse.json({ error: "booking_id y tenant_id son requeridos" }, { status: 400 })
    }
    const { data: booking, error: fetchErr } = await supabase
      .from("bookings")
      .select("cabin_id, check_in, check_out, total_amount, notes, status, deleted_at")
      .eq("id", booking_id)
      .eq("tenant_id", tenant_id)
      .single()
    if (fetchErr || !booking) {
      return NextResponse.json({ error: "Reserva no encontrada" }, { status: 404 })
    }
    // Idempotente: si ya fue cancelada, retornar success
    if (booking.deleted_at) {
      return NextResponse.json({ success: true })
    }
    const source = performed_by || "owner_panel"
    // Soft delete — el registro queda en BD para historial completo
    await supabase.from("bookings")
      .update({ deleted_at: new Date().toISOString(), deleted_by: source })
      .eq("id", booking_id)
      .eq("tenant_id", tenant_id)
    // Los calendar_blocks se eliminan fisicamente (son operacionales)
    await supabase.from("calendar_blocks").delete().eq("booking_id", booking_id).eq("tenant_id", tenant_id)
    await supabase.from("calendar_blocks").delete()
      .eq("cabin_id", booking.cabin_id).eq("tenant_id", tenant_id)
      .eq("start_date", booking.check_in).eq("end_date", booking.check_out)
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
      },
      performed_by: source,
    })
    return NextResponse.json({ success: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
