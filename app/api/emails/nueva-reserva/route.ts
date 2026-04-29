import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { getResend, emailNuevaReservaTurista, emailNuevaReservaDuena } from "@/lib/resend"

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
        cabins(name, has_tinaja),
        tenants(
          business_name, owner_name, email_owner, owner_whatsapp,
          deposit_percent, slug,
          bank_name, bank_account_type, bank_account_number,
          bank_account_holder, bank_rut, dashboard_token
        )
      `)
      .eq("id", booking_id)
      .single()

    if (error || !booking) return NextResponse.json({ error: "Reserva no encontrada" }, { status: 404 })

    const t = booking.tenants
    const nights = Math.round(
      (new Date(booking.check_out).getTime() - new Date(booking.check_in).getTime()) / 86400000
    )
    const depositAmount = Math.round(booking.total_amount * (t.deposit_percent / 100))
    const dashboardUrl = `https://panel.takai.cl/?token=${t.dashboard_token}`

    const formatDate = (d: string) =>
      new Date(d + "T12:00:00").toLocaleDateString("es-CL", {
        weekday: "long", year: "numeric", month: "long", day: "numeric"
      })

    const commonData = {
      business_name: t.business_name,
      cabin_name: booking.cabins?.name || "Cabaña",
      check_in: formatDate(booking.check_in),
      check_out: formatDate(booking.check_out),
      nights,
      total_amount: booking.total_amount,
      deposit_amount: depositAmount,
      booking_code: booking.booking_code,
      has_tinaja: booking.cabins?.has_tinaja ?? false,
      tinaja_amount: booking.tinaja_amount || 0,
    }

    // Email al turista
    await getResend().emails.send({
      from: `${t.business_name} <reservas@takai.cl>`,
      to: booking.guest_email,
      subject: `Solicitud recibida — ${booking.booking_code} | ${t.business_name}`,
      html: emailNuevaReservaTurista({
        ...commonData,
        owner_name: t.owner_name,
        guest_name: booking.guest_name,
        gender: undefined,
      })
    })

    // Email a la dueña (solo si tiene email configurado)
    if (t.email_owner) {
      await getResend().emails.send({
        from: `Takai.cl <notificaciones@takai.cl>`,
        to: t.email_owner,
        subject: `Nueva reserva — ${booking.booking_code} de ${booking.guest_name}`,
        html: emailNuevaReservaDuena({
          ...commonData,
          owner_name: t.owner_name,
          guest_name: booking.guest_name,
          guest_email: booking.guest_email,
          guest_phone: booking.guest_phone,
          guests_count: booking.guests,
          dashboard_url: dashboardUrl,
        })
      })
    }

    return NextResponse.json({ success: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
