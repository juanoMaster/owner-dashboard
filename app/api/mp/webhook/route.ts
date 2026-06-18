export const dynamic = "force-dynamic"

import { NextRequest, NextResponse } from "next/server"
import { getSupabaseAdmin } from "@/lib/supabase-server"
import { MercadoPagoConfig, Payment } from "mercadopago"
import { createHmac } from "crypto"
import { logAudit } from "@/lib/audit"
import { sendWhatsApp } from "@/lib/whatsapp"

function verifyMpSignature(secret: string, xSignature: string, xRequestId: string, dataId: string): boolean {
  let ts = ""
  let v1 = ""
  for (const part of xSignature.split(",")) {
    const [k, v] = part.trim().split("=", 2)
    if (k === "ts") ts = v
    if (k === "v1") v1 = v
  }
  if (!ts || !v1) return false
  const manifest = "id:" + dataId + ";request-id:" + xRequestId + ";ts:" + ts + ";"
  const computed = createHmac("sha256", secret).update(manifest).digest("hex")
  return computed === v1
}

export async function POST(req: NextRequest) {
  // MP requiere 200 siempre o reintenta — nunca retornar error al final
  const supabase = getSupabaseAdmin()

  try {
    const { searchParams } = new URL(req.url)
    const type = searchParams.get("type")
    const dataId = searchParams.get("data.id")
    const tenantId = searchParams.get("tenant_id")

    if (type !== "payment" || !dataId || !tenantId) {
      return NextResponse.json({ received: true }, { status: 200 })
    }

    const { data: tenant } = await supabase
      .from("tenants")
      .select("mp_access_token, mp_webhook_secret, owner_whatsapp, dashboard_token, business_name, currency")
      .eq("id", tenantId)
      .single()

    if (!tenant?.mp_access_token) {
      return NextResponse.json({ received: true }, { status: 200 })
    }

    if (tenant.mp_webhook_secret) {
      const xSignature = req.headers.get("x-signature") || ""
      const xRequestId = req.headers.get("x-request-id") || ""
      if (!verifyMpSignature(tenant.mp_webhook_secret, xSignature, xRequestId, dataId)) {
        return NextResponse.json({ received: true }, { status: 200 })
      }
    }

    const client = new MercadoPagoConfig({ accessToken: tenant.mp_access_token })
    const paymentClient = new Payment(client)
    const paymentData = await paymentClient.get({ id: dataId })

    const bookingId = paymentData.external_reference
    const status = paymentData.status

    if (!bookingId) {
      return NextResponse.json({ received: true }, { status: 200 })
    }

    if (status === "approved") {
      // Fetch booking data before confirming so we have context for audit and email
      const { data: booking } = await supabase
        .from("bookings")
        .select("cabin_id, check_in, check_out, total_amount, deposit_amount, guest_name, status, cabins(name)")
        .eq("id", bookingId)
        .eq("tenant_id", tenantId)
        .is("deleted_at", null)
        .maybeSingle()

      // Skip if not found (deleted) or already confirmed (idempotency)
      if (!booking || booking.status === "confirmed") {
        return NextResponse.json({ received: true }, { status: 200 })
      }

      await supabase
        .from("bookings")
        .update({ status: "confirmed" })
        .eq("id", bookingId)
        .eq("tenant_id", tenantId)

      await supabase
        .from("calendar_blocks")
        .update({ reason: "system_booking" })
        .eq("booking_id", bookingId)
        .eq("tenant_id", tenantId)
        .neq("reason", "manual")

      await logAudit({
        tenant_id: tenantId,
        cabin_id: booking?.cabin_id,
        action: "booking_confirmed",
        entity_type: "booking",
        entity_id: bookingId,
        details: {
          check_in: booking?.check_in,
          check_out: booking?.check_out,
          total_amount: booking?.total_amount,
          deposit_amount: booking?.deposit_amount,
          guest_name: booking?.guest_name,
          payment_method: "mercadopago",
          mp_payment_id: dataId,
        },
        performed_by: "mercadopago_webhook",
      })

      // WhatsApp al propietario
      if (tenant?.owner_whatsapp) {
        const panelUrl = tenant.dashboard_token
          ? `https://panel.takai.cl/?token=${tenant.dashboard_token}`
          : "https://panel.takai.cl"
        const cabinName = (booking.cabins as any)?.name || "Cabaña"
        const cur = (tenant as any).currency || "CLP"
        const totalFmt = cur === "USD"
          ? "$" + Number(booking.total_amount).toFixed(2) + " USD"
          : cur === "COP"
            ? "$" + Math.round(Number(booking.total_amount)).toLocaleString("es-CO") + " COP"
            : "$" + Math.round(Number(booking.total_amount)).toLocaleString("es-CL")
        const ownerMsg = `🏡 Nueva reserva en ${cabinName}\n👤 ${booking.guest_name}\n📅 Check-in: ${booking.check_in} → Check-out: ${booking.check_out}\n💰 Total: ${totalFmt}\nVer reserva: ${panelUrl}`
        sendWhatsApp({ to: tenant.owner_whatsapp, message: ownerMsg, tenantId }).catch(() => {})
      }

      try {
        await fetch(
          (process.env.NEXT_PUBLIC_APP_URL ?? "") + "/api/emails/reserva-confirmada",
          {
            method: "POST",
            headers: { "Content-Type": "application/json", "Authorization": `Bearer ${process.env.CRON_SECRET}` },
            body: JSON.stringify({ booking_id: bookingId }),
          }
        )
      } catch {
        // fallo silencioso — la reserva ya quedó confirmada
      }
    }

    return NextResponse.json({ received: true }, { status: 200 })
  } catch {
    return NextResponse.json({ received: true }, { status: 200 })
  }
}
