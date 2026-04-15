export const dynamic = "force-dynamic"

import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { MercadoPagoConfig, Payment } from "mercadopago"

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

    // Solo procesar notificaciones de tipo "payment"
    if (type !== "payment" || !dataId) {
      return NextResponse.json({ received: true }, { status: 200 })
    }

    const client = new MercadoPagoConfig({ accessToken: process.env.MP_TEST_ACCESS_TOKEN! })
    const paymentClient = new Payment(client)
    const paymentData = await paymentClient.get({ id: dataId })

    const bookingId = paymentData.external_reference
    const status = paymentData.status

    if (!bookingId) {
      return NextResponse.json({ received: true }, { status: 200 })
    }

    if (status === "approved") {
      // Confirmar reserva
      await supabase
        .from("bookings")
        .update({ status: "confirmed" })
        .eq("id", bookingId)

      // Actualizar bloque de calendario
      await supabase
        .from("calendar_blocks")
        .update({ reason: "system_booking" })
        .eq("booking_id", bookingId)

      // Enviar email de confirmación (fallo silencioso)
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
    // Siempre 200 para que MP no reintente
    return NextResponse.json({ received: true }, { status: 200 })
  }
}
