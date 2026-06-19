export const dynamic = "force-dynamic"

import { NextResponse } from "next/server"
import { getSupabaseAdmin } from "@/lib/supabase-server"

// POST /api/reviews — el huésped deja una reseña con su booking_code.
// Entra como status='pending' (moderación). Service role: el turista no tiene token.
export async function POST(req: Request) {
  try {
    const body = await req.json()
    const bookingCode = String(body.booking_code || "").trim().toUpperCase()
    const rating = parseInt(body.rating)
    const comment = String(body.comment || "").trim().slice(0, 1000)

    if (!/^[A-Z0-9-]{4,32}$/.test(bookingCode)) {
      return NextResponse.json({ success: false, message: "Código de reserva inválido" }, { status: 400 })
    }
    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
      return NextResponse.json({ success: false, message: "La calificación debe ser de 1 a 5" }, { status: 400 })
    }

    const supabase = getSupabaseAdmin()

    // El booking debe existir, estar confirmado, no eliminado y con check-out pasado.
    const { data: booking } = await supabase
      .from("bookings")
      .select("id, tenant_id, cabin_id, guest_name, check_out, status, deleted_at")
      .eq("booking_code", bookingCode)
      .is("deleted_at", null)
      .maybeSingle()

    if (!booking) {
      return NextResponse.json({ success: false, message: "Reserva no encontrada" }, { status: 404 })
    }
    if (booking.status !== "confirmed") {
      return NextResponse.json({ success: false, message: "Solo se puede reseñar una reserva confirmada" }, { status: 400 })
    }
    const todayStr = new Date().toISOString().split("T")[0]
    if (booking.check_out > todayStr) {
      return NextResponse.json({ success: false, message: "Podrás reseñar después de tu check-out" }, { status: 400 })
    }

    // ¿Ya existe reseña para este código? (índice único, pero validamos amable)
    const { data: existing } = await supabase
      .from("reviews").select("id").eq("booking_code", bookingCode).maybeSingle()
    if (existing) {
      return NextResponse.json({ success: false, message: "Ya recibimos tu reseña. ¡Gracias!" }, { status: 409 })
    }

    const { error: insErr } = await supabase.from("reviews").insert([{
      tenant_id: booking.tenant_id,
      cabin_id: booking.cabin_id,
      booking_code: bookingCode,
      rating,
      comment: comment || null,
      guest_name: booking.guest_name || null,
      status: "pending",
    }])

    if (insErr) {
      // Violación de índice único → reseña duplicada
      if (insErr.code === "23505") {
        return NextResponse.json({ success: false, message: "Ya recibimos tu reseña. ¡Gracias!" }, { status: 409 })
      }
      return NextResponse.json({ success: false, message: "No se pudo guardar la reseña" }, { status: 500 })
    }

    return NextResponse.json({ success: true, message: "¡Gracias por tu reseña! Será publicada tras revisión." })
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message || "Error" }, { status: 500 })
  }
}

// GET /api/reviews?cabin_id=... — reseñas APROBADAS para mostrar (público).
export async function GET(req: Request) {
  const url = new URL(req.url)
  const cabinId = url.searchParams.get("cabin_id")
  if (!cabinId || !/^[0-9a-f-]{36}$/i.test(cabinId)) {
    return NextResponse.json({ error: "cabin_id inválido" }, { status: 400 })
  }
  const supabase = getSupabaseAdmin()
  const { data } = await supabase
    .from("reviews")
    .select("rating, comment, guest_name, created_at")
    .eq("cabin_id", cabinId)
    .eq("status", "approved")
    .order("created_at", { ascending: false })
    .limit(20)

  const reviews = data || []
  const count = reviews.length
  const avg = count > 0 ? reviews.reduce((s, r) => s + (r.rating || 0), 0) / count : 0
  return NextResponse.json({
    count,
    average: Math.round(avg * 10) / 10,
    reviews,
  })
}
