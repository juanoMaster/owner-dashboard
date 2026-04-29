export const dynamic = "force-dynamic"

import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { generarResumenSemanal, type ResumenReserva } from "@/lib/email-templates/resumen-semanal"

const TAKAI_COMMISSION_RATE = 0.10
const PREVIEW_SLUG = "rukatraro"

function detectarGenero(ownerName: string): "male" | "female" {
  const primerNombre = ownerName.trim().split(/\s+/)[0].toLowerCase()
  return primerNombre.endsWith("a") ? "female" : "male"
}

function formatDiaSemana(d: Date): string {
  return d
    .toLocaleDateString("es-CL", {
      weekday: "long",
      day: "numeric",
      month: "long",
      timeZone: "UTC",
    })
    .replace(",", "")
}

function rangoSemanaPasada(): { weekStart: Date; weekEnd: Date } {
  const now = new Date()
  const dayOfWeek = now.getUTCDay()
  const daysSinceMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1

  const weekStart = new Date(now)
  weekStart.setUTCDate(now.getUTCDate() - daysSinceMonday - 7)
  weekStart.setUTCHours(0, 0, 0, 0)

  const weekEnd = new Date(weekStart)
  weekEnd.setUTCDate(weekStart.getUTCDate() + 6)
  weekEnd.setUTCHours(23, 59, 59, 999)

  return { weekStart, weekEnd }
}

export async function GET() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { global: { fetch: (url, options = {}) => fetch(url, { ...options, cache: "no-store" }) } }
  )

  const { data: tenant, error: tenantError } = await supabase
    .from("tenants")
    .select("id, business_name, owner_name")
    .eq("slug", PREVIEW_SLUG)
    .eq("active", true)
    .single()

  if (tenantError || !tenant) {
    return NextResponse.json({ error: "Tenant no encontrado" }, { status: 404 })
  }

  const { weekStart, weekEnd } = rangoSemanaPasada()

  const { data: bookings, error: bookingsError } = await supabase
    .from("bookings")
    .select("booking_code, guest_name, check_in, check_out, nights, total_amount, cabins(name)")
    .eq("tenant_id", tenant.id)
    .eq("status", "confirmed")
    .is("deleted_at", null)
    .gte("created_at", weekStart.toISOString())
    .lte("created_at", weekEnd.toISOString())

  if (bookingsError) {
    return NextResponse.json({ error: bookingsError.message }, { status: 500 })
  }

  const reservas: ResumenReserva[] = (bookings ?? []).map((b: any) => ({
    booking_code: b.booking_code ?? "—",
    guest_name: b.guest_name ?? "—",
    cabin_name: b.cabins?.name ?? "—",
    check_in: b.check_in,
    check_out: b.check_out,
    nights: b.nights ?? 0,
    total_amount: Number(b.total_amount) || 0,
  }))

  const total_bruto = reservas.reduce((sum, r) => sum + r.total_amount, 0)
  const comision_takai = Math.round(total_bruto * TAKAI_COMMISSION_RATE)
  const monto_neto = total_bruto - comision_takai

  const html = generarResumenSemanal({
    business_name: tenant.business_name,
    owner_name: tenant.owner_name,
    gender: detectarGenero(tenant.owner_name),
    semana_desde: formatDiaSemana(weekStart),
    semana_hasta: formatDiaSemana(weekEnd),
    reservas,
    total_bruto,
    comision_takai,
    monto_neto,
  })

  return new Response(html, {
    headers: { "Content-Type": "text/html" },
  })
}
