import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

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
  return `RKT-${l}-${n}`
}

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { cabin_id, check_in, check_out, guests, nights, subtotal, total, deposit, tinaja_days, nombre, whatsapp, metodo_pago } = body

    if (!cabin_id || !check_in || !check_out || !nombre || !whatsapp) {
      return NextResponse.json({ error: "Faltan datos requeridos" }, { status: 400 })
    }

    // 1. Verificar disponibilidad
    const { data: bloques } = await supabase
      .from("calendar_blocks")
      .select("id, start_date, end_date")
      .eq("cabin_id", cabin_id)
      .eq("tenant_id", TENANT_ID)
      .lt("start_date", check_out)
      .gt("end_date", check_in)

    if (bloques && bloques.length > 0) {
      return NextResponse.json({ error: "Las fechas seleccionadas no están disponibles" }, { status: 409 })
    }

    // 2. Generar código único
    const codigo = generarCodigo()

    // 3. Guardar reserva en bookings
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
        deposit_amount: Math.round(total * 0.2),
        balance_amount: total - Math.round(total * 0.2),
        commission_percent: 10,
        commission_amount: Math.round(total * 0.1),
        commission_status: "pending",
        status: "draft",
        notes: `Nombre: ${nombre} | WhatsApp: ${whatsapp} | Tinaja: ${tinaja_days} días | Código: ${codigo}`
      }])
      .select("id")
      .single()

    if (bookingError) throw bookingError

    // 4. Bloquear fechas en calendario
    const { error: bloqueError } = await supabase
      .from("calendar_blocks")
      .insert([{
        tenant_id: TENANT_ID,
        cabin_id,
        start_date: check_in,
        end_date: check_out,
        reason: metodo_pago === "tarjeta" ? "system_booking" : "transfer_pending"
      }])

    if (bloqueError) throw bloqueError

    return NextResponse.json({ success: true, codigo, booking_id: booking.id })

  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}