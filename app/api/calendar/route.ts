import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(req: Request) {

  const { searchParams } = new URL(req.url)
  const cabin_id = searchParams.get("cabin_id")

  if (!cabin_id) {
    return NextResponse.json({ error: "cabin_id requerido" }, { status: 400 })
  }

  const { data: bookings } = await supabase
    .from("bookings")
    .select("check_in, check_out")
    .eq("cabin_id", cabin_id)

  const { data: blocks } = await supabase
    .from("calendar_blocks")
    .select("start_date, end_date")
    .eq("cabin_id", cabin_id)

  const events:any[] = []

  if (bookings) {
    for (const b of bookings) {
      events.push({
        start: b.check_in,
        end: b.check_out,
        type: "booking"
      })
    }
  }

  if (blocks) {
    for (const b of blocks) {
      events.push({
        start: b.start_date,
        end: b.end_date,
        type: "block"
      })
    }
  }

  return NextResponse.json({ events })
}

export async function POST(req: Request) {

  try {

    const body = await req.json()

    const cabin_id = body.cabin_id
    const date = body.date

    if (!cabin_id || !date) {
      return NextResponse.json({ error: "datos incompletos" }, { status: 400 })
    }

    // Verificar si existe una reserva ese día
    const { data: existingBooking } = await supabase
      .from("bookings")
      .select("id")
      .eq("cabin_id", cabin_id)
      .lte("check_in", date)
      .gte("check_out", date)
      .maybeSingle()

    if (existingBooking) {
      return NextResponse.json(
        { error: "Ese día tiene una reserva existente" },
        { status: 400 }
      )
    }

    // Insertar bloqueo
    const { error } = await supabase
      .from("calendar_blocks")
      .insert({
        tenant_id: "11518e5f-6a0b-4bdc-bb6a-a1b9c3d1e2f4",
        cabin_id: cabin_id,
        start_date: date,
        end_date: date,
        reason: "bloqueo_manual"
      })

    if (error) {
      console.error(error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })

  } catch (err) {

    console.error(err)

    return NextResponse.json(
      { error: "error interno servidor" },
      { status: 500 }
    )

  }
}