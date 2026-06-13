import { NextResponse } from "next/server"
import { getSupabaseAdmin } from "@/lib/supabase-server"
import { logAudit } from "@/lib/audit"
import crypto from "crypto"

export async function POST(req: Request) {
  const supabase = getSupabaseAdmin()
  try {
    const body = await req.json()
    const { token, cabin_id, id } = body

    if (!token) {
      return NextResponse.json({ success: false, message: "No autorizado" }, { status: 401 })
    }
    if (!cabin_id || !id) {
      return NextResponse.json({ success: false, message: "cabin_id e id son requeridos" }, { status: 400 })
    }

    // Derivar tenant_id desde el token
    const tokenHash = crypto.createHash("sha256").update(token, "utf8").digest("hex")
    const { data: link } = await supabase
      .from("dashboard_links")
      .select("tenant_id")
      .eq("token_hash", tokenHash)
      .eq("active", true)
      .maybeSingle()
    if (!link) return NextResponse.json({ success: false, message: "No autorizado" }, { status: 401 })
    const tenant_id = link.tenant_id

    const { data: block } = await supabase
      .from("calendar_blocks")
      .select("booking_id, start_date, end_date, reason, tenant_id")
      .eq("id", id)
      .eq("cabin_id", cabin_id)
      .eq("tenant_id", tenant_id)
      .maybeSingle()

    let error
    if (block?.booking_id) {
      // Eliminar TODOS los bloques del mismo booking
      const result = await supabase
        .from("calendar_blocks")
        .delete()
        .eq("booking_id", block.booking_id)
        .eq("cabin_id", cabin_id)
        .eq("tenant_id", tenant_id)
      error = result.error

      if (!error) {
        // Cancelar (soft-delete) la reserva para evitar reservas confirmadas huérfanas
        // Esto permite que las fechas queden libres para nuevas reservas
        await supabase
          .from("bookings")
          .update({ deleted_at: new Date().toISOString(), deleted_by: "calendar_panel" })
          .eq("id", block.booking_id)
          .eq("tenant_id", tenant_id)
          .is("deleted_at", null)
      }
    } else {
      // Bloque manual suelto: borrar solo ese
      const result = await supabase
        .from("calendar_blocks")
        .delete()
        .eq("id", id)
        .eq("cabin_id", cabin_id)
        .eq("tenant_id", tenant_id)
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
