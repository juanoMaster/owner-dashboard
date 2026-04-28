export const dynamic = "force-dynamic"

import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { getResend } from "@/lib/resend"
import { generarResumenSemanal, type ResumenReserva } from "@/lib/email-templates/resumen-semanal"

const TAKAI_COMMISSION_RATE = 0.10

/** Derives gender from a Spanish first name using a suffix heuristic. */
function detectarGenero(ownerName: string): "male" | "female" {
  const primerNombre = ownerName.trim().split(/\s+/)[0].toLowerCase()
  return primerNombre.endsWith("a") ? "female" : "male"
}

/** Formats a Date as "lunes 21 de abril" in Chilean Spanish. */
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

/**
 * Computes the Monday–Sunday range of the previous calendar week.
 * Safe to call any day of the week; always returns the completed week.
 */
function rangoSemanaPasada(): { weekStart: Date; weekEnd: Date } {
  const now = new Date()
  const dayOfWeek = now.getUTCDay() // 0=Sun, 1=Mon … 6=Sat

  // Days elapsed since last Monday (today inclusive)
  const daysSinceMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1

  const weekStart = new Date(now)
  weekStart.setUTCDate(now.getUTCDate() - daysSinceMonday - 7)
  weekStart.setUTCHours(0, 0, 0, 0)

  const weekEnd = new Date(weekStart)
  weekEnd.setUTCDate(weekStart.getUTCDate() + 6)
  weekEnd.setUTCHours(23, 59, 59, 999)

  return { weekStart, weekEnd }
}

type TenantResult = {
  tenant: string
  status: "sent" | "skipped" | "error"
  reservas_count: number
  monto_neto: number
  error?: string
}

export async function GET() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { global: { fetch: (url, options = {}) => fetch(url, { ...options, cache: "no-store" }) } }
  )

  try {
    // 1. Fetch all active tenants with an owner email configured
    const { data: tenants, error: tenantsError } = await supabase
      .from("tenants")
      .select("id, business_name, owner_name, email_owner")
      .eq("active", true)
      .not("email_owner", "is", null)

    if (tenantsError) throw tenantsError
    if (!tenants || tenants.length === 0) {
      return NextResponse.json({ message: "No hay tenants activos con email configurado", results: [] })
    }

    const { weekStart, weekEnd } = rangoSemanaPasada()
    const results: TenantResult[] = []

    for (const tenant of tenants) {
      try {
        // 2. Fetch confirmed bookings for this tenant in the past week
        const { data: bookings, error: bookingsError } = await supabase
          .from("bookings")
          .select("booking_code, guest_name, check_in, check_out, nights, total_amount, cabin_id, cabins(name)")
          .eq("tenant_id", tenant.id)
          .eq("status", "confirmed")
          .is("deleted_at", null)
          .gte("created_at", weekStart.toISOString())
          .lte("created_at", weekEnd.toISOString())

        if (bookingsError) throw bookingsError

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

        await getResend().emails.send({
          from: "Takai.cl <contacto@takai.cl>",
          to: tenant.email_owner,
          subject: "Resumen semanal — " + tenant.business_name + " · Takai.cl",
          html,
        })

        results.push({
          tenant: tenant.business_name,
          status: "sent",
          reservas_count: reservas.length,
          monto_neto,
        })
      } catch (err: any) {
        results.push({
          tenant: tenant.business_name,
          status: "error",
          reservas_count: 0,
          monto_neto: 0,
          error: err?.message ?? "Error desconocido",
        })
      }
    }

    return NextResponse.json({ results })
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message ?? "Error interno" },
      { status: 500 }
    )
  }
}
