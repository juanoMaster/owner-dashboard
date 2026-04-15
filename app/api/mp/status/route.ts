export const dynamic = "force-dynamic"

import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

export async function GET(req: NextRequest) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { global: { fetch: (url: RequestInfo | URL, options: RequestInit = {}) => fetch(url, { ...options, cache: "no-store" }) } }
  )

  try {
    const { searchParams } = new URL(req.url)
    const booking_id = searchParams.get("booking_id")

    if (!booking_id) {
      return NextResponse.json({ error: "Falta booking_id" }, { status: 400 })
    }

    const { data: booking, error: bookingError } = await supabase
      .from("bookings")
      .select("status, tenant_id")
      .eq("id", booking_id)
      .single()

    if (bookingError || !booking) {
      return NextResponse.json({ error: "Reserva no encontrada" }, { status: 404 })
    }

    const { data: tenant, error: tenantError } = await supabase
      .from("tenants")
      .select("mp_enabled")
      .eq("id", booking.tenant_id)
      .single()

    if (tenantError || !tenant) {
      return NextResponse.json({ error: "Propietario no encontrado" }, { status: 404 })
    }

    return NextResponse.json({
      status: booking.status,
      mp_enabled: tenant.mp_enabled ?? false,
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Error desconocido"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
