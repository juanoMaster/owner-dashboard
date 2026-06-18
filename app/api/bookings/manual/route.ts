import { NextResponse } from "next/server"
import { getSupabaseAdmin } from "@/lib/supabase-server"
import { logAudit } from "@/lib/audit"
import { sendErrorAlert } from "@/lib/resend"
import { generateBookingCode } from "@/lib/booking-code"
import { getPriceForDates } from "@/lib/pricing"
import { getBillingInfo, isBillingBlocked } from "@/lib/billing"
import { sendWhatsApp } from "@/lib/whatsapp"
import crypto from "crypto"

export async function POST(req: Request) {
  const supabase = getSupabaseAdmin()
  try {
    const body = await req.json()
    const { token, cabin_id, check_in, check_out, guest_name, guest_whatsapp, guests, tinaja_days, notes } = body

    if (!token) {
      return NextResponse.json({ success: false, message: "No autorizado" }, { status: 401 })
    }
    if (!cabin_id || !check_in || !check_out || !guest_name || !guest_whatsapp || !guests) {
      return NextResponse.json({ success: false, message: "Faltan campos obligatorios" }, { status: 400 })
    }

    // Derivar tenant_id desde el token — no se confía en el body
    const tokenHash = crypto.createHash("sha256").update(token, "utf8").digest("hex")
    const { data: link } = await supabase
      .from("dashboard_links")
      .select("tenant_id")
      .eq("token_hash", tokenHash)
      .eq("active", true)
      .maybeSingle()
    if (!link) return NextResponse.json({ success: false, message: "No autorizado" }, { status: 401 })
    const tenant_id = link.tenant_id

    // Billing check — bloquea si el tenant está suspendido
    const billing = await getBillingInfo(tenant_id)
    if (isBillingBlocked(billing.billing_status, billing.manual_billing)) {
      return NextResponse.json(
        { success: false, message: "Tu suscripción está suspendida. Regulariza tu pago para crear reservas." },
        { status: 403 }
      )
    }

    const { data: cabin, error: cabinError } = await supabase
      .from("cabins")
      .select("base_price_night, name, capacity, extra_person_price, pricing_tiers, season_prices, has_tinaja, tinaja_price")
      .eq("id", cabin_id)
      .eq("tenant_id", tenant_id)
      .single()

    if (cabinError || !cabin) {
      return NextResponse.json({ success: false, message: "Cabaña no encontrada" }, { status: 404 })
    }

    const nights = Math.round(
      (new Date(check_out + "T12:00:00").getTime() - new Date(check_in + "T12:00:00").getTime()) / 86400000
    )
    if (nights < 1) {
      return NextResponse.json({ success: false, message: "Las fechas no son válidas" }, { status: 400 })
    }
    const todayStr = new Date().toISOString().split("T")[0]
    if (check_in < todayStr) {
      return NextResponse.json({ success: false, message: "No se pueden crear reservas en fechas pasadas" }, { status: 400 })
    }

    const { data: tenantConfig } = await supabase
      .from("tenants")
      .select("deposit_percent, slug, tinaja_price, has_tinaja, owner_whatsapp, dashboard_token, currency")
      .eq("id", tenant_id)
      .single()

    const tinajaPrice = Number(cabin.tinaja_price) || Number(tenantConfig?.tinaja_price) || 30000
    const depositPercent = Number(tenantConfig?.deposit_percent) || 20
    const tenantSlug = tenantConfig?.slug || "rsv"
    const currency = tenantConfig?.currency || "CLP"

    const guestCount = parseInt(guests)
    const tinajaCount = parseInt(tinaja_days) || 0
    const priceResult = getPriceForDates({
      cabin: {
        base_price_night: Number(cabin.base_price_night),
        season_prices: cabin.season_prices,
        pricing_tiers: cabin.pricing_tiers,
      },
      checkIn: check_in,
      checkOut: check_out,
      guests: guestCount,
      tenantMinNights: 1,
    })
    const subtotal = priceResult.total
    const resolvedPricePerNight = nights > 0 ? Math.round(subtotal / nights) : Number(cabin.base_price_night)
    const hasTierMatch = (cabin.pricing_tiers || []).some((t: any) => guestCount >= t.min_guests && guestCount <= t.max_guests)
    const extraGuests = Math.max(0, guestCount - cabin.capacity)
    const extraPersonPrice = Number(cabin.extra_person_price) || 0
    const extras = hasTierMatch ? 0 : extraGuests * extraPersonPrice * nights
    const tinajaTotal = tinajaCount * tinajaPrice
    const total = subtotal + extras + tinajaTotal
    const deposit = Math.round(total * depositPercent / 100)
    const balance = total - deposit
    const bookingCode = generateBookingCode(tenantSlug)

    const notesData = JSON.stringify({
      nombre: guest_name,
      whatsapp: guest_whatsapp,
      codigo: bookingCode,
      notas: notes || "",
      origen: "manual",
      tinaja: String(tinajaCount),
      price_per_night: resolvedPricePerNight
    })

    // Uso create_booking_manual (advisory lock + conflict check atómico)
    const { data: rpcResult, error: rpcError } = await supabase.rpc("create_booking_manual", {
      p_tenant_id: tenant_id,
      p_cabin_id: cabin_id,
      p_check_in: check_in,
      p_check_out: check_out,
      p_guests: guestCount,
      p_nights: nights,
      p_subtotal_amount: subtotal,
      p_total_amount: total,
      p_deposit_percent: depositPercent,
      p_deposit_amount: deposit,
      p_balance_amount: balance,
      p_notes: notesData,
      p_booking_code: bookingCode,
      p_guest_name: guest_name,
      p_guest_phone: guest_whatsapp,
      p_tinaja_amount: tinajaTotal,
    })

    if (rpcError) {
      return NextResponse.json({ success: false, message: rpcError.message || "Error al guardar" }, { status: 500 })
    }

    const rpc = rpcResult as { success: boolean; booking_id?: string; message?: string }
    if (!rpc.success) {
      return NextResponse.json({ success: false, message: rpc.message || "Las fechas no están disponibles" }, { status: 409 })
    }

    const bookingId = rpc.booking_id!

    await logAudit({
      tenant_id, cabin_id,
      action: "booking_created",
      entity_type: "booking",
      entity_id: bookingId,
      details: { check_in, check_out, nights, total_amount: total, deposit_amount: deposit, origen: "manual", guest_name, booking_code: bookingCode },
      performed_by: "owner_panel",
    })

    const fmtAmt = (n: number) =>
      currency === "USD" ? "$" + n.toFixed(2) + " USD"
      : currency === "COP" ? "$" + Math.round(n).toLocaleString("es-CO") + " COP"
      : "$" + Math.round(n).toLocaleString("es-CL")

    // WhatsApp al turista
    if (guest_whatsapp) {
      const guestMsg = `Hola ${guest_name} 👋 Tu reserva en ${cabin.name} fue registrada.\n📅 Check-in: ${check_in} | Check-out: ${check_out}\n💰 Total: ${fmtAmt(total)} | Anticipo: ${fmtAmt(deposit)}\nCódigo de reserva: ${bookingCode}`
      sendWhatsApp({ to: guest_whatsapp, message: guestMsg, tenantId: tenant_id }).catch(() => {})
    }

    // WhatsApp al propietario
    if (tenantConfig?.owner_whatsapp) {
      const panelUrl = tenantConfig.dashboard_token
        ? `https://panel.takai.cl/?token=${tenantConfig.dashboard_token}`
        : "https://panel.takai.cl"
      const ownerMsg = `🏡 Nueva reserva manual en ${cabin.name}\n👤 ${guest_name}\n📅 Check-in: ${check_in} → Check-out: ${check_out}\n💰 Total: ${fmtAmt(total)}\nVer reserva: ${panelUrl}`
      sendWhatsApp({ to: tenantConfig.owner_whatsapp, message: ownerMsg, tenantId: tenant_id }).catch(() => {})
    }

    return NextResponse.json({ success: true, booking_code: bookingCode, total, deposit, nights })
  } catch (err: any) {
    await sendErrorAlert({ route: "POST /api/bookings/manual", error: err.message })
    return NextResponse.json({ success: false, message: err.message || "Error interno" }, { status: 500 })
  }
}
