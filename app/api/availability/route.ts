import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const TENANT_ID = "11518e5f-6a0b-4bdc-bb6a-a1e142544579"

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const cabin_id = searchParams.get("cabin_id")
  const check_in = searchParams.get("check_in")
  const check_out = searchParams.get("check_out")
  const visited = (searchParams.get("visited") || "").split(",").filter(Boolean)

  if (!cabin_id || !check_in || !check_out) {
    return NextResponse.json({ available: false, error: "Faltan parámetros" }, { status: 400 })
  }

  // Verificar disponibilidad de la cabaña solicitada
  const { data: bloques } = await supabase
    .from("calendar_blocks")
    .select("id")
    .eq("cabin_id", cabin_id)
    .eq("tenant_id", TENANT_ID)
    .lt("start_date", check_out)
    .gt("end_date", check_in)

  const cabinDisponible = !bloques || bloques.length === 0

  if (cabinDisponible) {
    return NextResponse.json({ available: true })
  }

  // Cabaña no disponible — buscar alternativas
  // Obtener datos de la cabaña solicitada
  const { data: cabinaSolicitada } = await supabase
    .from("cabins")
    .select("capacity, base_price_night")
    .eq("id", cabin_id)
    .single()

  if (!cabinaSolicitada) {
    return NextResponse.json({ available: false, alternative: null })
  }

  // Buscar todas las cabañas del tenant (excepto la actual y las ya visitadas)
  const todasVisitadas = [...visited, cabin_id]
  const { data: todasCabanas } = await supabase
    .from("cabins")
    .select("id, name, capacity, base_price_night")
    .eq("tenant_id", TENANT_ID)
    .eq("active", true)
    .not("id", "in", `(${todasVisitadas.join(",")})`)

  if (!todasCabanas || todasCabanas.length === 0) {
    return NextResponse.json({ available: false, alternative: null, red_takai: true })
  }

  // Primero buscar cabañas con MISMA capacidad y precio (asignación automática)
  const mismaTipo = todasCabanas.filter(
    c => c.capacity === cabinaSolicitada.capacity && c.base_price_night === cabinaSolicitada.base_price_night
  )

  for (const alternativa of mismaTipo) {
    const { data: bloquesAlt } = await supabase
      .from("calendar_blocks")
      .select("id")
      .eq("cabin_id", alternativa.id)
      .eq("tenant_id", TENANT_ID)
      .lt("start_date", check_out)
      .gt("end_date", check_in)

    if (!bloquesAlt || bloquesAlt.length === 0) {
      // Disponible — asignación automática, el turista no se entera
      return NextResponse.json({
        available: false,
        auto_assign: {
          cabin_id: alternativa.id,
          cabin_name: alternativa.name,
        }
      })
    }
  }

  // Si no hay de igual tipo, sugerir cualquier otra disponible (el turista elige)
  for (const alternativa of todasCabanas) {
    const { data: bloquesAlt } = await supabase
      .from("calendar_blocks")
      .select("id")
      .eq("cabin_id", alternativa.id)
      .eq("tenant_id", TENANT_ID)
      .lt("start_date", check_out)
      .gt("end_date", check_in)

    if (!bloquesAlt || bloquesAlt.length === 0) {
      return NextResponse.json({
        available: false,
        suggest: {
          cabin_id: alternativa.id,
          cabin_name: alternativa.name,
          capacity: alternativa.capacity,
          price: alternativa.base_price_night,
        }
      })
    }
  }

  // Todas las cabañas del dueño están ocupadas
  return NextResponse.json({ available: false, alternative: null, red_takai: true })
}