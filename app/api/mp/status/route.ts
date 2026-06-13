export const dynamic = "force-dynamic"

import { NextRequest, NextResponse } from "next/server"
import { getSupabaseAdmin } from "@/lib/supabase-server"

export async function GET(req: NextRequest) {
  const supabase = getSupabaseAdmin()

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
      .is("deleted_at", null)
      .maybeSingle()

    if (bookingError || !booking) {
      return NextResponse.json({ error: "Reserva no encontrada" }, { status: 404 })
    }

    const { data: tenant, error: tenantError } = await supabase
      .from("tenants")
      .select("mp_enabled, mp_access_token")
      .eq("id", booking.tenant_id)
      .single()

    if (tenantError || !tenant) {
      return NextResponse.json({ error: "Propietario no encontrado" }, { status: 404 })
    }

    return NextResponse.json({
      status: booking.status,
      mp_enabled: !!(tenant.mp_enabled && tenant.mp_access_token),
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Error desconocido"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
