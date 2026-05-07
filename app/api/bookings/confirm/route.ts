import { sendErrorAlert } from "@/lib/resend"
import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { logAudit } from "@/lib/audit"
import { createHash } from "crypto"
import { sendWhatsApp } from "@/lib/whatsapp"

export async function POST(req: Request) {
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { global: { fetch: (url, options = {}) => fetch(url, { ...options, cache: "no-store" }) } })
  let booking_id: string | undefined
  let tenant_id: string | undefined
  try {
    const body = await req.json()
    ;({ booking_id, tenant_id } = body)
    const token: string | undefined = body.token

    if (!booking_id || !tenant_id || !token) {
      return NextResponse.json({ error: "booking_id, tenant_id y token son requeridos" }, { status: 400 })
    }

    const tokenHash = createHash("sha256").update(token).digest("hex")
    const { data: link } = await supabase
      .from("dashboard_links")
      .select("tenant_id")
      .eq("token_hash", tokenHash)
      .eq("active", true)
      .maybeSingle()

    if (!link || link.tenant_id !== tenant_id) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const { data: booking, error: fetchErr } = await supabase
      .from("bookings")
      .select("cabin_id, check_in, check_out, total_amount, notes, status, guest_name, guest_phone, booking_code")
      .eq("id", booking_id)
      .eq("tenant_id", tenant_id)
      .is("deleted_at", null)
      .maybeSingle()

    if (fetchErr) return NextResponse.json({ error: "Error al buscar reserva: " + fetchErr.message }, { status: 500 })
    if (!booking) return NextResponse.json({ error: "Reserva no encontrada (id: " + booking_id + ")" }, { status: 404 })
    if (booking.status === "confirmed") return NextResponse.json({ success: true })

    const { data: conflicts } = await supabase
      .from("bookings")
      .select("id, check_in, check_out")
      .eq("cabin_id", booking.cabin_id)
      .eq("tenant_id", tenant_id)
      .eq("status", "confirmed")
      .is("deleted_at", null)
      .neq("id", booking_id)
      .lt("check_in", booking.check_out)
      .gt("check_out", booking.check_in)

    if (conflicts && conflicts.length > 0) {
      const c = conflicts[0]
      return NextResponse.json({
        error: "Conflicto: ya existe una reserva confirmada del " + c.check_in + " al " + c.check_out + ". Cancela esa reserva primero."
      }, { status: 409 })
    }

    const { error } = await supabase.from("bookings").update({ status: "confirmed" }).eq("id", booking_id).eq("tenant_id", tenant_id)
    if (error) return NextResponse.json({ error: "Error al actualizar: " + error.message }, { status: 500 })

    await supabase.from("calendar_blocks")
      .update({ reason: "system_booking" })
      .eq("booking_id", booking_id)
      .neq("reason", "manual")

    await logAudit({
      tenant_id,
      cabin_id: booking.cabin_id,
      action: "booking_confirmed",
      entity_type: "booking",
      entity_id: booking_id,
      details: { check_in: booking.check_in, check_out: booking.check_out, total_amount: booking.total_amount, notes: booking.notes },
      performed_by: "owner_panel",
    })

    // Email reserva confirmada
    fetch(`${process.env.NEXT_PUBLIC_APP_URL ?? "https://panel.takai.cl"}/api/emails/reserva-confirmada`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ booking_id })
    }).catch(() => {})

    // WhatsApp al huésped
    if (booking.guest_phone) {
      const { data: tenantData } = await supabase
        .from("tenants")
        .select("business_name")
        .eq("id", tenant_id)
        .maybeSingle()
      const businessName = tenantData?.business_name || ""
      const reservasUrl = process.env.NEXT_PUBLIC_RESERVAS_URL ?? "https://reservas.takai.cl"
      const msg = `✅ ¡Reserva confirmada! ${businessName}\n📅 Check-in: ${booking.check_in} | Check-out: ${booking.check_out}\nNos vemos pronto 🏡\nCódigo: ${booking.booking_code}\n📖 Manual de bienvenida: ${reservasUrl}/bienvenida/${booking.booking_code}`
      sendWhatsApp({ to: booking.guest_phone, message: msg, tenantId: tenant_id }).catch(() => {})
    }

    return NextResponse.json({ success: true })
  } catch (err: any) {
    await sendErrorAlert({ route: "POST /api/bookings/confirm", error: err.message, details: { booking_id } })
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
