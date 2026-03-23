import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

export async function GET(
  req: Request,
  { params }: { params: { cabinId: string } }
) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const cabinId = params.cabinId

  const { data: cabin } = await supabase
    .from("cabins")
    .select("name, tenant_id")
    .eq("id", cabinId)
    .single()

  if (!cabin) {
    return NextResponse.json({ error: "Cabaña no encontrada" }, { status: 404 })
  }

  const { data: blocks } = await supabase
    .from("calendar_blocks")
    .select("id, start_date, end_date, reason, booking_id")
    .eq("cabin_id", cabinId)
    .gte("end_date", new Date().toISOString().split("T")[0])

  const events = (blocks || []).map((b) => {
    const uid = b.id + "@takai.cl"
    const start = b.start_date.replace(/-/g, "")
    const endDate = new Date(b.end_date + "T00:00:00")
    endDate.setDate(endDate.getDate() + 1)
    const end = endDate.toISOString().split("T")[0].replace(/-/g, "")
    
    const summary = b.reason === "system_booking" 
      ? "Reserva Confirmada - Takai" 
      : b.reason === "transfer_pending"
      ? "Reserva Pendiente - Takai"
      : "Bloqueado - Takai"

    return [
      "BEGIN:VEVENT",
      "UID:" + uid,
      "DTSTART;VALUE=DATE:" + start,
      "DTEND;VALUE=DATE:" + end,
      "SUMMARY:" + summary,
      "DESCRIPTION:Gestionado por Takai.cl",
      "STATUS:CONFIRMED",
      "END:VEVENT"
    ].join("\r\n")
  })

  const ical = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Takai.cl//Reservas//ES",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "X-WR-CALNAME:" + cabin.name + " - Takai",
    ...events,
    "END:VCALENDAR"
  ].join("\r\n")

  return new NextResponse(ical, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": "attachment; filename=calendario.ics"
    }
  })
}