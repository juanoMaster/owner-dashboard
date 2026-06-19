import { getSupabaseAdmin } from "@/lib/supabase-server"
import { NextResponse } from "next/server"

export const dynamic = "force-dynamic"

export async function GET(_req: Request, { params }: { params: { slug: string } }) {
  const supabase = getSupabaseAdmin()

  const { data: tenant } = await supabase
    .from("tenants")
    .select("id, slug, business_name, owner_name, owner_whatsapp, facebook_url, instagram_url, verified, currency, country, location_text, location_maps_url, tagline, activities, page_rules, latitude, longitude, extra_services, template, billing_status, manual_billing, guidebook")
    .eq("slug", params.slug)
    .eq("active", true)
    .maybeSingle()

  if (!tenant) {
    return NextResponse.json({ error: "Tenant no encontrado" }, { status: 404 })
  }

  const { data: cabins } = await supabase
    .from("cabins")
    .select("id, name, capacity, base_price_night, extra_person_price, photos, description, amenities, extras, active, pricing_tiers")
    .eq("tenant_id", tenant.id)
    .eq("active", true)
    .order("name")

  // Reseñas aprobadas por cabaña (Fase 9 → alimentan aggregateRating del schema)
  const cabinList = cabins || []
  const reviewsByCabin: Record<string, { count: number; average: number; reviews: Array<{ author: string; rating: number; body: string; date?: string }> }> = {}
  if (cabinList.length > 0) {
    const { data: revs } = await supabase
      .from("reviews")
      .select("cabin_id, rating, comment, guest_name, created_at")
      .eq("tenant_id", tenant.id)
      .eq("status", "approved")
      .in("cabin_id", cabinList.map((c) => c.id))
    for (const r of revs || []) {
      const key = r.cabin_id as string
      if (!reviewsByCabin[key]) reviewsByCabin[key] = { count: 0, average: 0, reviews: [] }
      const bucket = reviewsByCabin[key]
      bucket.count++
      bucket.average += r.rating || 0
      if (bucket.reviews.length < 10) {
        bucket.reviews.push({ author: r.guest_name || "Huésped", rating: r.rating, body: r.comment || "", date: (r.created_at || "").split("T")[0] })
      }
    }
    for (const key of Object.keys(reviewsByCabin)) {
      const b = reviewsByCabin[key]
      b.average = b.count > 0 ? Math.round((b.average / b.count) * 10) / 10 : 0
    }
  }
  const cabinsWithReviews = cabinList.map((c) => ({ ...c, review_summary: reviewsByCabin[c.id] || null }))

  return NextResponse.json({
    tenant: {
      id: tenant.id,
      slug: tenant.slug,
      business_name: tenant.business_name,
      owner_name: tenant.owner_name,
      country: tenant.country || null,
      guidebook: tenant.guidebook || null,
      owner_whatsapp: tenant.owner_whatsapp,
      facebook_url: tenant.facebook_url || null,
      instagram_url: tenant.instagram_url || null,
      verified: tenant.verified || false,
      currency: tenant.currency || "CLP",
      location_text: tenant.location_text || null,
      location_maps_url: tenant.location_maps_url || null,
      tagline: tenant.tagline || null,
      activities: tenant.activities || [],
      page_rules: tenant.page_rules || [],
      latitude: tenant.latitude ?? null,
      longitude: tenant.longitude ?? null,
      extra_services: tenant.extra_services || [],
      template: tenant.template || "clasico",
      suspended: !tenant.manual_billing && tenant.billing_status === "suspended",
      // Número del agente WhatsApp (compartido del sistema). null si no hay agente.
      agent_whatsapp: (process.env.TWILIO_WHATSAPP_FROM || "").replace("whatsapp:", "") || null,
    },
    cabins: cabinsWithReviews,
  })
}
