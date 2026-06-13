// SQL requerido en Supabase:
// ALTER TABLE bookings ADD COLUMN IF NOT EXISTS mp_preference_id text;

export const dynamic = "force-dynamic"

import { NextRequest, NextResponse } from "next/server"
import { getSupabaseAdmin } from "@/lib/supabase-server"
import { MercadoPagoConfig, Preference } from "mercadopago"

export async function POST(req: NextRequest) {
  const supabase = getSupabaseAdmin()

  try {
    const { booking_id } = await req.json() as { booking_id: string }

    if (!booking_id) {
      return NextResponse.json({ error: "Falta booking_id" }, { status: 400 })
    }

    // Buscar booking activo y en estado draft
    const { data: booking, error: bookingError } = await supabase
      .from("bookings")
      .select("id, cabin_id, tenant_id, deposit_amount, status")
      .eq("id", booking_id)
      .is("deleted_at", null)
      .maybeSingle()

    if (bookingError || !booking) {
      return NextResponse.json({ error: "Reserva no encontrada" }, { status: 404 })
    }

    if (booking.status !== "draft") {
      return NextResponse.json({ error: "Esta reserva ya fue procesada" }, { status: 409 })
    }

    // Buscar cabaña (nombre para el item)
    const { data: cabin, error: cabinError } = await supabase
      .from("cabins")
      .select("name")
      .eq("id", booking.cabin_id)
      .eq("tenant_id", booking.tenant_id)
      .single()

    if (cabinError || !cabin) {
      return NextResponse.json({ error: "Cabaña no encontrada" }, { status: 404 })
    }

    // Buscar tenant (mp_access_token y mp_enabled)
    const { data: tenant, error: tenantError } = await supabase
      .from("tenants")
      .select("mp_access_token, mp_enabled")
      .eq("id", booking.tenant_id)
      .single()

    if (tenantError || !tenant) {
      return NextResponse.json({ error: "Propietario no encontrado" }, { status: 404 })
    }

    if (!tenant.mp_enabled) {
      return NextResponse.json({ error: "Pago en línea no habilitado para este propietario" }, { status: 403 })
    }

    if (!tenant.mp_access_token) {
      return NextResponse.json({ error: "Propietario sin cuenta Mercado Pago configurada" }, { status: 403 })
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL!

    const client = new MercadoPagoConfig({ accessToken: tenant.mp_access_token })
    const preferenceClient = new Preference(client)

    const response = await preferenceClient.create({
      body: {
        items: [
          {
            id: booking_id,
            title: cabin.name,
            quantity: 1,
            unit_price: Number(booking.deposit_amount),
            currency_id: "CLP",
          },
        ],
        external_reference: booking_id,
        back_urls: {
          success: appUrl + "/reservar/pago-exitoso?booking_id=" + booking_id,
          failure: appUrl + "/reservar/pago-fallido?booking_id=" + booking_id,
          pending: appUrl + "/reservar/pago-pendiente?booking_id=" + booking_id,
        },
        auto_return: "approved",
        notification_url: appUrl + "/api/mp/webhook?tenant_id=" + booking.tenant_id,
      },
    })

    // Guardar preference_id en la reserva
    await supabase
      .from("bookings")
      .update({ mp_preference_id: response.id })
      .eq("id", booking_id)
      .eq("tenant_id", booking.tenant_id)

    return NextResponse.json({ init_point: response.init_point, preference_id: response.id })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Error desconocido"
    return NextResponse.json({ error: "Error al crear preferencia: " + message }, { status: 500 })
  }
}
