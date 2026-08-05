export const dynamic = "force-dynamic"

import { NextResponse } from "next/server"
import { getSupabaseAdmin } from "@/lib/supabase-server"
import { MAX_AFFILIATE_RATE, clampAffiliateRate } from "@/lib/commission"
import { calcularComisionReferido } from "@/lib/referral"
import crypto from "crypto"

function authed(req: Request): boolean {
  return !!process.env.ADMIN_TOKEN && req.headers.get("x-admin-token") === process.env.ADMIN_TOKEN
}

// GET — lista los partners CON TODO EL DETALLE para liquidarles:
// qué alojamientos trajo cada uno (y cuánto le toca por ellos), qué reservas
// generó (y su 5%), y cuánto hay que pagarle ahora. Nunca devuelve el token.
export async function GET(req: Request) {
  if (!authed(req)) return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  const supabase = getSupabaseAdmin()

  const { data: afiliados, error } = await supabase
    .from("affiliates")
    .select("id, code, name, contact, commission_rate, active, created_at")
    .order("created_at", { ascending: false })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const ids = (afiliados || []).map((a) => a.id)
  if (ids.length === 0) {
    return NextResponse.json({ affiliates: [], total_a_pagar: 0 })
  }

  // ── Alojamientos que trajeron (comisión única) ────────────────────────
  const { data: centros } = await supabase
    .from("tenants")
    .select("id, business_name, slug, active, referred_by_affiliate_id, referral_fee_amount, referral_paid_at, created_at")
    .in("referred_by_affiliate_id", ids)

  const centroIds = (centros || []).map((c) => c.id)
  // Cuántas cabañas activas tiene cada centro → define el tramo de pago.
  const cabinsPorTenant = new Map<string, number>()
  if (centroIds.length > 0) {
    const { data: cabs } = await supabase
      .from("cabins").select("id, tenant_id").in("tenant_id", centroIds).eq("active", true)
    for (const c of cabs || []) {
      cabinsPorTenant.set(c.tenant_id, (cabinsPorTenant.get(c.tenant_id) ?? 0) + 1)
    }
  }

  // ── Reservas que generaron (5% por reserva) ───────────────────────────
  const { data: reservas } = await supabase
    .from("bookings")
    .select("id, booking_code, affiliate_id, total_amount, status, check_in, check_out, affiliate_paid_at, created_at, tenants(business_name, currency), cabins(name)")
    .in("affiliate_id", ids)
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .limit(1000)

  let totalGeneral = 0

  const salida = (afiliados || []).map((a) => {
    const rate = clampAffiliateRate(Number(a.commission_rate) || 0)

    const susCentros = (centros || [])
      .filter((c) => c.referred_by_affiliate_id === a.id)
      .map((c) => {
        const nCabanas = cabinsPorTenant.get(c.id) ?? 0
        const calc = calcularComisionReferido(nCabanas)
        // Si ya se acordó un monto a mano, ese manda sobre el tramo.
        const guardado = c.referral_fee_amount != null ? Number(c.referral_fee_amount) : null
        const monto = guardado ?? calc.amount
        return {
          tenant_id: c.id,
          business_name: c.business_name,
          slug: c.slug,
          publicado: c.active,
          cabanas: nCabanas,
          tramo: calc.label,
          a_convenir: monto == null,
          monto,
          pagado_el: c.referral_paid_at,
          creado_el: c.created_at,
        }
      })

    const susReservas = (reservas || [])
      .filter((r) => r.affiliate_id === a.id)
      .map((r) => {
        const total = Number(r.total_amount) || 0
        const confirmada = r.status === "confirmed"
        const comision = confirmada ? Math.round(total * (rate / 100) * 100) / 100 : 0
        return {
          booking_id: r.id,
          booking_code: r.booking_code,
          alojamiento: (r.tenants as any)?.business_name || "",
          cabana: (r.cabins as any)?.name || "",
          currency: (r.tenants as any)?.currency || "CLP",
          check_in: r.check_in,
          total,
          confirmada,
          comision,
          // Reparto del 10% de Takai, para control interno del margen.
          takai_neto: confirmada ? Math.round(total * 0.1 * 100) / 100 - comision : 0,
          pagado_el: r.affiliate_paid_at,
        }
      })

    // Pendiente = lo confirmado y aún no liquidado.
    const centrosPendientes = susCentros
      .filter((c) => !c.pagado_el && c.monto != null && c.publicado)
      .reduce((s, c) => s + (c.monto as number), 0)
    const reservasPendientes = susReservas
      .filter((r) => r.confirmada && !r.pagado_el)
      .reduce((s, r) => s + r.comision, 0)
    const aPagar = Math.round((centrosPendientes + reservasPendientes) * 100) / 100
    totalGeneral += aPagar

    return {
      ...a,
      commission_rate: rate,
      centros: susCentros,
      reservas: susReservas,
      totales: {
        centros_traidos: susCentros.length,
        centros_por_pagar: susCentros.filter((c) => !c.pagado_el && c.publicado).length,
        centros_a_convenir: susCentros.filter((c) => c.a_convenir && !c.pagado_el && c.publicado).length,
        reservas_generadas: susReservas.length,
        reservas_confirmadas: susReservas.filter((r) => r.confirmada).length,
        volumen_confirmado: susReservas.filter((r) => r.confirmada).reduce((s, r) => s + r.total, 0),
        comision_reservas_pendiente: Math.round(reservasPendientes * 100) / 100,
        comision_centros_pendiente: centrosPendientes,
        a_pagar: aPagar,
        ya_pagado:
          susCentros.filter((c) => c.pagado_el).reduce((s, c) => s + (c.monto ?? 0), 0) +
          susReservas.filter((r) => r.pagado_el).reduce((s, r) => s + r.comision, 0),
      },
    }
  })

  return NextResponse.json({
    affiliates: salida,
    total_a_pagar: Math.round(totalGeneral * 100) / 100,
  })
}

// POST — crea partner. Devuelve el token EN CLARO una sola vez (se guarda hash).
export async function POST(req: Request) {
  if (!authed(req)) return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  const body = await req.json()
  const name = String(body.name || "").trim().slice(0, 120)
  const contact = String(body.contact || "").trim().slice(0, 160) || null
  const code = String(body.code || "").trim().toLowerCase().replace(/[^a-z0-9_-]/g, "").slice(0, 32)
  const rate = Number(body.commission_rate)
  if (!name || !code) return NextResponse.json({ error: "name y code son obligatorios" }, { status: 400 })
  if (!Number.isFinite(rate) || rate < 0 || rate > MAX_AFFILIATE_RATE) {
    return NextResponse.json({ error: `commission_rate debe estar entre 0 y ${MAX_AFFILIATE_RATE}%` }, { status: 400 })
  }

  const token = crypto.randomBytes(24).toString("hex")
  const tokenHash = crypto.createHash("sha256").update(token, "utf8").digest("hex")

  const supabase = getSupabaseAdmin()
  const { data, error } = await supabase
    .from("affiliates")
    .insert([{ code, name, contact, commission_rate: rate, token_hash: tokenHash, active: true }])
    .select("id, code")
    .single()
  if (error) {
    if (error.code === "23505") return NextResponse.json({ error: "Ese código ya existe" }, { status: 409 })
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  const base = process.env.NEXT_PUBLIC_APP_URL ?? "https://owner-dashboard-navy.vercel.app"
  return NextResponse.json({
    success: true,
    affiliate: data,
    token, // mostrar UNA vez
    dashboard_url: `${base}/dashboard/afiliado?token=${token}`,
    ref_example: `?ref=${data.code}`,
  })
}

// PATCH — activar/desactivar.
export async function PATCH(req: Request) {
  if (!authed(req)) return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  const body = await req.json()
  const id = String(body.id || "")
  if (!/^[0-9a-f-]{36}$/i.test(id)) return NextResponse.json({ error: "id inválido" }, { status: 400 })
  const supabase = getSupabaseAdmin()
  const { error } = await supabase.from("affiliates").update({ active: !!body.active }).eq("id", id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
