"use client"
import { Suspense, useEffect, useState } from "react"
import { useParams } from "next/navigation"
import TemplateClasico from "./templates/TemplateClasico"
import TemplateModerno from "./templates/TemplateModerno"
import TemplateRural from "./templates/TemplateRural"

interface Cabin {
  id: string; name: string; capacity: number; base_price_night: number
  extra_person_price: number; photos?: string[]; description?: string
  amenities?: string; extras?: Array<{ name: string; price: number }>
  pricing_tiers?: Array<{ min_guests: number; max_guests: number; price_per_night: number }>
}
interface TenantData {
  business_name: string; facebook_url?: string | null; instagram_url?: string | null
  verified?: boolean; currency?: string; location_text?: string | null
  location_maps_url?: string | null; tagline?: string | null
  activities?: Array<{ icon: string; name: string } | string>; page_rules?: Array<string | Record<string, string>>
  owner_whatsapp?: string | null
  latitude?: number | null; longitude?: number | null
  extra_services?: Array<{ name: string; price: number }>
  template?: string | null
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

  const template = tenant.template ?? "clasico"
  if (template === "moderno") return <TemplateModerno tenant={tenant} cabins={cabins} />
  if (template === "rural") return <TemplateRural tenant={tenant} cabins={cabins} />
  return <TemplateClasico tenant={tenant} cabins={cabins} />
}

export default function SlugPage() {
  return (
    <Suspense fallback={<div style={{ background: "#060606", minHeight: "100vh" }} />}>
      <SlugInner />
    </Suspense>
  )
}
