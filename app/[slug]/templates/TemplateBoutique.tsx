"use client"
import { useState } from "react"
import dynamic from "next/dynamic"
import ReviewStars from "@/app/components/ReviewStars"
import WhatsAppCabinButton from "@/app/components/WhatsAppCabinButton"

const MapaUbicacion = dynamic(() => import("@/app/components/MapaUbicacion"), { ssr: false })

interface Cabin {
  id: string; name: string; capacity: number; base_price_night: number
  extra_person_price: number; photos?: string[]; description?: string
  amenities?: string; extras?: Array<{ name: string; price: number }>
  pricing_tiers?: Array<{ min_guests: number; max_guests: number; price_per_night: number }>
  review_summary?: { count: number; average: number } | null
}
interface TenantData {
  business_name: string; facebook_url?: string | null; instagram_url?: string | null
  verified?: boolean; currency?: string; location_text?: string | null
  location_maps_url?: string | null; tagline?: string | null
  activities?: Array<{ icon: string; name: string } | string>; page_rules?: Array<string | Record<string, string>>
  owner_whatsapp?: string | null; template?: string | null
  agent_whatsapp?: string | null
  slug?: string | null
  latitude?: number | null; longitude?: number | null
}

// Paleta papel: calma, aire y tipografía. Pensada para alojamientos que
// quieren verse sobrios y caros sin gritar.
const PAPER = "#fbfaf8"
const INK = "#1c1b19"
const MUTED = "#8a857c"
const HAIR = "#e4e0d8"
const SAGE = "#6f7a63"
const SERIF = "Georgia, 'Times New Roman', serif"
const SANS = "system-ui, -apple-system, 'Segoe UI', sans-serif"

function fmtPrice(n: number, currency: string) {
  if (currency === "USD") return "$" + Number(n).toFixed(0)
  if (currency === "COP") return "$" + Math.round(n).toLocaleString("es-CO")
  return "$" + Math.round(n).toLocaleString("es-CL")
}

function reservarHref(cabin: Cabin) {
  return "/reservar?cabin_id=" + cabin.id +
    "&cabin_name=" + encodeURIComponent(cabin.name) +
    "&price=" + cabin.base_price_night +
    "&capacity=" + cabin.capacity +
    (cabin.pricing_tiers && cabin.pricing_tiers.length > 0
      ? "&tiers=" + encodeURIComponent(JSON.stringify(cabin.pricing_tiers))
      : "")
}

function Label({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ fontFamily: SANS, fontSize: "10px", letterSpacing: "3.5px", textTransform: "uppercase" as const, color: SAGE, marginBottom: "14px" }}>
      {children}
    </div>
  )
}

// Mosaico: una foto grande + tira de miniaturas. Sin flechas ni cromos.
function PhotoSet({ photos, name }: { photos?: string[]; name: string }) {
  const [idx, setIdx] = useState(0)
  const list = photos && photos.length > 0 ? photos : []

  if (list.length === 0) {
    return (
      <div style={{ width: "100%", height: "300px", background: "#f1eee8", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <span style={{ fontFamily: SANS, fontSize: "10px", letterSpacing: "3px", color: MUTED }}>SIN FOTOGRAFÍAS</span>
      </div>
    )
  }

  return (
    <div>
      <div style={{ width: "100%", height: "clamp(260px,42vw,440px)", overflow: "hidden", background: "#f1eee8" }}>
        <img src={list[idx]} alt={name} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
      </div>
      {list.length > 1 && (
        <div style={{ display: "flex", gap: "8px", marginTop: "8px", flexWrap: "wrap" as const }}>
          {list.slice(0, 6).map((p, i) => (
            <div
              key={i}
              onClick={() => setIdx(i)}
              style={{ width: "72px", height: "54px", overflow: "hidden", cursor: "pointer", opacity: i === idx ? 1 : 0.5, outline: i === idx ? "1px solid " + INK : "1px solid " + HAIR, outlineOffset: "-1px", transition: "opacity 0.2s" }}
            >
              <img src={p} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default function TemplateBoutique({ tenant, cabins }: { tenant: TenantData; cabins: Cabin[] }) {
  const currency = tenant.currency || "CLP"
  const fmt = (n: number) => fmtPrice(n, currency)
  const allPhotos = cabins.flatMap((c) => c.photos || []).filter(Boolean)
  const heroPhoto = allPhotos[0] || null
  const tagline = tenant.tagline || "Descanso simple, bien hecho"
  const sortedCabins = [...cabins].sort((a, b) => a.base_price_night - b.base_price_night)
  const activities = tenant.activities && tenant.activities.length > 0 ? tenant.activities : null
  const rulesRaw = tenant.page_rules ? (tenant.page_rules as unknown[]).filter((r) => typeof r === "string") as string[] : []
  const rules = rulesRaw.length > 0 ? rulesRaw : null

  return (
    <div style={{ fontFamily: SANS, background: PAPER, minHeight: "100vh", color: INK }}>

      {/* CABECERA tipográfica, sin barra fija */}
      <header style={{ maxWidth: "980px", margin: "0 auto", padding: "44px 28px 0", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px" }}>
        <span style={{ fontFamily: SANS, fontSize: "11px", letterSpacing: "4px", textTransform: "uppercase" as const, color: INK }}>
          {tenant.business_name}
        </span>
        {tenant.verified && (
          <span style={{ fontFamily: SANS, fontSize: "9.5px", letterSpacing: "2px", textTransform: "uppercase" as const, color: SAGE }}>
            Verificado
          </span>
        )}
      </header>

      {/* TITULAR */}
      <div style={{ maxWidth: "980px", margin: "0 auto", padding: "52px 28px 40px" }}>
        <h1 style={{ fontFamily: SERIF, fontSize: "clamp(32px,5.5vw,60px)", fontWeight: 400, lineHeight: 1.12, margin: "0 0 22px", maxWidth: "700px", letterSpacing: "-0.5px" }}>
          {tagline}
        </h1>
        {tenant.location_text && (
          <p style={{ fontFamily: SANS, fontSize: "14px", color: MUTED, margin: 0, letterSpacing: "0.3px" }}>
            {tenant.location_text}
          </p>
        )}
      </div>

      {/* FOTO DE APERTURA a sangre */}
      {heroPhoto && (
        <div style={{ width: "100%", height: "clamp(280px,48vw,540px)", overflow: "hidden", background: "#f1eee8", marginBottom: "8px" }}>
          <img src={heroPhoto} alt={tenant.business_name} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
        </div>
      )}

      {/* CABAÑAS en columna, con mucho aire */}
      <div id="cabanas" style={{ maxWidth: "980px", margin: "0 auto", padding: "72px 28px 24px" }}>
        <Label>Alojamientos</Label>
        <h2 style={{ fontFamily: SERIF, fontSize: "clamp(24px,3.2vw,34px)", fontWeight: 400, margin: "0 0 56px", letterSpacing: "-0.2px" }}>
          Nuestras cabañas
        </h2>

        <div style={{ display: "flex", flexDirection: "column" as const, gap: "80px" }}>
          {sortedCabins.map((cabin) => {
            const amenitiesList = cabin.amenities ? cabin.amenities.split("\n").filter(Boolean) : []
            const hasTiers = !!(cabin.pricing_tiers && cabin.pricing_tiers.length > 0)
            const minPrice = hasTiers
              ? Math.min(...cabin.pricing_tiers!.map((t) => t.price_per_night))
              : cabin.base_price_night

            return (
              <article key={cabin.id} id={cabin.id}>
                <PhotoSet photos={cabin.photos} name={cabin.name} />

                <div style={{ display: "flex", flexWrap: "wrap" as const, gap: "36px", marginTop: "28px" }}>
                  {/* Columna de texto */}
                  <div style={{ flex: "1 1 340px" }}>
                    <div style={{ display: "flex", alignItems: "baseline", gap: "14px", flexWrap: "wrap" as const, marginBottom: "8px" }}>
                      <h3 style={{ fontFamily: SERIF, fontSize: "26px", fontWeight: 400, margin: 0, letterSpacing: "-0.2px" }}>{cabin.name}</h3>
                      <span style={{ fontFamily: SANS, fontSize: "11px", letterSpacing: "1.5px", color: MUTED, textTransform: "uppercase" as const }}>
                        Hasta {cabin.capacity} personas
                      </span>
                    </div>

                    <ReviewStars summary={cabin.review_summary} textColor={MUTED} />

                    {cabin.description && (
                      <p style={{ fontFamily: SANS, fontSize: "15px", color: "#4a473f", lineHeight: 1.9, margin: "10px 0 20px" }}>
                        {cabin.description}
                      </p>
                    )}

                    {amenitiesList.length > 0 && (
                      <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexWrap: "wrap" as const, gap: "6px 22px" }}>
                        {amenitiesList.map((am, k) => (
                          <li key={k} style={{ fontFamily: SANS, fontSize: "13px", color: MUTED, display: "flex", alignItems: "center", gap: "8px" }}>
                            <span style={{ width: "4px", height: "4px", borderRadius: "50%", background: SAGE, display: "inline-block", flexShrink: 0 }} />
                            {am.trim()}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>

                  {/* Columna de precio y acción */}
                  <div style={{ flex: "0 1 260px", minWidth: "230px", borderTop: "1px solid " + HAIR, paddingTop: "20px" }}>
                    {hasTiers && (
                      <div style={{ fontFamily: SANS, fontSize: "10px", letterSpacing: "2.5px", textTransform: "uppercase" as const, color: MUTED, marginBottom: "4px" }}>Desde</div>
                    )}
                    <div style={{ marginBottom: "20px" }}>
                      <span style={{ fontFamily: SERIF, fontSize: "34px", letterSpacing: "-0.8px" }}>{fmt(minPrice)}</span>
                      <span style={{ fontFamily: SANS, fontSize: "13px", color: MUTED, marginLeft: "7px" }}>/ noche</span>
                    </div>
                    <a
                      href={reservarHref(cabin)}
                      style={{ display: "block", width: "100%", boxSizing: "border-box" as const, background: INK, color: PAPER, padding: "15px 0", textAlign: "center" as const, fontFamily: SANS, fontSize: "12px", fontWeight: 600, letterSpacing: "1.8px", textTransform: "uppercase" as const, textDecoration: "none" }}
                    >
                      Reservar
                    </a>
                    <WhatsAppCabinButton agentWhatsapp={tenant.agent_whatsapp} slug={tenant.slug} cabinId={cabin.id} cabinName={cabin.name} />
                  </div>
                </div>
              </article>
            )
          })}
        </div>
      </div>

      {/* ACTIVIDADES */}
      {activities && (
        <div style={{ maxWidth: "980px", margin: "0 auto", padding: "64px 28px 0" }}>
          <div style={{ borderTop: "1px solid " + HAIR, paddingTop: "48px" }}>
            <Label>En los alrededores</Label>
            <div style={{ display: "flex", flexWrap: "wrap" as const, gap: "10px 28px" }}>
              {activities.map((act, i) => {
                const actIcon = typeof act === "string" ? "📍" : act.icon
                const actName = typeof act === "string" ? act : act.name
                return (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: "9px" }}>
                    <span style={{ fontSize: "17px" }}>{actIcon}</span>
                    <span style={{ fontFamily: SANS, fontSize: "14px", color: "#4a473f" }}>{actName}</span>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {/* CÓMO LLEGAR */}
      {tenant.latitude && tenant.longitude && (
        <div style={{ maxWidth: "980px", margin: "0 auto", padding: "56px 28px 0" }}>
          <div style={{ borderTop: "1px solid " + HAIR, paddingTop: "48px" }}>
            <Label>Cómo llegar</Label>
            {tenant.location_text && (
              <p style={{ fontFamily: SANS, fontSize: "14px", color: MUTED, margin: "0 0 22px" }}>{tenant.location_text}</p>
            )}
            <MapaUbicacion latitude={tenant.latitude} longitude={tenant.longitude} nombre={tenant.business_name} modo="exacto" />
            <a
              href={"https://www.google.com/maps/dir/?api=1&destination=" + tenant.latitude + "," + tenant.longitude}
              target="_blank"
              rel="noopener noreferrer"
              style={{ display: "inline-block", marginTop: "18px", border: "1px solid " + INK, color: INK, padding: "13px 26px", fontFamily: SANS, fontSize: "11.5px", fontWeight: 600, letterSpacing: "1.8px", textTransform: "uppercase" as const, textDecoration: "none" }}
            >
              📍 Indicaciones en Google Maps
            </a>
          </div>
        </div>
      )}

      {/* NORMAS */}
      {rules && (
        <div style={{ maxWidth: "980px", margin: "0 auto", padding: "56px 28px 0" }}>
          <div style={{ borderTop: "1px solid " + HAIR, paddingTop: "48px" }}>
            <Label>Antes de reservar</Label>
            <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column" as const, gap: "9px" }}>
              {rules.map((rule, i) => (
                <li key={i} style={{ fontFamily: SANS, fontSize: "14px", color: "#4a473f", display: "flex", alignItems: "center", gap: "10px" }}>
                  <span style={{ color: "#b45b5b", fontSize: "11px" }}>✕</span>
                  {rule}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* Sin redes ni contacto del dueño (regla 2026-08-03): el turista habla
          con el agente Takai hasta que su reserva esté pagada. */}

      <footer style={{ maxWidth: "980px", margin: "72px auto 0", padding: "32px 28px 44px", borderTop: "1px solid " + HAIR, textAlign: "center" as const }}>
        <div style={{ fontFamily: SERIF, fontSize: "17px", marginBottom: "6px" }}>{tenant.business_name}</div>
        <div style={{ fontFamily: SANS, fontSize: "10.5px", letterSpacing: "2px", color: MUTED, textTransform: "uppercase" as const }}>Powered by Takai.cl</div>
      </footer>
    </div>
  )
}
