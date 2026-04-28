export const dynamic = "force-dynamic"

import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { MercadoPagoConfig, Payment } from "mercadopago"
import { createHmac } from "crypto"
import { logAudit } from "@/lib/audit"

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
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { global: { fetch: (url: RequestInfo | URL, options: RequestInit = {}) => fetch(url, { ...options, cache: "no-store" }) } }
  )

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
      .select("mp_access_token, mp_webhook_secret")
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
        .select("cabin_id, check_in, check_out, total_amount, deposit_amount, guest_name, status")
        .eq("id", bookingId)
        .eq("tenant_id", tenantId)
        .single()

      // Idempotency: skip if already confirmed
      if (booking?.status === "confirmed") {
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

      try {
        await fetch(
          (process.env.NEXT_PUBLIC_APP_URL ?? "") + "/api/emails/reserva-confirmada",
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
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
