export const dynamic = "force-dynamic"

import { NextResponse } from "next/server"
import { getSupabaseAdmin } from "@/lib/supabase-server"
import { cabinPublishReadiness } from "@/lib/cabin-validation"

function authed(req: Request): boolean {
  return !!process.env.ADMIN_TOKEN && req.headers.get("x-admin-token") === process.env.ADMIN_TOKEN
}

// GET /api/admin/cabins/readiness — para cada cabaña activa, si está lista para
// publicarse en el directorio y qué le falta. Alimenta el wizard de alta (Fase 10).
export async function GET(req: Request) {
  if (!authed(req)) return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  const supabase = getSupabaseAdmin()

  const { data: cabins, error } = await supabase
    .from("cabins")
    .select("id, name, description, capacity, base_price_night, photos, tenant_id, active, tenants(business_name, latitude, longitude, location_text)")
    .eq("active", true)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const result = (cabins || []).map((c) => {
    const t = (c.tenants as any) || {}
    const readiness = cabinPublishReadiness(
      { name: c.name, description: c.description, capacity: c.capacity, base_price_night: c.base_price_night, photos: c.photos },
      { latitude: t.latitude, longitude: t.longitude, location_text: t.location_text }
    )
    return {
      cabin_id: c.id,
      cabin_name: c.name,
      business_name: t.business_name || "",
      ready: readiness.ready,
      missing: readiness.missing,
    }
  })

  return NextResponse.json({
    cabins: result,
    ready_count: result.filter((r) => r.ready).length,
    total: result.length,
  })
}
