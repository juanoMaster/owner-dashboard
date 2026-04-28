export const dynamic = "force-dynamic"

import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

export async function GET(req: Request) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { global: { fetch: (url, options = {}) => fetch(url, { ...options, cache: "no-store" }) } }
  )

  const { searchParams } = new URL(req.url)
  const booking_id = searchParams.get("booking_id")

  if (!booking_id) {
    return NextResponse.json({ error: "booking_id requerido" }, { status: 400 })
  }

  const { data: booking } = await supabase
    .from("bookings")
    .select("tenant_id")
    .eq("id", booking_id)
    .is("deleted_at", null)
    .maybeSingle()

  if (!booking) {
    return NextResponse.json({ error: "Reserva no encontrada" }, { status: 404 })
  }

  const { data: tenant } = await supabase
    .from("tenants")
    .select("bank_name, bank_account_type, bank_account_number, bank_account_holder, bank_rut")
    .eq("id", booking.tenant_id)
    .single()

  if (!tenant) {
    return NextResponse.json({ error: "Propietario no encontrado" }, { status: 404 })
  }

  return NextResponse.json({
    bank_name: tenant.bank_name || null,
    bank_account_type: tenant.bank_account_type || null,
    bank_account_number: tenant.bank_account_number || null,
    bank_account_holder: tenant.bank_account_holder || null,
    bank_rut: tenant.bank_rut || null,
  })
}
