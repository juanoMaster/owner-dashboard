"use client"
import { Suspense, useEffect, useState } from "react"
import { useParams } from "next/navigation"

interface Cabin { id: string; name: string; capacity: number; base_price_night: number; photos?: string[] }
interface TenantData {
  business_name: string
  facebook_url?: string | null
  instagram_url?: string | null
  verified?: boolean
}

function SelloGrande() {
  return (
    <svg width="120" height="144" viewBox="0 0 150 180" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M75 6 L138 32 L138 92 C138 128 110 152 75 165 C40 152 12 128 12 92 L12 32 Z" fill="#1a2a18" stroke="#e8d5a3" strokeWidth="2.5"/>
      <path d="M75 16 L128 38 L128 89 C128 120 104 142 75 153 C46 142 22 120 22 89 L22 38 Z" fill="#0d1a12" stroke="#e8d5a366" strokeWidth="0.8"/>
      <path d="M75 24 L120 43 L120 86 C120 114 99 133 75 143 C51 133 30 114 30 86 L30 43 Z" fill="none" stroke="#e8d5a322" strokeWidth="0.5"/>
      <circle cx="75" cy="65" r="22" fill="#e8d5a315" stroke="#e8d5a3" strokeWidth="1.5"/>
      <circle cx="75" cy="65" r="15" fill="#e8d5a308" stroke="#e8d5a355" strokeWidth="0.5"/>
      <path d="M66 65 L72 71 L84 59" stroke="#e8d5a3" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
      <line x1="40" y1="100" x2="110" y2="100" stroke="#e8d5a333" strokeWidth="0.5"/>
      <text x="75" y="117" textAnchor="middle" fontFamily="Georgia, serif" fontSize="10" fill="#e8d5a3" fontWeight="700" letterSpacing="2">VERIFICADO</text>
      <line x1="40" y1="124" x2="110" y2="124" stroke="#e8d5a333" strokeWidth="0.5"/>
      <text x="75" y="140" textAnchor="middle" fontFamily="sans-serif" fontSize="8" fill="#7ab87a" letterSpacing="1">TAKAI.CL</text>
      <circle cx="32" cy="32" r="3.5" fill="#e8d5a3" opacity="0.18"/>
      <circle cx="118" cy="32" r="3.5" fill="#e8d5a3" opacity="0.18"/>
    </svg>
  )
}

function CabinGallery({ photos }: { photos?: string[] }) {
  const [main, setMain] = useState<string>((photos && photos.length > 0) ? photos[0] : "")
  if (!photos || photos.length === 0) return null
  return (
    <div style={{ width: "100%", marginBottom: "12px" }}>
      <img
        src={main}
        alt=""
        style={{ width: "100%", height: "180px", objectFit: "cover" as const, borderRadius: "8px", marginBottom: "8px", display: "block" }}
      />
      {photos.length > 1 && (
        <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" as const, justifyContent: "center" }}>
          {photos.map(function(url) {
            return (
              <img
                key={url}
                src={url}
                alt=""
                onClick={function() { setMain(url) }}
                style={{
                  width: "60px",
                  height: "60px",
                  objectFit: "cover" as const,
                  borderRadius: "6px",
                  cursor: "pointer",
                  opacity: url === main ? 1 : 0.55,
                  border: url === main ? "2px solid #7ab87a" : "2px solid transparent",
                  boxSizing: "border-box" as const,
                }}
              />
            )
          })}
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

  useEffect(function() {
    if (!slug) return
    fetch("/api/tenant/" + slug + "/cabins")
      .then(function(r) {
        if (!r.ok) { setNotFound(true); setLoading(false); return null }
        return r.json()
      })
      .then(function(d) {
        if (!d) return
        setTenant(d.tenant)
        setCabins(d.cabins || [])
        setLoading(false)
      })
      .catch(function() { setNotFound(true); setLoading(false) })
  }, [slug])

  function fmt(n: number) { return "$" + n.toLocaleString("es-CL") }

  if (loading) return (
    <div style={{ background: "#0a0f0a", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ color: "#4a6a48", fontFamily: "sans-serif", fontSize: "13px" }}>Cargando...</div>
    </div>
  )

  if (notFound || !tenant) return (
    <div style={{ background: "#0a0f0a", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ color: "#4a6a48", fontFamily: "sans-serif", fontSize: "13px" }}>{"Caba\u00f1as no encontradas"}</div>
    </div>
  )

  const parts = tenant.business_name.split(" ")
  const first = parts[0]
  const rest = parts.slice(1).join(" ")
  const hasSocial = !!(tenant.facebook_url || tenant.instagram_url)

  return (
    <div style={{ fontFamily: "Georgia, serif", background: "#0a0f0a", minHeight: "100vh", color: "#f0ede8" }}>
      <style>{"\
        @media (max-width: 640px) {\
          .hero-text-slug { padding-top: 108px !important; }\
          .cabins-slug { grid-template-columns: 1fr !important; }\
        }\
        @media (min-width: 768px) {\
          .hero-wrap-slug { max-height: 380px !important; }\
          .hero-wrap-slug svg { max-height: 380px !important; }\
          .hero-text-slug { padding-top: 30px !important; padding-bottom: 10px !important; }\
        }\
        @media (max-width: 640px) { .sello-pc-slug { display: flex !important; } .sello-fl-slug { display: none !important; } }\
        @media (min-width: 641px) { .sello-pc-slug { display: none !important; } .sello-fl-slug { display: flex !important; } }\
      "}</style>

      {/* ── HERO ── */}
      <div className="hero-wrap-slug" style={{ position: "relative", width: "100%", overflow: "hidden", background: "#060c10" }}>
        <svg style={{ display: "block", width: "100%", height: "auto", minHeight: "360px" }} viewBox="0 0 1200 540" preserveAspectRatio="xMidYMax slice">
          <defs>
            <linearGradient id="sky-slug" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#04080c"/>
              <stop offset="55%" stopColor="#08101a"/>
              <stop offset="100%" stopColor="#0a1420"/>
            </linearGradient>
            <linearGradient id="mt-a-slug" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#12243a"/>
              <stop offset="100%" stopColor="#0a1828"/>
            </linearGradient>
            <linearGradient id="mt-b-slug" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#0d1e30"/>
              <stop offset="100%" stopColor="#081018"/>
            </linearGradient>
            <linearGradient id="lago-slug" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#0a1e38" stopOpacity="0.7"/>
              <stop offset="100%" stopColor="#04080e" stopOpacity="0.9"/>
            </linearGradient>
            <linearGradient id="mist-slug" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#0a0f0a" stopOpacity="0"/>
              <stop offset="100%" stopColor="#0a0f0a" stopOpacity="1"/>
            </linearGradient>
            <radialGradient id="luna-slug" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#b0cce8" stopOpacity="0.15"/>
              <stop offset="100%" stopColor="#b0cce8" stopOpacity="0"/>
            </radialGradient>
            <radialGradient id="luna-refl-slug" cx="50%" cy="30%" r="50%">
              <stop offset="0%" stopColor="#8ab0d0" stopOpacity="0.18"/>
              <stop offset="100%" stopColor="#8ab0d0" stopOpacity="0"/>
            </radialGradient>
          </defs>
          <rect width="1200" height="540" fill="url(#sky-slug)"/>
          <circle cx="50" cy="25" r="0.7" fill="#ffffff35"/><circle cx="140" cy="48" r="0.5" fill="#ffffff25"/>
          <circle cx="230" cy="18" r="0.9" fill="#ffffff40"/><circle cx="340" cy="40" r="0.6" fill="#ffffff28"/>
          <circle cx="460" cy="15" r="0.8" fill="#ffffff30"/><circle cx="580" cy="50" r="0.5" fill="#ffffff20"/>
          <circle cx="680" cy="22" r="0.7" fill="#ffffff35"/><circle cx="790" cy="55" r="0.6" fill="#ffffff22"/>
          <circle cx="880" cy="18" r="0.9" fill="#ffffff38"/><circle cx="970" cy="38" r="0.5" fill="#ffffff20"/>
          <circle cx="1060" cy="22" r="0.8" fill="#ffffff30"/><circle cx="1150" cy="48" r="0.6" fill="#ffffff25"/>
          <circle cx="190" cy="65" r="0.4" fill="#ffffff18"/><circle cx="500" cy="70" r="0.5" fill="#ffffff15"/>
          <circle cx="750" cy="62" r="0.4" fill="#ffffff18"/><circle cx="1000" cy="68" r="0.5" fill="#ffffff20"/>
          <circle cx="960" cy="72" r="72" fill="url(#luna-slug)"/>
          <circle cx="960" cy="72" r="3.5" fill="#d0e8ff" opacity="0.32"/>
          <path d="M540 185 L620 62 L700 185 Z" fill="#0c1e32" opacity="0.55"/>
          <path d="M552 185 L620 78 L688 185 Z" fill="#0e2238" opacity="0.45"/>
          <path d="M608 78 L620 62 L632 78 Z" fill="#182e42" opacity="0.4"/>
          <path d="M0 295 L130 230 L250 262 L380 200 L500 238 L600 185 L700 185 L800 210 L900 192 L1020 225 L1120 205 L1200 238 L1200 540 L0 540Z" fill="url(#mt-a-slug)" opacity="0.55"/>
          <path d="M0 345 L110 295 L220 325 L340 278 L460 312 L570 265 L660 295 L760 272 L870 300 L980 270 L1090 298 L1200 275 L1200 540 L0 540Z" fill="url(#mt-b-slug)" opacity="0.88"/>
          <path d="M0 400 L150 368 L280 382 L420 360 L560 375 L700 358 L840 372 L980 356 L1100 370 L1200 360 L1200 540 L0 540Z" fill="#08131e" opacity="0.95"/>
          <path d="M0 418 L1200 410 L1200 490 L0 490Z" fill="url(#lago-slug)" opacity="0.6"/>
          <ellipse cx="960" cy="450" rx="60" ry="18" fill="url(#luna-refl-slug)"/>
          <line x1="940" y1="415" x2="935" y2="455" stroke="#8ab0d040" strokeWidth="1"/>
          <line x1="960" y1="412" x2="960" y2="458" stroke="#8ab0d055" strokeWidth="1.5"/>
          <line x1="980" y1="415" x2="985" y2="455" stroke="#8ab0d040" strokeWidth="1"/>
          <path d="M0 478 L200 472 L400 480 L600 473 L800 480 L1000 474 L1200 478 L1200 540 L0 540Z" fill="#060e18" opacity="0.85"/>
          <line x1="55" y1="468" x2="55" y2="390" stroke="#0c1e0c" strokeWidth="3"/><circle cx="55" cy="388" r="8" fill="#0c1e0c" opacity="0.9"/>
          <polygon points="55,390 38,422 72,422" fill="#0e2010" opacity="0.88"/>
          <polygon points="55,406 36,440 74,440" fill="#102212" opacity="0.88"/>
          <polygon points="55,422 33,460 77,460" fill="#122614" opacity="0.88"/>
          <line x1="130" y1="472" x2="130" y2="415" stroke="#0c1e0c" strokeWidth="2.2"/><circle cx="130" cy="413" r="6" fill="#0c1e0c" opacity="0.85"/>
          <polygon points="130,415 117,438 143,438" fill="#0e2010" opacity="0.8"/>
          <polygon points="130,428 115,454 145,454" fill="#102212" opacity="0.8"/>
          <line x1="1145" y1="465" x2="1145" y2="385" stroke="#0c1e0c" strokeWidth="3"/><circle cx="1145" cy="383" r="8.5" fill="#0c1e0c" opacity="0.9"/>
          <polygon points="1145,385 1128,418 1162,418" fill="#0e2010" opacity="0.88"/>
          <polygon points="1145,402 1126,438 1164,438" fill="#102212" opacity="0.88"/>
          <polygon points="1145,420 1122,460 1168,460" fill="#122614" opacity="0.88"/>
          <line x1="1070" y1="470" x2="1070" y2="412" stroke="#0c1e0c" strokeWidth="2.2"/><circle cx="1070" cy="410" r="6" fill="#0c1e0c" opacity="0.85"/>
          <polygon points="1070,412 1057,434 1083,434" fill="#0e2010" opacity="0.8"/>
          <polygon points="1070,424 1055,450 1085,450" fill="#102212" opacity="0.8"/>
          <line x1="330" y1="475" x2="330" y2="418" stroke="#0a1a0a" strokeWidth="2"/>
          <polygon points="330,418 320,436 340,436" fill="#0c1e0c" opacity="0.72"/>
          <polygon points="330,428 318,448 342,448" fill="#0e2010" opacity="0.72"/>
          <line x1="860" y1="474" x2="860" y2="414" stroke="#0a1a0a" strokeWidth="2.2"/>
          <polygon points="860,414 849,436 871,436" fill="#0c1e0c" opacity="0.75"/>
          <polygon points="860,426 847,450 873,450" fill="#0e2010" opacity="0.75"/>
          <rect x="0" y="460" width="1200" height="80" fill="url(#mist-slug)"/>
        </svg>

        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, #04080c 0%, transparent 22%, transparent 52%, #0a0f0a 100%)", pointerEvents: "none" }}/>

        {/* Sello — desktop: flotante derecha */}
        {tenant.verified && (
          <div className="sello-fl-slug" style={{ position: "absolute", right: "16%", top: "50%", transform: "translateY(-50%)", zIndex: 10, display: "none", flexDirection: "column", alignItems: "center", gap: "6px", filter: "drop-shadow(0 0 24px #e8d5a333)" }}>
            <SelloGrande />
            <div style={{ background: "#0d1a12cc", border: "1px solid #e8d5a322", borderRadius: "8px", padding: "6px 12px", textAlign: "center" }}>
              <div style={{ fontFamily: "Georgia, serif", fontSize: "8px", color: "#e8d5a3", letterSpacing: "1px", lineHeight: 1.5 }}>Alojamiento verificado</div>
              <div style={{ fontFamily: "Georgia, serif", fontSize: "8px", color: "#e8d5a3", letterSpacing: "1px", lineHeight: 1.5 }}>personalmente por</div>
              <div style={{ fontFamily: "sans-serif", fontSize: "9px", color: "#7ab87a", letterSpacing: "1.5px", fontWeight: 700, marginTop: "2px" }}>TAKAI.CL</div>
            </div>
          </div>
        )}

        {/* Header top-left: nombre del negocio */}
        <div style={{ position: "absolute", top: 0, left: 0, right: 0, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "18px 28px", zIndex: 10 }}>
          <div style={{ fontFamily: "Georgia, serif", fontSize: "22px", letterSpacing: "5px", textShadow: "0 2px 12px #000000cc", textTransform: "uppercase" as const }}>
            <span style={{ color: "#e8d5a3" }}>{first}</span>
            {rest && <span style={{ color: "#7ab87a" }}>{" " + rest}</span>}
          </div>
          <div style={{ fontSize: "11px", color: "#a8c8a055", letterSpacing: "2px", textTransform: "uppercase" as const }}>Licanray</div>
        </div>

        {/* Hero text centro */}
        <div className="hero-text-slug" style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", textAlign: "center", padding: "40px 20px 16px" }}>
          <div style={{ fontSize: "11px", letterSpacing: "4px", textTransform: "uppercase" as const, color: "#7ab87a", marginBottom: "14px" }}>{"Caba\u00f1as en la naturaleza"}</div>
          <div style={{ fontFamily: "Georgia, serif", fontSize: "clamp(26px, 5vw, 48px)", fontWeight: 700, color: "#f0ede8", lineHeight: 1.15, marginBottom: "14px" }}>
            {"Desc\u00f3nectate en el"}<br/><span style={{ color: "#b8d8a0" }}>{"sur de Chile"}</span>
          </div>
          <div style={{ fontFamily: "sans-serif", fontSize: "clamp(12px, 1.6vw, 16px)", color: "#8ab888", lineHeight: 1.7, maxWidth: "380px", margin: "0 auto 16px" }}>
            {"Bosque nativo, aguas cristalinas y el Volc\u00e1n Villarrica como tel\u00f3n de fondo. " + tenant.business_name + " \u2014 Licanray, Lago Calafqu\u00e9n."}
          </div>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "8px" }}>
            <div style={{ display: "inline-flex", alignItems: "center", gap: "7px", background: "#ffffff07", border: "1px solid #ffffff12", borderRadius: "20px", padding: "6px 16px", fontFamily: "sans-serif", fontSize: "11px", color: "#9ab898" }}>
              <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#7ab87a", flexShrink: 0, display: "inline-block" }}/>
              {"Licanray \u00b7 Lago Calafqu\u00e9n \u00b7 Regi\u00f3n de La Araucan\u00eda"}
            </div>
            {/* Sello — mobile: inline */}
            {tenant.verified && (
              <div className="sello-pc-slug" style={{ display: "none", flexDirection: "row", alignItems: "center", gap: "10px", marginTop: "10px", filter: "drop-shadow(0 0 20px #e8d5a322)" }}>
                <svg width="50" height="60" viewBox="0 0 150 180" fill="none">
                  <path d="M75 6 L138 32 L138 92 C138 128 110 152 75 165 C40 152 12 128 12 92 L12 32 Z" fill="#1a2a18" stroke="#e8d5a3" strokeWidth="4"/>
                  <path d="M75 16 L128 38 L128 89 C128 120 104 142 75 153 C46 142 22 120 22 89 L22 38 Z" fill="#0d1a12" stroke="#e8d5a366" strokeWidth="1.5"/>
                  <circle cx="75" cy="65" r="22" fill="#e8d5a315" stroke="#e8d5a3" strokeWidth="2.5"/>
                  <path d="M60 65 L70 75 L90 55" stroke="#e8d5a3" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
                  <text x="75" y="115" textAnchor="middle" fontFamily="Georgia, serif" fontSize="13" fill="#e8d5a3" fontWeight="700" letterSpacing="1.5">VERIFICADO</text>
                  <text x="75" y="137" textAnchor="middle" fontFamily="sans-serif" fontSize="11" fill="#7ab87a" letterSpacing="1">TAKAI.CL</text>
                </svg>
                <div style={{ fontFamily: "Georgia, serif", fontSize: "10px", color: "#e8d5a3", letterSpacing: "0.5px", textAlign: "left" as const, lineHeight: 1.4 }}>
                  Alojamiento verificado<br/>personalmente por<br/>
                  <span style={{ color: "#7ab87a", fontFamily: "sans-serif", fontWeight: 700, fontSize: "11px", letterSpacing: "1.5px" }}>TAKAI.CL</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── CABAÑAS ── */}
      <div style={{ padding: "24px 16px 6px", fontFamily: "sans-serif", maxWidth: "800px", margin: "0 auto" }}>
        <div style={{ fontSize: "10px", letterSpacing: "2.5px", textTransform: "uppercase" as const, color: "#4a6a48", marginBottom: "10px" }}>{"Reserva tu caba\u00f1a"}</div>
        <div className="cabins-slug" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "10px", marginBottom: "4px" }}>
          {cabins.map(function(c) {
            return (
              <div key={c.id} style={{ background: "#111a11", border: "1px solid #2a3a2a", borderRadius: "14px", padding: "16px", display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center" }}>
                <div style={{ display: "inline-flex", alignItems: "center", gap: "4px", background: "#7ab87a14", border: "1px solid #7ab87a22", color: "#7ab87a", fontSize: "9px", padding: "2px 7px", borderRadius: "10px", marginBottom: "12px" }}>
                  <span style={{ width: "4px", height: "4px", borderRadius: "50%", background: "#7ab87a", display: "inline-block" }}/>
                  Disponible
                </div>
                <div style={{ marginBottom: "10px" }}>
                  <svg width="40" height="36" viewBox="0 0 48 40" fill="none">
                    <path d="M24 4 L44 20 L44 38 L4 38 L4 20 Z" fill="#162618" stroke="#3a5a38" strokeWidth="1.5" strokeLinejoin="round"/>
                    <path d="M24 4 L44 20 L4 20 Z" fill="#1e3020" stroke="#3a5a38" strokeWidth="1.5" strokeLinejoin="round"/>
                    <rect x="18" y="26" width="12" height="12" rx="2" fill="#0d1a0d" stroke="#3a5a38" strokeWidth="1"/>
                    <rect x="8" y="24" width="8" height="6" rx="1" fill="#7ab87a22" stroke="#3a5a38" strokeWidth="0.8"/>
                    <line x1="12" y1="24" x2="12" y2="30" stroke="#3a5a38" strokeWidth="0.8"/>
                  </svg>
                </div>
                <div style={{ fontFamily: "Georgia, serif", fontSize: "17px", color: "#e8d5a3", marginBottom: "4px" }}>{c.name}</div>
                <div style={{ fontSize: "11px", color: "#8a9e88", marginBottom: "12px" }}>{"Hasta " + c.capacity + " personas"}</div>
                <div style={{ fontFamily: "Georgia, serif", fontSize: "28px", color: "#c8d8c0", marginBottom: "2px" }}>{fmt(c.base_price_night)}</div>
                <div style={{ fontSize: "10px", color: "#6a8a68", marginBottom: "14px" }}>por noche</div>
                <CabinGallery photos={c.photos} />
                <a href={"/reservar?cabin_id=" + c.id + "&cabin_name=" + encodeURIComponent(c.name) + "&price=" + c.base_price_night + "&capacity=" + c.capacity}
                  style={{ display: "block", boxSizing: "border-box", width: "100%", background: "#7ab87a", color: "#0a0f0a", borderRadius: "10px", padding: "11px", fontSize: "13px", fontWeight: 700, textAlign: "center", textDecoration: "none", fontFamily: "sans-serif" }}>
                  {"Reservar \u2192"}
                </a>
              </div>
            )
          })}
        </div>
      </div>

      {/* ── CHIPS DE ACTIVIDADES ── */}
      <div style={{ display: "flex", flexWrap: "wrap" as const, justifyContent: "center", gap: "7px", padding: "4px 16px 14px", fontFamily: "sans-serif", maxWidth: "800px", margin: "0 auto" }}>
        {[
          { ico: "\uD83C\uDFDE\uFE0F", name: "Lago" },
          { ico: "\uD83C\uDF0B", name: "Volc\u00e1n Villarrica" },
          { ico: "\u2668\uFE0F", name: "Termas" },
          { ico: "\uD83D\uDEA3", name: "Kayak" },
          { ico: "\uD83E\uDD7E", name: "Trekking" },
          { ico: "\uD83C\uDF32", name: "Bosque nativo" },
        ].map(function(f) {
          return (
            <div key={f.name} style={{ background: "#111a11", border: "1px solid #1e2e1e", borderRadius: "12px", padding: "9px 8px", textAlign: "center", width: "78px", minHeight: "72px", display: "flex", flexDirection: "column", justifyContent: "center" }}>
              <div style={{ fontSize: "18px", marginBottom: "4px" }}>{f.ico}</div>
              <div style={{ fontSize: "8px", color: "#8a9e88", fontWeight: 500, lineHeight: 1.2 }}>{f.name}</div>
            </div>
          )
        })}
      </div>

      {/* ── QUÉ HACER ── */}
      <div style={{ background: "#0d140d", padding: "16px", borderTop: "1px solid #1a261a", fontFamily: "sans-serif" }}>
        <div style={{ maxWidth: "800px", margin: "0 auto" }}>
          <div style={{ fontFamily: "Georgia, serif", fontSize: "17px", color: "#e8d5a3", marginBottom: "12px" }}>{"Qu\u00e9 hacer en Licanray"}</div>
          {[
            { ico: "\uD83C\uDFDE\uFE0F", name: "Lago Calafqu\u00e9n", desc: "Kayak, pesca y ba\u00f1os en verano \u2014 aguas de origen glaciar a pasos del alojamiento" },
            { ico: "\uD83C\uDF0B", name: "Volc\u00e1n Villarrica", desc: "A 45 min \u2014 trekking hasta uno de los volcanes m\u00e1s activos de Sudam\u00e9rica" },
            { ico: "\u2668\uFE0F", name: "Termas de Co\u00f1aripe", desc: "Aguas termales naturales rodeadas de monta\u00f1a y bosque, a solo 20 min" },
            { ico: "\uD83E\uDD7E", name: "Trekking y bosque nativo", desc: "Senderos y miradores con vistas al lago y la cordillera" },
          ].map(function(a) {
            return (
              <div key={a.name} style={{ display: "flex", gap: "10px", alignItems: "flex-start", marginBottom: "10px", paddingBottom: "10px", borderBottom: "1px solid #ffffff07" }}>
                <div style={{ width: "36px", height: "36px", background: "#162618", border: "1px solid #2a3820", borderRadius: "9px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "16px", flexShrink: 0 }}>{a.ico}</div>
                <div>
                  <div style={{ fontSize: "12px", fontWeight: 600, color: "#c8d8c0", marginBottom: "2px" }}>{a.name}</div>
                  <div style={{ fontSize: "11px", color: "#6a8a68", lineHeight: 1.5 }}>{a.desc}</div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* ── NORMAS ── */}
      <div style={{ background: "#0a0f0a", padding: "13px 16px", borderTop: "1px solid #1a261a", fontFamily: "sans-serif" }}>
        <div style={{ maxWidth: "800px", margin: "0 auto" }}>
          <div style={{ fontSize: "10px", fontWeight: 600, color: "#8a9e88", letterSpacing: "1.5px", textTransform: "uppercase" as const, marginBottom: "7px" }}>Normas del lugar</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "5px" }}>
            {["No mascotas", "No fiestas", "No visitas externas", "No fumar adentro", "No papeles al WC", "M\u00fasica moderada"].map(function(r) {
              return (
                <div key={r} style={{ display: "flex", alignItems: "center", gap: "5px", fontSize: "10px", color: "#6a8a68" }}>
                  <span style={{ color: "#c0504888", fontSize: "11px", fontWeight: 700 }}>{"x"}</span>
                  {r}
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* ── REDES SOCIALES (solo si existen) ── */}
      {hasSocial && (
        <div style={{ background: "#0d140d", padding: "13px 16px", borderTop: "1px solid #1a261a", fontFamily: "sans-serif" }}>
          <div style={{ maxWidth: "800px", margin: "0 auto" }}>
            <div style={{ fontSize: "10px", fontWeight: 600, color: "#8a9e88", letterSpacing: "1.5px", textTransform: "uppercase" as const, marginBottom: "10px" }}>{"S\u00edguenos"}</div>
            <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" as const }}>
              {tenant.instagram_url && (
                <a href={tenant.instagram_url} target="_blank" rel="noopener noreferrer"
                  style={{ display: "inline-flex", alignItems: "center", gap: "8px", background: "#111a11", border: "1px solid #2a3a2a", borderRadius: "10px", padding: "9px 14px", textDecoration: "none", color: "#c8d8c0", fontSize: "12px" }}>
                  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="#c8d8c0" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="2" y="2" width="20" height="20" rx="5" ry="5"/>
                    <circle cx="12" cy="12" r="4"/>
                    <circle cx="17.5" cy="6.5" r="0.8" fill="#c8d8c0" stroke="none"/>
                  </svg>
                  Instagram
                </a>
              )}
              {tenant.facebook_url && (
                <a href={tenant.facebook_url} target="_blank" rel="noopener noreferrer"
                  style={{ display: "inline-flex", alignItems: "center", gap: "8px", background: "#111a11", border: "1px solid #2a3a2a", borderRadius: "10px", padding: "9px 14px", textDecoration: "none", color: "#c8d8c0", fontSize: "12px" }}>
                  <svg viewBox="0 0 24 24" width="16" height="16" fill="#c8d8c0">
                    <path d="M18 2h-3a5 5 0 00-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 011-1h3z"/>
                  </svg>
                  Facebook
                </a>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── FOOTER ── */}
      <div style={{ textAlign: "center", padding: "12px", fontSize: "10px", color: "#5a7058", letterSpacing: "1.5px", textTransform: "uppercase" as const, borderTop: "1px solid #1a261a", fontFamily: "sans-serif" }}>
        {tenant.business_name + " \u00b7 Licanray \u00b7 Lago Calafqu\u00e9n \u00b7 Chile"}
      </div>

    </div>
  )
}

export default function SlugPage() {
  return (
    <Suspense fallback={<div style={{ background: "#0a0f0a", minHeight: "100vh" }}/>}>
      <SlugInner />
    </Suspense>
  )
}
// v2 — sin formulario de contacto
