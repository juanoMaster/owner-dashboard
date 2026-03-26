import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { cabin_id, id } = body

    if (!cabin_id || !id) {
      return NextResponse.json({ success: false, message: "cabin_id e id son requeridos" }, { status: 400 })
    }

    // Buscar el bloque para ver si tiene booking_id asociado
    const { data: block } = await supabase
      .from("calendar_blocks")
      .select("booking_id")
      .eq("id", id)
      .eq("cabin_id", cabin_id)
      .maybeSingle()

    let error
    if (block?.booking_id) {
      // Eliminar TODOS los bloques del mismo booking (rangos con múltiples registros)
      const result = await supabase
        .from("calendar_blocks")
        .delete()
        .eq("booking_id", block.booking_id)
        .eq("cabin_id", cabin_id)
      error = result.error
    } else {
      // Bloque manual suelto: borrar solo ese
      const result = await supabase
        .from("calendar_blocks")
        .delete()
        .eq("id", id)
        .eq("cabin_id", cabin_id)
      error = result.error
    }

    if (error) return NextResponse.json({ success: false, message: error.message }, { status: 500 })

    return NextResponse.json({ success: true })
  } catch (err: any) {
    return NextResponse.json({
      success: false,
      message: err instanceof Error ? err.message : "Error interno del servidor",
    }, { status: 500 })
  }
}
