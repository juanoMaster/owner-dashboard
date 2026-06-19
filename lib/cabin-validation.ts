// lib/cabin-validation.ts — Fase 10/4.
// Define cuándo una cabaña está lista para publicarse (directorio + schema SEO).
// Mismo criterio que usa el directorio para decidir qué renderiza: una cabaña
// incompleta NO se publica (evita SEO inválido y fichas pobres).

export interface PublishCabin {
  name?: string | null
  description?: string | null
  capacity?: number | null
  base_price_night?: number | null
  photos?: string[] | null
}
export interface PublishTenant {
  latitude?: number | null
  longitude?: number | null
  location_text?: string | null
}

export interface PublishReadiness {
  ready: boolean
  missing: string[]
}

function geoHas5Decimals(v: number | null | undefined): boolean {
  if (typeof v !== "number" || !isFinite(v) || v === 0) return false
  // al menos 5 decimales de precisión (Google lo exige para VacationRental)
  const decimals = (String(v).split(".")[1] || "").length
  return decimals >= 5
}

export function cabinPublishReadiness(cabin: PublishCabin, tenant: PublishTenant): PublishReadiness {
  const missing: string[] = []

  if (!cabin.name || cabin.name.trim().length < 2) missing.push("nombre")
  if (!cabin.description || cabin.description.trim().length < 30) missing.push("descripción (mín. 30 caracteres)")
  if (!cabin.capacity || cabin.capacity < 1) missing.push("capacidad")
  if (!cabin.base_price_night || cabin.base_price_night <= 0) missing.push("precio base")

  const photos = (cabin.photos || []).filter(Boolean)
  if (photos.length < 8) missing.push(`fotos (${photos.length}/8 mínimo)`)

  const hasGeo = geoHas5Decimals(tenant.latitude) && geoHas5Decimals(tenant.longitude)
  if (!hasGeo) missing.push("geo (lat/long con 5+ decimales)")

  if (!tenant.location_text || tenant.location_text.trim().length < 3) missing.push("ubicación (texto)")

  return { ready: missing.length === 0, missing }
}
