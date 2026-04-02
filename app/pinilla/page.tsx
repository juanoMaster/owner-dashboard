"use client"
import { Suspense } from "react"

const CABINS = [
  { id: "e5b3906b-3b65-4c64-9906-14a23d38697d", name: "Cabaña El Mirador 1", cap: 5, price: 60000 },
  { id: "5ff2793e-c4c1-4e91-ac7d-f7c66a6da968", name: "Cabaña El Mirador 2", cap: 7, price: 70000 },
]

function SelloGrande() {
  return (
    <svg width="120" height="144" viewBox="0 0 150 180" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M75 6 L138 32 L138 92 C138 128 110 152 75 165 C40 152 12 128 12 92 L12 32 Z" fill="#1a2a18" stroke="#e8d5a3" strokeWidth="2.5"/>
      <path d="M75 16 L128 38 L128 89 C128 120 104 142 75 153 C46 142 22 120 22 89 L22 38 Z" fill="#0d1a12" stroke="#e8d5a366" strokeWidth="0.8"/>
      <circle cx="75" cy="65" r="22" fill="#e8d5a315" stroke="#e8d5a3" strokeWidth="1.5"/>
      <path d="M66 65 L72 71 L84 59" stroke="#e8d5a3" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
      <line x1="40" y1="100" x2="110" y2="100" stroke="#e8d5a333" strokeWidth="0.5"/>
      <text x="75" y="117" textAnchor="middle" fontFamily="Georgia, serif" fontSize="10" fill="#e8d5a3" fontWeight="700" letterSpacing="2">VERIFICADO</text>
      <line x1="40" y1="124" x2="110" y2="124" stroke="#e8d5a333" strokeWidth="0.5"/>
      <text x="75" y="140" textAnchor="middle" fontFamily="sans-serif" fontSize="8" fill="#7ab87a" letterSpacing="1">TAKAI.CL</text>
    </svg>
  )
}

function MiradorInner() {
  function fmt(n: number) { return "$" + n.toLocaleString("es-CL") }

  return (
    <div style={{ fontFamily: "Georgia, serif", background: "#0a0f0a", minHeight: "100vh", color: "#f0ede8" }}>
      <style>{"\
        @media (max-width: 640px) {\
          .hero-text-mr { padding-top: 108px !important; }\
          .cabins-mr { grid-template-columns: 1fr !important; }\
          .sello-pc-mr { display: flex !important; }\
          .sello-fl-mr { display: none !important; }\
        }\
        @media (min-width: 641px) {\
          .sello-pc-mr { display: none !important; }\
          .sello-fl-mr { display: flex !important; }\
          .hero-wrap-mr { max-height: 380px !important; }\
        }\
      "}</style>

      {/* HERO */}
      <div className="hero-wrap-mr" style={{ position: "relative", width: "100%", overflow: "hidden", background: "#060c10" }}>
        <svg style={{ display: "block", width: "100%", height: "auto", minHeight: "360px" }} viewBox="0 0 1200 540" preserveAspectRatio="xMidYMax slice">
          <defs>
            <linearGradient id="sky-mr" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#04080c"/>
              <stop offset="55%" stopColor="#08101a"/>
              <stop offset="100%" stopColor="#0a1420"/>
            </linearGradient>
            <linearGradient id="mt-mr-a" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#12243a"/>
              <stop offset="100%" stopColor="#0a1828"/>
            </linearGradient>
            <linearGradient id="mt-mr-b" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#0d1e30"/>
              <stop offset="100%" stopColor="#081018"/>
            </linearGradient>
            <linearGradient id="lago-mr" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#0a1e38" stopOpacity="0.7"/>
              <stop offset="100%" stopColor="#04080e" stopOpacity="0.9"/>
            </linearGradient>
            <linearGradient id="mist-mr" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#0a0f0a" stopOpacity="0"/>
              <stop offset="100%" stopColor="#0a0f0a" stopOpacity="1"/>
            </linearGradient>
            <radialGradient id="luna-mr" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#b0cce8" stopOpacity="0.15"/>
              <stop offset="100%" stopColor="#b0cce8" stopOpacity="0"/>
            </radialGradient>
          </defs>
          <rect width="1200" height="540" fill="url(#sky-mr)"/>
          <circle cx="80" cy="30" r="0.7" fill="#ffffff35"/><circle cx="200" cy="50" r="0.5" fill="#ffffff25"/>
          <circle cx="350" cy="20" r="0.9" fill="#ffffff40"/><circle cx="500" cy="45" r="0.6" fill="#ffffff28"/>
          <circle cx="650" cy="18" r="0.8" fill="#ffffff30"/><circle cx="800" cy="55" r="0.5" fill="#ffffff20"/>
          <circle cx="950" cy="25" r="0.7" fill="#ffffff35"/><circle cx="1100" cy="40" r="0.6" fill="#ffffff22"/>
          <circle cx="960" cy="72" r="72" fill="url(#luna-mr)"/>
          <circle cx="960" cy="72" r="3.5" fill="#d0e8ff" opacity="0.32"/>
          <path d="M540 185 L620 62 L700 185 Z" fill="#0c1e32" opacity="0.55"/>
          <path d="M0 295 L130 230 L250 262 L380 200 L500 238 L600 185 L700 185 L800 210 L900 192 L1020 225 L1120 205 L1200 238 L1200 540 L0 540Z" fill="url(#mt-mr-a)" opacity="0.55"/>
          <path d="M0 345 L110 295 L220 325 L340 278 L460 312 L570 265 L660 295 L760 272 L870 300 L980 270 L1090 298 L1200 275 L1200 540 L0 540Z" fill="url(#mt-mr-b)" opacity="0.88"/>
          <path d="M0 400 L150 368 L280 382 L420 360 L560 375 L700 358 L840 372 L980 356 L1100 370 L1200 360 L1200 540 L0 540Z" fill="#08131e" opacity="0.95"/>
          <path d="M0 418 L1200 410 L1200 490 L0 490Z" fill="url(#lago-mr)" opacity="0.6"/>
          <line x1="55" y1="468" x2="55" y2="390" stroke="#0c1e0c" strokeWidth="3"/><circle cx="55" cy="388" r="8" fill="#0c1e0c" opacity="0.9"/>
          <polygon points="55,390 38,422 72,422" fill="#0e2010" opacity="0.88"/>
          <polygon points="55,406 36,440 74,440" fill="#102212" opacity="0.88"/>
          <polygon points="55,422 33,460 77,460" fill="#122614" opacity="0.88"/>
          <line x1="1145" y1="465" x2="1145" y2="385" stroke="#0c1e0c" strokeWidth="3"/><circle cx="1145" cy="383" r="8.5" fill="#0c1e0c" opacity="0.9"/>
          <polygon points="1145,385 1128,418 1162,418" fill="#0e2010" opacity="0.88"/>
          <polygon points="1145,402 1126,438 1164,438" fill="#102212" opacity="0.88"/>
          <polygon points="1145,420 1122,460 1168,460" fill="#122614" opacity="0.88"/>
          <rect x="0" y="460" width="1200" height="80" fill="url(#mist-mr)"/>
        </svg>

        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, #04080c 0%, transparent 22%, transparent 52%, #0a0f0a 100%)", pointerEvents: "none" }}/>

        <div className="sello-fl-mr" style={{ position: "absolute", right: "16%", top: "50%", transform: "translateY(-50%)", zIndex: 10, display: "none", flexDirection: "column", alignItems: "center", gap: "6px", filter: "drop-shadow(0 0 24px #e8d5a333)" }}>
          <SelloGrande />
          <div style={{ background: "#0d1a12cc", border: "1px solid #e8d5a322", borderRadius: "8px", padding: "6px 12px", textAlign: "center" }}>
            <div style={{ fontFamily: "Georgia, serif", fontSize: "8px", color: "#e8d5a3", letterSpacing: "1px", lineHeight: 1.5 }}>Alojamiento verificado</div>
            <div style={{ fontFamily: "Georgia, serif", fontSize: "8px", color: "#e8d5a3", letterSpacing: "1px", lineHeight: 1.5 }}>personalmente por</div>
            <div style={{ fontFamily: "sans-serif", fontSize: "9px", color: "#7ab87a", letterSpacing: "1.5px", fontWeight: 700, marginTop: "2px" }}>TAKAI.CL</div>
          </div>
        </div>

        <div style={{ position: "absolute", top: 0, left: 0, right: 0, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "18px 28px", zIndex: 10 }}>
          <div style={{ fontFamily: "Georgia, serif", fontSize: "22px", letterSpacing: "5px", color: "#e8d5a3", textShadow: "0 2px 12px #000000cc" }}>
            {"EL"}<span style={{ color: "#7ab87a" }}>{" MIRADOR"}</span>
          </div>
          <div style={{ fontSize: "11px", color: "#a8c8a055", letterSpacing: "2px", textTransform: "uppercase" as const }}>Licanray</div>
        </div>

        <div className="hero-text-mr" style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", textAlign: "center", padding: "40px 20px 16px" }}>
          <div style={{ fontSize: "11px", letterSpacing: "4px", textTransform: "uppercase" as const, color: "#7ab87a", marginBottom: "14px" }}>{"Cabañas en la naturaleza"}</div>
          <div style={{ fontFamily: "Georgia, serif", fontSize: "clamp(26px, 5vw, 48px)", fontWeight: 700, color: "#f0ede8", lineHeight: 1.15, marginBottom: "14px" }}>
            {"El Mirador"}<br/><span style={{ color: "#b8d8a0" }}>{"de Licanray"}</span>
          </div>
          <div style={{ fontFamily: "sans-serif", fontSize: "clamp(12px, 1.6vw, 16px)", color: "#8ab888", lineHeight: 1.7, maxWidth: "380px", margin: "0 auto 16px" }}>
            {"Naturaleza, tranquilidad y confort en el corazón del sur de Chile. Desconéctate en Licanray, a pasos del Lago Calafquén."}
          </div>
          <div style={{ display: "inline-flex", alignItems: "center", gap: "7px", background: "#ffffff07", border: "1px solid #ffffff12", borderRadius: "20px", padding: "6px 16px", fontFamily: "sans-serif", fontSize: "11px", color: "#9ab898" }}>
            <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#7ab87a", flexShrink: 0, display: "inline-block" }}/>
            {"Licanray · Lago Calafquén · Región de La Araucanía"}
          </div>
        </div>
      </div>

      {/* CABAÑAS */}
      <div style={{ padding: "24px 16px 6px", fontFamily: "sans-serif", maxWidth: "800px", margin: "0 auto" }}>
        <div style={{ fontSize: "10px", letterSpacing: "2.5px", textTransform: "uppercase" as const, color: "#4a6a48", marginBottom: "10px" }}>{"Reserva tu cabaña"}</div>
        <div className="cabins-mr" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginBottom: "4px" }}>
          {CABINS.map(function(c) {
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
                <div style={{ fontSize: "11px", color: "#8a9e88", marginBottom: "6px" }}>{"Hasta " + c.cap + " personas"}</div>
                <div style={{ fontSize: "10px", color: "#6a8a68", marginBottom: "4px" }}>{"Tinaja de madera +$30.000/día"}</div>
                <div style={{ fontFamily: "Georgia, serif", fontSize: "28px", color: "#c8d8c0", marginBottom: "2px" }}>{fmt(c.price)}</div>
                <div style={{ fontSize: "10px", color: "#6a8a68", marginBottom: "14px" }}>por noche</div>
                <a href={"/reservar?cabin_id=" + c.id + "&cabin_name=" + encodeURIComponent(c.name) + "&price=" + c.price + "&capacity=" + c.cap}
                  style={{ display: "block", boxSizing: "border-box", width: "100%", background: "#7ab87a", color: "#0a0f0a", border: "none", borderRadius: "10px", padding: "11px", fontSize: "13px", fontWeight: 700, textAlign: "center", textDecoration: "none", fontFamily: "sans-serif" }}>
                  {"Reservar →"}
                </a>
              </div>
            )
          })}
        </div>
      </div>

      {/* CHIPS */}
      <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: "7px", padding: "4px 16px 14px", fontFamily: "sans-serif", maxWidth: "800px", margin: "0 auto" }}>
        {[
          { ico: "🏔️", name: "Mirador" },
          { ico: "🌊", name: "Lago" },
          { ico: "🌋", name: "Volcán" },
          { ico: "🌲", name: "Bosque" },
          { ico: "🛶", name: "Kayak" },
          { ico: "♨️", name: "Termas" },
        ].map(function(f) {
          return (
            <div key={f.name} style={{ background: "#111a11", border: "1px solid #1e2e1e", borderRadius: "12px", padding: "9px 11px", textAlign: "center", width: "70px" }}>
              <div style={{ fontSize: "18px", marginBottom: "4px" }}>{f.ico}</div>
              <div style={{ fontSize: "10px", color: "#8a9e88", fontWeight: 500 }}>{f.name}</div>
            </div>
          )
        })}
      </div>

      {/* QUÉ HACER */}
      <div style={{ background: "#0d140d", padding: "16px", borderTop: "1px solid #1a261a", fontFamily: "sans-serif" }}>
        <div style={{ maxWidth: "800px", margin: "0 auto" }}>
          <div style={{ fontFamily: "Georgia, serif", fontSize: "17px", color: "#e8d5a3", marginBottom: "12px" }}>{"Qué hacer en Licanray"}</div>
          {[
            { ico: "🌊", name: "Lago Calafquén", desc: "Aguas de origen glaciar a pasos de la cabaña — kayak, pesca y baños en verano" },
            { ico: "🌋", name: "Volcán Villarrica", desc: "A 45 min — trekking hasta uno de los volcanes más activos de Sudamérica" },
            { ico: "♨️", name: "Termas de Coñaripe", desc: "Aguas termales naturales rodeadas de montaña y bosque, a solo 20 min" },
            { ico: "🥾", name: "Senderismo y miradores", desc: "Rutas en bosque nativo con vistas panorámicas al Lago Calafquén y la cordillera" },
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

      {/* NORMAS */}
      <div style={{ background: "#0a0f0a", padding: "13px 16px", borderTop: "1px solid #1a261a", fontFamily: "sans-serif" }}>
        <div style={{ maxWidth: "800px", margin: "0 auto" }}>
          <div style={{ fontSize: "10px", fontWeight: 600, color: "#8a9e88", letterSpacing: "1.5px", textTransform: "uppercase" as const, marginBottom: "7px" }}>Normas del lugar</div>
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
      <div style={{ textAlign: "center", padding: "12px", fontSize: "10px", color: "#5a7058", letterSpacing: "1.5px", textTransform: "uppercase" as const, borderTop: "1px solid #1a261a", fontFamily: "sans-serif" }}>
        {"El Mirador de Licanray · Lago Calafquén · Chile"}
      </div>
    </div>
  )
}

export default function MiradorPage() {
  return (
    <Suspense fallback={<div style={{ background: "#0a0f0a", minHeight: "100vh" }}/>}>
      <MiradorInner />
    </Suspense>
  )
}
