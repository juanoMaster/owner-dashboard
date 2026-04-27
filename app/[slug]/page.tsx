"use client"
import { Suspense, useEffect, useState } from "react"
import { useParams } from "next/navigation"

interface Cabin {
  id: string; name: string; capacity: number; base_price_night: number
  extra_person_price: number; photos?: string[]; description?: string
  amenities?: string; extras?: Array<{ name: string; price: number }>
}
interface TenantData {
  business_name: string; facebook_url?: string | null; instagram_url?: string | null
  verified?: boolean; currency?: string; location_text?: string | null
  location_maps_url?: string | null; tagline?: string | null
  activities?: Array<{ icon: string; name: string }>; page_rules?: string[]
  owner_whatsapp?: string | null
}

const GOLD = "#C9A84C"; const GOLD_L = "#d4b96a"; const BG = "#060606"
const SURF = "#0d0d0d"; const BORDER = "#1c1c1c"; const TEXT = "#f0ede8"
const MUTED = "#888"; const SERIF = "'Cormorant Garamond', Georgia, serif"
const SANS = "'DM Sans', sans-serif"

function fmtPrice(n: number, currency: string) {
  if (currency === "USD") return "$" + Number(n).toFixed(0)
  if (currency === "COP") return "$" + Math.round(n).toLocaleString("es-CO")
  return "$" + Math.round(n).toLocaleString("es-CL")
}

function GoldLine() {
  return (
    <div style={{ position: "relative", height: "1px", margin: "0" }}>
      <div style={{ position: "absolute", inset: 0, background: "linear-gradient(90deg,transparent 0%," + GOLD + " 30%," + GOLD + " 70%,transparent 100%)", opacity: 0.18 }} />
    </div>
  )
}

function CabinGallery({ photos, name }: { photos?: string[]; name: string }) {
  const [main, setMain] = useState(0)
  if (!photos || photos.length === 0) return (
    <div style={{ height: "260px", background: "linear-gradient(135deg,#0d120a,#111a0d)", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <svg width="48" height="40" viewBox="0 0 48 40" fill="none">
        <path d="M24 4L44 20L44 38L4 38L4 20Z" fill="#162012" stroke="#2a3a28" strokeWidth="1.5" strokeLinejoin="round"/>
        <path d="M24 4L44 20L4 20Z" fill="#1a2818" stroke="#2a3a28" strokeWidth="1.5" strokeLinejoin="round"/>
        <rect x="18" y="26" width="12" height="12" rx="2" fill="#0d1a0d" stroke="#2a3a28" strokeWidth="1"/>
      </svg>
    </div>
  )
  return (
    <div>
      <div style={{ position: "relative", height: "260px", overflow: "hidden" }}>
        <img src={photos[main]} alt={name} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to bottom,transparent 55%,rgba(13,13,13,0.95) 100%)" }} />
      </div>
      {photos.length > 1 && (
        <div style={{ display: "flex", gap: "5px", padding: "8px 12px", background: "rgba(0,0,0,0.5)", borderBottom: "1px solid " + BORDER }}>
          {photos.map((url, i) => (
            <img key={i} src={url} alt="" onClick={() => setMain(i)}
              style={{ width: "40px", height: "32px", objectFit: "cover", borderRadius: "5px", cursor: "pointer", flexShrink: 0, border: i === main ? "1.5px solid " + GOLD : "1.5px solid transparent", opacity: i === main ? 1 : 0.45, transition: "all 0.15s" }} />
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

  useEffect(function() {
    if (!slug) return
    fetch("/api/tenant/" + slug + "/cabins")
      .then(r => { if (!r.ok) { setNotFound(true); setLoading(false); return null } return r.json() })
      .then(d => { if (!d) return; setTenant(d.tenant); setCabins(d.cabins || []); setLoading(false) })
      .catch(() => { setNotFound(true); setLoading(false) })
  }, [slug])

  const allPhotos = cabins.flatMap(c => c.photos || []).filter(Boolean)

  useEffect(function() {
    if (allPhotos.length <= 1) return
    const iv = setInterval(() => setHeroIdx(p => (p + 1) % allPhotos.length), 4500)
    return () => clearInterval(iv)
  }, [allPhotos.length])

  if (loading) return <div style={{ background: BG, minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}><div style={{ color: "#2a2a2a", fontFamily: SANS, fontSize: "11px", letterSpacing: "3px" }}>CARGANDO</div></div>
  if (notFound || !tenant) return <div style={{ background: BG, minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}><div style={{ color: "#2a2a2a", fontFamily: SANS, fontSize: "12px" }}>No encontrado</div></div>

  const currency = tenant.currency || "CLP"
  const fmt = (n: number) => fmtPrice(n, currency)
  const hasSocial = !!(tenant.facebook_url || tenant.instagram_url)
  const activities = tenant.activities && tenant.activities.length > 0 ? tenant.activities : null
  const rules = tenant.page_rules && tenant.page_rules.length > 0 ? tenant.page_rules : null
  const tagline = tenant.tagline || tenant.business_name
  const sortedCabins = [...cabins].sort((a, b) => a.base_price_night - b.base_price_night)

  return (
    <div style={{ fontFamily: SANS, background: BG, minHeight: "100vh", color: TEXT }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;1,300;1,400;1,500&family=DM+Sans:wght@300;400;500&display=swap');
        *{box-sizing:border-box;}
        @keyframes tk-pulse{0%,100%{opacity:1}50%{opacity:0.35}}
        .tk-card::before,.tk-card::after{content:'';position:absolute;width:16px;height:16px;pointer-events:none;z-index:2;}
        .tk-card::before{top:0;left:0;background:linear-gradient(${GOLD},${GOLD}) no-repeat top left/1.5px 100%,linear-gradient(${GOLD},${GOLD}) no-repeat top left/100% 1.5px;opacity:0.18;}
        .tk-card::after{top:0;right:0;background:linear-gradient(${GOLD},${GOLD}) no-repeat top right/1.5px 100%,linear-gradient(${GOLD},${GOLD}) no-repeat top right/100% 1.5px;opacity:0.18;}
        .tk-btn:hover{opacity:0.88;}
        .tk-soc:hover{border-color:rgba(201,168,76,0.35)!important;color:${TEXT}!important;}

        @media(min-width:768px){
          .tk-cabins-grid{display:grid;grid-template-columns:1fr 1fr;gap:24px;align-items:start;}
          .tk-hero{height:clamp(420px,45vw,620px)!important;}
          .tk-hero-text{padding:0 80px 64px!important;}
          .tk-hero-h1{font-size:64px!important;max-width:700px!important;}
          .tk-section{padding-left:80px!important;padding-right:80px!important;}
          .tk-acts-grid{grid-template-columns:repeat(4,1fr)!important;}
          .tk-rules-grid{grid-template-columns:repeat(3,1fr)!important;}
          .tk-between{display:none;}
          .tk-nav-inner{padding:0 80px!important;}
          .tk-container{max-width:1400px!important;}
          .tk-card{transition:transform 0.2s ease,box-shadow 0.2s ease;}
          .tk-card:hover{transform:translateY(-3px);box-shadow:0 12px 40px rgba(0,0,0,0.5);}
          .tk-card .tk-card-body{padding:24px 28px 28px!important;}
        }
        @media(min-width:1024px){
          .tk-cabins-grid{grid-template-columns:1fr 1fr 1fr;gap:28px;}
          .tk-hero-h1{font-size:72px!important;}
        }
        @media(min-width:1280px){
          .tk-section{padding-left:100px!important;padding-right:100px!important;}
          .tk-nav-inner{padding:0 100px!important;}
        }
      `}</style>

      {/* NAV */}
      <nav style={{ position: "fixed", top: 0, left: 0, right: 0, zIndex: 100, background: "rgba(6,6,6,0.96)", borderBottom: "1px solid rgba(201,168,76,0.07)" }}>
        <div className="tk-nav-inner" style={{ maxWidth: "1200px", margin: "0 auto", padding: "0 24px", display: "flex", alignItems: "center", height: "56px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <svg width="24" height="24" viewBox="0 0 40 40" fill="none">
              <path d="M20 4L32 12V24C32 31 26 36 20 38C14 36 8 31 8 24V12Z" fill="rgba(201,168,76,0.08)" stroke="rgba(201,168,76,0.35)" strokeWidth="1.2"/>
              <path d="M14 20L18 24L26 16" stroke={GOLD} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
            </svg>
            <span style={{ fontFamily: SERIF, fontSize: "14px", letterSpacing: "4px", color: TEXT, textTransform: "uppercase" as const, whiteSpace: "nowrap" as const, overflow: "hidden", textOverflow: "ellipsis", maxWidth: "240px" }}>
              {tenant.business_name}
            </span>
          </div>
        </div>
      </nav>

      {/* HERO — fotos difuminadas rotando + texto bienvenida */}
      <div className="tk-hero" style={{ position: "relative", minHeight: "320px", height: "clamp(380px, 55vw, 620px)", maxHeight: "500px", overflow: "hidden", marginTop: "56px" }}>

        {/* Fotos rotando difuminadas */}
        {allPhotos.length > 0 ? allPhotos.map((photo, i) => (
          <img key={i} src={photo} alt=""
            style={{
              position: "absolute", top: 0, left: 0,
              width: "100%", height: "100%",
              objectFit: "cover", display: "block",
              filter: "brightness(0.32)",
              transform: "scale(1.0)",
              opacity: i === heroIdx ? 1 : 0,
              transition: "opacity 1.6s ease"
            }} />
        )) : (
          <div style={{ position: "absolute", inset: 0, background: "linear-gradient(160deg,#0a0f08,#111a0d,#080d07)" }} />
        )}

        {/* Overlay degradado */}
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to bottom, rgba(6,6,6,0.45) 0%, rgba(6,6,6,0.15) 30%, rgba(6,6,6,0.6) 70%, rgba(6,6,6,1) 100%)" }} />

        {/* Vignette centrado detrás del texto */}
        <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse 70% 60% at 50% 60%, rgba(0,0,0,0.72) 0%, rgba(0,0,0,0.35) 55%, transparent 100%)", zIndex: 1 }} />

        {/* Contenido centrado */}
        <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column" as const, alignItems: "center", justifyContent: "center", textAlign: "center" as const, padding: "0 24px", zIndex: 3 }}>

          {/* Indicadores dots */}
          {allPhotos.length > 1 && (
            <div style={{ display: "flex", gap: "5px", marginBottom: "20px" }}>
              {allPhotos.map((_, i) => (
                <div key={i} onClick={() => setHeroIdx(i)}
                  style={{ width: i === heroIdx ? "20px" : "5px", height: "5px", borderRadius: "3px", background: i === heroIdx ? GOLD : "rgba(255,255,255,0.18)", cursor: "pointer", transition: "all 0.35s ease" }} />
              ))}
            </div>
          )}

          <div style={{
            background: "rgba(0,0,0,0.52)",
            backdropFilter: "blur(6px)",
            WebkitBackdropFilter: "blur(6px)",
            borderRadius: "24px",
            padding: "36px 48px",
            display: "flex",
            flexDirection: "column" as const,
            alignItems: "center",
            maxWidth: "760px",
            width: "90%",
          }}>

            {/* Pill */}
            <div style={{ display: "inline-flex", alignItems: "center", gap: "6px", background: "rgba(201,168,76,0.1)", border: "1px solid rgba(201,168,76,0.25)", borderRadius: "20px", padding: "4px 14px", marginBottom: "20px" }}>
              <div style={{ width: "4px", height: "4px", borderRadius: "50%", background: GOLD }} />
              <span style={{ fontSize: "9px", letterSpacing: "2.5px", textTransform: "uppercase" as const, color: "rgba(201,168,76,0.8)" }}>Reserva directa</span>
            </div>

            {/* Headline principal impactante */}
            <div style={{ fontFamily: SANS, fontSize: "clamp(11px,2.2vw,15px)", fontWeight: 500, letterSpacing: "5px", textTransform: "uppercase" as const, color: "rgba(201,168,76,0.7)", marginBottom: "14px" }}>
              {tenant.business_name}
            </div>

            <div className="tk-hero-h1" style={{ fontFamily: SERIF, fontSize: "clamp(32px,6vw,68px)", fontWeight: 300, color: TEXT, lineHeight: 1.05, marginBottom: "18px", maxWidth: "700px" }}>
              {tagline && tagline !== tenant.business_name
                ? tagline
                : "Desconéctate en medio de la naturaleza"}
            </div>

            {/* Subtítulo motivador */}
            <div style={{ fontFamily: SERIF, fontSize: "clamp(14px,1.8vw,20px)", fontWeight: 300, color: "rgba(240,237,232,0.6)", lineHeight: 1.65, maxWidth: "520px", marginBottom: "24px", fontStyle: "italic" }}>
              Relájate, desconéctate y vive una experiencia única.<br/>
              Reserva directo, sin intermediarios.
            </div>

            {/* Botón CTA scroll */}
            <div style={{ display: "inline-flex", alignItems: "center", gap: "10px", background: GOLD, color: "#0a0700", borderRadius: "30px", padding: "12px 28px", cursor: "pointer", fontSize: "11px", fontWeight: 700, letterSpacing: "2px", textTransform: "uppercase" as const }}
              onClick={() => document.querySelector('.tk-section')?.scrollIntoView({ behavior: 'smooth' })}>
              Ver cabañas
              <span style={{ fontSize: "16px", fontWeight: 300 }}>↓</span>
            </div>

            {/* Ubicación */}
            {tenant.location_text && (
              <div style={{ display: "flex", alignItems: "center", gap: "6px", marginTop: "20px", flexWrap: "wrap" as const, justifyContent: "center" }}>
                <svg width="8" height="11" viewBox="0 0 9 12" fill="none"><path d="M4.5 0C2.3 0 .5 1.8.5 4c0 3 4 8 4 8s4-5 4-8C8.5 1.8 6.7 0 4.5 0zm0 5.5C3.7 5.5 3 4.8 3 4s.7-1.5 1.5-1.5S6 3.2 6 4s-.7 1.5-1.5 1.5z" fill="rgba(201,168,76,0.5)"/></svg>
                <span style={{ fontSize: "10px", color: "rgba(201,168,76,0.5)" }}>{tenant.location_text}</span>
                {tenant.location_maps_url && (
                  <a href={tenant.location_maps_url} target="_blank" rel="noopener noreferrer"
                    style={{ fontSize: "10px", color: "rgba(201,168,76,0.65)", textDecoration: "none", borderBottom: "1px solid rgba(201,168,76,0.22)" }}>
                    Ver en Maps
                  </a>
                )}
              </div>
            )}
          </div>
        </div>

      </div>

      {/* Franja verificado centrada */}
      {tenant.verified && (
        <div style={{ background: "linear-gradient(90deg,rgba(6,6,6,0) 0%,rgba(201,168,76,0.06) 30%,rgba(201,168,76,0.10) 50%,rgba(201,168,76,0.06) 70%,rgba(6,6,6,0) 100%)", borderTop: "1px solid rgba(201,168,76,0.12)", borderBottom: "1px solid rgba(201,168,76,0.12)", padding: "10px 24px", display: "flex", alignItems: "center", justifyContent: "center", gap: "16px" }}>
          <svg width="18" height="21" viewBox="0 0 28 33" fill="none">
            <path d="M14 1L26 6V16C26 23.5 20.5 29.5 14 31.5C7.5 29.5 2 23.5 2 16V6Z" fill="rgba(201,168,76,0.08)" stroke={GOLD} strokeWidth="1.2"/>
            <path d="M9 16.5L12.5 20L19 13" stroke={GOLD} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          <div style={{ textAlign: "center" as const }}>
            <span style={{ fontSize: "10px", fontWeight: 700, letterSpacing: "2.5px", textTransform: "uppercase" as const, color: GOLD }}>Verificado</span>
            <span style={{ fontSize: "10px", color: "rgba(201,168,76,0.5)", letterSpacing: "1px" }}> · por Takai.cl</span>
          </div>
          <svg width="18" height="21" viewBox="0 0 28 33" fill="none">
            <path d="M14 1L26 6V16C26 23.5 20.5 29.5 14 31.5C7.5 29.5 2 23.5 2 16V6Z" fill="rgba(201,168,76,0.08)" stroke={GOLD} strokeWidth="1.2"/>
            <path d="M9 16.5L12.5 20L19 13" stroke={GOLD} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
      )}

      <div className="tk-container" style={{ maxWidth: "1400px", margin: "0 auto" }}>

        <div style={{ margin: "14px 0 0" }}><GoldLine /></div>

        {/* CABINS */}
        <div className="tk-section" style={{ padding: "20px 20px 0" }}>
          <div style={{ fontSize: "10px", letterSpacing: "4px", fontWeight: 600, textTransform: "uppercase" as const, color: GOLD, marginBottom: "18px", display: "flex", alignItems: "center", gap: "8px" }}>
            Elige tu cabaña
            <div style={{ flex: 1, height: "1px", background: "rgba(201,168,76,0.12)" }} />
          </div>
          <div className="tk-cabins-grid">
            {sortedCabins.map(function(cabin, idx) {
              const amenitiesList = cabin.amenities ? cabin.amenities.split("\n").filter(Boolean) : []
              const extras = cabin.extras && cabin.extras.length > 0 ? cabin.extras : null
              const bgImg = cabin.photos && cabin.photos.length > 1 ? cabin.photos[1] : cabin.photos?.[0]

              return (
                <div key={cabin.id}>
                  {idx > 0 && (
                    <div className="tk-between" style={{ position: "relative", height: "52px", overflow: "hidden", margin: "4px 0" }}>
                      {bgImg && <div style={{ position: "absolute", inset: 0, backgroundImage: "url('" + bgImg + "')", backgroundSize: "cover", backgroundPosition: "center", opacity: 0.06 }} />}
                      <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to bottom," + BG + ",transparent 35%,transparent 65%," + BG + ")" }} />
                    </div>
                  )}
                  <div className="tk-card" style={{ position: "relative", background: SURF, border: "1px solid " + BORDER, borderRadius: "16px", overflow: "hidden" }}>
                    <CabinGallery photos={cabin.photos} name={cabin.name} />

                    {/* badge disponible */}
                    <div style={{ position: "absolute", top: "10px", left: "10px", display: "inline-flex", alignItems: "center", gap: "4px", background: "rgba(6,6,6,0.72)", border: "1px solid rgba(106,191,106,0.2)", borderRadius: "7px", padding: "3px 7px", zIndex: 3 }}>
                      <div style={{ width: "4px", height: "4px", borderRadius: "50%", background: "#6abf6a", animation: "tk-pulse 2s infinite", flexShrink: 0 }} />
                      <span style={{ fontSize: "8px", color: "#6abf6a", whiteSpace: "nowrap" as const }}>Disponible</span>
                    </div>

                    <div className="tk-card-body" style={{ padding: "20px 24px 24px" }}>
                      <div style={{ fontFamily: SERIF, fontSize: "26px", fontWeight: 400, color: TEXT, letterSpacing: "-0.2px", lineHeight: 1.15, marginBottom: "12px", wordBreak: "break-word" as const }}>{cabin.name}</div>

                      <div style={{ fontSize: "13px", color: "#bbb", letterSpacing: "1px", textTransform: "uppercase" as const, marginBottom: "14px" }}>Hasta {cabin.capacity} personas</div>

                      {cabin.description && (
                        <div style={{ fontSize: "14px", color: "#aaa", lineHeight: 1.8, marginBottom: "16px", fontWeight: 300, wordBreak: "break-word" as const }}>{cabin.description}</div>
                      )}

                      {amenitiesList.length > 0 && (
                        <div style={{ display: "flex", flexWrap: "wrap" as const, gap: "6px", marginBottom: "18px" }}>
                          {amenitiesList.map((am, i) => (
                            <span key={i} style={{ padding: "6px 12px", background: "rgba(201,168,76,0.05)", border: "1px solid rgba(201,168,76,0.16)", borderRadius: "5px", fontSize: "12px", color: "rgba(201,168,76,0.7)" }}>{am.trim()}</span>
                          ))}
                        </div>
                      )}

                      {extras && (
                        <div style={{ borderTop: "1px solid rgba(255,255,255,0.05)", paddingTop: "10px", marginBottom: "14px" }}>
                          {extras.map((ex, i) => (
                            <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "3px 0", borderTop: i > 0 ? "1px solid rgba(255,255,255,0.04)" : "none" }}>
                              <span style={{ fontSize: "11px", color: "#666", fontWeight: 300 }}>{ex.name}</span>
                              <span style={{ fontFamily: SERIF, fontSize: "12px", color: "rgba(201,168,76,0.65)" }}>{fmt(ex.price)}</span>
                            </div>
                          ))}
                        </div>
                      )}

                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px", paddingTop: "4px" }}>
                        <div>
                          <div style={{ fontFamily: SERIF, fontSize: "32px", fontWeight: 300, color: TEXT, lineHeight: 1 }}>{fmt(cabin.base_price_night)}</div>
                          <div style={{ fontSize: "12px", color: MUTED, letterSpacing: "0.5px", marginTop: "2px" }}>por noche</div>
                        </div>
                      </div>

                      <a href={"/reservar?cabin_id=" + cabin.id + "&cabin_name=" + encodeURIComponent(cabin.name) + "&price=" + cabin.base_price_night + "&capacity=" + cabin.capacity}
                        className="tk-btn"
                        style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%", background: GOLD, color: "#0a0700", borderRadius: "8px", padding: "14px 20px", fontSize: "12px", fontWeight: 600, textDecoration: "none", fontFamily: SANS, letterSpacing: "1.5px", textTransform: "uppercase" as const }}>
                        <span>Reservar</span>
                        <span style={{ fontFamily: SERIF, fontSize: "15px", fontWeight: 300 }}>→</span>
                      </a>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        <div style={{ margin: "20px 0 0" }}><GoldLine /></div>

        {/* LOCATION */}
        {tenant.location_text && (
          <div className="tk-section" style={{ padding: "18px 20px 0" }}>
            <div style={{ fontSize: "9px", letterSpacing: "3px", textTransform: "uppercase" as const, color: GOLD, marginBottom: "12px", display: "flex", alignItems: "center", gap: "8px" }}>
              Dónde estamos<div style={{ flex: 1, height: "1px", background: "rgba(201,168,76,0.12)" }} />
            </div>
            <div style={{ background: SURF, border: "1px solid " + BORDER, borderRadius: "12px", overflow: "hidden" }}>
              <div style={{ height: "70px", background: "#0a0d08", display: "flex", alignItems: "center", justifyContent: "center", position: "relative", overflow: "hidden" }}>
                {allPhotos[0] && <img src={allPhotos[0]} alt="" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", opacity: 0.16, filter: "blur(2px)" }} />}
                <div style={{ position: "absolute", inset: 0, background: "rgba(6,6,6,0.55)" }} />
                <div style={{ position: "absolute", inset: 0, backgroundImage: "linear-gradient(rgba(201,168,76,0.05) 1px,transparent 1px),linear-gradient(90deg,rgba(201,168,76,0.05) 1px,transparent 1px)", backgroundSize: "18px 18px" }} />
                <div style={{ position: "relative", zIndex: 1, width: "24px", height: "24px", background: "rgba(201,168,76,0.1)", border: "1px solid rgba(201,168,76,0.4)", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <svg width="10" height="13" viewBox="0 0 11 14" fill="none"><path d="M5.5 0C2.97 0 .92 2.06.92 4.58c0 3.44 4.58 9.42 4.58 9.42s4.58-5.98 4.58-9.42C10.08 2.06 8.03 0 5.5 0zm0 6.21c-.9 0-1.63-.73-1.63-1.63s.73-1.63 1.63-1.63 1.63.73 1.63 1.63-.73 1.63-1.63 1.63z" fill={GOLD}/></svg>
                </div>
              </div>
              <div style={{ padding: "10px 14px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div style={{ fontSize: "12px", color: TEXT, fontWeight: 500 }}>{tenant.location_text}</div>
                {tenant.location_maps_url && <a href={tenant.location_maps_url} target="_blank" rel="noopener noreferrer" style={{ fontSize: "9px", color: "rgba(201,168,76,0.6)", textDecoration: "none", borderBottom: "1px solid rgba(201,168,76,0.2)", letterSpacing: "0.5px" }}>Abrir Maps →</a>}
              </div>
            </div>
          </div>
        )}

        {/* ACTIVITIES */}
        {activities && (
          <div className="tk-section" style={{ position: "relative", overflow: "hidden", padding: "18px 20px 16px" }}>
            {allPhotos[0] && <img src={allPhotos[0]} alt="" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", opacity: 0.04, pointerEvents: "none" }} />}
            <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to bottom," + BG + " 0%,transparent 20%,transparent 80%," + BG + " 100%)", pointerEvents: "none" }} />
            <div style={{ position: "relative", zIndex: 1 }}>
              <div style={{ fontSize: "9px", letterSpacing: "3px", textTransform: "uppercase" as const, color: GOLD, marginBottom: "12px", display: "flex", alignItems: "center", gap: "8px" }}>
                Qué hacer cerca<div style={{ flex: 1, height: "1px", background: "rgba(201,168,76,0.12)" }} />
              </div>
              <div className="tk-acts-grid" style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: "6px" }}>
                {activities.map((act, i) => (
                  <div key={i} style={{ background: "rgba(13,13,13,0.9)", border: "1px solid " + BORDER, borderRadius: "10px", padding: "11px 6px", textAlign: "center" as const }}>
                    <div style={{ fontSize: "18px", marginBottom: "4px" }}>{act.icon}</div>
                    <div style={{ fontSize: "8px", color: "#555", letterSpacing: "0.5px" }}>{act.name}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* RULES */}
        {rules && (
          <div className="tk-section" style={{ position: "relative", overflow: "hidden", borderTop: "1px solid " + BORDER, padding: "14px 20px 16px" }}>
            {allPhotos[0] && <img src={allPhotos[0]} alt="" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", opacity: 0.03, pointerEvents: "none" }} />}
            <div style={{ position: "absolute", inset: 0, background: "rgba(6,6,6,0.8)", pointerEvents: "none" }} />
            <div style={{ position: "relative", zIndex: 1 }}>
              <div style={{ fontSize: "8px", letterSpacing: "2.5px", textTransform: "uppercase" as const, color: "#333", marginBottom: "10px" }}>Normas del lugar</div>
              <div className="tk-rules-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "5px" }}>
                {rules.map((rule, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: "5px", fontSize: "10px", color: "#3a3a3a" }}>
                    <div style={{ width: "14px", height: "14px", borderRadius: "4px", background: "rgba(230,57,70,0.07)", border: "1px solid rgba(230,57,70,0.15)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "8px", color: "rgba(230,57,70,0.4)", flexShrink: 0 }}>✕</div>
                    {rule}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* SOCIAL */}
        {hasSocial && (
          <div className="tk-section" style={{ display: "flex", gap: "8px", padding: "12px 20px", borderTop: "1px solid " + BORDER }}>
            {tenant.instagram_url && (
              <a href={tenant.instagram_url} target="_blank" rel="noopener noreferrer" className="tk-soc"
                style={{ display: "inline-flex", alignItems: "center", gap: "7px", background: SURF, border: "1px solid " + BORDER, borderRadius: "8px", padding: "7px 13px", textDecoration: "none", color: MUTED, fontSize: "11px", transition: "all 0.15s" }}>
                <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="20" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="0.8" fill="currentColor" stroke="none"/></svg>
                Instagram
              </a>
            )}
            {tenant.facebook_url && (
              <a href={tenant.facebook_url} target="_blank" rel="noopener noreferrer" className="tk-soc"
                style={{ display: "inline-flex", alignItems: "center", gap: "7px", background: SURF, border: "1px solid " + BORDER, borderRadius: "8px", padding: "7px 13px", textDecoration: "none", color: MUTED, fontSize: "11px", transition: "all 0.15s" }}>
                <svg viewBox="0 0 24 24" width="13" height="13" fill="currentColor"><path d="M18 2h-3a5 5 0 00-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 011-1h3z"/></svg>
                Facebook
              </a>
            )}
          </div>
        )}

      </div>

      {/* FOOTER */}
      <div style={{ position: "relative", overflow: "hidden", marginTop: "8px" }}>
        {allPhotos[0] && <img src={allPhotos[0]} alt="" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", opacity: 0.05, pointerEvents: "none" }} />}
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to bottom," + BG + ",rgba(6,6,6,0.85))", pointerEvents: "none" }} />
        <div style={{ position: "relative", zIndex: 1, borderTop: "1px solid rgba(201,168,76,0.07)", padding: "14px 24px", display: "flex", alignItems: "center", justifyContent: "space-between", maxWidth: "1200px", margin: "0 auto" }}>
          <div style={{ fontFamily: SERIF, fontSize: "11px", letterSpacing: "2px", color: "rgba(201,168,76,0.25)", textTransform: "uppercase" as const }}>{tenant.business_name}</div>
          <div style={{ fontSize: "8px", color: "rgba(201,168,76,0.18)", letterSpacing: "1.5px", textTransform: "uppercase" as const }}>Powered by Takai.cl</div>
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
