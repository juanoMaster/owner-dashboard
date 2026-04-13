export const dynamic = "force-dynamic"

import { createClient } from "@supabase/supabase-js"
import { NextResponse } from "next/server"

function ymd(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, "0")
  const day = String(d.getDate()).padStart(2, "0")
  return `${y}-${m}-${day}`
}

/** Noches ocupadas: check_in inclusive hasta día anterior a check_out (mismo criterio que el resto del sistema). */
function expandOccupiedNightDates(checkIn: string, checkOut: string): string[] {
  const out: string[] = []
  const start = new Date(checkIn + "T12:00:00")
  const end = new Date(checkOut + "T12:00:00")
  for (let d = new Date(start); d < end; d.setDate(d.getDate() + 1)) {
    out.push(ymd(d))
  }
  return out
}

function parseYmd(s: string): number {
  const [y, m, d] = s.split("-").map(Number)
  return new Date(y, m - 1, d).getTime()
}

export async function GET(_req: Request, { params }: { params: { slug: string } }) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { global: { fetch: (url, options = {}) => fetch(url, { ...options, cache: "no-store" }) } }
  )

  const slug = params.slug
  if (!slug) {
    return NextResponse.json({ error: "Slug requerido" }, { status: 400 })
  }

  const { data: tenant, error: tenantErr } = await supabase
    .from("tenants")
    .select("id, business_name, slug")
    .eq("slug", slug)
    .eq("active", true)
    .maybeSingle()

  if (tenantErr) {
    return NextResponse.json({ error: "Error al buscar negocio" }, { status: 500 })
  }
  if (!tenant) {
    return NextResponse.json({ error: "Negocio no encontrado" }, { status: 404 })
  }

  const { data: cabins, error: cabinsErr } = await supabase
    .from("cabins")
    .select("id, name, capacity, base_price_night")
    .eq("tenant_id", tenant.id)
    .eq("active", true)
    .order("name")

  if (cabinsErr) {
    return NextResponse.json({ error: "Error al cargar cabañas" }, { status: 500 })
  }

  const cabinList = cabins ?? []
  const cabinIds = cabinList.map((c) => c.id)
  const today = new Date()
  const windowStart = new Date(today.getFullYear(), today.getMonth(), today.getDate())
  const windowEnd = new Date(windowStart)
  windowEnd.setMonth(windowEnd.getMonth() + 3)

  if (cabinIds.length === 0) {
    return NextResponse.json(
      {
        business_name: tenant.business_name,
        slug: tenant.slug,
        window_start: ymd(windowStart),
        window_end: ymd(windowEnd),
        cabins: [],
      },
      { headers: { "Cache-Control": "no-store" } }
    )
  }

  const windowStartStr = ymd(windowStart)
  const windowEndStr = ymd(windowEnd)
  const windowStartMs = parseYmd(windowStartStr)
  const windowEndMs = parseYmd(windowEndStr)

  const { data: bookingRows, error: bookErr } = await supabase
    .from("bookings")
    .select("cabin_id, check_in, check_out, status")
    .in("cabin_id", cabinIds)
    .is("deleted_at", null)

  if (bookErr) {
    return NextResponse.json({ error: "Error al cargar reservas" }, { status: 500 })
  }

  const activeBookings = (bookingRows ?? []).filter((b) => String(b.status || "").toLowerCase() !== "cancelled")

  const overlapWindow = activeBookings.filter((b) => {
    const ci = parseYmd(b.check_in)
    const co = parseYmd(b.check_out)
    return ci < windowEndMs && co > windowStartMs
  })

  const byCabin: Record<string, Set<string>> = {}
  for (const c of cabinList) {
    byCabin[c.id] = new Set()
  }

  for (const b of overlapWindow) {
    const set = byCabin[b.cabin_id]
    if (!set) continue
    for (const day of expandOccupiedNightDates(b.check_in, b.check_out)) {
      const t = parseYmd(day)
      if (t >= windowStartMs && t < windowEndMs) {
        set.add(day)
      }
    }
  }

  return NextResponse.json(
    {
      business_name: tenant.business_name,
      slug: tenant.slug,
      window_start: windowStartStr,
      window_end: windowEndStr,
      cabins: cabinList.map((c) => ({
        id: c.id,
        name: c.name,
        capacity: c.capacity,
        base_price_night: c.base_price_night,
        occupied_dates: Array.from(byCabin[c.id] ?? []).sort(),
      })),
    },
    { headers: { "Cache-Control": "no-store, no-cache, must-revalidate", "CDN-Cache-Control": "no-store" } }
  )
}
