export const dynamic = "force-dynamic"

import { NextResponse } from "next/server"
import { getSupabaseAdmin } from "@/lib/supabase-server"

export async function GET(req: Request) {
  const supabase = getSupabaseAdmin()

  const { searchParams } = new URL(req.url)
  const booking_id = searchParams.get("booking_id")

  if (!booking_id) {
    return NextResponse.json({ error: "booking_id requerido" }, { status: 400 })
  }

  const { data: booking } = await supabase
    .from("bookings")
    .select("tenant_id, booking_code, total_amount, deposit_amount, check_in, check_out, guest_name, created_at")
    .eq("id", booking_id)
    .is("deleted_at", null)
    .maybeSingle()

  if (!booking) {
    return NextResponse.json({ error: "Reserva no encontrada" }, { status: 404 })
  }

  const { data: tenant } = await supabase
    .from("tenants")
    .select("slug, bank_name, bank_account_type, bank_account_number, bank_account_holder, bank_rut, bank_email, transfer_timeout_hours, currency, owner_whatsapp")
    .eq("id", booking.tenant_id)
    .single()

  if (!tenant) {
    return NextResponse.json({ error: "Propietario no encontrado" }, { status: 404 })
  }

  // Número de WhatsApp al que el turista debe enviar el comprobante
  const rawFrom = process.env.TWILIO_WHATSAPP_FROM ?? ""
  const whatsapp_number = rawFrom.replace("whatsapp:", "")

  return NextResponse.json({
    // Datos de la reserva
    booking_code: booking.booking_code,
    total_amount: booking.total_amount,
    deposit_amount: booking.deposit_amount,
    check_in: booking.check_in,
    check_out: booking.check_out,
    guest_name: booking.guest_name,
    created_at: booking.created_at,
    // Datos bancarios
    bank_name: tenant.bank_name || null,
    bank_account_type: tenant.bank_account_type || null,
    bank_account_number: tenant.bank_account_number || null,
    bank_account_holder: tenant.bank_account_holder || null,
    bank_rut: tenant.bank_rut || null,
    bank_email: (tenant as any).bank_email || null,
    currency: (tenant as any).currency || "CLP",
    // Config de timeout para la cuenta regresiva
    transfer_timeout_hours: Number(tenant.transfer_timeout_hours) || 12,
    // WhatsApp donde enviar el comprobante de transferencia (número del sistema Twilio)
    whatsapp_number: whatsapp_number || null,
    // WhatsApp del propietario (para contacto directo en caso de error de pago)
    owner_whatsapp: (tenant as any).owner_whatsapp || null,
    // Slug del tenant (para redirigir al turista de vuelta a la landing)
    slug: (tenant as any).slug || null,
  })
}
