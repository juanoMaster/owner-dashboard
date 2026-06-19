// lib/schema.ts
// FASE 3 — Generadores de JSON-LD schema.org/VacationRental para Rich Results.
// Se alimenta SIEMPRE de datos reales (Supabase), nunca hardcodeado.
// Usado por la landing pública (/[slug]) y por el directorio B2C (Fase 4).
// Campos según doc de Google VacationRental:
//   developers.google.com/search/docs/appearance/structured-data/vacation-rental

export interface SchemaCabin {
  id: string
  name: string
  capacity?: number | null
  base_price_night?: number | null
  photos?: string[] | null
  description?: string | null
  amenities?: unknown // jsonb: array de strings | array de {name} | string
}

export interface SchemaTenant {
  business_name: string
  currency?: string | null
  location_text?: string | null
  country?: string | null
  latitude?: number | null
  longitude?: number | null
}

export interface SchemaReviewAgg {
  ratingValue: number // 1–5
  reviewCount: number
  reviews?: Array<{ author: string; rating: number; body: string; date?: string }>
}

export interface SchemaOptions {
  // URL canónica de la página de esta cabaña (absoluta)
  url: string
  reviews?: SchemaReviewAgg | null
  checkinTime?: string | null // "15:00:00"
  checkoutTime?: string | null // "12:00:00"
  petsAllowed?: boolean | null
}

// Normaliza amenities (jsonb heterogéneo) a lista de nombres legibles.
function amenityNames(raw: unknown): string[] {
  if (!raw) return []
  if (Array.isArray(raw)) {
    return raw
      .map((a) => (typeof a === "string" ? a : a && typeof a === "object" ? (a as any).name : null))
      .filter((s): s is string => typeof s === "string" && s.trim().length > 0)
  }
  if (typeof raw === "string") {
    return raw.split(/[,;\n]/).map((s) => s.trim()).filter(Boolean)
  }
  return []
}

// ¿Tiene los mínimos para un schema válido? (Google exige fotos y geo reales)
export interface SchemaValidity {
  ok: boolean
  warnings: string[]
}
export function checkSchemaValidity(cabin: SchemaCabin, tenant: SchemaTenant): SchemaValidity {
  const warnings: string[] = []
  const photos = (cabin.photos || []).filter(Boolean)
  if (photos.length < 8) warnings.push(`${cabin.name}: tiene ${photos.length} fotos (Google recomienda mín. 8)`)
  const hasGeo =
    typeof tenant.latitude === "number" &&
    typeof tenant.longitude === "number" &&
    Math.abs(tenant.latitude) > 0 &&
    Math.abs(tenant.longitude) > 0
  if (!hasGeo) warnings.push(`${cabin.name}: sin geo (lat/long) válida`)
  return { ok: photos.length >= 8 && hasGeo, warnings }
}

const CURRENCY_FALLBACK: Record<string, string> = { CLP: "CLP", USD: "USD", COP: "COP" }

// Construye el objeto VacationRental. Devuelve null si faltan mínimos duros
// (sin fotos o sin geo) para no emitir schema inválido.
export function buildVacationRental(
  cabin: SchemaCabin,
  tenant: SchemaTenant,
  opts: SchemaOptions
): Record<string, any> | null {
  const photos = (cabin.photos || []).filter(Boolean)
  const hasGeo =
    typeof tenant.latitude === "number" &&
    typeof tenant.longitude === "number" &&
    Math.abs(tenant.latitude) > 0 &&
    Math.abs(tenant.longitude) > 0

  // Sin fotos o sin geo → no generamos schema (evita Rich Results inválido).
  if (photos.length === 0 || !hasGeo) return null

  const currency = CURRENCY_FALLBACK[tenant.currency || "CLP"] || "CLP"
  const amenities = amenityNames(cabin.amenities)

  const node: Record<string, any> = {
    "@context": "https://schema.org",
    "@type": "VacationRental",
    "@id": opts.url + "#vacationrental",
    name: cabin.name,
    description: (cabin.description || `${cabin.name} — ${tenant.business_name}`).slice(0, 500),
    url: opts.url,
    identifier: cabin.id,
    image: photos.slice(0, 20),
    latitude: Number(tenant.latitude!.toFixed(6)),
    longitude: Number(tenant.longitude!.toFixed(6)),
    address: {
      "@type": "PostalAddress",
      addressLocality: tenant.location_text || undefined,
      addressCountry: tenant.country || "CL",
    },
    containsPlace: {
      "@type": "Accommodation",
      additionalType: "EntirePlace",
      occupancy: {
        "@type": "QuantitativeValue",
        value: cabin.capacity || 1,
        unitText: "guests",
      },
      amenityFeature: amenities.map((a) => ({
        "@type": "LocationFeatureSpecification",
        name: a,
        value: true,
      })),
    },
  }

  if (typeof cabin.base_price_night === "number" && cabin.base_price_night > 0) {
    node.offers = {
      "@type": "Offer",
      price: cabin.base_price_night,
      priceCurrency: currency,
      availability: "https://schema.org/InStock",
      url: opts.url,
    }
  }

  if (opts.checkinTime) node.checkinTime = opts.checkinTime
  if (opts.checkoutTime) node.checkoutTime = opts.checkoutTime
  if (typeof opts.petsAllowed === "boolean") node.petsAllowed = opts.petsAllowed

  // Reseñas (Fase 9). Si no hay, se omiten (no inventar).
  if (opts.reviews && opts.reviews.reviewCount > 0) {
    node.aggregateRating = {
      "@type": "AggregateRating",
      ratingValue: Number(opts.reviews.ratingValue.toFixed(1)),
      reviewCount: opts.reviews.reviewCount,
      bestRating: 5,
      worstRating: 1,
    }
    if (opts.reviews.reviews && opts.reviews.reviews.length > 0) {
      node.review = opts.reviews.reviews.slice(0, 10).map((r) => ({
        "@type": "Review",
        author: { "@type": "Person", name: r.author },
        reviewRating: { "@type": "Rating", ratingValue: r.rating, bestRating: 5, worstRating: 1 },
        reviewBody: r.body,
        ...(r.date ? { datePublished: r.date } : {}),
      }))
    }
  }

  return node
}

// BreadcrumbList para navegación (Home > Destino > Cabaña).
export function buildBreadcrumb(items: Array<{ name: string; url: string }>): Record<string, any> {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((it, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: it.name,
      item: it.url,
    })),
  }
}
