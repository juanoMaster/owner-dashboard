export const dynamic = "force-dynamic"
import { NextResponse } from "next/server"
import { getSupabaseAdmin } from "@/lib/supabase-server"
import { getResend, emailRecordatorio48h, sendErrorAlert } from "@/lib/resend"

export async function GET(req: Request) {
  const authHeader = req.headers.get("authorization")
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }

  try {
    const supabase = getSupabaseAdmin()

    const today = new Date()
    const targetDate = new Date(today)
    targetDate.setDate(today.getDate() + 2)
    const targetStr = targetDate.toISOString().split("T")[0]

    const { data: bookings, error: dbError } = await supabase
      .from("bookings")
      .select(`*, cabins(name), tenants(business_name, owner_whatsapp)`)
      .eq("check_in", targetStr)
      .eq("status", "confirmed")
      .is("deleted_at", null)

    if (dbError) throw dbError

    if (!bookings || bookings.length === 0) {
      return NextResponse.json({ sent: 0 })
    }

    let sent = 0
    const errors: string[] = []

    for (const booking of bookings) {
      try {
        const t = booking.tenants
        const nights = Math.round(
          (new Date(booking.check_out).getTime() - new Date(booking.check_in).getTime()) / 86400000
        )
        const formatDate = (d: string) =>
          new Date(d + "T12:00:00").toLocaleDateString("es-CL", {
            weekday: "long", year: "numeric", month: "long", day: "numeric",
          })

        await getResend().emails.send({
          from: `${t.business_name} <reservas@takai.cl>`,
          to: booking.guest_email,
          subject: `¡Te esperamos en 2 días! — ${booking.booking_code} | ${t.business_name}`,
          html: emailRecordatorio48h({
            business_name: t.business_name,
            guest_name: booking.guest_name,
            cabin_name: booking.cabins?.name || "Cabaña",
            check_in: formatDate(booking.check_in),
            check_out: formatDate(booking.check_out),
            nights,
            booking_code: booking.booking_code,
            owner_whatsapp: t.owner_whatsapp || "",
          }),
        })
        sent++
      } catch (err: any) {
        errors.push(`${booking.booking_code}: ${err?.message}`)
        console.error("[recordatorio] Error en booking", booking.booking_code, err?.message)
      }
    }

    return NextResponse.json({ sent, errors: errors.length ? errors : undefined })
  } catch (err: any) {
    await sendErrorAlert({ route: "GET /api/emails/recordatorio", error: err?.message ?? "Error desconocido" })
    return NextResponse.json({ error: err?.message ?? "Error interno" }, { status: 500 })
  }
}