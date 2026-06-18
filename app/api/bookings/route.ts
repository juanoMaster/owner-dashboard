import { sendErrorAlert } from "@/lib/resend"
import { NextResponse } from "next/server"
import { getSupabaseAdmin, getSupabaseForTenant } from "@/lib/supabase-server"
import { logAudit } from "@/lib/audit"
import { generateBookingCode } from "@/lib/booking-code"
import { getPriceForDates } from "@/lib/pricing"
import { sendWhatsApp } from "@/lib/whatsapp"
import { getBillingInfo, isBillingBlocked } from "@/lib/billing"

export async function POST(req: Request) {
  let cabin_id: string | undefined
  let check_in: string | undefined
  let check_out: string | undefined
  try {
    const body = await req.json()
    ;({ cabin_id, check_in, check_out } = body)
    const { guests, tinaja_days, notes } = body
    const guest_name = body.guest_name || body.nombre || ""
    const guest_email = body.guest_email || body.email || ""
    const guest_phone = body.guest_phone || body.guest_whatsapp || body.whatsapp || ""

    if (!cabin_id || !check_in || !check_out || !guest_name || !guest_phone || !guests) {
      return NextResponse.json({ success: false, message: "Faltan campos obligatorios" }, { status: 400 })
    }

    // Lookup inicial sin tenant conocido → admin
    const supabaseAdmin = getSupabaseAdmin()
    const { data: cabin, error: cabinError } = await supabaseAdmin
      .from("cabins")
      .select("base_price_night, name, capacity, tenant_id, extra_person_price, pricing_tiers, has_tinaja, tinaja_price, season_prices")
      .eq("id", cabin_id)
      .single()

    if (cabinError || !cabin) {
      return NextResponse.json({ success: false, message: "Cabaña no encontrada" }, { status: 404 })
    }

    const tenant_id = cabin.tenant_id

    // Billing check — rechazar si el tenant está suspendido
    const billing = await getBillingInfo(tenant_id)
    if (isBillingBlocked(billing.billing_status, billing.manual_billing)) {
      return NextResponse.json({ success: false, message: "Las reservas en línea no están disponibles temporalmente." }, { status: 503 })
    }

    // Tenant conocido → cliente con contexto de sesión
    const supabase = await getSupabaseForTenant(tenant_id)

    const { data: tenantConfig } = await supabase
      .from("tenants")
      .select("deposit_percent, min_nights, slug, business_name, owner_whatsapp, currency, dashboard_token, tinaja_price")
      .eq("id", tenant_id)
      .single()

    const tinajaPrice = Number(cabin.tinaja_price) || Number(tenantConfig?.tinaja_price) || 30000
    const depositPercent = Number(tenantConfig?.deposit_percent) || 20
    const minNights = Number(tenantConfig?.min_nights) || 1
    const tenantSlug = tenantConfig?.slug || "rsv"
    const businessName = tenantConfig?.business_name || ""
    const currency = tenantConfig?.currency || "CLP"

    const nights = Math.round(
      (new Date(check_out + "T12:00:00").getTime() - new Date(check_in + "T12:00:00").getTime()) / 86400000
    )

    const todayStr = new Date().toISOString().split("T")[0]
    if (check_in < todayStr) {
      return NextResponse.json({ success: false, message: "No se pueden hacer reservas en fechas pasadas" }, { status: 400 })
    }
    if (nights < 1) {
      return NextResponse.json({ success: false, message: "Las fechas no son válidas" }, { status: 400 })
    }

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
      tenantMinNights: minNights,
    })

    const effectiveMinNights = priceResult.min_nights_required
    if (nights < effectiveMinNights) {
      return NextResponse.json({
        success: false,
        message: "La estadía mínima es de " + effectiveMinNights + " noche" + (effectiveMinNights === 1 ? "" : "s") + "."
      }, { status: 400 })
    }

    const extraGuests = Math.max(0, guestCount - cabin.capacity)
    const extraPersonPrice = Number(cabin.extra_person_price) || 0
    const hasTierMatch = (cabin.pricing_tiers || []).some((t: any) => guestCount >= t.min_guests && guestCount <= t.max_guests)
    const subtotal = priceResult.total
    const extras = hasTierMatch ? 0 : extraGuests * extraPersonPrice * nights
    const tinajaTotal = tinajaCount * tinajaPrice
    const total = subtotal + extras + tinajaTotal
    const deposit = Math.round(total * depositPercent / 100)
    const balance = total - deposit
    const bookingCode = generateBookingCode(tenantSlug)
    const effectivePricePerNight = nights > 0 ? Math.round(subtotal / nights) : Number(cabin.base_price_night)

    const notesData = JSON.stringify({
      nombre: guest_name,
      whatsapp: guest_phone,
      codigo: bookingCode,
      notas: notes || "",
      origen: "web",
      tinaja: String(tinajaCount),
      price_per_night: effectivePricePerNight
    })

    const { data: rpcResult, error: rpcError } = await supabase.rpc("create_booking_atomic", {
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
      p_guest_email: guest_email,
      p_guest_phone: guest_phone,
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
      tenant_id,
      cabin_id,
      action: "booking_created",
      entity_type: "booking",
      entity_id: bookingId,
      details: { check_in, check_out, nights, total_amount: total, deposit_amount: deposit, origen: "formulario_turista", guest_name, booking_code: bookingCode },
      performed_by: "formulario_turista",
    })

    if (guest_email) {
      fetch((process.env.NEXT_PUBLIC_APP_URL ?? "https://panel.takai.cl") + "/api/emails/nueva-reserva", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${process.env.CRON_SECRET}` },
        body: JSON.stringify({ booking_id: bookingId })
      }).catch(() => {})
    }

    if (guest_phone) {
      const fmtAmt = (n: number) =>
        currency === "USD" ? "$" + n.toFixed(2) + " USD"
        : currency === "COP" ? "$" + Math.round(n).toLocaleString("es-CO") + " COP"
        : "$" + Math.round(n).toLocaleString("es-CL")
      const guestMsg = `Hola ${guest_name} 👋 Recibimos tu solicitud de reserva en ${businessName}.\n📅 Check-in: ${check_in} | Check-out: ${check_out}\n💰 Total: ${fmtAmt(total)} | Anticipo: ${fmtAmt(deposit)}\nTu propietario revisará tu solicitud y te contactará para coordinar el pago.\nCódigo de reserva: ${bookingCode}`
      sendWhatsApp({ to: guest_phone, message: guestMsg, tenantId: tenant_id }).catch(() => {})
    }

    if (tenantConfig?.owner_whatsapp) {
      const fmtAmt = (n: number) =>
        currency === "USD" ? "$" + n.toFixed(2) + " USD"
        : currency === "COP" ? "$" + Math.round(n).toLocaleString("es-CO") + " COP"
        : "$" + Math.round(n).toLocaleString("es-CL")
      const panelUrl = tenantConfig.dashboard_token
        ? `https://panel.takai.cl/?token=${tenantConfig.dashboard_token}`
        : "https://panel.takai.cl"
      const ownerMsg = `🏡 Nueva reserva en ${cabin.name}\n👤 ${guest_name}\n📅 Check-in: ${check_in} → Check-out: ${check_out}\n💰 Total: ${fmtAmt(total)}\nVer reserva: ${panelUrl}`
      sendWhatsApp({ to: tenantConfig.owner_whatsapp, message: ownerMsg, tenantId: tenant_id }).catch(() => {})
    }

    return NextResponse.json({ success: true, booking_id: bookingId, booking_code: bookingCode, total, deposit, nights })
  } catch (err: any) {
    await sendErrorAlert({ route: "POST /api/bookings", error: err.message, details: { cabin_id, check_in, check_out } })
    return NextResponse.json({ success: false, message: err.message || "Error interno" }, { status: 500 })
  }
}
