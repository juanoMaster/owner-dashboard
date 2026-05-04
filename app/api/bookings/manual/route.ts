import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { logAudit } from "@/lib/audit"
import { sendErrorAlert } from "@/lib/resend"
import { generateBookingCode } from "@/lib/booking-code"

function getPriceForGuests(
  tiers: Array<{ min_guests: number; max_guests: number; price_per_night: number }> | null | undefined,
  guests: number,
  basePriceNight: number
): number {
  if (!tiers || tiers.length === 0) return basePriceNight
  const tier = tiers.find(t => guests >= t.min_guests && guests <= t.max_guests)
  return tier ? tier.price_per_night : basePriceNight
}

export async function POST(req: Request) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { global: { fetch: (url, options = {}) => fetch(url, { ...options, cache: "no-store" }) } }
  )
  try {
    const body = await req.json()
    const { tenant_id, cabin_id, check_in, check_out, guest_name, guest_whatsapp, guests, tinaja_days, notes } = body
    if (!tenant_id || !cabin_id || !check_in || !check_out || !guest_name || !guest_whatsapp || !guests) {
      return NextResponse.json({ success: false, message: "Faltan campos obligatorios" }, { status: 400 })
    }

    const { data: cabin, error: cabinError } = await supabase
      .from("cabins")
      .select("base_price_night, name, capacity, extra_person_price, pricing_tiers, has_tinaja, tinaja_price")
      .eq("id", cabin_id)
      .eq("tenant_id", tenant_id)
      .single()

    if (cabinError || !cabin) {
      return NextResponse.json({ success: false, message: "Cabaña no encontrada" }, { status: 404 })
    }

    const nights = Math.round(
      (new Date(check_out + "T12:00:00").getTime() - new Date(check_in + "T12:00:00").getTime()) / 86400000
    )
    if (nights < 1) {
      return NextResponse.json({ success: false, message: "Las fechas no son válidas" }, { status: 400 })
    }
    const todayStr = new Date().toISOString().split("T")[0]
    if (check_in < todayStr) {
      return NextResponse.json({ success: false, message: "No se pueden crear reservas en fechas pasadas" }, { status: 400 })
    }

    // Verificar que no exista reserva confirmada para esas fechas
    const { data: existingConfirmed } = await supabase
      .from("bookings")
      .select("id, check_in, check_out")
      .eq("cabin_id", cabin_id)
      .eq("tenant_id", tenant_id)
      .eq("status", "confirmed")
      .is("deleted_at", null)
      .lt("check_in", check_out)
      .gt("check_out", check_in)

    if (existingConfirmed && existingConfirmed.length > 0) {
      const c = existingConfirmed[0]
      return NextResponse.json({
        success: false,
        message: "Las fechas ya están confirmadas para otra reserva (" + c.check_in + " al " + c.check_out + ")"
      }, { status: 409 })
    }

    const { data: tenantConfig } = await supabase
      .from("tenants")
      .select("deposit_percent, slug")
      .eq("id", tenant_id)
      .single()

    const tinajaPrice = Number(cabin.tinaja_price) || 30000
    const depositPercent = Number(tenantConfig?.deposit_percent) || 20
    const tenantSlug = tenantConfig?.slug || "rsv"

    const guestCount = parseInt(guests)
    const tinajaCount = parseInt(tinaja_days) || 0
    const resolvedPricePerNight = getPriceForGuests(cabin.pricing_tiers, guestCount, cabin.base_price_night)
    const hasTierMatch = (cabin.pricing_tiers || []).some((t: any) => guestCount >= t.min_guests && guestCount <= t.max_guests)
    const extraGuests = Math.max(0, guestCount - cabin.capacity)
    const extraPersonPrice = Number(cabin.extra_person_price) || 0
    const subtotal = resolvedPricePerNight * nights
    const extras = hasTierMatch ? 0 : extraGuests * extraPersonPrice * nights
    const tinajaTotal = tinajaCount * tinajaPrice
    const total = subtotal + extras + tinajaTotal
    const deposit = Math.round(total * depositPercent / 100)
    const balance = total - deposit
    const bookingCode = generateBookingCode(tenantSlug)

    const notesData = JSON.stringify({
      nombre: guest_name,
      whatsapp: guest_whatsapp,
      codigo: bookingCode,
      notas: notes || "",
      origen: "manual",
      tinaja: String(tinajaCount),
      price_per_night: resolvedPricePerNight
    })

    const { data: booking, error: bookingError } = await supabase
      .from("bookings")
      .insert([{
        tenant_id, cabin_id, check_in, check_out,
        guests: guestCount, nights,
        subtotal_amount: subtotal, total_amount: total,
        deposit_percent: depositPercent, deposit_amount: deposit, balance_amount: balance,
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
      return NextResponse.json({ success: false, message: "Las fechas no están disponibles" }, { status: 409 })
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
    await sendErrorAlert({ route: "POST /api/bookings/manual", error: err.message })
    return NextResponse.json({ success: false, message: err.message || "Error interno" }, { status: 500 })
  }
}
