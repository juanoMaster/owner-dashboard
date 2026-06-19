export const dynamic = "force-dynamic"
import { NextResponse } from "next/server"
import { getSupabaseAdmin, getSupabaseForTenant } from "@/lib/supabase-server"
import crypto from "crypto"

async function tenantFromToken(token: string | null): Promise<string | null> {
  if (!token) return null
  const supabaseAdmin = getSupabaseAdmin()
  const tokenHash = crypto.createHash("sha256").update(token, "utf8").digest("hex")
  const { data: link } = await supabaseAdmin
    .from("dashboard_links").select("tenant_id").eq("token_hash", tokenHash).eq("active", true).maybeSingle()
  return link?.tenant_id || null
}

// GET /api/tenant/gbp?token=... — devuelve place_id/url guardados + reseñas Google
// (estas últimas solo si GOOGLE_PLACES_API_KEY está configurada; si no, se omiten).
export async function GET(req: Request) {
  const url = new URL(req.url)
  const tenantId = await tenantFromToken(url.searchParams.get("token"))
  if (!tenantId) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const supabase = getSupabaseAdmin()
  const { data: tenant } = await supabase
    .from("tenants").select("google_place_id, google_business_url").eq("id", tenantId).single()

  let googleReviews: any = null
  const apiKey = process.env.GOOGLE_PLACES_API_KEY
  if (apiKey && tenant?.google_place_id) {
    try {
      const r = await fetch(
        `https://maps.googleapis.com/maps/api/place/details/json?place_id=${encodeURIComponent(tenant.google_place_id)}&fields=rating,user_ratings_total,reviews&key=${apiKey}`,
        { cache: "no-store" }
      )
      const j = await r.json()
      if (j.result) {
        googleReviews = {
          rating: j.result.rating ?? null,
          total: j.result.user_ratings_total ?? null,
          reviews: (j.result.reviews || []).slice(0, 5).map((rv: any) => ({
            author: rv.author_name, rating: rv.rating, text: rv.text, time: rv.relative_time_description,
          })),
        }
      }
    } catch { /* opcional: si falla, no rompe */ }
  }

  return NextResponse.json({
    google_place_id: tenant?.google_place_id || null,
    google_business_url: tenant?.google_business_url || null,
    google_reviews: googleReviews,
    places_api_enabled: !!apiKey,
  })
}

// PATCH /api/tenant/gbp — { token, google_place_id?, google_business_url? }
export async function PATCH(req: Request) {
  try {
    const body = await req.json()
    const tenantId = await tenantFromToken(body.token)
    if (!tenantId) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

    const payload: Record<string, any> = {}
    if (body.google_place_id !== undefined) {
      const pid = String(body.google_place_id || "").trim().slice(0, 200)
      payload.google_place_id = pid || null
    }
    if (body.google_business_url !== undefined) {
      const u = String(body.google_business_url || "").trim().slice(0, 500)
      if (u && !/^https?:\/\//i.test(u)) {
        return NextResponse.json({ error: "La URL debe empezar con http(s)://" }, { status: 400 })
      }
      payload.google_business_url = u || null
    }
    if (Object.keys(payload).length === 0) {
      return NextResponse.json({ error: "Nada que actualizar" }, { status: 400 })
    }

    const supabase = await getSupabaseForTenant(tenantId)
    const { error } = await supabase.from("tenants").update(payload).eq("id", tenantId)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ success: true })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
