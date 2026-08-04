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

// Paleta cinematográfica: negro cálido + bronce. Contraste alto para que la
// fotografía del propietario sea la protagonista absoluta.
const BG = "#0b0b0d"
const SURF = "#141417"
const LINE = "#26262b"
const TEXT = "#f2efe9"
const MUTED = "#8f8b84"
const BRONZE = "#c08b4a"
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

// Galería grande con navegación lateral — el foco visual de esta plantilla.
function Gallery({ photos, name }: { photos?: string[]; name: string }) {
  const [idx, setIdx] = useState(0)
  const list = photos && photos.length > 0 ? photos : []

  if (list.length === 0) {
    return (
      <div style={{ width: "100%", height: "100%", minHeight: "340px", background: SURF, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <span style={{ color: LINE, fontFamily: SANS, fontSize: "11px", letterSpacing: "3px" }}>SIN FOTOGRAFÍAS</span>
      </div>
    )
  }

  const go = (delta: number) => setIdx((prev) => (prev + delta + list.length) % list.length)

  return (
    <div style={{ position: "relative", width: "100%", height: "100%", minHeight: "340px", overflow: "hidden", background: SURF }}>
      <img src={list[idx]} alt={name} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
      <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, rgba(11,11,13,0.45) 0%, transparent 45%)", pointerEvents: "none" as const }} />
      {list.length > 1 && (
        <>
          <button
            onClick={() => go(-1)}
            aria-label="Foto anterior"
            style={{ position: "absolute", left: "14px", top: "50%", transform: "translateY(-50%)", width: "38px", height: "38px", borderRadius: "50%", background: "rgba(11,11,13,0.55)", border: "1px solid rgba(242,239,233,0.25)", color: TEXT, fontSize: "16px", cursor: "pointer", lineHeight: 1 }}
          >
            ‹
          </button>
          <button
            onClick={() => go(1)}
            aria-label="Foto siguiente"
            style={{ position: "absolute", right: "14px", top: "50%", transform: "translateY(-50%)", width: "38px", height: "38px", borderRadius: "50%", background: "rgba(11,11,13,0.55)", border: "1px solid rgba(242,239,233,0.25)", color: TEXT, fontSize: "16px", cursor: "pointer", lineHeight: 1 }}
          >
            ›
          </button>
          <div style={{ position: "absolute", bottom: "16px", left: 0, right: 0, display: "flex", justifyContent: "center", gap: "6px" }}>
            {list.map((_, i) => (
              <div
                key={i}
                onClick={() => setIdx(i)}
                style={{ width: i === idx ? "24px" : "7px", height: "3px", background: i === idx ? BRONZE : "rgba(242,239,233,0.4)", cursor: "pointer", transition: "all 0.25s" }}
              />
            ))}
          </div>
        </>
      )}
    </div>
  )
}

function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "18px" }}>
      <span style={{ width: "28px", height: "1px", background: BRONZE }} />
      <span style={{ fontFamily: SANS, fontSize: "10px", letterSpacing: "3.5px", textTransform: "uppercase" as const, color: BRONZE }}>
        {children}
      </span>
    </div>
  )
}

export default function TemplatePremium({ tenant, cabins }: { tenant: TenantData; cabins: Cabin[] }) {
  const currency = tenant.currency || "CLP"
  const fmt = (n: number) => fmtPrice(n, currency)
  const allPhotos = cabins.flatMap((c) => c.photos || []).filter(Boolean)
  const heroPhoto = allPhotos[0] || null
  const tagline = tenant.tagline || "Un lugar para volver al silencio"
  const sortedCabins = [...cabins].sort((a, b) => a.base_price_night - b.base_price_night)
  const activities = tenant.activities && tenant.activities.length > 0 ? tenant.activities : null
  const rulesRaw = tenant.page_rules ? (tenant.page_rules as unknown[]).filter((r) => typeof r === "string") as string[] : []
  const rules = rulesRaw.length > 0 ? rulesRaw : null

  return (
    <div style={{ fontFamily: SANS, background: BG, minHeight: "100vh", color: TEXT }}>

      {/* HERO a pantalla completa */}
      <div style={{ position: "relative", minHeight: "92vh", overflow: "hidden", display: "flex", alignItems: "flex-end" }}>
        {heroPhoto ? (
          <img src={heroPhoto} alt={tenant.business_name} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} />
        ) : (
          <div style={{ position: "absolute", inset: 0, background: "linear-gradient(160deg,#1b1b20,#0b0b0d)" }} />
        )}
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to bottom, rgba(11,11,13,0.55) 0%, rgba(11,11,13,0.2) 35%, rgba(11,11,13,0.92) 100%)" }} />

        <div style={{ position: "absolute", top: 0, left: 0, right: 0, padding: "26px 32px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px" }}>
          <span style={{ fontFamily: SANS, fontSize: "11px", letterSpacing: "4px", textTransform: "uppercase" as const, color: TEXT }}>
            {tenant.business_name}
          </span>
          {tenant.verified && (
            <span style={{ fontFamily: SANS, fontSize: "9.5px", letterSpacing: "2px", textTransform: "uppercase" as const, color: BRONZE, border: "1px solid rgba(192,139,74,0.45)", borderRadius: "20px", padding: "4px 12px" }}>
              Verificado
            </span>
          )}
        </div>

        <div style={{ position: "relative", zIndex: 1, width: "100%", maxWidth: "1180px", margin: "0 auto", padding: "0 32px 72px" }}>
          <Eyebrow>{tenant.location_text || "Naturaleza"}</Eyebrow>
          <h1 style={{ fontFamily: SERIF, fontSize: "clamp(34px,6vw,74px)", fontWeight: 400, lineHeight: 1.05, margin: "0 0 26px", maxWidth: "780px", letterSpacing: "-0.5px" }}>
            {tagline}
          </h1>
          <a
            href="#cabanas"
            onClick={(e) => { e.preventDefault(); document.getElementById("cabanas")?.scrollIntoView({ behavior: "smooth" }) }}
            style={{ display: "inline-block", background: BRONZE, color: "#120d06", padding: "15px 38px", fontFamily: SANS, fontSize: "12px", fontWeight: 700, letterSpacing: "2px", textTransform: "uppercase" as const, textDecoration: "none" }}
          >
            Ver disponibilidad
          </a>
        </div>
      </div>

      {/* CABAÑAS — filas alternadas a lo ancho */}
      <div id="cabanas" style={{ maxWidth: "1180px", margin: "0 auto", padding: "88px 32px 40px" }}>
        <Eyebrow>Alojamientos</Eyebrow>
        <h2 style={{ fontFamily: SERIF, fontSize: "clamp(26px,3.5vw,40px)", fontWeight: 400, margin: "0 0 8px", letterSpacing: "-0.3px" }}>
          Elige dónde quedarte
        </h2>
        <p style={{ fontFamily: SANS, fontSize: "14px", color: MUTED, margin: "0 0 56px", maxWidth: "520px", lineHeight: 1.7 }}>
          Reserva en línea con disponibilidad real y confirmación inmediata.
        </p>

        <div style={{ display: "flex", flexDirection: "column" as const, gap: "72px" }}>
          {sortedCabins.map((cabin, i) => {
            const amenitiesList = cabin.amenities ? cabin.amenities.split("\n").filter(Boolean) : []
            const hasTiers = !!(cabin.pricing_tiers && cabin.pricing_tiers.length > 0)
            const minPrice = hasTiers
              ? Math.min(...cabin.pricing_tiers!.map((t) => t.price_per_night))
              : cabin.base_price_night

            return (
              <div
                key={cabin.id}
                id={cabin.id}
                style={{ display: "flex", flexWrap: "wrap" as const, flexDirection: i % 2 === 0 ? "row" : "row-reverse", gap: "0", border: "1px solid " + LINE, background: SURF, overflow: "hidden" }}
              >
                <div style={{ flex: "1 1 400px", minHeight: "340px" }}>
                  <Gallery photos={cabin.photos} name={cabin.name} />
                </div>

                <div style={{ flex: "1 1 380px", padding: "40px 38px", display: "flex", flexDirection: "column" as const }}>
                  <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "14px", marginBottom: "10px" }}>
                    <h3 style={{ fontFamily: SERIF, fontSize: "27px", fontWeight: 400, margin: 0, lineHeight: 1.2 }}>{cabin.name}</h3>
                    <span style={{ fontFamily: SANS, fontSize: "10px", letterSpacing: "1.5px", color: MUTED, border: "1px solid " + LINE, padding: "5px 11px", whiteSpace: "nowrap" as const, flexShrink: 0 }}>
                      {cabin.capacity} PERSONAS
                    </span>
                  </div>

                  <ReviewStars summary={cabin.review_summary} textColor={MUTED} />

                  {cabin.description && (
                    <p style={{ fontFamily: SANS, fontSize: "14.5px", color: MUTED, lineHeight: 1.85, margin: "6px 0 22px" }}>
                      {cabin.description}
                    </p>
                  )}

                  {amenitiesList.length > 0 && (
                    <div style={{ display: "flex", flexWrap: "wrap" as const, gap: "8px", marginBottom: "26px" }}>
                      {amenitiesList.map((am, k) => (
                        <span key={k} style={{ fontFamily: SANS, fontSize: "11.5px", color: TEXT, background: "rgba(242,239,233,0.05)", border: "1px solid " + LINE, padding: "6px 12px" }}>
                          {am.trim()}
                        </span>
                      ))}
                    </div>
                  )}

                  <div style={{ marginTop: "auto", paddingTop: "24px", borderTop: "1px solid " + LINE }}>
                    <div style={{ marginBottom: "20px" }}>
                      {hasTiers && (
                        <div style={{ fontFamily: SANS, fontSize: "10px", letterSpacing: "2px", color: MUTED, marginBottom: "4px", textTransform: "uppercase" as const }}>Desde</div>
                      )}
                      <span style={{ fontFamily: SERIF, fontSize: "38px", color: TEXT, letterSpacing: "-1px" }}>{fmt(minPrice)}</span>
                      <span style={{ fontFamily: SANS, fontSize: "13px", color: MUTED, marginLeft: "8px" }}>por noche</span>
                    </div>
                    <a
                      href={reservarHref(cabin)}
                      style={{ display: "block", width: "100%", boxSizing: "border-box" as const, background: BRONZE, color: "#120d06", padding: "16px 0", textAlign: "center" as const, fontFamily: SANS, fontSize: "12px", fontWeight: 700, letterSpacing: "2px", textTransform: "uppercase" as const, textDecoration: "none" }}
                    >
                      Reservar
                    </a>
                    <WhatsAppCabinButton agentWhatsapp={tenant.agent_whatsapp} slug={tenant.slug} cabinId={cabin.id} cabinName={cabin.name} />
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* ACTIVIDADES */}
      {activities && (
        <div style={{ borderTop: "1px solid " + LINE, marginTop: "48px" }}>
          <div style={{ maxWidth: "1180px", margin: "0 auto", padding: "64px 32px" }}>
            <Eyebrow>En los alrededores</Eyebrow>
            <div style={{ display: "flex", flexWrap: "wrap" as const, gap: "14px" }}>
              {activities.map((act, i) => {
                const actIcon = typeof act === "string" ? "📍" : act.icon
                const actName = typeof act === "string" ? act : act.name
                return (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: "10px", background: SURF, border: "1px solid " + LINE, padding: "13px 20px" }}>
                    <span style={{ fontSize: "19px" }}>{actIcon}</span>
                    <span style={{ fontFamily: SANS, fontSize: "13px", color: TEXT }}>{actName}</span>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {/* CÓMO LLEGAR */}
      {tenant.latitude && tenant.longitude && (
        <div style={{ borderTop: "1px solid " + LINE }}>
          <div style={{ maxWidth: "1180px", margin: "0 auto", padding: "64px 32px" }}>
            <Eyebrow>Cómo llegar</Eyebrow>
            {tenant.location_text && (
              <p style={{ fontFamily: SANS, fontSize: "14px", color: MUTED, margin: "0 0 24px" }}>{tenant.location_text}</p>
            )}
            <MapaUbicacion latitude={tenant.latitude} longitude={tenant.longitude} nombre={tenant.business_name} modo="exacto" />
            <a
              href={"https://www.google.com/maps/dir/?api=1&destination=" + tenant.latitude + "," + tenant.longitude}
              target="_blank"
              rel="noopener noreferrer"
              style={{ display: "inline-block", marginTop: "18px", border: "1px solid " + BRONZE, color: BRONZE, padding: "13px 28px", fontFamily: SANS, fontSize: "11.5px", fontWeight: 700, letterSpacing: "2px", textTransform: "uppercase" as const, textDecoration: "none" }}
            >
              📍 Indicaciones en Google Maps
            </a>
          </div>
        </div>
      )}

      {/* NORMAS */}
      {rules && (
        <div style={{ borderTop: "1px solid " + LINE }}>
          <div style={{ maxWidth: "1180px", margin: "0 auto", padding: "56px 32px" }}>
            <Eyebrow>Antes de reservar</Eyebrow>
            <div style={{ display: "flex", flexWrap: "wrap" as const, gap: "10px" }}>
              {rules.map((rule, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: "10px", border: "1px solid " + LINE, padding: "10px 16px" }}>
                  <span style={{ color: "#c25b5b", fontSize: "11px" }}>✕</span>
                  <span style={{ fontFamily: SANS, fontSize: "13px", color: MUTED }}>{rule}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Sin redes ni contacto del dueño (regla 2026-08-03): el turista habla
          con el agente Takai hasta que su reserva esté pagada. */}

      <footer style={{ borderTop: "1px solid " + LINE, padding: "40px 32px", textAlign: "center" as const }}>
        <div style={{ fontFamily: SERIF, fontSize: "17px", color: TEXT, marginBottom: "6px" }}>{tenant.business_name}</div>
        <div style={{ fontFamily: SANS, fontSize: "10.5px", letterSpacing: "2px", color: MUTED, textTransform: "uppercase" as const }}>Powered by Takai.cl</div>
      </footer>
    </div>
  )
}
