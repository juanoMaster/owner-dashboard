"use client"
import { Suspense, useEffect, useState } from "react"

// ─── Datos de Trinidad ──────────────────────────────────────────────
// Cambia estas constantes para personalizar la página
const NOMBRE = "Cabañas Trinidad"
const UBICACION = "Sur de Chile"       // ← ajustar
const DESCRIPCION = "Un refugio en la naturaleza para descansar y reconectarse."  // ← ajustar
const TAG_UBICACION = "Chile · Naturaleza · Tranquilidad"  // ← ajustar
// ─────────────────────────────────────────────────────────────────────

function SelloGrande() {
  return (
    <svg width="120" height="144" viewBox="0 0 150 180" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M75 6 L138 32 L138 92 C138 128 110 152 75 165 C40 152 12 128 12 92 L12 32 Z" fill="#1a2a18" stroke="#e8d5a3" strokeWidth="2.5"/>
      <path d="M75 16 L128 38 L128 89 C128 120 104 142 75 153 C46 142 22 120 22 89 L22 38 Z" fill="#0d1a12" stroke="#e8d5a366" strokeWidth="0.8"/>
      <circle cx="75" cy="65" r="22" fill="#e8d5a315" stroke="#e8d5a3" strokeWidth="1.5"/>
      <path d="M66 65 L72 71 L84 59" stroke="#e8d5a3" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
      <text x="75" y="117" textAnchor="middle" fontFamily="Georgia, serif" fontSize="10" fill="#e8d5a3" fontWeight="700" letterSpacing="2">VERIFICADO</text>
      <text x="75" y="140" textAnchor="middle" fontFamily="sans-serif" fontSize="8" fill="#7ab87a" letterSpacing="1">TAKAI.CL</text>
    </svg>
  )
}

interface Cabin {
  id: string
  name: string
  capacity: number
  base_price_night: number
}

function TrinidadInner() {
  const [cabins, setCabins] = useState<Cabin[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(function() {
    fetch("/api/trinidad/cabins")
      .then(function(r) { return r.json() })
      .then(function(d) { setCabins(d.cabins || []); setLoading(false) })
      .catch(function() { setLoading(false) })
  }, [])

  function fmt(n: number) { return "$" + n.toLocaleString("es-CL") }

  return (
    <div style={{ fontFamily: "Georgia, serif", background: "#0a0f0a", minHeight: "100vh", color: "#f0ede8" }}>

      <style>{"\
        @media (max-width: 640px) { .hero-text-tr { padding-top: 108px !important; } }\
        @media (min-width: 768px) { .hero-wrap-tr { max-height: 360px !important; } .hero-text-tr { padding-top: 30px !important; padding-bottom: 10px !important; } }\
        @media (max-width: 640px) { .sello-pc-tr { display: flex !important; } .sello-float-tr { display: none !important; } }\
        @media (min-width: 641px) { .sello-pc-tr { display: none !important; } .sello-float-tr { display: flex !important; } }\
      "}</style>

      {/* HERO */}
      <div className="hero-wrap-tr" style={{ position: "relative", width: "100%", overflow: "hidden", background: "#0a1208" }}>
        <svg style={{ display: "block", width: "100%", height: "auto", minHeight: "340px" }} viewBox="0 0 1200 520" preserveAspectRatio="xMidYMax slice">
          <defs>
            <linearGradient id="sky-tr" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#070c0e"/><stop offset="60%" stopColor="#0a1018"/><stop offset="100%" stopColor="#0c1220"/></linearGradient>
            <linearGradient id="mt1-tr" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#122030"/><stop offset="100%" stopColor="#0a1020"/></linearGradient>
            <linearGradient id="mt2-tr" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#0e1828"/><stop offset="100%" stopColor="#080e18"/></linearGradient>
            <linearGradient id="mist-tr" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#0a0f0a" stopOpacity="0"/><stop offset="100%" stopColor="#0a0f0a" stopOpacity="1"/></linearGradient>
            <radialGradient id="moonGlow-tr" cx="50%" cy="50%" r="50%"><stop offset="0%" stopColor="#a0b8d0" stopOpacity="0.1"/><stop offset="100%" stopColor="#a0b8d0" stopOpacity="0"/></radialGradient>
          </defs>
          <rect width="1200" height="520" fill="url(#sky-tr)"/>
          <circle cx="80" cy="30" r="0.8" fill="#ffffff30"/><circle cx="200" cy="55" r="0.6" fill="#ffffff20"/>
          <circle cx="350" cy="22" r="1" fill="#ffffff38"/><circle cx="500" cy="45" r="0.7" fill="#ffffff28"/>
          <circle cx="650" cy="18" r="0.9" fill="#ffffff22"/><circle cx="800" cy="52" r="0.6" fill="#ffffff1a"/>
          <circle cx="950" cy="28" r="0.8" fill="#ffffff30"/><circle cx="1100" cy="40" r="0.7" fill="#ffffff20"/>
          <circle cx="160" cy="68" r="0.5" fill="#ffffff15"/><circle cx="700" cy="72" r="0.6" fill="#ffffff18"/>
          <circle cx="920" cy="80" r="80" fill="url(#moonGlow-tr)"/>
          <circle cx="920" cy="80" r="3" fill="#c0d8f0" opacity="0.3"/>
          <path d="M0 300 L120 240 L220 270 L340 210 L440 245 L540 185 L640 220 L700 200 L780 225 L880 195 L980 220 L1080 205 L1200 230 L1200 520 L0 520Z" fill="url(#mt1-tr)" opacity="0.55"/>
          <path d="M0 360 L100 305 L200 335 L300 290 L400 320 L500 278 L600 310 L700 285 L800 308 L900 272 L1000 300 L1100 282 L1200 295 L1200 520 L0 520Z" fill="url(#mt2-tr)" opacity="0.9"/>
          <path d="M0 410 L100 375 L200 390 L300 368 L400 385 L500 362 L600 380 L700 365 L800 382 L900 360 L1000 378 L1100 366 L1200 375 L1200 520 L0 520Z" fill="#080e18" opacity="0.95"/>
          <rect x="0" y="440" width="1200" height="80" fill="url(#mist-tr)"/>
        </svg>

        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, #070c0e 0%, transparent 20%, transparent 55%, #0a0f0a 100%)", pointerEvents: "none" }}/>

        <div className="sello-float-tr" style={{ position: "absolute", right: "18%", top: "50%", transform: "translateY(-50%)", zIndex: 10, display: "none", flexDirection: "column", alignItems: "center", gap: "6px", filter: "drop-shadow(0 0 24px #e8d5a333)" }}>
          <SelloGrande />
        </div>

        <div style={{ position: "absolute", top: 0, left: 0, right: 0, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "18px 28px", zIndex: 10 }}>
          <div style={{ fontFamily: "Georgia, serif", fontSize: "22px", letterSpacing: "5px", color: "#e8d5a3", textShadow: "0 2px 12px #000000cc" }}>
            {"CABAÑAS"}<span style={{ color: "#7ab87a" }}>{" TRINIDAD"}</span>
          </div>
          <div style={{ fontSize: "11px", color: "#a8c8a055", letterSpacing: "2px", textTransform: "uppercase" }}>{UBICACION}</div>
        </div>

        <div className="hero-text-tr" style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", textAlign: "center", padding: "40px 20px 16px" }}>
          <div style={{ fontSize: "11px", letterSpacing: "4px", textTransform: "uppercase", color: "#7ab87a", marginBottom: "14px" }}>{"Cabañas en la naturaleza"}</div>
          <div style={{ fontFamily: "Georgia, serif", fontSize: "clamp(26px, 5vw, 48px)", fontWeight: 700, color: "#f0ede8", lineHeight: 1.15, marginBottom: "14px" }}>
            {"Un lugar para"}<br/><span style={{ color: "#b8d8a0" }}>{"desconectarte"}</span>
          </div>
          <div style={{ fontFamily: "sans-serif", fontSize: "clamp(12px, 1.6vw, 16px)", color: "#8ab888", lineHeight: 1.7, maxWidth: "380px", margin: "0 auto 16px" }}>
            {DESCRIPCION}
          </div>
          <div style={{ display: "inline-flex", alignItems: "center", gap: "7px", background: "#ffffff07", border: "1px solid #ffffff12", borderRadius: "20px", padding: "6px 16px", fontFamily: "sans-serif", fontSize: "11px", color: "#9ab898" }}>
            <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#7ab87a", flexShrink: 0, display: "inline-block" }}/>
            {TAG_UBICACION}
          </div>
        </div>
      </div>

      {/* CABAÑAS */}
      <div style={{ padding: "24px 16px 6px", fontFamily: "sans-serif", maxWidth: "800px", margin: "0 auto" }}>
        <div style={{ fontSize: "10px", letterSpacing: "2.5px", textTransform: "uppercase", color: "#4a6a48", marginBottom: "10px" }}>{"Reserva tu cabaña"}</div>
        {loading ? (
          <div style={{ color: "#4a6a48", fontSize: "13px", padding: "20px 0" }}>Cargando...</div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginBottom: "4px" }}>
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
                    </svg>
                  </div>
                  <div style={{ fontFamily: "Georgia, serif", fontSize: "17px", color: "#e8d5a3", marginBottom: "4px" }}>{c.name}</div>
                  <div style={{ fontSize: "11px", color: "#8a9e88", marginBottom: "12px" }}>{"Hasta " + c.capacity + " personas"}</div>
                  <div style={{ fontFamily: "Georgia, serif", fontSize: "28px", color: "#c8d8c0", marginBottom: "2px" }}>{fmt(c.base_price_night)}</div>
                  <div style={{ fontSize: "10px", color: "#6a8a68", marginBottom: "14px" }}>por noche</div>
                  <a href={"/reservar?cabin_id=" + c.id + "&cabin_name=" + encodeURIComponent(c.name) + "&price=" + c.base_price_night + "&capacity=" + c.capacity}
                    style={{ display: "block", boxSizing: "border-box", width: "100%", background: "#7ab87a", color: "#0a0f0a", border: "none", borderRadius: "10px", padding: "11px", fontSize: "13px", fontWeight: 700, textAlign: "center", textDecoration: "none", fontFamily: "sans-serif" }}>
                    {"Reservar →"}
                  </a>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* AMENIDADES */}
      <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: "7px", padding: "4px 16px 14px", fontFamily: "sans-serif", maxWidth: "800px", margin: "0 auto" }}>
        {[
          { ico: "🌲", name: "Bosque" },
          { ico: "🏞️", name: "Naturaleza" },
          { ico: "🔥", name: "Fogata" },
          { ico: "🌙", name: "Estrellas" },
          { ico: "🥾", name: "Senderismo" },
          { ico: "🧘", name: "Relax" },
        ].map(function(f) {
          return (
            <div key={f.name} style={{ background: "#111a11", border: "1px solid #1e2e1e", borderRadius: "12px", padding: "9px 11px", textAlign: "center", width: "70px" }}>
              <div style={{ fontSize: "18px", marginBottom: "4px" }}>{f.ico}</div>
              <div style={{ fontSize: "10px", color: "#8a9e88", fontWeight: 500 }}>{f.name}</div>
            </div>
          )
        })}
      </div>

      {/* NORMAS */}
      <div style={{ background: "#0a0f0a", padding: "13px 16px", borderTop: "1px solid #1a261a", fontFamily: "sans-serif" }}>
        <div style={{ maxWidth: "800px", margin: "0 auto" }}>
          <div style={{ fontSize: "10px", fontWeight: 600, color: "#8a9e88", letterSpacing: "1.5px", textTransform: "uppercase", marginBottom: "7px" }}>Normas del lugar</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "5px" }}>
            {["No mascotas", "No fiestas", "No visitas externas", "No fumar adentro", "No papeles al WC", "Música moderada"].map(function(r) {
              return (
                <div key={r} style={{ display: "flex", alignItems: "center", gap: "5px", fontSize: "10px", color: "#6a8a68" }}>
                  <span style={{ color: "#c0504888", fontSize: "11px", fontWeight: 700 }}>{"×"}</span>
                  {r}
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* FOOTER */}
      <div style={{ textAlign: "center", padding: "12px", fontSize: "10px", color: "#5a7058", letterSpacing: "1.5px", textTransform: "uppercase", borderTop: "1px solid #1a261a", fontFamily: "sans-serif" }}>
        {"Cabañas Trinidad · " + UBICACION + " · Chile"}
      </div>
    </div>
  )
}

export default function TrinidadPage() {
  return (
    <Suspense fallback={<div style={{ background: "#0a0f0a", minHeight: "100vh" }}/>}>
      <TrinidadInner />
    </Suspense>
  )
}
