"use client"
import { Suspense } from "react"

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
      <circle cx="32" cy="32" r="3.5" fill="#e8d5a3" opacity="0.18"/><circle cx="118" cy="32" r="3.5" fill="#e8d5a3" opacity="0.18"/>
      <circle cx="22" cy="55" r="2.5" fill="#e8d5a3" opacity="0.12"/><circle cx="128" cy="55" r="2.5" fill="#e8d5a3" opacity="0.12"/>
      <circle cx="18" cy="80" r="2" fill="#e8d5a3" opacity="0.08"/><circle cx="132" cy="80" r="2" fill="#e8d5a3" opacity="0.08"/>
    </svg>
  )
}

function InicioInner() {
  const cabins = [
    { id: "f935a02e-2572-4272-9a08-af40b29f0912", name: "Caba\u00f1a N\u00ba 1", cap: 4, price: 30000 },
    { id: "100598b1-5232-46a0-adf5-6dc969ce2f9f", name: "Caba\u00f1a N\u00ba 2", cap: 5, price: 40000 },
  ]
  function fmt(n: number) { return "$" + n.toLocaleString("es-CL") }

  return (
    <div style={{ fontFamily: "Georgia, serif", background: "#0a0f0a", minHeight: "100vh", color: "#f0ede8" }}>

      <style>{"\
        @media (max-width: 640px) {\
          .hero-text { padding-top: 108px !important; }\
        }\
        @media (min-width: 768px) {\
          .hero-wrap { max-height: 360px !important; }\
          .hero-wrap svg { max-height: 360px !important; }\
          .hero-text { padding-top: 30px !important; padding-bottom: 10px !important; }\
        }\
        @media (max-width: 640px) {\
          .sello-pc { display: flex !important; }\
          .sello-float { display: none !important; }\
        }\
        @media (min-width: 641px) {\
          .sello-pc { display: none !important; }\
          .sello-float { display: flex !important; }\
        }\
      "}</style>

      <div className="hero-wrap" style={{ position: "relative", width: "100%", overflow: "hidden", background: "#0a1208" }}>
        <svg style={{ display: "block", width: "100%", height: "auto", minHeight: "340px" }} viewBox="0 0 1200 520" preserveAspectRatio="xMidYMax slice">
          <defs>
            <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#080e08"/><stop offset="60%" stopColor="#0a1208"/><stop offset="100%" stopColor="#0c160c"/></linearGradient>
            <linearGradient id="mt1" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#14241a"/><stop offset="100%" stopColor="#0e1a0c"/></linearGradient>
            <linearGradient id="mt2" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#0f1c0e"/><stop offset="100%" stopColor="#0a1208"/></linearGradient>
            <linearGradient id="mist" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#0a0f0a" stopOpacity="0"/><stop offset="100%" stopColor="#0a0f0a" stopOpacity="1"/></linearGradient>
            <radialGradient id="moonGlow" cx="50%" cy="50%" r="50%"><stop offset="0%" stopColor="#c8d8a0" stopOpacity="0.08"/><stop offset="100%" stopColor="#c8d8a0" stopOpacity="0"/></radialGradient>
          </defs>
          <rect width="1200" height="520" fill="url(#sky)"/>
          <circle cx="80" cy="30" r="0.8" fill="#ffffff30"/><circle cx="150" cy="55" r="0.6" fill="#ffffff20"/>
          <circle cx="260" cy="22" r="1" fill="#ffffff38"/><circle cx="370" cy="45" r="0.7" fill="#ffffff28"/>
          <circle cx="480" cy="18" r="0.9" fill="#ffffff22"/><circle cx="560" cy="52" r="0.6" fill="#ffffff1a"/>
          <circle cx="650" cy="28" r="0.8" fill="#ffffff30"/><circle cx="740" cy="60" r="0.7" fill="#ffffff20"/>
          <circle cx="830" cy="15" r="1" fill="#ffffff35"/><circle cx="920" cy="42" r="0.6" fill="#ffffff1a"/>
          <circle cx="1010" cy="25" r="0.8" fill="#ffffff28"/><circle cx="1100" cy="50" r="0.7" fill="#ffffff20"/>
          <circle cx="200" cy="70" r="0.5" fill="#ffffff15"/><circle cx="440" cy="72" r="0.6" fill="#ffffff18"/>
          <circle cx="700" cy="68" r="0.5" fill="#ffffff15"/><circle cx="980" cy="65" r="0.6" fill="#ffffff1a"/>
          <circle cx="1140" cy="35" r="0.9" fill="#ffffff25"/><circle cx="50" cy="65" r="0.7" fill="#ffffff18"/>
          <circle cx="950" cy="80" r="80" fill="url(#moonGlow)"/>
          <circle cx="950" cy="80" r="3" fill="#d8e8c0" opacity="0.25"/>
          <path d="M0 340 L100 260 L180 290 L280 220 L360 255 L460 195 L540 230 L600 210 L660 215 L740 240 L820 200 L900 230 L960 210 L1040 245 L1120 225 L1200 260 L1200 520 L0 520Z" fill="url(#mt1)" opacity="0.5"/>
          <path d="M0 380 L80 320 L160 350 L240 310 L320 340 L400 305 L480 335 L560 300 L640 325 L720 310 L800 330 L880 295 L960 320 L1040 305 L1120 325 L1200 300 L1200 520 L0 520Z" fill="url(#mt2)" opacity="0.85"/>
          <path d="M0 420 L100 385 L200 400 L300 378 L400 395 L500 372 L600 390 L700 375 L800 392 L900 370 L1000 388 L1100 376 L1200 385 L1200 520 L0 520Z" fill="#0d1a0b" opacity="0.95"/>
          <rect x="55" y="330" width="4" height="130" fill="#0f1a0e" opacity="0.9"/>
          <line x1="57" y1="420" x2="28" y2="402" stroke="#0f1a0e" strokeWidth="2.2" opacity="0.9"/><line x1="57" y1="420" x2="86" y2="402" stroke="#0f1a0e" strokeWidth="2.2" opacity="0.9"/>
          <line x1="57" y1="400" x2="24" y2="382" stroke="#0f1a0e" strokeWidth="2.2" opacity="0.9"/><line x1="57" y1="400" x2="90" y2="382" stroke="#0f1a0e" strokeWidth="2.2" opacity="0.9"/>
          <line x1="57" y1="380" x2="30" y2="366" stroke="#0f1a0e" strokeWidth="2" opacity="0.9"/><line x1="57" y1="380" x2="84" y2="366" stroke="#0f1a0e" strokeWidth="2" opacity="0.9"/>
          <line x1="57" y1="362" x2="36" y2="350" stroke="#0f1a0e" strokeWidth="1.8" opacity="0.9"/><line x1="57" y1="362" x2="78" y2="350" stroke="#0f1a0e" strokeWidth="1.8" opacity="0.9"/>
          <circle cx="28" cy="401" r="5" fill="#0f1a0e" opacity="0.85"/><circle cx="86" cy="401" r="5" fill="#0f1a0e" opacity="0.85"/>
          <circle cx="24" cy="381" r="5" fill="#0f1a0e" opacity="0.85"/><circle cx="90" cy="381" r="5" fill="#0f1a0e" opacity="0.85"/>
          <circle cx="30" cy="365" r="4" fill="#0f1a0e" opacity="0.85"/><circle cx="84" cy="365" r="4" fill="#0f1a0e" opacity="0.85"/>
          <circle cx="57" cy="328" r="7" fill="#0f1a0e" opacity="0.9"/>
          <rect x="1128" y="310" width="5" height="150" fill="#0f1a0e" opacity="0.9"/>
          <line x1="1130" y1="418" x2="1098" y2="400" stroke="#0f1a0e" strokeWidth="2.5" opacity="0.9"/><line x1="1130" y1="418" x2="1162" y2="400" stroke="#0f1a0e" strokeWidth="2.5" opacity="0.9"/>
          <line x1="1130" y1="396" x2="1094" y2="378" stroke="#0f1a0e" strokeWidth="2.5" opacity="0.9"/><line x1="1130" y1="396" x2="1166" y2="378" stroke="#0f1a0e" strokeWidth="2.5" opacity="0.9"/>
          <line x1="1130" y1="376" x2="1100" y2="362" stroke="#0f1a0e" strokeWidth="2" opacity="0.9"/><line x1="1130" y1="376" x2="1160" y2="362" stroke="#0f1a0e" strokeWidth="2" opacity="0.9"/>
          <line x1="1130" y1="358" x2="1108" y2="346" stroke="#0f1a0e" strokeWidth="1.8" opacity="0.9"/><line x1="1130" y1="358" x2="1152" y2="346" stroke="#0f1a0e" strokeWidth="1.8" opacity="0.9"/>
          <circle cx="1098" cy="399" r="5.5" fill="#0f1a0e" opacity="0.85"/><circle cx="1162" cy="399" r="5.5" fill="#0f1a0e" opacity="0.85"/>
          <circle cx="1094" cy="377" r="5.5" fill="#0f1a0e" opacity="0.85"/><circle cx="1166" cy="377" r="5.5" fill="#0f1a0e" opacity="0.85"/>
          <circle cx="1100" cy="361" r="4.5" fill="#0f1a0e" opacity="0.85"/><circle cx="1160" cy="361" r="4.5" fill="#0f1a0e" opacity="0.85"/>
          <circle cx="1130" cy="308" r="8" fill="#0f1a0e" opacity="0.9"/>
          <rect x="265" y="375" width="3" height="90" fill="#0f1a0e" opacity="0.75"/>
          <line x1="266" y1="430" x2="248" y2="418" stroke="#0f1a0e" strokeWidth="1.5" opacity="0.75"/><line x1="266" y1="430" x2="284" y2="418" stroke="#0f1a0e" strokeWidth="1.5" opacity="0.75"/>
          <line x1="266" y1="416" x2="250" y2="406" stroke="#0f1a0e" strokeWidth="1.5" opacity="0.75"/><line x1="266" y1="416" x2="282" y2="406" stroke="#0f1a0e" strokeWidth="1.5" opacity="0.75"/>
          <line x1="266" y1="402" x2="254" y2="394" stroke="#0f1a0e" strokeWidth="1.3" opacity="0.75"/><line x1="266" y1="402" x2="278" y2="394" stroke="#0f1a0e" strokeWidth="1.3" opacity="0.75"/>
          <circle cx="248" cy="417" r="3.5" fill="#0f1a0e" opacity="0.7"/><circle cx="284" cy="417" r="3.5" fill="#0f1a0e" opacity="0.7"/>
          <circle cx="266" cy="373" r="5" fill="#0f1a0e" opacity="0.75"/>
          <line x1="170" y1="460" x2="170" y2="385" stroke="#142610" strokeWidth="2.5"/>
          <polygon points="170,385 155,412 185,412" fill="#142610" opacity="0.85"/>
          <polygon points="170,398 152,428 188,428" fill="#162812" opacity="0.85"/>
          <polygon points="170,412 148,448 192,448" fill="#1a2e14" opacity="0.85"/>
          <line x1="420" y1="465" x2="420" y2="395" stroke="#142610" strokeWidth="2.2"/>
          <polygon points="420,395 408,418 432,418" fill="#142610" opacity="0.8"/>
          <polygon points="420,406 405,432 435,432" fill="#162812" opacity="0.8"/>
          <polygon points="420,418 402,450 438,450" fill="#1a2e14" opacity="0.8"/>
          <line x1="780" y1="465" x2="780" y2="370" stroke="#142610" strokeWidth="2.8"/>
          <polygon points="780,370 764,400 796,400" fill="#142610" opacity="0.85"/>
          <polygon points="780,385 760,418 800,418" fill="#162812" opacity="0.85"/>
          <polygon points="780,400 756,440 804,440" fill="#1a2e14" opacity="0.85"/>
          <polygon points="780,418 752,458 808,458" fill="#1c3016" opacity="0.85"/>
          <line x1="1020" y1="462" x2="1020" y2="408" stroke="#142610" strokeWidth="2"/>
          <polygon points="1020,408 1010,426 1030,426" fill="#142610" opacity="0.75"/>
          <polygon points="1020,416 1008,438 1032,438" fill="#162812" opacity="0.75"/>
          <polygon points="1020,426 1005,452 1035,452" fill="#1a2e14" opacity="0.75"/>
          <line x1="650" y1="455" x2="650" y2="402" stroke="#121e10" strokeWidth="1.8"/>
          <polygon points="650,402 641,420 659,420" fill="#121e10" opacity="0.65"/>
          <polygon points="650,410 639,432 661,432" fill="#142210" opacity="0.65"/>
          <polygon points="650,420 636,446 664,446" fill="#162610" opacity="0.65"/>
          <line x1="520" y1="462" x2="520" y2="415" stroke="#121e10" strokeWidth="1.5"/>
          <polygon points="520,415 512,430 528,430" fill="#121e10" opacity="0.6"/>
          <polygon points="520,422 510,440 530,440" fill="#142210" opacity="0.6"/>
          <polygon points="520,432 508,454 532,454" fill="#162610" opacity="0.6"/>
          <rect x="0" y="440" width="1200" height="80" fill="url(#mist)"/>
        </svg>

        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, #080e08 0%, transparent 20%, transparent 55%, #0a0f0a 100%)", pointerEvents: "none" }}/>

        <div className="sello-float" style={{ position: "absolute", right: "18%", top: "50%", transform: "translateY(-50%)", zIndex: 10, display: "none", flexDirection: "column" as any, alignItems: "center", gap: "6px", filter: "drop-shadow(0 0 24px #e8d5a333)" }}>
          <SelloGrande />
          <div style={{ background: "#0d1a12cc", border: "1px solid #e8d5a322", borderRadius: "8px", padding: "6px 12px", textAlign: "center" as any }}>
            <div style={{ fontFamily: "Georgia, serif", fontSize: "8px", color: "#e8d5a3", letterSpacing: "1px", lineHeight: 1.5 }}>Alojamiento verificado</div>
            <div style={{ fontFamily: "Georgia, serif", fontSize: "8px", color: "#e8d5a3", letterSpacing: "1px", lineHeight: 1.5 }}>personalmente por</div>
            <div style={{ fontFamily: "sans-serif", fontSize: "9px", color: "#7ab87a", letterSpacing: "1.5px", fontWeight: 700, marginTop: "2px" }}>TAKAI.CL</div>
          </div>
        </div>

        <div style={{ position: "absolute", top: 0, left: 0, right: 0, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "18px 28px", zIndex: 10 }}>
          <div style={{ fontFamily: "Georgia, serif", fontSize: "22px", letterSpacing: "5px", color: "#e8d5a3", textShadow: "0 2px 12px #000000cc" }}>
            RUKA<span style={{ color: "#7ab87a" }}>TRARO</span>
          </div>
          <div style={{ fontSize: "11px", color: "#a8c8a055", letterSpacing: "2px", textTransform: "uppercase" as const }}>Licanray</div>
        </div>

        <div className="hero-text" style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column" as const, justifyContent: "center", alignItems: "center", textAlign: "center" as const, padding: "40px 20px 16px" }}>
          <div style={{ fontSize: "11px", letterSpacing: "4px", textTransform: "uppercase" as const, color: "#7ab87a", marginBottom: "14px" }}>{"Caba\u00f1as en la naturaleza"}</div>

          <div style={{ fontFamily: "Georgia, serif", fontSize: "clamp(26px, 5vw, 48px)", fontWeight: 700, color: "#f0ede8", lineHeight: 1.15, marginBottom: "14px" }}>
              {"Descon\u00e9ctate en el"}<br/><span style={{ color: "#b8d8a0" }}>sur de Chile</span>
            </div>

          

          <div style={{ fontFamily: "sans-serif", fontSize: "clamp(12px, 1.6vw, 16px)", color: "#8ab888", lineHeight: 1.7, maxWidth: "380px", margin: "0 auto 16px" }}>
            {"Bosque nativo, Lago Calafqu\u00e9n y el Volc\u00e1n Villarrica como tel\u00f3n de fondo."}
          </div>

          <div style={{ display: "inline-flex", alignItems: "center", gap: "7px", background: "#ffffff07", border: "1px solid #ffffff12", borderRadius: "20px", padding: "6px 16px", fontFamily: "sans-serif", fontSize: "11px", color: "#9ab898" }}>
            <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#7ab87a", flexShrink: 0, display: "inline-block" }}/>
            {"Licanray \u00b7 Regi\u00f3n de La Araucan\u00eda \u00b7 5 min del lago"}
          </div>

          <div className="sello-pc" style={{ display: "none", flexDirection: "column" as any, alignItems: "center", gap: "4px", marginTop: "14px", filter: "drop-shadow(0 0 20px #e8d5a322)" }}>
            <svg width="70" height="84" viewBox="0 0 150 180" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M75 6 L138 32 L138 92 C138 128 110 152 75 165 C40 152 12 128 12 92 L12 32 Z" fill="#1a2a18" stroke="#e8d5a3" strokeWidth="4"/>
              <path d="M75 16 L128 38 L128 89 C128 120 104 142 75 153 C46 142 22 120 22 89 L22 38 Z" fill="#0d1a12" stroke="#e8d5a366" strokeWidth="1.5"/>
              <circle cx="75" cy="65" r="22" fill="#e8d5a315" stroke="#e8d5a3" strokeWidth="2.5"/>
              <path d="M60 65 L70 75 L90 55" stroke="#e8d5a3" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
              <text x="75" y="115" textAnchor="middle" fontFamily="Georgia, serif" fontSize="13" fill="#e8d5a3" fontWeight="700" letterSpacing="1.5">VERIFICADO</text>
              <text x="75" y="137" textAnchor="middle" fontFamily="sans-serif" fontSize="11" fill="#7ab87a" letterSpacing="1">TAKAI.CL</text>
            </svg>
            <div style={{ fontFamily: "Georgia, serif", fontSize: "8px", color: "#e8d5a3aa", letterSpacing: "1px", textAlign: "center" as any, lineHeight: 1.4 }}>Alojamiento verificado<br/>personalmente por <span style={{ color: "#7ab87a", fontFamily: "sans-serif", fontWeight: 700, fontSize: "9px" }}>TAKAI.CL</span></div>
          </div>
        </div>
      </div>

      <div style={{ padding: "24px 16px 6px", fontFamily: "sans-serif", maxWidth: "800px", margin: "0 auto" }}>
        <div style={{ fontSize: "10px", letterSpacing: "2.5px", textTransform: "uppercase" as const, color: "#4a6a48", marginBottom: "10px" }}>{"Reserva tu caba\u00f1a"}</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginBottom: "4px" }}>
          {cabins.map(c => (
            <div key={c.id} style={{ background: "#111a11", border: "1px solid #2a3a2a", borderRadius: "14px", padding: "16px", display: "flex", flexDirection: "column" as const, alignItems: "center", textAlign: "center" as const }}>
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
              <div style={{ fontSize: "11px", color: "#8a9e88", marginBottom: "12px" }}>Hasta {c.cap} personas</div>
              <div style={{ fontFamily: "Georgia, serif", fontSize: "28px", color: "#c8d8c0", marginBottom: "2px" }}>{fmt(c.price)}</div>
              <div style={{ fontSize: "10px", color: "#6a8a68", marginBottom: "14px" }}>por noche</div>
              <a href={"/reservar?cabin_id=" + c.id + "&cabin_name=" + encodeURIComponent(c.name)}
                style={{ display: "block", boxSizing: "border-box" as const, width: "100%", background: "#7ab87a", color: "#0a0f0a", border: "none", borderRadius: "10px", padding: "11px", fontSize: "13px", fontWeight: 700, textAlign: "center" as const, textDecoration: "none", fontFamily: "sans-serif" }}>
                {"Reservar \u2192"}
              </a>
            </div>
          ))}
        </div>
      </div>

      <div style={{ display: "flex", flexWrap: "wrap" as const, justifyContent: "center", gap: "7px", padding: "4px 16px 14px", fontFamily: "sans-serif", maxWidth: "800px", margin: "0 auto" }}>
        {[
          { ico: "\uD83C\uDFDE\uFE0F", name: "Lago", isImg: false },
          { ico: "\uD83C\uDF0B", name: "Volc\u00e1n", isImg: false },
          { ico: "/tinaja.png", name: "Tinaja", isImg: true },
          { ico: "\u2668\uFE0F", name: "Termas", isImg: false },
          { ico: "\uD83D\uDEA3", name: "Kayak", isImg: false },
          { ico: "\uD83E\uDD7E", name: "Trekking", isImg: false },
        ].map(f => (
          <div key={f.name} style={{ background: "#111a11", border: "1px solid #1e2e1e", borderRadius: "12px", padding: "9px 11px", textAlign: "center" as const, width: "70px" }}>
            {f.isImg ? (
              <img src={f.ico} alt={f.name} style={{ width: "24px", height: "24px", objectFit: "contain" as const, borderRadius: "4px", marginBottom: "4px" }} />
            ) : (
              <div style={{ fontSize: "18px", marginBottom: "4px" }}>{f.ico}</div>
            )}
            <div style={{ fontSize: "10px", color: "#8a9e88", fontWeight: 500 }}>{f.name}</div>
          </div>
        ))}
      </div>

      <div style={{ background: "#0d140d", padding: "16px", borderTop: "1px solid #1a261a", fontFamily: "sans-serif" }}>
        <div style={{ maxWidth: "800px", margin: "0 auto" }}>
          <div style={{ fontFamily: "Georgia, serif", fontSize: "17px", color: "#e8d5a3", marginBottom: "12px" }}>{"Qu\u00e9 hacer en Licanray"}</div>
          {[
            { ico: "\uD83C\uDFDE\uFE0F", name: "Lago Calafqu\u00e9n", desc: "Aguas de origen glaciar a 5 min \u2014 kayak, pesca y ba\u00f1os en verano" },
            { ico: "\uD83C\uDF0B", name: "Volc\u00e1n Villarrica", desc: "A 45 min \u2014 trekking hasta uno de los volcanes m\u00e1s activos de Sudam\u00e9rica" },
            { ico: "\u2668\uFE0F", name: "Termas de Co\u00f1aripe", desc: "Aguas termales naturales rodeadas de monta\u00f1a y bosque, a solo 20 min" },
            { ico: "\uD83E\uDD7E", name: "Senderismo y miradores", desc: "Rutas en bosque nativo con vistas panor\u00e1micas a la cordillera andina" },
          ].map(a => (
            <div key={a.name} style={{ display: "flex", gap: "10px", alignItems: "flex-start", marginBottom: "10px", paddingBottom: "10px", borderBottom: "1px solid #ffffff07" }}>
              <div style={{ width: "36px", height: "36px", background: "#162618", border: "1px solid #2a3820", borderRadius: "9px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "16px", flexShrink: 0 }}>{a.ico}</div>
              <div>
                <div style={{ fontSize: "12px", fontWeight: 600, color: "#c8d8c0", marginBottom: "2px" }}>{a.name}</div>
                <div style={{ fontSize: "11px", color: "#6a8a68", lineHeight: 1.5 }}>{a.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ background: "#0a0f0a", padding: "13px 16px", borderTop: "1px solid #1a261a", fontFamily: "sans-serif" }}>
        <div style={{ maxWidth: "800px", margin: "0 auto" }}>
          <div style={{ fontSize: "10px", fontWeight: 600, color: "#8a9e88", letterSpacing: "1.5px", textTransform: "uppercase" as const, marginBottom: "7px" }}>Normas del lugar</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "5px" }}>
            {["No mascotas", "No fiestas", "No visitas externas", "No fumar adentro", "No papeles al WC", "M\u00fasica moderada"].map(r => (
              <div key={r} style={{ display: "flex", alignItems: "center", gap: "5px", fontSize: "10px", color: "#6a8a68" }}>
                <span style={{ color: "#c0504888", fontSize: "11px", fontWeight: 700 }}>{"\u2715"}</span>
                {r}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div style={{ display: "flex", justifyContent: "center", gap: "12px", padding: "13px", borderTop: "1px solid #1a261a", fontFamily: "sans-serif" }}>
        <a href="https://www.facebook.com/share/16ZGGvPzZD/" target="_blank" rel="noopener noreferrer" style={{ display: "flex", alignItems: "center", gap: "6px", background: "#111a11", border: "1px solid #1e2e1e", borderRadius: "9px", padding: "7px 14px", fontSize: "11px", color: "#8a9e88", textDecoration: "none" }}>
          <span style={{ width: "16px", height: "16px", background: "#1877F2", borderRadius: "3px", display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontSize: "10px", fontWeight: 700, fontFamily: "Georgia, serif", flexShrink: 0 }}>f</span>
          @rukatraro
        </a>
        <a href="https://instagram.com/rukatraro" target="_blank" rel="noopener noreferrer" style={{ display: "flex", alignItems: "center", gap: "6px", background: "#111a11", border: "1px solid #1e2e1e", borderRadius: "9px", padding: "7px 14px", fontSize: "11px", color: "#8a9e88", textDecoration: "none" }}>
          <span style={{ width: "16px", height: "16px", borderRadius: "4px", background: "linear-gradient(45deg,#f09433,#e6683c,#dc2743,#cc2366,#bc1888)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <svg viewBox="0 0 24 24" width="10" height="10" fill="none"><rect x="2" y="2" width="20" height="20" rx="5" stroke="white" strokeWidth="2.2"/><circle cx="12" cy="12" r="5" stroke="white" strokeWidth="2"/><circle cx="17.5" cy="6.5" r="1.8" fill="white"/></svg>
          </span>
          @rukatraro
        </a>
      </div>

      <div style={{ textAlign: "center" as const, padding: "12px", fontSize: "10px", color: "#5a7058", letterSpacing: "1.5px", textTransform: "uppercase" as const, borderTop: "1px solid #1a261a", fontFamily: "sans-serif" }}>
        {"Rukatraro \u00b7 Licanray \u00b7 Lago Calafqu\u00e9n \u00b7 Chile"}
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
