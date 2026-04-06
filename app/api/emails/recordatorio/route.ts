import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { resend, emailRecordatorio48h } from "@/lib/resend"

export async function GET(req: Request) {
  // Este endpoint lo llama Vercel Cron cada día a las 10:00
  const authHeader = req.headers.get("authorization")
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { global: { fetch: (url, options = {}) => fetch(url, { ...options, cache: "no-store" }) } }
  )

  const today = new Date()
  const targetDate = new Date(today)
  targetDate.setDate(today.getDate() + 2)
  const targetStr = targetDate.toISOString().split("T")[0]

  const { data: bookings } = await supabase
    .from("bookings")
    .select(`
      *,
      cabins(name),
      tenants(business_name, owner_whatsapp)
    `)
    .eq("check_in", targetStr)
    .eq("status", "confirmed")

  if (!bookings || bookings.length === 0) {
    return NextResponse.json({ sent: 0 })
  }

  let sent = 0
  for (const booking of bookings) {
    const t = booking.tenants
    const nights = Math.round(
      (new Date(booking.check_out).getTime() - new Date(booking.check_in).getTime()) / 86400000
    )
    const formatDate = (d: string) =>
      new Date(d + "T12:00:00").toLocaleDateString("es-CL", {
        weekday: "long", year: "numeric", month: "long", day: "numeric"
      })

    await resend.emails.send({
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
      })
    })
    sent++
  }

  return NextResponse.json({ sent })
}