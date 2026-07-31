import { getSupabase } from "./supabase"
import { matchDestino, Destino } from "./destinos"

export interface DirReviewSummary {
  count: number
  average: number
  reviews: Array<{ author: string; rating: number; body: string; date?: string }>
}

export interface DirCabin {
  id: string
  name: string
  capacity: number | null
  base_price_night: number | null
  photos: string[]
  description: string | null
  amenities: unknown
  review_summary: DirReviewSummary | null
  tenant: {
    id: string
    slug: string | null
    business_name: string
    currency: string | null
    location_text: string | null
    latitude: number | null
    longitude: number | null
    country: string | null
  }
  destino?: Destino
}

function geo5(v: number | null | undefined): boolean {
  if (typeof v !== "number" || !isFinite(v) || v === 0) return false
  return (String(v).split(".")[1] || "").length >= 5
}

// Una cabaña se publica en el directorio solo si está completa (8 fotos + geo +
// datos mínimos). Mismo criterio que lib/cabin-validation del owner-dashboard.
export function isPublishable(c: { name?: string | null; description?: string | null; capacity?: number | null; base_price_night?: number | null; photos?: string[] | null; latitude?: number | null; longitude?: number | null; location_text?: string | null }): boolean {
  if (!c.name || !c.description || c.description.trim().length < 30) return false
  if (!c.capacity || c.capacity < 1) return false
  if (!c.base_price_night || c.base_price_night <= 0) return false
  if ((c.photos || []).filter(Boolean).length < 8) return false
  if (!geo5(c.latitude) || !geo5(c.longitude)) return false
  if (!c.location_text || c.location_text.trim().length < 3) return false
  return true
}

// Trae todas las cabañas activas, no eliminadas y publicables. SSG/ISR-friendly.
export async function getPublishedCabins(): Promise<DirCabin[]> {
  const supabase = getSupabase()
  const { data: tenants } = await supabase
    .from("tenants")
    .select("id, slug, business_name, currency, location_text, latitude, longitude, country, active, billing_status, manual_billing")
    .eq("active", true)

  const okTenants = (tenants || []).filter(
    (t: any) => t.manual_billing || t.billing_status !== "suspended"
  )
  const tenantById = new Map(okTenants.map((t: any) => [t.id, t]))
  if (okTenants.length === 0) return []

  const { data: cabins } = await supabase
    .from("cabins")
    .select("id, tenant_id, name, capacity, base_price_night, photos, description, amenities, active")
    .eq("active", true)
    .in("tenant_id", okTenants.map((t: any) => t.id))

  const result: DirCabin[] = []
  for (const c of cabins || []) {
    const t: any = tenantById.get((c as any).tenant_id)
    if (!t) continue
    const photos = ((c as any).photos || []).filter(Boolean)
    const publishable = isPublishable({
      name: (c as any).name, description: (c as any).description, capacity: (c as any).capacity,
      base_price_night: (c as any).base_price_night, photos,
      latitude: t.latitude, longitude: t.longitude, location_text: t.location_text,
    })
    if (!publishable) continue
    result.push({
      id: (c as any).id,
      name: (c as any).name,
      capacity: (c as any).capacity,
      base_price_night: (c as any).base_price_night,
      photos,
      description: (c as any).description,
      amenities: (c as any).amenities,
      review_summary: null,
      tenant: {
        id: t.id, slug: t.slug, business_name: t.business_name, currency: t.currency,
        location_text: t.location_text, latitude: t.latitude, longitude: t.longitude, country: t.country,
      },
      destino: matchDestino(t.location_text),
    })
  }

  // Reseñas aprobadas por cabaña (misma agregación que la landing del owner;
  // alimentan aggregateRating del schema y la sección de reseñas).
  if (result.length > 0) {
    const { data: revs } = await supabase
      .from("reviews")
      .select("cabin_id, rating, comment, guest_name, created_at")
      .eq("status", "approved")
      .in("cabin_id", result.map((c) => c.id))
      .order("created_at", { ascending: false })
    const byCabin = new Map<string, DirReviewSummary>()
    for (const r of revs || []) {
      const key = (r as any).cabin_id as string
      let bucket = byCabin.get(key)
      if (!bucket) { bucket = { count: 0, average: 0, reviews: [] }; byCabin.set(key, bucket) }
      bucket.count++
      bucket.average += (r as any).rating || 0
      if (bucket.reviews.length < 10) {
        bucket.reviews.push({
          author: (r as any).guest_name || "Huésped",
          rating: (r as any).rating,
          body: (r as any).comment || "",
          date: (((r as any).created_at as string) || "").split("T")[0] || undefined,
        })
      }
    }
    for (const bucket of Array.from(byCabin.values())) {
      bucket.average = bucket.count > 0 ? Math.round((bucket.average / bucket.count) * 10) / 10 : 0
    }
    for (const c of result) c.review_summary = byCabin.get(c.id) || null
  }

  return result
}

export async function getCabinById(id: string): Promise<DirCabin | null> {
  const all = await getPublishedCabins()
  return all.find((c) => c.id === id) || null
}

export async function getCabinsByDestino(destinoSlug: string): Promise<DirCabin[]> {
  const all = await getPublishedCabins()
  return all.filter((c) => c.destino?.slug === destinoSlug)
}

// Los códigos se crean en minúsculas desde el admin. Normalizarlos al entrar al
// directorio evita perder la atribución por mayúsculas o caracteres inválidos.
export function normalizeAffiliateRef(value: unknown): string | null {
  const raw = Array.isArray(value) ? value[0] : value
  if (typeof raw !== "string") return null
  const normalized = raw.trim().toLowerCase()
  return /^[a-z0-9_-]{1,64}$/.test(normalized) ? normalized : null
}

// Link al motor de reservas existente con atribución de origen (Fase 4/7).
export function reservaUrl(cabin: DirCabin, ref?: string | null): string {
  const base = process.env.NEXT_PUBLIC_RESERVAS_URL ?? "https://reservas.takai.cl"
  const params = new URLSearchParams({ cabin_id: cabin.id, source: "directory" })
  if (ref) params.set("ref", ref)
  return `${base}/reservar?${params.toString()}`
}
