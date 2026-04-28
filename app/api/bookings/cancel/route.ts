import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { logAudit } from "@/lib/audit"
import { getResend, emailReservaCancelada, sendErrorAlert } from "@/lib/resend"
import { createHash } from "crypto"

export async function POST(req: Request) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { global: { fetch: (url, options = {}) => fetch(url, { ...options, cache: "no-store" }) } }
  )
  try {
    const body = await req.json()
    const { booking_id, tenant_id, performed_by } = body
    const token: string | undefined = body.token

    if (!booking_id || !tenant_id || !token) {
      return NextResponse.json({ error: "booking_id, tenant_id y token son requeridos" }, { status: 400 })
    }

    const tokenHash = createHash("sha256").update(token).digest("hex")
    const { data: link } = await supabase
      .from("dashboard_links")
      .select("tenant_id")
      .eq("token_hash", tokenHash)
      .eq("active", true)
      .maybeSingle()

    if (!link || link.tenant_id !== tenant_id) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }
    const { data: booking, error: fetchErr } = await supabase
      .from("bookings")
      .select("cabin_id, check_in, check_out, total_amount, notes, status, deleted_at, guest_email, guest_name, booking_code, cabins(name), tenants(business_name, owner_name)")
      .eq("id", booking_id)
      .eq("tenant_id", tenant_id)
      .single()
    if (fetchErr || !booking) {
      return NextResponse.json({ error: "Reserva no encontrada" }, { status: 404 })
    }
    if (booking.deleted_at) {
      return NextResponse.json({ success: true })
    }
    const source = performed_by || "owner_panel"
    await supabase.from("bookings")
      .update({ deleted_at: new Date().toISOString(), deleted_by: source })
      .eq("id", booking_id)
      .eq("tenant_id", tenant_id)
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
    const formatDate = (d: string) =>
      new Date(d + "T12:00:00").toLocaleDateString("es-CL", {
        weekday: "long", year: "numeric", month: "long", day: "numeric"
      })
    if (booking.guest_email && booking.booking_code) {
      try {
        const t = booking.tenants as any
        await getResend().emails.send({
          from: t.business_name + " <reservas@takai.cl>",
          to: booking.guest_email,
          subject: "Reserva no confirmada — " + booking.booking_code + " | " + t.business_name,
          html: emailReservaCancelada({
            business_name: t.business_name,
            guest_name: booking.guest_name,
            cabin_name: (booking.cabins as any)?.name || "Cabaña",
            check_in: formatDate(booking.check_in),
            check_out: formatDate(booking.check_out),
            booking_code: booking.booking_code,
          })
        })
      } catch (_) {}
    }
    return NextResponse.json({ success: true })
  } catch (err: any) {
    await sendErrorAlert({ route: "POST /api/bookings/cancel", error: err.message })
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
