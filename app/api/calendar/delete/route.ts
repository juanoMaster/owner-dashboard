import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { logAudit } from "@/lib/audit"

export async function POST(req: Request) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
  try {
    const body = await req.json()
    const { cabin_id, id } = body

    if (!cabin_id || !id) {
      return NextResponse.json({ success: false, message: "cabin_id e id son requeridos" }, { status: 400 })
    }

    const { data: block } = await supabase
      .from("calendar_blocks")
      .select("booking_id, start_date, end_date, reason, tenant_id")
      .eq("id", id)
      .eq("cabin_id", cabin_id)
      .maybeSingle()

    const tenant_id = block?.tenant_id || null

    let error
    if (block?.booking_id) {
      // Eliminar TODOS los bloques del mismo booking
      const result = await supabase
        .from("calendar_blocks")
        .delete()
        .eq("booking_id", block.booking_id)
        .eq("cabin_id", cabin_id)
      error = result.error

      if (!error) {
        // Cancelar (soft-delete) la reserva para evitar reservas confirmadas huérfanas
        // Esto permite que las fechas queden libres para nuevas reservas
        await supabase
          .from("bookings")
          .update({ deleted_at: new Date().toISOString(), deleted_by: "calendar_panel" })
          .eq("id", block.booking_id)
          .is("deleted_at", null)
      }
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

    if (tenant_id) {
      await logAudit({
        tenant_id, cabin_id,
        action: block?.booking_id ? "booking_blocks_released" : "block_deleted",
        entity_type: block?.booking_id ? "booking" : "calendar_block",
        entity_id: block?.booking_id || id,
        details: { start_date: block?.start_date, end_date: block?.end_date, reason: block?.reason },
        performed_by: "calendar_panel",
      })
    }

    return NextResponse.json({ success: true })
  } catch (err: any) {
    return NextResponse.json({
      success: false,
      message: err instanceof Error ? err.message : "Error interno del servidor",
    }, { status: 500 })
  }
}
