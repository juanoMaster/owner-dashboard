import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { logAudit } from "@/lib/audit"

function generateBookingCode(): string {
  const letters = "ABCDEFGHJKLMNPQRSTUVWXYZ"
  const part1 = Array.from({ length: 3 }, () => letters[Math.floor(Math.random() * letters.length)]).join("")
  const part2 = Math.floor(1000 + Math.random() * 9000).toString()
  return "RKT-" + part1 + "-" + part2
}

export async function POST(req: Request) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
  try {
    const body = await req.json()
    const { tenant_id, cabin_id, check_in, check_out, guest_name, guest_whatsapp, guests, tinaja_days, notes } = body
    if (!tenant_id || !cabin_id || !check_in || !check_out || !guest_name || !guest_whatsapp || !guests) {
      return NextResponse.json({ success: false, message: "Faltan campos obligatorios" }, { status: 400 })
    }

    const { data: cabin, error: cabinError } = await supabase
      .from("cabins")
      .select("base_price_night, name, capacity")
      .eq("id", cabin_id)
      .eq("tenant_id", tenant_id)
      .single()

    if (cabinError || !cabin) {
      return NextResponse.json({ success: false, message: "Cabana no encontrada" }, { status: 404 })
    }

    const nights = Math.round((new Date(check_out + "T12:00:00").getTime() - new Date(check_in + "T12:00:00").getTime()) / 86400000)
    if (nights < 1) {
      return NextResponse.json({ success: false, message: "Las fechas no son validas" }, { status: 400 })
    }

    // Verificar que no exista reserva confirmada para esas fechas
    const { data: existingConfirmed } = await supabase
      .from("bookings")
      .select("id, check_in, check_out")
      .eq("cabin_id", cabin_id)
      .eq("tenant_id", tenant_id)
      .eq("status", "confirmed")
      .lt("check_in", check_out)
      .gt("check_out", check_in)

    if (existingConfirmed && existingConfirmed.length > 0) {
      const c = existingConfirmed[0]
      return NextResponse.json({
        success: false,
        message: "Las fechas ya estan confirmadas para otra reserva (" + c.check_in + " al " + c.check_out + ")"
      }, { status: 409 })
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
    const notesData = JSON.stringify({ nombre: guest_name, whatsapp: guest_whatsapp, codigo: bookingCode, notas: notes || "", origen: "manual", tinaja: String(tinajaCount) })

    const { data: booking, error: bookingError } = await supabase
      .from("bookings")
      .insert([{
        tenant_id, cabin_id, check_in, check_out,
        guests: guestCount, nights,
        subtotal_amount: subtotal, total_amount: total,
        deposit_percent: 20, deposit_amount: deposit, balance_amount: balance,
        status: "draft", notes: notesData,
        booking_code: bookingCode,
        guest_name, guest_phone: guest_whatsapp,
        commission_percent: 0, commission_amount: 0, commission_status: "not_applicable"
      }])
      .select("id")
      .single()

    if (bookingError || !booking) {
      return NextResponse.json({ success: false, message: bookingError?.message || "Error al guardar" }, { status: 500 })
    }

    const { error: blockError } = await supabase
      .from("calendar_blocks")
      .insert([{ tenant_id, cabin_id, start_date: check_in, end_date: check_out, reason: "manual", booking_id: booking.id }])

    if (blockError) {
      await supabase.from("bookings").delete().eq("id", booking.id)
      return NextResponse.json({ success: false, message: "Las fechas no estan disponibles" }, { status: 409 })
    }

    await logAudit({
      tenant_id, cabin_id,
      action: "booking_created",
      entity_type: "booking",
      entity_id: booking.id,
      details: { check_in, check_out, nights, total_amount: total, deposit_amount: deposit, origen: "manual", guest_name, booking_code: bookingCode },
      performed_by: "owner_panel",
    })

    return NextResponse.json({ success: true, booking_code: bookingCode, total, deposit, nights })
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message || "Error interno" }, { status: 500 })
  }
}
