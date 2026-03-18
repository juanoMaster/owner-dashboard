import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { logAudit } from "@/lib/audit"

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const TENANT_ID = "11518e5f-6a0b-4bdc-bb6a-a1e142544579"

function generarCodigo() {
  const letras = "ABCDEFGHJKLMNPQRSTUVWXYZ"
  const nums = "0123456789"
  const l = Array.from({ length: 3 }, () => letras[Math.floor(Math.random() * letras.length)]).join("")
  const n = Array.from({ length: 4 }, () => nums[Math.floor(Math.random() * nums.length)]).join("")
  return "RKT-" + l + "-" + n
}

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { cabin_id, check_in, check_out, nombre, whatsapp, email, metodo_pago } = body
    const guests = Number(body.guests) || 1
    const tinaja_days = Number(body.tinaja_days) || 0

    if (!cabin_id || !check_in || !check_out || !nombre || !whatsapp) {
      return NextResponse.json({ error: "Faltan datos requeridos" }, { status: 400 })
    }

    const { data: cabin, error: cabinErr } = await supabase
      .from("cabins")
      .select("base_price_night, capacity")
      .eq("id", cabin_id)
      .single()

    if (cabinErr || !cabin) {
      return NextResponse.json({ error: "Cabana no encontrada" }, { status: 404 })
    }

    const nights = Math.max(0, Math.round((new Date(check_out).getTime() - new Date(check_in).getTime()) / 86400000))
    if (nights < 2) {
      return NextResponse.json({ error: "Estadia minima 2 noches" }, { status: 400 })
    }

    const precioNoche = Number(cabin.base_price_night)
    const capacidad = Number(cabin.capacity)
    const extrasPersonas = Math.max(0, guests - capacidad) * 5000 * nights
    const subtotal = precioNoche * nights + extrasPersonas
    const tinaja = tinaja_days * 30000
    const total = subtotal + tinaja
    const depositAmount = Math.round(total * 0.2)
    const balanceAmount = total - depositAmount

    const { data: bloques } = await supabase
      .from("calendar_blocks")
      .select("id")
      .eq("cabin_id", cabin_id)
      .eq("tenant_id", TENANT_ID)
      .lt("start_date", check_out)
      .gt("end_date", check_in)

    if (bloques && bloques.length > 0) {
      return NextResponse.json({ error: "Fechas no disponibles" }, { status: 409 })
    }

    const codigo = generarCodigo()

    const { data: booking, error: bookingError } = await supabase
      .from("bookings")
      .insert([{
        tenant_id: TENANT_ID,
        cabin_id,
        check_in,
        check_out,
        guests,
        nights,
        subtotal_amount: subtotal,
        total_amount: total,
        deposit_percent: 20,
        deposit_amount: depositAmount,
        balance_amount: balanceAmount,
        commission_percent: 10,
        commission_amount: Math.round(total * 0.1),
        commission_status: "pending",
        status: "draft",
        notes: "Nombre: " + nombre + " | WhatsApp: " + whatsapp + " | Email: " + (email || "") + " | Tinaja: " + tinaja_days + " dias | Codigo: " + codigo
      }])
      .select("id")
      .single()

    if (bookingError) throw bookingError

    const { error: bloqueError } = await supabase
      .from("calendar_blocks")
      .insert([{
        tenant_id: TENANT_ID,
        cabin_id,
        start_date: check_in,
        end_date: check_out,
        reason: metodo_pago === "tarjeta" ? "system_booking" : "transfer_pending",
        booking_id: booking.id
      }])

    if (bloqueError) throw bloqueError

    await logAudit({
      tenant_id: TENANT_ID,
      cabin_id,
      action: "booking_created",
      entity_type: "booking",
      entity_id: booking.id,
      details: { codigo, check_in, check_out, nights, guests, tinaja_days, tinaja_amount: tinaja, total_amount: total, deposit_amount: depositAmount, metodo_pago: metodo_pago || "transferencia", nombre, whatsapp }
    })

    return NextResponse.json({ success: true, codigo, booking_id: booking.id })

  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}