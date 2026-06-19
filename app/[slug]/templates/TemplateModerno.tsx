"use client"
import { useState } from "react"
import ReviewStars from "@/app/components/ReviewStars"

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
}

const ACCENT = "#1a5c2e"
const SANS = "system-ui, -apple-system, 'Segoe UI', sans-serif"

function fmtPrice(n: number, currency: string) {
  if (currency === "USD") return "$" + Number(n).toFixed(0)
  if (currency === "COP") return "$" + Math.round(n).toLocaleString("es-CO")
  return "$" + Math.round(n).toLocaleString("es-CL")
}

function CabinPhoto({ photos, name }: { photos?: string[]; name: string }) {
  const [idx, setIdx] = useState(0)
  const list = photos && photos.length > 0 ? photos : []
  if (list.length === 0) return (
    <div style={{ height: "220px", background: "#e8f0ea", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <svg width="40" height="34" viewBox="0 0 48 40" fill="none">
        <path d="M24 4L44 20L44 38L4 38L4 20Z" fill="#c5d9c8" stroke="#9bbfa0" strokeWidth="1.5" strokeLinejoin="round"/>
        <path d="M24 4L44 20L4 20Z" fill="#d4e6d6" stroke="#9bbfa0" strokeWidth="1.5" strokeLinejoin="round"/>
        <rect x="18" y="26" width="12" height="12" rx="2" fill="#b8d4bc" stroke="#9bbfa0" strokeWidth="1"/>
      </svg>
    </div>
  )
  return (
    <div style={{ position: "relative", height: "220px", overflow: "hidden" }}>
      <img src={list[idx]} alt={name} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
      {list.length > 1 && (
        <div style={{ position: "absolute", bottom: "10px", left: 0, right: 0, display: "flex", justifyContent: "center", gap: "5px" }}>
          {list.map((_, i) => (
            <div key={i} onClick={() => setIdx(i)}
              style={{ width: i === idx ? "18px" : "6px", height: "6px", borderRadius: "3px", background: i === idx ? "#fff" : "rgba(255,255,255,0.5)", cursor: "pointer", transition: "all 0.2s" }} />
          ))}
        </div>
      )}
    </div>
  )
}

export default function TemplateModerno({ tenant, cabins }: { tenant: TenantData; cabins: Cabin[] }) {
  const currency = tenant.currency || "CLP"
  const fmt = (n: number) => fmtPrice(n, currency)
  const allPhotos = cabins.flatMap(c => c.photos || []).filter(Boolean)
  const heroPhoto = allPhotos[0] || null
  const tagline = tenant.tagline || "Desconéctate y vive algo especial"
  const sortedCabins = [...cabins].sort((a, b) => a.base_price_night - b.base_price_night)
  const activities = tenant.activities && tenant.activities.length > 0 ? tenant.activities : null
  const rulesRaw = tenant.page_rules ? (tenant.page_rules as unknown[]).filter((r) => typeof r === "string") as string[] : []
  const rules = rulesRaw.length > 0 ? rulesRaw : null

  return (
    <div style={{ fontFamily: SANS, background: "#ffffff", minHeight: "100vh", color: "#1a1a1a" }}>

      {/* NAV */}
      <nav style={{ position: "fixed", top: 0, left: 0, right: 0, zIndex: 100, background: "#ffffff", borderBottom: "1px solid #e5e5e5", boxShadow: "0 1px 8px rgba(0,0,0,0.06)" }}>
        <div style={{ maxWidth: "1200px", margin: "0 auto", padding: "0 24px", display: "flex", alignItems: "center", justifyContent: "space-between", height: "60px" }}>
          <span style={{ fontSize: "16px", fontWeight: 700, color: ACCENT, letterSpacing: "-0.3px" }}>{tenant.business_name}</span>
          {tenant.verified && (
            <span style={{ fontSize: "11px", color: ACCENT, background: "#e8f5ec", border: "1px solid #b8dcbf", borderRadius: "20px", padding: "3px 12px", fontWeight: 600 }}>
              Verificado
            </span>
          )}
        </div>
      </nav>

      {/* HERO */}
      <div style={{ position: "relative", height: "520px", marginTop: "60px", overflow: "hidden" }}>
        {heroPhoto ? (
          <img src={heroPhoto} alt={tenant.business_name} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
        ) : (
          <div style={{ width: "100%", height: "100%", background: "linear-gradient(135deg,#1a5c2e,#2d8a4e)" }} />
        )}
        <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.52)" }} />
        <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column" as const, alignItems: "center", justifyContent: "center", textAlign: "center" as const, padding: "0 32px" }}>
          <div style={{ fontSize: "12px", fontWeight: 600, letterSpacing: "3px", textTransform: "uppercase" as const, color: "rgba(255,255,255,0.7)", marginBottom: "16px" }}>
            {tenant.business_name}
          </div>
          <h1 style={{ fontFamily: SANS, fontSize: "clamp(28px,5vw,56px)", fontWeight: 300, color: "#ffffff", lineHeight: 1.1, margin: "0 0 20px", maxWidth: "700px" }}>
            {tagline}
          </h1>
          {tenant.location_text && (
            <div style={{ fontSize: "13px", color: "rgba(255,255,255,0.65)", marginBottom: "28px" }}>
              {tenant.location_text}
              {tenant.location_maps_url && (
                <a href={tenant.location_maps_url} target="_blank" rel="noopener noreferrer"
                  style={{ color: "rgba(255,255,255,0.8)", textDecoration: "underline", marginLeft: "8px" }}>
                  Ver en Maps
                </a>
              )}
            </div>
          )}
          <a href="#cabanas" style={{ display: "inline-flex", alignItems: "center", gap: "8px", background: "#ffffff", color: ACCENT, borderRadius: "30px", padding: "13px 32px", fontSize: "13px", fontWeight: 700, textDecoration: "none", letterSpacing: "0.5px" }}
            onClick={e => { e.preventDefault(); document.getElementById("cabanas")?.scrollIntoView({ behavior: "smooth" }) }}>
            Ver cabañas disponibles
          </a>
        </div>
      </div>

      {/* CABAÑAS */}
      <div id="cabanas" style={{ maxWidth: "1200px", margin: "0 auto", padding: "60px 24px" }}>
        <h2 style={{ fontSize: "28px", fontWeight: 700, color: "#111", marginBottom: "8px", letterSpacing: "-0.5px" }}>
          Nuestras cabañas
        </h2>
        <p style={{ fontSize: "15px", color: "#666", marginBottom: "40px" }}>
          Reserva directo con el propietario, sin intermediarios.
        </p>
        <div style={{ display: "flex", flexWrap: "wrap" as const, gap: "28px" }}>
          {sortedCabins.map(cabin => {
            const amenitiesList = cabin.amenities ? cabin.amenities.split("\n").filter(Boolean) : []
            const minPrice = cabin.pricing_tiers && cabin.pricing_tiers.length > 0
              ? Math.min(...cabin.pricing_tiers.map(t => t.price_per_night))
              : cabin.base_price_night
            const hasTiers = cabin.pricing_tiers && cabin.pricing_tiers.length > 0
            return (
              <div key={cabin.id} style={{ flex: "1 1 320px", maxWidth: "420px", background: "#ffffff", border: "1px solid #e5e5e5", borderRadius: "16px", overflow: "hidden", boxShadow: "0 2px 16px rgba(0,0,0,0.06)", display: "flex", flexDirection: "column" as const }}>
                <CabinPhoto photos={cabin.photos} name={cabin.name} />
                <div style={{ padding: "24px", display: "flex", flexDirection: "column" as const, flex: 1 }}>
                  <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "10px", gap: "12px" }}>
                    <h3 style={{ fontSize: "20px", fontWeight: 700, color: "#111", margin: 0, lineHeight: 1.2 }}>{cabin.name}</h3>
                    <span style={{ fontSize: "11px", color: "#666", background: "#f5f5f5", borderRadius: "6px", padding: "4px 8px", whiteSpace: "nowrap" as const, flexShrink: 0 }}>
                      Hasta {cabin.capacity} pers.
                    </span>
                  </div>
                  <ReviewStars summary={cabin.review_summary} textColor="#888" />
                  {cabin.description && (
                    <p style={{ fontSize: "14px", color: "#555", lineHeight: 1.7, marginBottom: "16px" }}>{cabin.description}</p>
                  )}
                  {amenitiesList.length > 0 && (
                    <div style={{ display: "flex", flexWrap: "wrap" as const, gap: "6px", marginBottom: "20px" }}>
                      {amenitiesList.map((am, i) => (
                        <span key={i} style={{ fontSize: "12px", color: ACCENT, background: "#e8f5ec", borderRadius: "6px", padding: "4px 10px" }}>{am.trim()}</span>
                      ))}
                    </div>
                  )}
                  <div style={{ marginTop: "auto", paddingTop: "16px", borderTop: "1px solid #f0f0f0" }}>
                    <div style={{ marginBottom: "14px" }}>
                      {hasTiers && <div style={{ fontSize: "12px", color: "#888", marginBottom: "2px" }}>desde</div>}
                      <span style={{ fontSize: "30px", fontWeight: 800, color: ACCENT }}>{fmt(minPrice)}</span>
                      <span style={{ fontSize: "13px", color: "#888", marginLeft: "4px" }}>/ noche</span>
                    </div>
                    <a href={"/reservar?cabin_id=" + cabin.id + "&cabin_name=" + encodeURIComponent(cabin.name) + "&price=" + cabin.base_price_night + "&capacity=" + cabin.capacity + (cabin.pricing_tiers && cabin.pricing_tiers.length > 0 ? "&tiers=" + encodeURIComponent(JSON.stringify(cabin.pricing_tiers)) : "")}
                      style={{ display: "block", width: "100%", background: "#111111", color: "#ffffff", borderRadius: "10px", padding: "14px 0", textAlign: "center" as const, fontSize: "13px", fontWeight: 700, textDecoration: "none", letterSpacing: "0.5px", boxSizing: "border-box" as const }}>
                      Reservar ahora
                    </a>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* ACTIVIDADES */}
      {activities && (
        <div style={{ background: "#f8faf8", padding: "48px 24px" }}>
          <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
            <h2 style={{ fontSize: "22px", fontWeight: 700, color: "#111", marginBottom: "24px" }}>Qué hacer cerca</h2>
            <div style={{ display: "flex", flexWrap: "wrap" as const, gap: "12px" }}>
              {activities.map((act, i) => {
                const actIcon = typeof act === "string" ? "📍" : act.icon
                const actName = typeof act === "string" ? act : act.name
                return (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: "8px", background: "#ffffff", border: "1px solid #e5e5e5", borderRadius: "10px", padding: "10px 16px" }}>
                    <span style={{ fontSize: "20px" }}>{actIcon}</span>
                    <span style={{ fontSize: "13px", color: "#444", fontWeight: 500 }}>{actName}</span>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {/* NORMAS */}
      {rules && (
        <div style={{ maxWidth: "1200px", margin: "0 auto", padding: "40px 24px" }}>
          <h2 style={{ fontSize: "20px", fontWeight: 700, color: "#111", marginBottom: "20px" }}>Normas del lugar</h2>
          <div style={{ display: "flex", flexWrap: "wrap" as const, gap: "10px" }}>
            {rules.map((rule, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: "8px", background: "#fff5f5", border: "1px solid #ffd5d5", borderRadius: "8px", padding: "8px 14px" }}>
                <span style={{ color: "#e63946", fontSize: "12px", fontWeight: 700 }}>✕</span>
                <span style={{ fontSize: "13px", color: "#444" }}>{rule}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* REDES SOCIALES */}
      {(tenant.instagram_url || tenant.facebook_url) && (
        <div style={{ background: "#f8f8f8", padding: "32px 24px" }}>
          <div style={{ maxWidth: "1200px", margin: "0 auto", display: "flex", gap: "12px", flexWrap: "wrap" as const }}>
            {tenant.instagram_url && (
              <a href={tenant.instagram_url} target="_blank" rel="noopener noreferrer"
                style={{ display: "inline-flex", alignItems: "center", gap: "8px", background: "#fff", border: "1px solid #ddd", borderRadius: "8px", padding: "10px 18px", textDecoration: "none", color: "#333", fontSize: "13px", fontWeight: 500 }}>
                <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="20" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="0.8" fill="currentColor" stroke="none"/></svg>
                Instagram
              </a>
            )}
            {tenant.facebook_url && (
              <a href={tenant.facebook_url} target="_blank" rel="noopener noreferrer"
                style={{ display: "inline-flex", alignItems: "center", gap: "8px", background: "#fff", border: "1px solid #ddd", borderRadius: "8px", padding: "10px 18px", textDecoration: "none", color: "#333", fontSize: "13px", fontWeight: 500 }}>
                <svg viewBox="0 0 24 24" width="15" height="15" fill="currentColor"><path d="M18 2h-3a5 5 0 00-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 011-1h3z"/></svg>
                Facebook
              </a>
            )}
          </div>
        </div>
      )}

      {/* FOOTER */}
      <footer style={{ background: "#111", color: "#666", padding: "24px", textAlign: "center" as const }}>
        <div style={{ fontSize: "13px", color: "#aaa", marginBottom: "4px", fontWeight: 600 }}>{tenant.business_name}</div>
        <div style={{ fontSize: "11px", color: "#444" }}>Powered by Takai.cl</div>
      </footer>
    </div>
  )
}
