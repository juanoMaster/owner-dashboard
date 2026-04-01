import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { logAudit } from "@/lib/audit"

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

function generateBookingCode(): string {
  const letters = "ABCDEFGHJKLMNPQRSTUVWXYZ"
  const part1 = Array.from({ length: 3 }, () =>
    letters[Math.floor(Math.random() * letters.length)]
  ).join("")
  const part2 = Math.floor(1000 + Math.random() * 9000).toString()
  return "RKT-" + part1 + "-" + part2
}

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { cabin_id, check_in, check_out, guests, tinaja_days, notes } = body
    const guest_name = body.guest_name || body.nombre || ""
    const guest_whatsapp = body.guest_whatsapp || body.whatsapp || ""

    if (!cabin_id || !check_in || !check_out || !guest_name || !guest_whatsapp || !guests) {
      return NextResponse.json({ success: false, message: "Faltan campos obligatorios" }, { status: 400 })
    }

    const { data: cabin, error: cabinError } = await supabase
      .from("cabins")
      .select("base_price_night, name, capacity, tenant_id")
      .eq("id", cabin_id)
      .single()

    if (cabinError || !cabin) {
      return NextResponse.json({ success: false, message: "Cabana no encontrada" }, { status: 404 })
    }

    const tenant_id = cabin.tenant_id

    const nights = Math.round(
      (new Date(check_out + "T12:00:00").getTime() - new Date(check_in + "T12:00:00").getTime()) / 86400000
    )

    if (nights < 1) {
      return NextResponse.json({ success: false, message: "Las fechas no son validas" }, { status: 400 })
    }

    const guestCount = parseInt(guests)
    const tinajaCount = parseInt(tinaja_days) || 0
    const extraGuests = Math.max(0, guestCount - (cabin.capacity - 2))
    const subtotal = cabin.base_price_night * nights
    const extras = extraGuests * 5000 * nights
    const tinajaTotal = tinajaCount * 30000
    const total = subtotal + extras + tinajaTotal
    const deposit = Math.round(total * 0.2)
    const balance = total - deposit
    const bookingCode = generateBookingCode()

    const notesData = JSON.stringify({
      nombre: guest_name,
      whatsapp: guest_whatsapp,
      codigo: bookingCode,
      notas: notes || "",
      origen: "web",
      tinaja: String(tinajaCount)
    })

    const { data: booking, error: bookingError } = await supabase
      .from("bookings")
      .insert([{
        tenant_id, cabin_id, check_in, check_out,
        guests: guestCount, nights,
        subtotal_amount: subtotal, total_amount: total,
        deposit_percent: 20, deposit_amount: deposit, balance_amount: balance,
        status: "draft",
        notes: notesData,
        commission_percent: 0, commission_amount: 0, commission_status: "not_applicable"
      }])
      .select("id")
      .single()

    if (bookingError || !booking) {
      return NextResponse.json({ success: false, message: bookingError?.message || "Error al guardar" }, { status: 500 })
    }

    const { error: blockError } = await supabase
      .from("calendar_blocks")
      .insert([{
        tenant_id, cabin_id,
        start_date: check_in, end_date: check_out,
        reason: "transfer_pending", booking_id: booking.id
      }])

    if (blockError) {
      await supabase.from("bookings").delete().eq("id", booking.id)
      return NextResponse.json({ success: false, message: "Las fechas no estan disponibles" }, { status: 409 })
    }

    await logAudit({
      tenant_id,
      cabin_id,
      action: "booking_created",
      entity_type: "booking",
      entity_id: booking.id,
      details: { check_in, check_out, nights, total_amount: total, deposit_amount: deposit, origen: "formulario_turista", guest_name, booking_code: bookingCode },
      performed_by: "formulario_turista",
    })
    // Notificación por email
    const resendKey = process.env.RESEND_API_KEY
    if (resendKey) {
      try {
        await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            "Authorization": "Bearer " + resendKey,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: "Takai.cl <onboarding@resend.dev>",
            to: ["contacto@takai.cl"],
            subject: "🏕️ Nueva reserva — " + bookingCode,
            html:
              "<div style='font-family:sans-serif;max-width:560px;margin:0 auto;padding:24px;background:#f9f9f9;border-radius:12px'>" +
              "<div style='background:#27ae60;padding:16px 24px;border-radius:8px 8px 0 0'>" +
              "<h2 style='margin:0;color:white;font-size:18px'>Nueva reserva recibida</h2>" +
              "</div>" +
              "<div style='background:white;padding:24px;border-radius:0 0 8px 8px'>" +
              "<table style='width:100%;border-collapse:collapse'>" +
              "<tr><td style='padding:10px 0;color:#555;font-size:14px;width:140px;border-bottom:1px solid #eee'>Código</td><td style='padding:10px 0;color:#111;font-size:14px;font-weight:700;border-bottom:1px solid #eee'>" + bookingCode + "</td></tr>" +
              "<tr><td style='padding:10px 0;color:#555;font-size:14px;border-bottom:1px solid #eee'>Huésped</td><td style='padding:10px 0;color:#111;font-size:14px;border-bottom:1px solid #eee'>" + guest_name + "</td></tr>" +
              "<tr><td style='padding:10px 0;color:#555;font-size:14px;border-bottom:1px solid #eee'>WhatsApp</td><td style='padding:10px 0;color:#111;font-size:14px;border-bottom:1px solid #eee'>" + guest_whatsapp + "</td></tr>" +
              "<tr><td style='padding:10px 0;color:#555;font-size:14px;border-bottom:1px solid #eee'>Cabaña</td><td style='padding:10px 0;color:#111;font-size:14px;border-bottom:1px solid #eee'>" + cabin.name + "</td></tr>" +
              "<tr><td style='padding:10px 0;color:#555;font-size:14px;border-bottom:1px solid #eee'>Check-in</td><td style='padding:10px 0;color:#111;font-size:14px;border-bottom:1px solid #eee'>" + check_in + "</td></tr>" +
              "<tr><td style='padding:10px 0;color:#555;font-size:14px;border-bottom:1px solid #eee'>Check-out</td><td style='padding:10px 0;color:#111;font-size:14px;border-bottom:1px solid #eee'>" + check_out + "</td></tr>" +
              "<tr><td style='padding:10px 0;color:#555;font-size:14px;border-bottom:1px solid #eee'>Noches</td><td style='padding:10px 0;color:#111;font-size:14px;border-bottom:1px solid #eee'>" + nights + "</td></tr>" +
              "<tr><td style='padding:10px 0;color:#555;font-size:14px;border-bottom:1px solid #eee'>Personas</td><td style='padding:10px 0;color:#111;font-size:14px;border-bottom:1px solid #eee'>" + guests + "</td></tr>" +
              "<tr><td style='padding:10px 0;color:#555;font-size:14px;border-bottom:1px solid #eee'>Total</td><td style='padding:10px 0;color:#111;font-size:16px;font-weight:700;border-bottom:1px solid #eee'>$" + total.toLocaleString("es-CL") + "</td></tr>" +
              "<tr><td style='padding:10px 0;color:#e67e22;font-size:14px'>Adelanto 20%</td><td style='padding:10px 0;color:#e67e22;font-size:16px;font-weight:700'>$" + deposit.toLocaleString("es-CL") + "</td></tr>" +
              "</table>" +
              "<div style='margin-top:20px;padding:14px;background:#fff3cd;border-radius:8px;font-size:13px;color:#856404'>" +
              "💬 Contactar huésped por WhatsApp: <a href='https://wa.me/" + guest_whatsapp.replace(/[^0-9]/g, "") + "' style='color:#856404'>" + guest_whatsapp + "</a>" +
              "</div>" +
              "</div>" +
              "</div>",
          }),
        })
      } catch (e) {
        // fallo silencioso
      }
    }

    return NextResponse.json({ success: true, booking_code: bookingCode, total, deposit, nights })
