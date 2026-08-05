export const dynamic = "force-dynamic"

import { NextResponse } from "next/server"
import { getSupabaseAdmin } from "@/lib/supabase-server"
import { logAudit } from "@/lib/audit"

// Marca comisiones como pagadas al partner. Dos tipos:
//   centro  → tenants.referral_paid_at (comisión única por traer el alojamiento)
//   reserva → bookings.affiliate_paid_at (5% de esa reserva)
//
// Sin esto Juan no tiene forma de saber qué ya liquidó: pagaría dos veces o se
// le pasaría alguna. Se puede deshacer (`undo: true`) por si marca una de más.

function authed(req: Request): boolean {
  return !!process.env.ADMIN_TOKEN && req.headers.get("x-admin-token") === process.env.ADMIN_TOKEN
}

const UUID = /^[0-9a-f-]{36}$/i

export async function POST(req: Request) {
  if (!authed(req)) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 })
  }

  const tipo = String(body.tipo || "")
  const id = String(body.id || "")
  const undo = body.undo === true
  if (!UUID.test(id)) return NextResponse.json({ error: "id inválido" }, { status: 400 })

  const supabase = getSupabaseAdmin()
  const ahora = undo ? null : new Date().toISOString()

  if (tipo === "centro") {
    // Monto: el que venga del panel (caso "a convenir") o el ya guardado.
    const patch: Record<string, unknown> = { referral_paid_at: ahora }
    if (!undo && body.monto != null && body.monto !== "") {
      const monto = Number(body.monto)
      if (!Number.isFinite(monto) || monto < 0) {
        return NextResponse.json({ error: "Monto inválido" }, { status: 400 })
      }
      patch.referral_fee_amount = monto
    }

    const { data: t } = await supabase
      .from("tenants").select("id, business_name, referred_by_affiliate_id").eq("id", id).maybeSingle()
    if (!t) return NextResponse.json({ error: "Alojamiento no encontrado" }, { status: 404 })
    if (!t.referred_by_affiliate_id) {
      return NextResponse.json({ error: "Ese alojamiento no lo trajo ningún partner" }, { status: 400 })
    }

    const { error } = await supabase.from("tenants").update(patch).eq("id", id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    await logAudit({
      tenant_id: id,
      action: undo ? "referral_pago_deshecho" : "referral_pago_registrado",
      entity_type: "tenant",
      entity_id: id,
      details: { affiliate_id: t.referred_by_affiliate_id, monto: patch.referral_fee_amount ?? null },
      performed_by: "admin_panel",
    })
    return NextResponse.json({ success: true })
  }

  if (tipo === "reserva") {
    const { data: b } = await supabase
      .from("bookings").select("id, tenant_id, affiliate_id, booking_code, status").eq("id", id).maybeSingle()
    if (!b) return NextResponse.json({ error: "Reserva no encontrada" }, { status: 404 })
    if (!b.affiliate_id) {
      return NextResponse.json({ error: "Esa reserva no la trajo ningún partner" }, { status: 400 })
    }
    if (!undo && b.status !== "confirmed") {
      return NextResponse.json({ error: "Solo se liquidan reservas confirmadas" }, { status: 400 })
    }

    const { error } = await supabase.from("bookings").update({ affiliate_paid_at: ahora }).eq("id", id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    await logAudit({
      tenant_id: b.tenant_id,
      action: undo ? "comision_partner_deshecha" : "comision_partner_pagada",
      entity_type: "booking",
      entity_id: id,
      details: { affiliate_id: b.affiliate_id, booking_code: b.booking_code },
      performed_by: "admin_panel",
    })
    return NextResponse.json({ success: true })
  }

  return NextResponse.json({ error: "tipo debe ser 'centro' o 'reserva'" }, { status: 400 })
}
