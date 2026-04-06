import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { getResend, emailReservaConfirmada } from "@/lib/resend"

export async function POST(req: Request) {
  try {
    const { booking_id } = await req.json()
    if (!booking_id) return NextResponse.json({ error: "booking_id requerido" }, { status: 400 })

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { global: { fetch: (url, options = {}) => fetch(url, { ...options, cache: "no-store" }) } }
    )

    const { data: booking, error } = await supabase
      .from("bookings")
      .select(`
        *,
        cabins(name),
        tenants(
          business_name, owner_name, email_owner, owner_whatsapp,
          deposit_percent, has_tinaja,
          bank_name, bank_account_type, bank_account_number,
          bank_account_holder, bank_rut
        )
      `)
      .eq("id", booking_id)
      .single()

    if (error || !booking) return NextResponse.json({ error: "Reserva no encontrada" }, { status: 404 })
    if (!booking.guest_email) return NextResponse.json({ success: true, skipped: "no guest_email" })

    const t = booking.tenants
    const nights = Math.round(
      (new Date(booking.check_out).getTime() - new Date(booking.check_in).getTime()) / 86400000
    )
    const depositAmount = Math.round(booking.total_amount * (t.deposit_percent / 100))

    const formatDate = (d: string) =>
      new Date(d + "T12:00:00").toLocaleDateString("es-CL", {
        weekday: "long", year: "numeric", month: "long", day: "numeric"
      })

    await getResend().emails.send({
      from: `${t.business_name} <reservas@takai.cl>`,
      to: booking.guest_email,
      subject: `✓ Reserva confirmada — ${booking.booking_code} | ${t.business_name}`,
      html: emailReservaConfirmada({
        business_name: t.business_name,
        guest_name: booking.guest_name,
        cabin_name: booking.cabins?.name || "Cabaña",
        check_in: formatDate(booking.check_in),
        check_out: formatDate(booking.check_out),
        nights,
        total_amount: booking.total_amount,
        deposit_amount: depositAmount,
        booking_code: booking.booking_code,
        bank_name: t.bank_name || "Por confirmar",
        bank_account_type: t.bank_account_type || "Por confirmar",
        bank_account_number: t.bank_account_number || "Por confirmar",
        bank_account_holder: t.bank_account_holder || "Por confirmar",
        bank_rut: t.bank_rut || "Por confirmar",
        owner_whatsapp: t.owner_whatsapp || "",
      })
    })

    return NextResponse.json({ success: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}