"use client"
import { Suspense, useEffect, useState } from "react"
import { useParams } from "next/navigation"

interface Cabin {
  id: string
  name: string
  capacity: number
  base_price_night: number
  extra_person_price: number
  photos?: string[]
  description?: string
  amenities?: string
  extras?: Array<{ name: string; price: number }>
}

interface TenantData {
  business_name: string
  facebook_url?: string | null
  instagram_url?: string | null
  verified?: boolean
  currency?: string
  location_text?: string | null
  location_maps_url?: string | null
  tagline?: string | null
  activities?: Array<{ icon: string; name: string }>
  page_rules?: string[]
  owner_whatsapp?: string | null
}

const GOLD = "#C9A84C"
const GOLD_L = "#d4b96a"
const BG = "#060606"
const SURF = "#0d0d0d"
const BORDER = "#1c1c1c"
const TEXT = "#f0ede8"
const MUTED = "#888"
const SERIF = "'Cormorant Garamond', Georgia, serif"
const SANS = "'DM Sans', sans-serif"

function fmtPrice(n: number, currency: string) {
  if (currency === "USD") return "$" + n.toFixed(0)
  if (currency === "COP") return "$" + Math.round(n).toLocaleString("es-CO")
  return "$" + Math.round(n).toLocaleString("es-CL")
}

function GoldLine() {
  return <div style={{ height: "1px", background: "linear-gradient(90deg,transparent," + GOLD + ",transparent)", opacity: 0.25, margin: "0" }} />
}

function CabinGallery({ photos, name }: { photos?: string[]; name: string }) {
  const [main, setMain] = useState(0)
  if (!photos || photos.length === 0) return (
    <div style={{ height: "200px", background: "linear-gradient(135deg,#0d120a,#111a0d)", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <svg width="48" height="40" viewBox="0 0 48 40" fill="none">
        <path d="M24 4L44 20L44 38L4 38L4 20Z" fill="#162012" stroke="#2a3a28" strokeWidth="1.5" strokeLinejoin="round"/>
        <path d="M24 4L44 20L4 20Z" fill="#1a2818" stroke="#2a3a28" strokeWidth="1.5" strokeLinejoin="round"/>
        <rect x="18" y="26" width="12" height="12" rx="2" fill="#0d1a0d" stroke="#2a3a28" strokeWidth="1"/>
      </svg>
    </div>
  )
  return (
    <div style={{ position: "relative" }}>
      <div style={{ position: "relative", height: "200px", overflow: "hidden" }}>
        <img src={photos[main]} alt={name} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to bottom, rgba(6,6,6,0) 45%, rgba(6,6,6,0.98) 100%)" }} />
      </div>
      {photos.length > 1 && (
        <div style={{ display: "flex", gap: "5px", padding: "8px 12px", background: "rgba(0,0,0,0.4)", borderBottom: "1px solid " + BORDER }}>
          {photos.map((url, i) => (
            <img key={i} src={url} alt="" onClick={() => setMain(i)}
              style={{ width: "38px", height: "30px", objectFit: "cover", borderRadius: "5px", cursor: "pointer", border: i === main ? "1.5px solid " + GOLD : "1.5px solid transparent", opacity: i === main ? 1 : 0.5 }} />
          ))}
        </div>
      )}
    </div>
  )
}

function SlugInner() {
  const params = useParams()
  const slug = params.slug as string
  const [tenant, setTenant] = useState<TenantData | null>(null)
  const [cabins, setCabins] = useState<Cabin[]>([])
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [heroIdx, setHeroIdx] = useState(0)

  useEffect(function () {
    if (!slug) return
    fetch("/api/tenant/" + slug + "/cabins")
      .then(function (r) {
        if (!r.ok) { setNotFound(true); setLoading(false); return null }
        return r.json()
      })
      .then(function (d) {
        if (!d) return
        setTenant(d.tenant)
        setCabins(d.cabins || [])
        setLoading(false)
      })
      .catch(function () { setNotFound(true); setLoading(false) })
  }, [slug])

  const allPhotos = cabins.flatMap(c => c.photos || []).filter(Boolean)
  useEffect(function() {
    if (allPhotos.length <= 1) return
    const interval = setInterval(function() {
      setHeroIdx(function(prev) { return (prev + 1) % allPhotos.length })
    }, 4000)
    return function() { clearInterval(interval) }
  }, [allPhotos.length])

  if (loading) return (
    <div style={{ background: BG, minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ color: "#2a2a2a", fontFamily: SANS, fontSize: "12px", letterSpacing: "2px" }}>CARGANDO</div>
    </div>
  )
  if (notFound || !tenant) return (
    <div style={{ background: BG, minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ color: "#2a2a2a", fontFamily: SANS, fontSize: "12px" }}>No encontrado</div>
    </div>
  )

  const currency = tenant.currency || "CLP"
  const fmt = (n: number) => fmtPrice(n, currency)
  const currencyLabel = currency === "CLP" ? "CLP" : currency === "USD" ? "USD $" : currency
  const hasSocial = !!(tenant.facebook_url || tenant.instagram_url)
  const activities = tenant.activities && tenant.activities.length > 0 ? tenant.activities : null
  const rules = tenant.page_rules && tenant.page_rules.length > 0 ? tenant.page_rules : null
  const tagline = tenant.tagline || null
  const waLink = tenant.owner_whatsapp ? "https://wa.me/" + tenant.owner_whatsapp.replace(/\D/g, "") : null

  const firstPhoto = cabins.flatMap(c => c.photos || []).find(Boolean)

  return (
    <div style={{ fontFamily: SANS, background: BG, minHeight: "100vh", color: TEXT }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;1,300;1,400;1,500&family=DM+Sans:wght@300;400;500&display=swap');
        * { box-sizing: border-box; }
        @keyframes tk-avail-pulse { 0%,100%{opacity:1} 50%{opacity:0.35} }
        @keyframes tk-wa-pulse { 0%{box-shadow:0 0 0 0 rgba(37,211,102,0.4)} 70%{box-shadow:0 0 0 12px rgba(37,211,102,0)} 100%{box-shadow:0 0 0 0 rgba(37,211,102,0)} }
        .tk-cabin-card::before, .tk-cabin-card::after { content:''; position:absolute; width:16px; height:16px; pointer-events:none; z-index:2; }
        .tk-cabin-card::before { top:0; left:0; background: linear-gradient(${GOLD},${GOLD}) no-repeat top left/1.5px 100%, linear-gradient(${GOLD},${GOLD}) no-repeat top left/100% 1.5px; opacity:0.2; }
        .tk-cabin-card::after { top:0; right:0; background: linear-gradient(${GOLD},${GOLD}) no-repeat top right/1.5px 100%, linear-gradient(${GOLD},${GOLD}) no-repeat top right/100% 1.5px; opacity:0.2; }
        .tk-reserve-btn:hover { background: ${GOLD_L} !important; }
        .tk-thumb { transition: border-color 0.15s, opacity 0.15s; }
        .tk-soc-link:hover { border-color: rgba(201,168,76,0.4) !important; color: ${TEXT} !important; }
      `}</style>

      {/* NAV */}
      <nav style={{ position: "fixed", top: 0, left: 0, right: 0, zIndex: 100, background: "rgba(6,6,6,0.95)", borderBottom: "1px solid rgba(201,168,76,0.08)", backdropFilter: "blur(10px)" }}>
        <div style={{ maxWidth: "720px", margin: "0 auto", padding: "0 20px", display: "flex", alignItems: "center", justifyContent: "space-between", height: "58px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <svg width="26" height="26" viewBox="0 0 40 40" fill="none">
              <path d="M20 4L32 12V24C32 31 26 36 20 38C14 36 8 31 8 24V12Z" fill="rgba(201,168,76,0.08)" stroke="rgba(201,168,76,0.35)" strokeWidth="1.2"/>
              <path d="M14 20L18 24L26 16" stroke={GOLD} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
            </svg>
            <span style={{ fontFamily: SERIF, fontSize: "13px", letterSpacing: "3px", color: TEXT, textTransform: "uppercase" as const, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" as const, maxWidth: "200px" }}>{tenant.business_name}</span>
          </div>
        </div>
      </nav>

      {/* HERO */}
      <div style={{ position: "relative", height: "100vw", maxHeight: "420px", minHeight: "300px", overflow: "hidden", marginTop: "58px" }}>
        {allPhotos.length > 0 ? (
          allPhotos.map(function(photo, i) {
            return (
              <img key={i} src={photo} alt=""
                style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", objectFit: "cover", opacity: i === heroIdx ? 0.45 : 0, filter: "brightness(0.6) saturate(0.8)", transition: "opacity 1.2s ease" }} />
            )
          })
        ) : (
          <div style={{ position: "absolute", inset: 0, background: "linear-gradient(160deg,#0a0f08 0%,#111a0d 50%,#080d07 100%)" }}>
            <svg style={{ position: "absolute", bottom: 0, left: 0, right: 0, width: "100%", opacity: 0.4 }} viewBox="0 0 400 120" fill="none" preserveAspectRatio="xMidYMax slice">
              <rect width="400" height="120" fill="#0a0f08"/>
              {[30,70,110,150,200,250,290,330,370].map((x, i) => (
                <g key={i}>
                  <line x1={x} y1="120" x2={x} y2={60 + (i % 3) * 12} stroke="#111e0d" strokeWidth={i % 2 === 0 ? "3" : "2"}/>
                  <polygon points={x + "," + (60+(i%3)*12) + " " + (x-12) + "," + (80+(i%3)*12) + " " + (x+12) + "," + (80+(i%3)*12)} fill="#111e0d" opacity="0.9"/>
                  <polygon points={x + "," + (74+(i%3)*12) + " " + (x-14) + "," + (98+(i%3)*12) + " " + (x+14) + "," + (98+(i%3)*12)} fill="#131f10" opacity="0.85"/>
                </g>
              ))}
            </svg>
          </div>
        )}
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to bottom, rgba(6,6,6,0.3) 0%, rgba(6,6,6,0.1) 40%, rgba(6,6,6,0.65) 80%, rgba(6,6,6,1) 100%)" }} />
        <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column" as const, alignItems: "center", justifyContent: "center", padding: "20px", textAlign: "center" as const }}>
          {allPhotos.length > 1 && (
            <div style={{ display: "flex", gap: "5px", marginBottom: "20px" }}>
              {allPhotos.map(function(_, i) {
                return (
                  <div key={i} onClick={function() { setHeroIdx(i) }}
                    style={{ width: i === heroIdx ? "18px" : "5px", height: "5px", borderRadius: "3px", background: i === heroIdx ? GOLD : "rgba(255,255,255,0.25)", cursor: "pointer", transition: "all 0.3s ease" }} />
                )
              })}
            </div>
          )}
          <div style={{ fontFamily: SERIF, fontSize: "clamp(24px,6vw,38px)", fontWeight: 300, color: TEXT, lineHeight: 1.15, marginBottom: "12px", maxWidth: "90%", wordBreak: "break-word" as const }}>
            {tagline ? (
              tagline.split(",").map(function(part, i, arr) {
                return (
                  <span key={i} style={{ display: "block" }}>
                    {i === arr.length - 1 ? <em style={{ color: GOLD_L, fontStyle: "italic" }}>{part.trim()}</em> : part.trim()}
                  </span>
                )
              })
            ) : (
              <span>{tenant.business_name}</span>
            )}
          </div>
          {tenant.location_text && (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "6px", flexWrap: "wrap" as const }}>
              <svg width="9" height="12" viewBox="0 0 9 12" fill="none"><path d="M4.5 0C2.3 0 .5 1.8.5 4c0 3 4 8 4 8s4-5 4-8C8.5 1.8 6.7 0 4.5 0zm0 5.5C3.7 5.5 3 4.8 3 4s.7-1.5 1.5-1.5S6 3.2 6 4s-.7 1.5-1.5 1.5z" fill="rgba(201,168,76,0.5)"/></svg>
              <span style={{ fontSize: "10px", color: "rgba(201,168,76,0.55)" }}>{tenant.location_text}</span>
              {tenant.location_maps_url && (
                <a href={tenant.location_maps_url} target="_blank" rel="noopener noreferrer" style={{ fontSize: "10px", color: "rgba(201,168,76,0.7)", textDecoration: "none", borderBottom: "1px solid rgba(201,168,76,0.25)" }}>Ver en Maps</a>
              )}
            </div>
          )}
        </div>
      </div>

      <div style={{ maxWidth: "720px", margin: "0 auto", padding: "0 16px" }}>

        {/* VERIFIED */}
        {tenant.verified && (
          <div style={{ display: "flex", alignItems: "center", gap: "10px", padding: "9px 14px", margin: "14px 0 4px", background: "rgba(201,168,76,0.05)", border: "1px solid rgba(201,168,76,0.18)", borderRadius: "10px" }}>
            <svg width="22" height="26" viewBox="0 0 22 26" fill="none">
              <path d="M11 1L20 5V13C20 18.5 16 22.5 11 24C6 22.5 2 18.5 2 13V5Z" fill="rgba(201,168,76,0.08)" stroke="rgba(201,168,76,0.4)" strokeWidth="1.2"/>
              <path d="M7 13L9.5 15.5L15 10" stroke={GOLD} strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <div style={{ fontSize: "10px", color: "rgba(201,168,76,0.65)", lineHeight: 1.4 }}>
              Alojamiento verificado por <strong style={{ color: GOLD }}>Takai.cl</strong> · Calidad y seguridad garantizadas
            </div>
          </div>
        )}

        <GoldLine />

        {/* CABINS SECTION */}
        <div style={{ paddingTop: "20px" }}>
          <div style={{ fontSize: "9px", letterSpacing: "3px", textTransform: "uppercase" as const, color: GOLD, marginBottom: "16px", display: "flex", alignItems: "center", gap: "8px" }}>
            Elige tu cabaña
            <div style={{ flex: 1, height: "1px", background: "rgba(201,168,76,0.12)" }} />
          </div>

          {cabins.map(function (cabin, idx) {
            const amenitiesList = cabin.amenities ? cabin.amenities.split("\n").filter(Boolean) : []
            const bgImg = cabin.photos && cabin.photos.length > 0
              ? "url('" + (cabin.photos[1] || cabin.photos[0]) + "')"
              : null

            return (
              <div key={cabin.id}>
                {idx > 0 && (
                  <div style={{ position: "relative", height: "56px", overflow: "hidden", margin: "4px 0" }}>
                    {bgImg && <div style={{ position: "absolute", inset: 0, backgroundImage: bgImg, backgroundSize: "cover", backgroundPosition: "center", opacity: 0.06, filter: "blur(2px)" }} />}
                    <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to bottom," + BG + ",transparent 30%,transparent 70%," + BG + ")" }} />
                  </div>
                )}
                <div className="tk-cabin-card" style={{ position: "relative", background: SURF, border: "1px solid " + BORDER, borderRadius: "18px", overflow: "hidden", marginBottom: "6px" }}>
                  <CabinGallery photos={cabin.photos} name={cabin.name} />
                  <div style={{ position: "absolute", top: "10px", left: "10px", display: "inline-flex", alignItems: "center", gap: "4px", background: "rgba(6,6,6,0.7)", border: "1px solid rgba(106,191,106,0.2)", borderRadius: "7px", padding: "3px 7px", zIndex: 3 }}>
                    <div style={{ width: "4px", height: "4px", borderRadius: "50%", background: "#6abf6a", animation: "tk-avail-pulse 2s infinite", flexShrink: 0 }} />
                    <span style={{ fontSize: "8px", color: "#6abf6a", letterSpacing: "0.3px", whiteSpace: "nowrap" as const }}>Disponible</span>
                  </div>
                  <div style={{ padding: "14px 16px 16px" }}>
                    <div style={{ fontFamily: SERIF, fontSize: "20px", fontWeight: 400, color: TEXT, letterSpacing: "-0.2px", marginBottom: "2px", wordBreak: "break-word" as const }}>{cabin.name}</div>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px" }}>
                      <div style={{ fontSize: "9px", color: MUTED, letterSpacing: "1.5px", textTransform: "uppercase" as const }}>
                        Hasta {cabin.capacity} personas
                        {cabin.extra_person_price > 0 && <span style={{ color: "rgba(201,168,76,0.5)", marginLeft: "6px" }}>· extra {fmt(cabin.extra_person_price)}</span>}
                      </div>
                      <div style={{ textAlign: "right" as const }}>
                        <div style={{ fontFamily: SERIF, fontSize: "22px", fontWeight: 300, color: TEXT, lineHeight: 1 }}>{fmt(cabin.base_price_night)}</div>
                        <div style={{ fontSize: "8px", color: "rgba(255,255,255,0.35)", letterSpacing: "0.5px" }}>{currency} / noche</div>
                      </div>
                    </div>

                    {cabin.description && (
                      <div style={{ fontSize: "12px", color: "#888", lineHeight: 1.75, marginBottom: "12px", fontWeight: 300, wordBreak: "break-word" as const, overflowWrap: "break-word" as const }}>{cabin.description}</div>
                    )}

                    {amenitiesList.length > 0 && (
                      <div style={{ display: "flex", flexWrap: "wrap" as const, gap: "4px", marginBottom: "13px" }}>
                        {amenitiesList.map(function (am, i) {
                          return (
                            <span key={i} style={{ padding: "3px 9px", background: "rgba(201,168,76,0.05)", border: "1px solid rgba(201,168,76,0.18)", borderRadius: "5px", fontSize: "9px", color: "rgba(201,168,76,0.75)", fontFamily: SANS }}>
                              {am.trim()}
                            </span>
                          )
                        })}
                      </div>
                    )}

                    <a href={"/reservar?cabin_id=" + cabin.id + "&cabin_name=" + encodeURIComponent(cabin.name) + "&price=" + cabin.base_price_night + "&capacity=" + cabin.capacity}
                      style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%", background: GOLD, color: "#0a0700", border: "none", borderRadius: "9px", padding: "12px 16px", fontSize: "11px", fontWeight: 600, textDecoration: "none", fontFamily: SANS, letterSpacing: "1.5px", textTransform: "uppercase" as const, boxSizing: "border-box" as const }}>
                      <span>Reservar ahora</span>
                      <span style={{ fontFamily: SERIF, fontSize: "16px", fontWeight: 400 }}>→</span>
                    </a>
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        <GoldLine />

        {/* LOCATION */}
        {tenant.location_text && (
          <div style={{ padding: "18px 0 0" }}>
            <div style={{ fontSize: "9px", letterSpacing: "3px", textTransform: "uppercase" as const, color: GOLD, marginBottom: "12px", display: "flex", alignItems: "center", gap: "8px" }}>
              Dónde estamos
              <div style={{ flex: 1, height: "1px", background: "rgba(201,168,76,0.12)" }} />
            </div>
            <div style={{ background: SURF, border: "1px solid " + BORDER, borderRadius: "12px", overflow: "hidden" }}>
              <div style={{ height: "70px", background: "#0a0d08", display: "flex", alignItems: "center", justifyContent: "center", position: "relative", overflow: "hidden" }}>
                {firstPhoto && <img src={firstPhoto} alt="" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", opacity: 0.18, filter: "blur(2px)" }} />}
                <div style={{ position: "absolute", inset: 0, background: "rgba(6,6,6,0.55)" }} />
                <div style={{ position: "absolute", inset: 0, backgroundImage: "linear-gradient(rgba(201,168,76,0.05) 1px,transparent 1px),linear-gradient(90deg,rgba(201,168,76,0.05) 1px,transparent 1px)", backgroundSize: "18px 18px" }} />
                <div style={{ position: "relative", zIndex: 1, width: "24px", height: "24px", background: "rgba(201,168,76,0.12)", border: "1px solid rgba(201,168,76,0.45)", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <svg width="11" height="14" viewBox="0 0 11 14" fill="none"><path d="M5.5 0C2.97 0 .92 2.06.92 4.58c0 3.44 4.58 9.42 4.58 9.42s4.58-5.98 4.58-9.42C10.08 2.06 8.03 0 5.5 0zm0 6.21c-.9 0-1.63-.73-1.63-1.63s.73-1.63 1.63-1.63 1.63.73 1.63 1.63-.73 1.63-1.63 1.63z" fill={GOLD}/></svg>
                </div>
              </div>
              <div style={{ padding: "10px 14px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div>
                  <div style={{ fontSize: "12px", color: TEXT, fontWeight: 500, fontFamily: SANS }}>{tenant.location_text}</div>
                </div>
                {tenant.location_maps_url && (
                  <a href={tenant.location_maps_url} target="_blank" rel="noopener noreferrer" style={{ fontSize: "9px", color: "rgba(201,168,76,0.65)", textDecoration: "none", borderBottom: "1px solid rgba(201,168,76,0.2)", letterSpacing: "0.5px" }}>Abrir Maps →</a>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ACTIVITIES */}
        {activities && (
          <div style={{ position: "relative", overflow: "hidden", padding: "18px 0 16px" }}>
            {firstPhoto && <img src={firstPhoto} alt="" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", opacity: 0.05, pointerEvents: "none" }} />}
            <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to bottom," + BG + " 0%,transparent 20%,transparent 80%," + BG + " 100%)", pointerEvents: "none" }} />
            <div style={{ position: "relative", zIndex: 1 }}>
              <div style={{ fontSize: "9px", letterSpacing: "3px", textTransform: "uppercase" as const, color: GOLD, marginBottom: "12px", display: "flex", alignItems: "center", gap: "8px" }}>
                Qué hacer cerca
                <div style={{ flex: 1, height: "1px", background: "rgba(201,168,76,0.12)" }} />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: "6px" }}>
                {activities.map(function (act, i) {
                  return (
                    <div key={i} style={{ background: "rgba(13,13,13,0.88)", border: "1px solid " + BORDER, borderRadius: "10px", padding: "11px 6px", textAlign: "center" as const }}>
                      <div style={{ fontSize: "18px", marginBottom: "4px" }}>{act.icon}</div>
                      <div style={{ fontSize: "8px", color: "#555", letterSpacing: "0.5px", fontFamily: SANS }}>{act.name}</div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        )}

        {/* RULES */}
        {rules && (
          <div style={{ position: "relative", overflow: "hidden", borderTop: "1px solid " + BORDER, padding: "14px 0 16px" }}>
            {firstPhoto && <img src={firstPhoto} alt="" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", opacity: 0.04, pointerEvents: "none" }} />}
            <div style={{ position: "absolute", inset: 0, background: "rgba(6,6,6,0.75)", pointerEvents: "none" }} />
            <div style={{ position: "relative", zIndex: 1 }}>
              <div style={{ fontSize: "8px", letterSpacing: "2.5px", textTransform: "uppercase" as const, color: "#333", marginBottom: "10px" }}>Normas del lugar</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "5px" }}>
                {rules.map(function (rule, i) {
                  return (
                    <div key={i} style={{ display: "flex", alignItems: "center", gap: "5px", fontSize: "10px", color: "#3a3a3a", fontFamily: SANS }}>
                      <div style={{ width: "14px", height: "14px", borderRadius: "4px", background: "rgba(230,57,70,0.08)", border: "1px solid rgba(230,57,70,0.18)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "8px", color: "rgba(230,57,70,0.45)", flexShrink: 0 }}>✕</div>
                      {rule}
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        )}

        {/* SOCIAL */}
        {hasSocial && (
          <div style={{ display: "flex", gap: "8px", padding: "12px 0", borderTop: "1px solid " + BORDER }}>
            {tenant.instagram_url && (
              <a href={tenant.instagram_url} target="_blank" rel="noopener noreferrer" className="tk-soc-link"
                style={{ display: "inline-flex", alignItems: "center", gap: "7px", background: SURF, border: "1px solid " + BORDER, borderRadius: "8px", padding: "7px 13px", textDecoration: "none", color: MUTED, fontSize: "11px", fontFamily: SANS }}>
                <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="0.8" fill="currentColor" stroke="none"/></svg>
                Instagram
              </a>
            )}
            {tenant.facebook_url && (
              <a href={tenant.facebook_url} target="_blank" rel="noopener noreferrer" className="tk-soc-link"
                style={{ display: "inline-flex", alignItems: "center", gap: "7px", background: SURF, border: "1px solid " + BORDER, borderRadius: "8px", padding: "7px 13px", textDecoration: "none", color: MUTED, fontSize: "11px", fontFamily: SANS }}>
                <svg viewBox="0 0 24 24" width="13" height="13" fill="currentColor"><path d="M18 2h-3a5 5 0 00-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 011-1h3z"/></svg>
                Facebook
              </a>
            )}
          </div>
        )}

      </div>

      {/* FOOTER */}
      <div style={{ position: "relative", overflow: "hidden", marginTop: "8px" }}>
        {firstPhoto && <img src={firstPhoto} alt="" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", opacity: 0.05, pointerEvents: "none" }} />}
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to bottom," + BG + ",rgba(6,6,6,0.8))", pointerEvents: "none" }} />
        <div style={{ position: "relative", zIndex: 1, borderTop: "1px solid rgba(201,168,76,0.08)", padding: "14px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", maxWidth: "720px", margin: "0 auto" }}>
          <div style={{ fontFamily: SERIF, fontSize: "11px", letterSpacing: "2px", color: "#2a2a2a", textTransform: "uppercase" as const }}>{tenant.business_name}</div>
          <div style={{ fontSize: "8px", color: "#1e1e1e", letterSpacing: "1.5px", textTransform: "uppercase" as const }}>Powered by Takai.cl</div>
        </div>
      </div>


    </div>
  )
}

export default function SlugPage() {
  return (
    <Suspense fallback={<div style={{ background: "#060606", minHeight: "100vh" }} />}>
      <SlugInner />
    </Suspense>
  )
}
