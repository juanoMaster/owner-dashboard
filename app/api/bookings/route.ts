import { sendErrorAlert } from "@/lib/resend"
import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { logAudit } from "@/lib/audit"

function getPriceForGuests(
  tiers: Array<{ min_guests: number; max_guests: number; price_per_night: number }> | null | undefined,
  guests: number,
  basePriceNight: number
): number {
  if (!tiers || tiers.length === 0) return basePriceNight
  const tier = tiers.find(t => guests >= t.min_guests && guests <= t.max_guests)
  return tier ? tier.price_per_night : basePriceNight
}

function generateBookingCode(): string {
  const letters = "ABCDEFGHJKLMNPQRSTUVWXYZ"
  const part1 = Array.from({ length: 3 }, () =>
    letters[Math.floor(Math.random() * letters.length)]
  ).join("")
  const part2 = Math.floor(1000 + Math.random() * 9000).toString()
  return "RKT-" + part1 + "-" + part2
}

export async function POST(req: Request) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { global: { fetch: (url, options = {}) => fetch(url, { ...options, cache: "no-store" }) } }
  )

  let cabin_id: string | undefined
  let check_in: string | undefined
  let check_out: string | undefined
  try {
    const body = await req.json()
    ;({ cabin_id, check_in, check_out } = body)
    const { guests, tinaja_days, notes } = body
    const guest_name = body.guest_name || body.nombre || ""
    const guest_email = body.guest_email || body.email || ""
    const guest_phone = body.guest_phone || body.guest_whatsapp || body.whatsapp || ""

    if (!cabin_id || !check_in || !check_out || !guest_name || !guest_phone || !guests) {
      return NextResponse.json({ success: false, message: "Faltan campos obligatorios" }, { status: 400 })
    }

    const { data: cabin, error: cabinError } = await supabase
      .from("cabins")
      .select("base_price_night, name, capacity, tenant_id, extra_person_price, pricing_tiers")
      .eq("id", cabin_id)
      .single()

    if (cabinError || !cabin) {
      return NextResponse.json({ success: false, message: "Cabaña no encontrada" }, { status: 404 })
    }

    const tenant_id = cabin.tenant_id

    const { data: tenantConfig } = await supabase
      .from("tenants")
      .select("tinaja_price, deposit_percent")
      .eq("id", tenant_id)
      .single()

    const tinajaPrice = Number(tenantConfig?.tinaja_price) || 30000
    const depositPercent = Number(tenantConfig?.deposit_percent) || 20

    const nights = Math.round(
      (new Date(check_out + "T12:00:00").getTime() - new Date(check_in + "T12:00:00").getTime()) / 86400000
    )

    const todayStr = new Date().toISOString().split("T")[0]
    if (check_in < todayStr) {
      return NextResponse.json({ success: false, message: "No se pueden hacer reservas en fechas pasadas" }, { status: 400 })
    }
    if (nights < 1) {
      return NextResponse.json({ success: false, message: "Las fechas no son válidas" }, { status: 400 })
    }

    const guestCount = parseInt(guests)
    const tinajaCount = parseInt(tinaja_days) || 0
    const extraGuests = Math.max(0, guestCount - cabin.capacity)
    const extraPersonPrice = Number(cabin.extra_person_price) || 0
    const resolvedPricePerNight = getPriceForGuests(cabin.pricing_tiers, guestCount, cabin.base_price_night)
    const subtotal = resolvedPricePerNight * nights
    const extras = extraGuests * extraPersonPrice * nights
    const tinajaTotal = tinajaCount * tinajaPrice
    const total = subtotal + extras + tinajaTotal
    const deposit = Math.round(total * depositPercent / 100)
    const balance = total - deposit
    const bookingCode = generateBookingCode()

    const notesData = JSON.stringify({
      nombre: guest_name,
      whatsapp: guest_phone,
      codigo: bookingCode,
      notas: notes || "",
      origen: "web",
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
        status: "draft",
        notes: notesData,
        booking_code: bookingCode,
        guest_name,
        guest_email,
        guest_phone,
        tinaja_amount: tinajaTotal,
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
      return NextResponse.json({ success: false, message: "Las fechas no están disponibles" }, { status: 409 })
    }

    // Detección de race condition: verificar que no haya otro bloque concurrente
    // para las mismas fechas (otra reserva que pasó el chequeo de disponibilidad
    // en paralelo). Solución definitiva: ejecutar supabase/migrations/001_create_booking_atomic.sql
    const { data: concurrent } = await supabase
      .from("calendar_blocks")
      .select("id")
      .eq("cabin_id", cabin_id)
      .eq("tenant_id", tenant_id)
      .lt("start_date", check_out)
      .gt("end_date", check_in)
      .not("booking_id", "is", null)
      .neq("booking_id", booking.id)

    if (concurrent && concurrent.length > 0) {
      await supabase.from("calendar_blocks").delete().eq("booking_id", booking.id)
      await supabase.from("bookings").delete().eq("id", booking.id)
      return NextResponse.json({ success: false, message: "Las fechas ya no están disponibles" }, { status: 409 })
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

    // Email automático via nuevo sistema
    if (guest_email) {
      try {
        await fetch(`${process.env.NEXT_PUBLIC_APP_URL || "https://panel.takai.cl"}/api/emails/nueva-reserva`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ booking_id: booking.id })
        })
      } catch (e) {
        // fallo silencioso — la reserva ya quedó guardada
      }
    }

    return NextResponse.json({ success: true, booking_id: booking.id, booking_code: bookingCode, total, deposit, nights })
  } catch (err: any) {
    await sendErrorAlert({ route: "POST /api/bookings", error: err.message, details: { cabin_id, check_in, check_out } })
    return NextResponse.json({ success: false, message: err.message || "Error interno" }, { status: 500 })
  }
}