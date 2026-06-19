"use client"
import { Suspense, useEffect, useState } from "react"
import { useParams } from "next/navigation"
import TemplateClasico from "./templates/TemplateClasico"
import TemplateModerno from "./templates/TemplateModerno"
import TemplateRural from "./templates/TemplateRural"
import JsonLd from "../components/JsonLd"
import { buildVacationRental, buildBreadcrumb } from "../../lib/schema"

interface Cabin {
  id: string; name: string; capacity: number; base_price_night: number
  extra_person_price: number; photos?: string[]; description?: string
  amenities?: string; extras?: Array<{ name: string; price: number }>
  pricing_tiers?: Array<{ min_guests: number; max_guests: number; price_per_night: number }>
}
interface TenantData {
  business_name: string; slug?: string; facebook_url?: string | null; instagram_url?: string | null
  verified?: boolean; currency?: string; country?: string | null; location_text?: string | null
  location_maps_url?: string | null; tagline?: string | null
  activities?: Array<{ icon: string; name: string } | string>; page_rules?: Array<string | Record<string, string>>
  owner_whatsapp?: string | null
  latitude?: number | null; longitude?: number | null
  extra_services?: Array<{ name: string; price: number }>
  template?: string | null
  guidebook?: { checkin_time?: string; checkout_time?: string } | null
  suspended?: boolean
}

const APP_BASE = process.env.NEXT_PUBLIC_RESERVAS_URL ?? "https://reservas.takai.cl"

// JSON-LD VacationRental + BreadcrumbList por cada cabaña, desde datos reales.
function LandingSchema({ tenant, cabins, slug }: { tenant: TenantData; cabins: Cabin[]; slug: string }) {
  const nodes: Array<Record<string, any>> = []
  for (const c of cabins) {
    const url = `${APP_BASE}/${slug}#${c.id}`
    const node = buildVacationRental(
      { id: c.id, name: c.name, capacity: c.capacity, base_price_night: c.base_price_night, photos: c.photos, description: c.description, amenities: c.amenities },
      { business_name: tenant.business_name, currency: tenant.currency, location_text: tenant.location_text, country: tenant.country, latitude: tenant.latitude, longitude: tenant.longitude },
      {
        url,
        checkinTime: tenant.guidebook?.checkin_time || null,
        checkoutTime: tenant.guidebook?.checkout_time || null,
      }
    )
    if (node) nodes.push(node)
  }
  if (nodes.length === 0) return null
  nodes.push(buildBreadcrumb([
    { name: "Inicio", url: APP_BASE },
    { name: tenant.business_name, url: `${APP_BASE}/${slug}` },
  ]))
  return <JsonLd data={nodes} />
}

function SlugInner() {
  const params = useParams()
  const slug = params.slug as string
  const [tenant, setTenant] = useState<TenantData | null>(null)
  const [cabins, setCabins] = useState<Cabin[]>([])
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  useEffect(function() {
    if (!slug) return
    let cancelled = false
    function tryFetch(attempt: number) {
      fetch("/api/tenant/" + slug + "/cabins")
        .then(function(r) {
          if (!r.ok) {
            if (attempt < 2 && !cancelled) { setTimeout(function() { tryFetch(attempt + 1) }, 800 * (attempt + 1)) }
            else if (!cancelled) { setNotFound(true); setLoading(false) }
            return null
          }
          return r.json()
        })
        .then(function(d) {
          if (!d || cancelled) return
          setTenant(d.tenant); setCabins(d.cabins || []); setLoading(false)
        })
        .catch(function() {
          if (attempt < 2 && !cancelled) { setTimeout(function() { tryFetch(attempt + 1) }, 800 * (attempt + 1)) }
          else if (!cancelled) { setNotFound(true); setLoading(false) }
        })
    }
    tryFetch(0)
    return function() { cancelled = true }
  }, [slug])

  if (loading) return (
    <div style={{ background: "#060606", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ color: "#2a2a2a", fontFamily: "sans-serif", fontSize: "11px", letterSpacing: "3px" }}>CARGANDO</div>
    </div>
  )
  if (notFound || !tenant) return (
    <div style={{ background: "#060606", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ color: "#2a2a2a", fontFamily: "sans-serif", fontSize: "12px" }}>No encontrado</div>
    </div>
  )

  if (tenant.suspended) return (
    <div style={{ background: "#060606", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: "16px" }}>
      <div style={{ color: "#555", fontFamily: "Georgia, serif", fontSize: "22px" }}>{tenant.business_name}</div>
      <div style={{ color: "#444", fontFamily: "sans-serif", fontSize: "14px", textAlign: "center", maxWidth: "320px", lineHeight: "1.6" }}>
        Las reservas en línea no están disponibles temporalmente.
        <br />Para reservar contáctanos directamente.
      </div>
    </div>
  )

  const template = tenant.template ?? "clasico"
  const schema = <LandingSchema tenant={tenant} cabins={cabins} slug={slug} />
  if (template === "moderno") return <>{schema}<TemplateModerno tenant={tenant} cabins={cabins} /></>
  if (template === "rural") return <>{schema}<TemplateRural tenant={tenant} cabins={cabins} /></>
  return <>{schema}<TemplateClasico tenant={tenant} cabins={cabins} /></>
}

export default function SlugPage() {
  return (
    <Suspense fallback={<div style={{ background: "#060606", minHeight: "100vh" }} />}>
      <SlugInner />
    </Suspense>
  )
}
