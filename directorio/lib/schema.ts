// Schema VacationRental para el directorio (copia del lib/schema del owner-dashboard;
// proyecto separado). Genera JSON-LD desde datos reales.
import type { DirCabin } from "./data"

function amenityNames(raw: unknown): string[] {
  if (!raw) return []
  if (Array.isArray(raw)) return raw.map((a) => (typeof a === "string" ? a : (a as any)?.name)).filter((s): s is string => typeof s === "string" && s.trim().length > 0)
  if (typeof raw === "string") return raw.split(/[,;\n]/).map((s) => s.trim()).filter(Boolean)
  return []
}

const CUR: Record<string, string> = { CLP: "CLP", USD: "USD", COP: "COP" }

export function buildVacationRental(cabin: DirCabin, url: string): Record<string, any> | null {
  const photos = (cabin.photos || []).filter(Boolean)
  const lat = cabin.tenant.latitude, lng = cabin.tenant.longitude
  const hasGeo = typeof lat === "number" && typeof lng === "number" && lat !== 0 && lng !== 0
  if (photos.length === 0 || !hasGeo) return null
  const currency = CUR[cabin.tenant.currency || "CLP"] || "CLP"
  const node: Record<string, any> = {
    "@context": "https://schema.org",
    "@type": "VacationRental",
    "@id": url + "#vr",
    name: cabin.name,
    description: (cabin.description || cabin.name).slice(0, 500),
    url,
    identifier: cabin.id,
    image: photos.slice(0, 20),
    latitude: Number(lat!.toFixed(6)),
    longitude: Number(lng!.toFixed(6)),
    address: { "@type": "PostalAddress", addressLocality: cabin.tenant.location_text || undefined, addressCountry: cabin.tenant.country || "CL" },
    containsPlace: {
      "@type": "Accommodation",
      additionalType: "EntirePlace",
      occupancy: { "@type": "QuantitativeValue", value: cabin.capacity || 1, unitText: "guests" },
      amenityFeature: amenityNames(cabin.amenities).map((a) => ({ "@type": "LocationFeatureSpecification", name: a, value: true })),
    },
  }
  if (cabin.base_price_night && cabin.base_price_night > 0) {
    node.offers = { "@type": "Offer", price: cabin.base_price_night, priceCurrency: currency, availability: "https://schema.org/InStock", url }
  }
  // Reseñas (Fase 9). Si no hay, se omiten (no inventar) — igual que el owner-dashboard.
  if (cabin.review_summary && cabin.review_summary.count > 0) {
    node.aggregateRating = {
      "@type": "AggregateRating",
      ratingValue: Number(cabin.review_summary.average.toFixed(1)),
      reviewCount: cabin.review_summary.count,
      bestRating: 5,
      worstRating: 1,
    }
    if (cabin.review_summary.reviews.length > 0) {
      node.review = cabin.review_summary.reviews.slice(0, 10).map((r) => ({
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

export function buildBreadcrumb(items: Array<{ name: string; url: string }>): Record<string, any> {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((it, i) => ({ "@type": "ListItem", position: i + 1, name: it.name, item: it.url })),
  }
}
