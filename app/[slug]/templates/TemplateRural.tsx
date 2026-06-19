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

const BROWN = "#6b4c2a"
const GREEN = "#4a7c3f"
const BG = "#f5f0e8"
const CARD_BG = "#fffdf7"
const BORDER = "#ddd0b8"
const TEXT = "#2a1f10"
const MUTED = "#8a7060"
const SERIF = "Georgia, 'Times New Roman', serif"
const SANS = "system-ui, -apple-system, sans-serif"

function fmtPrice(n: number, currency: string) {
  if (currency === "USD") return "$" + Number(n).toFixed(0)
  if (currency === "COP") return "$" + Math.round(n).toLocaleString("es-CO")
  return "$" + Math.round(n).toLocaleString("es-CL")
}

function CabinPhoto({ photos, name }: { photos?: string[]; name: string }) {
  const [idx, setIdx] = useState(0)
  const list = photos && photos.length > 0 ? photos : []
  if (list.length === 0) return (
    <div style={{ width: "260px", flexShrink: 0, height: "200px", background: "#e8ddc8", display: "flex", alignItems: "center", justifyContent: "center", borderRadius: "8px" }}>
      <svg width="40" height="34" viewBox="0 0 48 40" fill="none">
        <path d="M24 4L44 20L44 38L4 38L4 20Z" fill="#c8b898" stroke="#a09070" strokeWidth="1.5" strokeLinejoin="round"/>
        <path d="M24 4L44 20L4 20Z" fill="#d4c0a0" stroke="#a09070" strokeWidth="1.5" strokeLinejoin="round"/>
        <rect x="18" y="26" width="12" height="12" rx="2" fill="#b8a880" stroke="#a09070" strokeWidth="1"/>
      </svg>
    </div>
  )
  return (
    <div style={{ position: "relative", width: "260px", flexShrink: 0, height: "200px", borderRadius: "8px", overflow: "hidden" }}>
      <img src={list[idx]} alt={name} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
      {list.length > 1 && (
        <div style={{ position: "absolute", bottom: "8px", left: 0, right: 0, display: "flex", justifyContent: "center", gap: "4px" }}>
          {list.map((_, i) => (
            <div key={i} onClick={() => setIdx(i)}
              style={{ width: "6px", height: "6px", borderRadius: "50%", background: i === idx ? BROWN : "rgba(255,255,255,0.6)", cursor: "pointer", border: "1px solid rgba(0,0,0,0.2)" }} />
          ))}
        </div>
      )}
    </div>
  )
}

export default function TemplateRural({ tenant, cabins }: { tenant: TenantData; cabins: Cabin[] }) {
  const currency = tenant.currency || "CLP"
  const fmt = (n: number) => fmtPrice(n, currency)
  const allPhotos = cabins.flatMap(c => c.photos || []).filter(Boolean)
  const heroPhoto = allPhotos[0] || null
  const tagline = tenant.tagline || tenant.business_name
  const sortedCabins = [...cabins].sort((a, b) => a.base_price_night - b.base_price_night)
  const activities = tenant.activities && tenant.activities.length > 0 ? tenant.activities : null
  const rulesRaw = tenant.page_rules ? (tenant.page_rules as unknown[]).filter((r) => typeof r === "string") as string[] : []
  const rules = rulesRaw.length > 0 ? rulesRaw : null

  return (
    <div style={{ fontFamily: SANS, background: BG, minHeight: "100vh", color: TEXT }}>

      {/* NAV */}
      <nav style={{ position: "fixed", top: 0, left: 0, right: 0, zIndex: 100, background: "#fffdf7", borderBottom: "2px solid " + BORDER }}>
        <div style={{ maxWidth: "1100px", margin: "0 auto", padding: "0 24px", display: "flex", alignItems: "center", justifyContent: "space-between", height: "58px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <svg width="22" height="22" viewBox="0 0 32 32" fill="none">
              <path d="M16 3L28 10V20C28 25 22.5 29 16 31C9.5 29 4 25 4 20V10Z" fill="#e8ddc8" stroke={BROWN} strokeWidth="1.5"/>
              <path d="M10 18L14 22L22 14" stroke={GREEN} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <span style={{ fontFamily: SERIF, fontSize: "17px", color: BROWN, fontWeight: 400, letterSpacing: "0.5px" }}>{tenant.business_name}</span>
          </div>
          {tenant.verified && (
            <span style={{ fontSize: "11px", color: GREEN, fontWeight: 600 }}>Verificado</span>
          )}
        </div>
      </nav>

      {/* HERO */}
      <div style={{ position: "relative", height: "440px", marginTop: "58px", overflow: "hidden" }}>
        {heroPhoto ? (
          <img src={heroPhoto} alt={tenant.business_name} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
        ) : (
          <div style={{ width: "100%", height: "100%", background: "linear-gradient(135deg," + BROWN + "," + GREEN + ")" }} />
        )}
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to bottom, rgba(0,0,0,0.25) 0%, rgba(0,0,0,0.55) 100%)" }} />
        <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column" as const, alignItems: "center", justifyContent: "flex-end", padding: "0 24px 48px" }}>
          <h1 style={{ fontFamily: SERIF, fontSize: "clamp(28px,5vw,52px)", fontWeight: 400, color: "#fffdf7", textAlign: "center" as const, margin: "0 0 12px", textShadow: "0 2px 12px rgba(0,0,0,0.4)", maxWidth: "700px", lineHeight: 1.2 }}>
            {tagline}
          </h1>
          {tenant.location_text && (
            <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "13px", color: "rgba(255,253,247,0.8)" }}>
              <svg width="9" height="12" viewBox="0 0 9 12" fill="none"><path d="M4.5 0C2.3 0 .5 1.8.5 4c0 3 4 8 4 8s4-5 4-8C8.5 1.8 6.7 0 4.5 0zm0 5.5C3.7 5.5 3 4.8 3 4s.7-1.5 1.5-1.5S6 3.2 6 4s-.7 1.5-1.5 1.5z" fill="rgba(255,253,247,0.7)"/></svg>
              {tenant.location_text}
              {tenant.location_maps_url && (
                <a href={tenant.location_maps_url} target="_blank" rel="noopener noreferrer"
                  style={{ color: "rgba(255,253,247,0.85)", textDecoration: "underline" }}>
                  Ver mapa
                </a>
              )}
            </div>
          )}
        </div>
      </div>

      {/* INTRO */}
      <div style={{ background: CARD_BG, borderBottom: "1px solid " + BORDER, padding: "20px 24px", textAlign: "center" as const }}>
        <div style={{ maxWidth: "700px", margin: "0 auto" }}>
          <p style={{ fontFamily: SERIF, fontSize: "17px", color: MUTED, lineHeight: 1.7, margin: 0, fontStyle: "italic" }}>
            Reserva directo con el propietario. Sin intermediarios, sin sorpresas.
          </p>
        </div>
      </div>

      {/* CABAÑAS */}
      <div style={{ maxWidth: "1100px", margin: "0 auto", padding: "48px 24px" }}>
        <h2 style={{ fontFamily: SERIF, fontSize: "26px", fontWeight: 400, color: BROWN, marginBottom: "32px", paddingBottom: "12px", borderBottom: "2px solid " + BORDER }}>
          Nuestras cabañas
        </h2>
        <div style={{ display: "flex", flexDirection: "column" as const, gap: "28px" }}>
          {sortedCabins.map(cabin => {
            const amenitiesList = cabin.amenities ? cabin.amenities.split("\n").filter(Boolean) : []
            const minPrice = cabin.pricing_tiers && cabin.pricing_tiers.length > 0
              ? Math.min(...cabin.pricing_tiers.map(t => t.price_per_night))
              : cabin.base_price_night
            const hasTiers = cabin.pricing_tiers && cabin.pricing_tiers.length > 0
            return (
              <div key={cabin.id} style={{ background: CARD_BG, border: "1px solid " + BORDER, borderRadius: "12px", overflow: "hidden", display: "flex", flexWrap: "wrap" as const, gap: "0" }}>
                <CabinPhoto photos={cabin.photos} name={cabin.name} />
                <div style={{ flex: "1 1 280px", padding: "24px 28px", display: "flex", flexDirection: "column" as const }}>
                  <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "8px", gap: "12px" }}>
                    <h3 style={{ fontFamily: SERIF, fontSize: "22px", fontWeight: 400, color: BROWN, margin: 0, lineHeight: 1.2 }}>{cabin.name}</h3>
                    <span style={{ fontSize: "12px", color: MUTED, background: "#f0e8d8", borderRadius: "6px", padding: "4px 10px", whiteSpace: "nowrap" as const, flexShrink: 0 }}>
                      Hasta {cabin.capacity} personas
                    </span>
                  </div>
                  <ReviewStars summary={cabin.review_summary} color="#b5803a" textColor={MUTED} />
                  {cabin.description && (
                    <p style={{ fontSize: "14px", color: "#5a4a38", lineHeight: 1.75, marginBottom: "16px" }}>{cabin.description}</p>
                  )}
                  {amenitiesList.length > 0 && (
                    <div style={{ display: "flex", flexWrap: "wrap" as const, gap: "6px", marginBottom: "16px" }}>
                      {amenitiesList.map((am, i) => (
                        <span key={i} style={{ fontSize: "12px", color: GREEN, background: "#e8f2e4", border: "1px solid #c0d8b8", borderRadius: "5px", padding: "3px 10px" }}>{am.trim()}</span>
                      ))}
                    </div>
                  )}
                  {cabin.extras && cabin.extras.length > 0 && (
                    <div style={{ borderTop: "1px solid " + BORDER, paddingTop: "10px", marginBottom: "14px" }}>
                      {cabin.extras.map((ex, i) => (
                        <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "3px 0" }}>
                          <span style={{ fontSize: "12px", color: MUTED }}>{ex.name}</span>
                          <span style={{ fontFamily: SERIF, fontSize: "13px", color: BROWN }}>{fmt(ex.price)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                  <div style={{ marginTop: "auto", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "16px", flexWrap: "wrap" as const }}>
                    <div>
                      {hasTiers && <div style={{ fontSize: "11px", color: MUTED, marginBottom: "2px" }}>desde</div>}
                      <span style={{ fontFamily: SERIF, fontSize: "28px", fontWeight: 400, color: BROWN }}>{fmt(minPrice)}</span>
                      <span style={{ fontSize: "13px", color: MUTED, marginLeft: "4px" }}>/ noche</span>
                    </div>
                    <a href={"/reservar?cabin_id=" + cabin.id + "&cabin_name=" + encodeURIComponent(cabin.name) + "&price=" + cabin.base_price_night + "&capacity=" + cabin.capacity + (cabin.pricing_tiers && cabin.pricing_tiers.length > 0 ? "&tiers=" + encodeURIComponent(JSON.stringify(cabin.pricing_tiers)) : "")}
                      style={{ display: "inline-flex", alignItems: "center", gap: "8px", background: BROWN, color: "#fffdf7", borderRadius: "8px", padding: "12px 24px", fontSize: "13px", fontWeight: 600, textDecoration: "none", fontFamily: SERIF }}>
                      Reservar
                      <span style={{ fontSize: "16px", fontWeight: 300 }}>→</span>
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
        <div style={{ background: "#ede8dc", borderTop: "1px solid " + BORDER, borderBottom: "1px solid " + BORDER, padding: "40px 24px" }}>
          <div style={{ maxWidth: "1100px", margin: "0 auto" }}>
            <h2 style={{ fontFamily: SERIF, fontSize: "22px", fontWeight: 400, color: BROWN, marginBottom: "20px" }}>Qué hacer cerca</h2>
            <div style={{ display: "flex", flexWrap: "wrap" as const, gap: "10px" }}>
              {activities.map((act, i) => {
                const actIcon = typeof act === "string" ? "📍" : act.icon
                const actName = typeof act === "string" ? act : act.name
                return (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: "8px", background: CARD_BG, border: "1px solid " + BORDER, borderRadius: "8px", padding: "9px 16px" }}>
                    <span style={{ fontSize: "18px" }}>{actIcon}</span>
                    <span style={{ fontSize: "13px", color: TEXT, fontFamily: SERIF }}>{actName}</span>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {/* NORMAS */}
      {rules && (
        <div style={{ maxWidth: "1100px", margin: "0 auto", padding: "40px 24px" }}>
          <h2 style={{ fontFamily: SERIF, fontSize: "22px", fontWeight: 400, color: BROWN, marginBottom: "20px" }}>Normas del lugar</h2>
          <div style={{ display: "flex", flexDirection: "column" as const, gap: "8px" }}>
            {rules.map((rule, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: "10px", padding: "10px 14px", background: CARD_BG, border: "1px solid " + BORDER, borderRadius: "8px" }}>
                <span style={{ color: "#c0392b", fontSize: "13px", fontWeight: 700, flexShrink: 0 }}>✕</span>
                <span style={{ fontSize: "14px", color: TEXT, fontFamily: SERIF }}>{rule}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SOCIAL */}
      {(tenant.instagram_url || tenant.facebook_url) && (
        <div style={{ borderTop: "1px solid " + BORDER, padding: "28px 24px" }}>
          <div style={{ maxWidth: "1100px", margin: "0 auto", display: "flex", gap: "10px", flexWrap: "wrap" as const }}>
            {tenant.instagram_url && (
              <a href={tenant.instagram_url} target="_blank" rel="noopener noreferrer"
                style={{ display: "inline-flex", alignItems: "center", gap: "8px", background: CARD_BG, border: "1px solid " + BORDER, borderRadius: "8px", padding: "9px 16px", textDecoration: "none", color: BROWN, fontSize: "13px" }}>
                <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="20" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="0.8" fill="currentColor" stroke="none"/></svg>
                Instagram
              </a>
            )}
            {tenant.facebook_url && (
              <a href={tenant.facebook_url} target="_blank" rel="noopener noreferrer"
                style={{ display: "inline-flex", alignItems: "center", gap: "8px", background: CARD_BG, border: "1px solid " + BORDER, borderRadius: "8px", padding: "9px 16px", textDecoration: "none", color: BROWN, fontSize: "13px" }}>
                <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor"><path d="M18 2h-3a5 5 0 00-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 011-1h3z"/></svg>
                Facebook
              </a>
            )}
          </div>
        </div>
      )}

      {/* FOOTER */}
      <footer style={{ background: BROWN, color: "#e8ddc8", padding: "24px", textAlign: "center" as const }}>
        <div style={{ fontFamily: SERIF, fontSize: "14px", marginBottom: "4px" }}>{tenant.business_name}</div>
        <div style={{ fontSize: "11px", color: "rgba(232,221,200,0.5)" }}>Powered by Takai.cl</div>
      </footer>
    </div>
  )
}
