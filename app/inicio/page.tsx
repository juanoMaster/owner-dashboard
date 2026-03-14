"use client"
import { Suspense } from "react"

function InicioInner() {
  const cabins = [
    { id: "f935a02e-2572-4272-9a08-af40b29f0912", name: "Cabaña Nº 1", cap: 4, price: 30000 },
    { id: "100598b1-5232-46a0-adf5-6dc969ce2f9f", name: "Cabaña Nº 2", cap: 5, price: 40000 },
  ]
  function fmt(n: number) { return "$" + n.toLocaleString("es-CL") }

  return (
    <div style={{ fontFamily: "Georgia, serif", background: "#0a0f0a", minHeight: "100vh", color: "#f0ede8" }}>

      {/* HERO */}
      <div style={{ position: "relative", height: "400px", overflow: "hidden", background: "#0a1208" }}>
        <svg style={{ position: "absolute", bottom: 0, left: 0, width: "100%", height: "100%" }} viewBox="0 0 400 400" preserveAspectRatio="xMidYMax slice">
          <defs>
            <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#0c1a0c"/><stop offset="100%" stopColor="#0a1208"/></linearGradient>
            <linearGradient id="mt" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#182a16"/><stop offset="100%" stopColor="#0e1a0c"/></linearGradient>
            <linearGradient id="mist" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#0a1208" stopOpacity="0"/><stop offset="100%" stopColor="#0a0f0a" stopOpacity="1"/></linearGradient>
          </defs>
          <rect width="400" height="400" fill="url(#sky)"/>
          <circle cx="50" cy="28" r="0.8" fill="#ffffff33"/><circle cx="120" cy="16" r="0.6" fill="#ffffff22"/><circle cx="200" cy="22" r="1" fill="#ffffff44"/><circle cx="280" cy="13" r="0.7" fill="#ffffff33"/><circle cx="340" cy="32" r="0.9" fill="#ffffff22"/><circle cx="80" cy="46" r="0.6" fill="#ffffff1a"/><circle cx="160" cy="38" r="0.8" fill="#ffffff2a"/><circle cx="310" cy="50" r="0.6" fill="#ffffff1a"/>
          <path d="M0 270 L80 195 L140 232 L200 165 L260 208 L320 180 L380 212 L400 202 L400 400 L0 400Z" fill="url(#mt)" opacity="0.6"/>
          <path d="M0 302 L60 252 L120 278 L170 238 L220 262 L280 244 L340 258 L400 234 L400 400 L0 400Z" fill="#0d1a0b" opacity="0.9"/>
          {/* Araucaria izquierda */}
          <rect x="24" y="292" width="4" height="108" fill="#0f1a0e" opacity="0.85"/>
          <line x1="26" y1="368" x2="1" y2="352" stroke="#0f1a0e" strokeWidth="2" opacity="0.85"/><line x1="26" y1="368" x2="51" y2="352" stroke="#0f1a0e" strokeWidth="2" opacity="0.85"/>
          <line x1="26" y1="350" x2="-3" y2="334" stroke="#0f1a0e" strokeWidth="2" opacity="0.85"/><line x1="26" y1="350" x2="55" y2="334" stroke="#0f1a0e" strokeWidth="2" opacity="0.85"/>
          <line x1="26" y1="332" x2="3" y2="320" stroke="#0f1a0e" strokeWidth="2" opacity="0.85"/><line x1="26" y1="332" x2="49" y2="320" stroke="#0f1a0e" strokeWidth="2" opacity="0.85"/>
          <line x1="26" y1="316" x2="7" y2="306" stroke="#0f1a0e" strokeWidth="1.8" opacity="0.85"/><line x1="26" y1="316" x2="45" y2="306" stroke="#0f1a0e" strokeWidth="1.8" opacity="0.85"/>
          <circle cx="1" cy="351" r="4" fill="#0f1a0e" opacity="0.8"/><circle cx="51" cy="351" r="4" fill="#0f1a0e" opacity="0.8"/>
          <circle cx="-3" cy="333" r="4" fill="#0f1a0e" opacity="0.8"/><circle cx="55" cy="333" r="4" fill="#0f1a0e" opacity="0.8"/>
          <circle cx="26" cy="290" r="6" fill="#0f1a0e" opacity="0.85"/>
          {/* Araucaria derecha */}
          <rect x="368" y="266" width="5" height="134" fill="#0f1a0e" opacity="0.9"/>
          <line x1="370" y1="363" x2="342" y2="347" stroke="#0f1a0e" strokeWidth="2.5" opacity="0.9"/><line x1="370" y1="363" x2="398" y2="347" stroke="#0f1a0e" strokeWidth="2.5" opacity="0.9"/>
          <line x1="370" y1="344" x2="338" y2="328" stroke="#0f1a0e" strokeWidth="2.5" opacity="0.9"/><line x1="370" y1="344" x2="402" y2="328" stroke="#0f1a0e" strokeWidth="2.5" opacity="0.9"/>
          <line x1="370" y1="326" x2="344" y2="314" stroke="#0f1a0e" strokeWidth="2" opacity="0.9"/><line x1="370" y1="326" x2="396" y2="314" stroke="#0f1a0e" strokeWidth="2" opacity="0.9"/>
          <line x1="370" y1="310" x2="348" y2="300" stroke="#0f1a0e" strokeWidth="2" opacity="0.9"/><line x1="370" y1="310" x2="392" y2="300" stroke="#0f1a0e" strokeWidth="2" opacity="0.9"/>
          <circle cx="342" cy="346" r="5" fill="#0f1a0e" opacity="0.85"/><circle cx="398" cy="346" r="5" fill="#0f1a0e" opacity="0.85"/>
          <circle cx="338" cy="327" r="5" fill="#0f1a0e" opacity="0.85"/><circle cx="402" cy="327" r="5" fill="#0f1a0e" opacity="0.85"/>
          <circle cx="370" cy="264" r="7" fill="#0f1a0e" opacity="0.9"/>
          {/* Pino centro */}
          <line x1="88" y1="395" x2="88" y2="318" stroke="#1a2e16" strokeWidth="2.5"/>
          <polygon points="88,318 75,342 101,342" fill="#142610"/>
          <polygon points="88,330 73,358 103,358" fill="#162812"/>
          <polygon points="88,342 70,374 106,374" fill="#1a2e14"/>
          <rect x="0" y="348" width="400" height="52" fill="url(#mist)"/>
        </svg>
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg,#0c1a0c 0%,transparent 28%,transparent 52%,#0a0f0a 100%)" }}/>
        {/* NAV */}
        <div style={{ position: "absolute", top: 0, left: 0, right: 0, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 24px", zIndex: 10 }}>
          <div style={{ fontFamily: "Georgia, serif", fontSize: "20px", letterSpacing: "4px", color: "#e8d5a3", textShadow: "0 1px 10px #000000cc" }}>
            RUKA<span style={{ color: "#7ab87a" }}>TRARO</span>
          </div>
          <div style={{ fontSize: "10px", color: "#a8c8a055", letterSpacing: "1.5px", textTransform: "uppercase" as const }}>Licanray</div>
        </div>
        {/* HERO CONTENT */}
        <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column" as const, justifyContent: "center", alignItems: "center", textAlign: "center" as const, padding: "52px 28px 16px" }}>
          <div style={{ fontSize: "10px", letterSpacing: "3px", textTransform: "uppercase" as const, color: "#7ab87a", marginBottom: "10px" }}>Cabañas en la naturaleza</div>
          <div style={{ fontFamily: "Georgia, serif", fontSize: "32px", fontWeight: 700, color: "#f0ede8", lineHeight: 1.1, marginBottom: "10px" }}>
            Desconéctate en el<br/><span style={{ color: "#b8d8a0" }}>sur de Chile</span>
          </div>
          <div style={{ fontFamily: "sans-serif", fontSize: "13px", color: "#8ab888", lineHeight: 1.65, maxWidth: "270px", margin: "0 auto 16px" }}>
            Bosque nativo, Lago Calafquén y el Volcán Villarrica como telón de fondo.
          </div>
          <div style={{ display: "inline-flex", alignItems: "center", gap: "7px", background: "#ffffff07", border: "1px solid #ffffff12", borderRadius: "20px", padding: "5px 13px", fontFamily: "sans-serif", fontSize: "11px", color: "#9ab898" }}>
            <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#7ab87a", flexShrink: 0, display: "inline-block" }}/>
            Licanray · Región de La Araucanía · 5 min del lago
          </div>
        </div>
      </div>

      {/* CABAÑAS */}
      <div style={{ padding: "16px 16px 6px", fontFamily: "sans-serif" }}>
        <div style={{ fontSize: "10px", letterSpacing: "2.5px", textTransform: "uppercase" as const, color: "#4a6a48", marginBottom: "10px" }}>Reserva tu cabaña</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginBottom: "4px" }}>
          {cabins.map(c => (
            <div key={c.id} style={{ background: "#111a11", border: "1px solid #2a3a2a", borderRadius: "14px", padding: "14px 13px" }}>
              <div style={{ display: "inline-flex", alignItems: "center", gap: "4px", background: "#7ab87a14", border: "1px solid #7ab87a22", color: "#7ab87a", fontSize: "9px", padding: "2px 7px", borderRadius: "10px", marginBottom: "8px" }}>
                <span style={{ width: "4px", height: "4px", borderRadius: "50%", background: "#7ab87a", display: "inline-block" }}/>
                Disponible
              </div>
              <div style={{ marginBottom: "8px" }}>
                <svg width="36" height="32" viewBox="0 0 48 40" fill="none">
                  <path d="M24 4 L44 20 L44 38 L4 38 L4 20 Z" fill="#162618" stroke="#3a5a38" strokeWidth="1.5" strokeLinejoin="round"/>
                  <path d="M24 4 L44 20 L4 20 Z" fill="#1e3020" stroke="#3a5a38" strokeWidth="1.5" strokeLinejoin="round"/>
                  <rect x="18" y="26" width="12" height="12" rx="2" fill="#0d1a0d" stroke="#3a5a38" strokeWidth="1"/>
                  <rect x="8" y="24" width="8" height="6" rx="1" fill="#7ab87a22" stroke="#3a5a38" strokeWidth="0.8"/>
                  <line x1="12" y1="24" x2="12" y2="30" stroke="#3a5a38" strokeWidth="0.8"/>
                </svg>
              </div>
              <div style={{ fontFamily: "Georgia, serif", fontSize: "15px", color: "#e8d5a3", marginBottom: "5px" }}>{c.name}</div>
              <div style={{ fontSize: "11px", color: "#6a8a68", marginBottom: "7px" }}>👥 {c.cap} personas máx.</div>
              <div style={{ fontFamily: "Georgia, serif", fontSize: "22px", color: "#c8d8c0" }}>{fmt(c.price)}</div>
              <div style={{ fontSize: "10px", color: "#4a6a48", marginBottom: "9px" }}>por noche</div>
              <a href={`/reservar?cabin_id=${c.id}&cabin_name=${encodeURIComponent(c.name)}`}
                style={{ display: "block", width: "100%", background: "#7ab87a", color: "#0a0f0a", border: "none", borderRadius: "8px", padding: "9px", fontSize: "12px", fontWeight: 700, textAlign: "center" as const, textDecoration: "none", fontFamily: "sans-serif" }}>
                Reservar →
              </a>
            </div>
          ))}
        </div>
      </div>

      {/* ICONOS */}
      <div style={{ display: "flex", flexWrap: "wrap" as const, justifyContent: "center", gap: "7px", padding: "4px 16px 14px", fontFamily: "sans-serif" }}>
        {[
          { ico: "🏞️", name: "Lago" }, { ico: "🌋", name: "Volcán" },
          { ico: "🪵", name: "Tinaja" }, { ico: "♨️", name: "Termas" },
          { ico: "🚣", name: "Kayak" }, { ico: "🥾", name: "Trekking" },
        ].map(f => (
          <div key={f.name} style={{ background: "#111a11", border: "1px solid #1e2e1e", borderRadius: "12px", padding: "9px 11px", textAlign: "center" as const, width: "70px" }}>
            <div style={{ fontSize: "18px", marginBottom: "4px" }}>{f.ico}</div>
            <div style={{ fontSize: "10px", color: "#6a8a68", fontWeight: 500 }}>{f.name}</div>
          </div>
        ))}
      </div>

      {/* ATRACTIVOS */}
      <div style={{ background: "#0d140d", padding: "16px", borderTop: "1px solid #1a261a", fontFamily: "sans-serif" }}>
        <div style={{ fontFamily: "Georgia, serif", fontSize: "17px", color: "#e8d5a3", marginBottom: "12px" }}>Qué hacer en Licanray</div>
        {[
          { ico: "🏞️", name: "Lago Calafquén", desc: "Aguas de origen glaciar a 5 min — kayak, pesca y baños en verano" },
          { ico: "🌋", name: "Volcán Villarrica", desc: "A 45 min — trekking hasta uno de los volcanes más activos de Sudamérica" },
          { ico: "♨️", name: "Termas de Coñaripe", desc: "Aguas termales naturales rodeadas de montaña y bosque, a solo 20 min" },
          { ico: "🥾", name: "Senderismo y miradores", desc: "Rutas en bosque nativo con vistas panorámicas a la cordillera andina" },
        ].map(a => (
          <div key={a.name} style={{ display: "flex", gap: "10px", alignItems: "flex-start", marginBottom: "10px", paddingBottom: "10px", borderBottom: "1px solid #ffffff07" }}>
            <div style={{ width: "36px", height: "36px", background: "#162618", border: "1px solid #2a3820", borderRadius: "9px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "16px", flexShrink: 0 }}>{a.ico}</div>
            <div>
              <div style={{ fontSize: "12px", fontWeight: 600, color: "#c8d8c0", marginBottom: "2px" }}>{a.name}</div>
              <div style={{ fontSize: "11px", color: "#4a6a48", lineHeight: 1.5 }}>{a.desc}</div>
            </div>
          </div>
        ))}
      </div>

      {/* NORMAS */}
      <div style={{ background: "#0a0f0a", padding: "13px 16px", borderTop: "1px solid #1a261a", fontFamily: "sans-serif" }}>
        <div style={{ fontSize: "10px", fontWeight: 600, color: "#6a8a68", letterSpacing: "1.5px", textTransform: "uppercase" as const, marginBottom: "7px" }}>Normas del lugar</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "5px" }}>
          {["No mascotas", "No fiestas", "No visitas externas", "No fumar adentro", "No papeles al WC", "Música moderada"].map(r => (
            <div key={r} style={{ display: "flex", alignItems: "center", gap: "5px", fontSize: "10px", color: "#4a5a48" }}>
              <span style={{ color: "#c0504855", fontSize: "11px", fontWeight: 700 }}>✕</span> {r}
            </div>
          ))}
        </div>
      </div>

      {/* REDES */}
      <div style={{ display: "flex", justifyContent: "center", gap: "12px", padding: "13px", borderTop: "1px solid #1a261a", fontFamily: "sans-serif" }}>
        <a href="https://www.facebook.com/share/16ZGGvPzZD/" style={{ display: "flex", alignItems: "center", gap: "6px", background: "#111a11", border: "1px solid #1e2e1e", borderRadius: "9px", padding: "7px 14px", fontSize: "11px", color: "#6a8a68", textDecoration: "none" }}>
          <span style={{ width: "16px", height: "16px", background: "#1877F2", borderRadius: "3px", display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontSize: "10px", fontWeight: 700, fontFamily: "Georgia, serif", flexShrink: 0 }}>f</span>
          Facebook
        </a>
        <a href="https://instagram.com/rukatraro" style={{ display: "flex", alignItems: "center", gap: "6px", background: "#111a11", border: "1px solid #1e2e1e", borderRadius: "9px", padding: "7px 14px", fontSize: "11px", color: "#6a8a68", textDecoration: "none" }}>
          <span style={{ width: "16px", height: "16px", borderRadius: "4px", background: "linear-gradient(45deg,#f09433,#e6683c,#dc2743,#cc2366,#bc1888)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <svg viewBox="0 0 24 24" width="10" height="10" fill="none"><rect x="2" y="2" width="20" height="20" rx="5" stroke="white" strokeWidth="2.2"/><circle cx="12" cy="12" r="5" stroke="white" strokeWidth="2"/><circle cx="17.5" cy="6.5" r="1.8" fill="white"/></svg>
          </span>
          @rukatraro
        </a>
      </div>

      <div style={{ textAlign: "center" as const, padding: "12px", fontSize: "9px", color: "#1e2e1e", letterSpacing: "1.5px", textTransform: "uppercase" as const, borderTop: "1px solid #111a11", fontFamily: "sans-serif" }}>
        Rukatraro · Licanray · Lago Calafquén · Chile
      </div>
    </div>
  )
}

export default function InicioPage() {
  return (
    <Suspense fallback={<div style={{ background: "#0a0f0a", minHeight: "100vh" }}/>}>
      <InicioInner />
    </Suspense>
  )
}