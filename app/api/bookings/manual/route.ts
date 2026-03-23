import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

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
    const {
      tenant_id,
      cabin_id,
      check_in,
      check_out,
      guest_name,
      guest_whatsapp,
      guests,
      tinaja_days,
      notes
    } = body

    if (!tenant_id || !cabin_id || !check_in || !check_out || !guest_name || !guest_whatsapp || !guests) {
      return NextResponse.json(
        { success: false, message: "Faltan campos obligatorios" },
        { status: 400 }
      )
    }

    const { data: cabin, error: cabinError } = await supabase
      .from("cabins")
      .select("base_price_night, name, capacity")
      .eq("id", cabin_id)
      .eq("tenant_id", tenant_id)
      .single()

    if (cabinError || !cabin) {
      return NextResponse.json(
        { success: false, message: "Cabaña no encontrada" },
        { status: 404 }
      )
    }

    const startDate = new Date(check_in + "T12:00:00")
    const endDate = new Date(check_out + "T12:00:00")
    const nights = Math.round((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))

    if (nights < 1) {
      return NextResponse.json(
        { success: false, message: "Las fechas no son válidas" },
        { status: 400 }
      )
    }

    const guestCount = parseInt(guests)
    const tinajaCount = parseInt(tinaja_days) || 0
    const baseCapacity = cabin.capacity - 2
    const extraGuests = Math.max(0, guestCount - baseCapacity)
    const extraGuestCost = extraGuests * 5000 * nights
    const subtotal = cabin.base_price_night * nights
    const tinajaTotal = tinajaCount * 30000
    const total = subtotal + extraGuestCost + tinajaTotal
    const deposit = Math.round(total * 0.2)
    const balance = total - deposit
    const bookingCode = generateBookingCode()

    const notesData = JSON.stringify({
      nombre: guest_name,
      whatsapp: guest_whatsapp,
      codigo: bookingCode,
      notas: notes || "",
      origen: "manual"
    })

    const { data: booking, error: bookingError } = await supabase
      .from("bookings")
      .insert([{
        tenant_id,
        cabin_id,
        check_in,
        check_out,
        guests: guestCount,
        nights,
        subtotal_amount: subtotal,
        total_amount: total,
        deposit_percent: 20,
        deposit_amount: deposit,
        balance_amount: balance,
        status: "confirmed",
        notes: notesData,
        commission_percent: 0,
        commission_amount: 0,
        commission_status: "not_applicable"
      }])
      .select("id")
      .single()

    if (bookingError || !booking) {
      return NextResponse.json(
        { success: false, message: bookingError?.message || "Error al guardar la reserva" },
        { status: 500 }
      )
    }

    const { error: blockError } = await supabase
      .from("calendar_blocks")
      .insert([{
        tenant_id,
        cabin_id,
        start_date: check_in,
        end_date: check_out,
        reason: "manual",
        booking_id: booking.id
      }])

    if (blockError) {
      await supabase.from("bookings").delete().eq("id", booking.id)
      return NextResponse.json(
        { success: false, message: "Las fechas no están disponibles o se superponen con otra reserva" },
        { status: 409 }
      )
    }

    return NextResponse.json({
      success: true,
      booking_code: bookingCode,
      total,
      deposit,
      nights
    })

  } catch (err: any) {
    return NextResponse.json(
      { success: false, message: err.message || "Error interno del servidor" },
      { status: 500 }
    )
  }
}