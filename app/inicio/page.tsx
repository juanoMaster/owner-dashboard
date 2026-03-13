"use client"
import { Suspense } from "react"
import { useSearchParams } from "next/navigation"

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;700&family=Inter:wght@300;400;500;600&display=swap');
*{box-sizing:border-box;margin:0;padding:0;}
html,body{background:#0d1a12;min-height:100vh;}
.rk{font-family:'Inter',sans-serif;color:#f0ede8;background:#0d1a12;min-height:100vh;}
.rk-nav{display:flex;align-items:center;justify-content:space-between;padding:20px 24px;border-bottom:1px solid #ffffff0f;background:#0a1510;}
.rk-logo{font-family:'Playfair Display',serif;font-size:20px;letter-spacing:3px;color:#e8d5a3;text-transform:uppercase;}
.rk-logo em{color:#7ab87a;font-style:normal;}
.rk-pill{background:#ffffff08;border:1px solid #ffffff12;color:#a8b8a0;font-size:10px;padding:5px 14px;border-radius:20px;letter-spacing:1.5px;text-transform:uppercase;}
.rk-hero{padding:48px 24px 44px;background:linear-gradient(180deg,#0a1510 0%,#162618 60%,#1a3020 100%);text-align:center;border-bottom:1px solid #7ab87a1a;position:relative;overflow:hidden;}
.rk-hero::before{content:'';position:absolute;top:-60px;left:50%;transform:translateX(-50%);width:300px;height:300px;border-radius:50%;background:radial-gradient(circle,#7ab87a08 0%,transparent 70%);}
.rk-eyebrow{font-size:10px;letter-spacing:3px;text-transform:uppercase;color:#7ab87a;margin-bottom:14px;}
.rk-hero-title{font-family:'Playfair Display',serif;font-size:38px;font-weight:700;color:#f0ede8;line-height:1.1;margin-bottom:12px;}
.rk-hero-desc{font-size:14px;color:#8a9e88;line-height:1.75;max-width:340px;margin:0 auto 24px;}
.rk-hero-loc{display:inline-flex;align-items:center;gap:8px;background:#7ab87a15;border:1px solid #7ab87a2a;border-radius:20px;padding:7px 16px;font-size:12px;color:#7ab87a;}
.rk-attrs{display:grid;grid-template-columns:1fr 1fr;gap:10px;padding:22px 20px;border-bottom:1px solid #ffffff07;}
.rk-attr{background:#162618;border:1px solid #ffffff0a;border-radius:14px;padding:16px 14px;text-align:center;}
.rk-attr-ico{font-size:26px;margin-bottom:8px;line-height:1;}
.rk-attr-name{font-size:12px;font-weight:600;color:#c8d8c0;letter-spacing:0.3px;margin-bottom:4px;}
.rk-attr-desc{font-size:11px;color:#5a7058;line-height:1.5;}
.rk-cabins{padding:24px 20px;}
.rk-section-label{font-size:10px;letter-spacing:2.5px;text-transform:uppercase;color:#6a7e68;margin-bottom:18px;}
.rk-cabin{background:#162618;border:1px solid #2a3e28;border-radius:18px;padding:22px 20px;margin-bottom:16px;position:relative;overflow:hidden;}
.rk-cabin::after{content:'';position:absolute;top:0;right:0;width:120px;height:120px;background:radial-gradient(circle at top right,#7ab87a07,transparent 70%);}
.rk-cabin-avail{display:inline-flex;align-items:center;gap:5px;background:#7ab87a18;border:1px solid #7ab87a2a;color:#7ab87a;font-size:10px;padding:4px 10px;border-radius:20px;letter-spacing:1px;text-transform:uppercase;margin-bottom:14px;}
.rk-cabin-avail-dot{width:6px;height:6px;border-radius:50%;background:#7ab87a;flex-shrink:0;}
.rk-cabin-name{font-family:'Playfair Display',serif;font-size:24px;color:#e8d5a3;margin-bottom:16px;}
.rk-specs{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:18px;}
.rk-spec{background:#0d1a12;border-radius:10px;padding:11px 13px;}
.rk-spec-label{font-size:10px;color:#5a7058;letter-spacing:1px;text-transform:uppercase;margin-bottom:4px;}
.rk-spec-val{font-size:14px;font-weight:600;color:#c8d8c0;}
.rk-price-row{display:flex;align-items:baseline;gap:6px;margin-bottom:18px;}
.rk-price-big{font-family:'Playfair Display',serif;font-size:32px;color:#e8d5a3;}
.rk-price-label{font-size:12px;color:#5a7058;}
.rk-price-extra{font-size:11px;color:#6a7e68;background:#0d1a12;border-radius:6px;padding:3px 8px;}
.rk-btn{display:block;width:100%;background:#7ab87a;color:#0d1a12;border:none;border-radius:12px;padding:15px;font-size:15px;font-weight:700;cursor:pointer;text-align:center;text-decoration:none;font-family:'Inter',sans-serif;letter-spacing:0.2px;transition:background .2s;}
.rk-btn:hover{background:#8ecb8e;}
.rk-nature{background:#0a1510;border-top:1px solid #ffffff08;padding:24px 20px;}
.rk-nature-title{font-family:'Playfair Display',serif;font-size:20px;color:#e8d5a3;margin-bottom:18px;}
.rk-nat{display:flex;gap:14px;align-items:flex-start;margin-bottom:16px;padding-bottom:16px;border-bottom:1px solid #ffffff07;}
.rk-nat:last-child{border-bottom:none;margin-bottom:0;padding-bottom:0;}
.rk-nat-ico{width:44px;height:44px;background:#162618;border:1px solid #2a3e28;border-radius:12px;display:flex;align-items:center;justify-content:center;font-size:22px;flex-shrink:0;}
.rk-nat-name{font-size:14px;font-weight:600;color:#c8d8c0;margin-bottom:4px;}
.rk-nat-desc{font-size:12px;color:#5a7058;line-height:1.6;}
.rk-footer{text-align:center;padding:24px 20px;font-size:10px;color:#2a3e28;letter-spacing:1.5px;text-transform:uppercase;border-top:1px solid #ffffff06;}
`

function InicioInner() {
  const searchParams = useSearchParams()
  const token = searchParams.get("token") || ""

  const cabins = [
    {
      id: "f935a02e-2572-4272-9a08-af40b29f0912",
      name: "Cabaña Nº 1",
      capacity: 4,
      price: 30000,
    },
    {
      id: "100598b1-5232-46a0-adf5-6dc969ce2f9f",
      name: "Cabaña Nº 2",
      capacity: 5,
      price: 40000,
    },
  ]

  function fmt(n: number) { return "$" + n.toLocaleString("es-CL") }

  return (
    <div className="rk">
      <style>{CSS}</style>

      <nav className="rk-nav">
        <div className="rk-logo">Ruka<em>traro</em></div>
        <div className="rk-pill">Licanray, Chile</div>
      </nav>

      <div className="rk-hero">
        <div className="rk-eyebrow">Cabañas en la naturaleza</div>
        <div className="rk-hero-title">Desconéctate<br />del mundo</div>
        <div className="rk-hero-desc">
          Rodeados de bosque nativo y a pasos del Lago Calafquén —
          un refugio auténtico en el corazón de la Región de Los Ríos.
        </div>
        <div className="rk-hero-loc">
          📍 Licanray · 5 min del Lago Calafquén
        </div>
      </div>

      <div className="rk-attrs">
        {[
          { ico: "🏞️", name: "Lago Calafquén", desc: "Aguas cristalinas a 5 min caminando" },
          { ico: "🌿", name: "Bosque Nativo", desc: "Coihues, boldos y arrayanes del sur" },
          { ico: "🪵", name: "Tinaja de Madera", desc: "Bajo las estrellas del sur de Chile" },
          { ico: "🌋", name: "Volcán Villarrica", desc: "Vistas al volcán más activo del país" },
        ].map(a => (
          <div className="rk-attr" key={a.name}>
            <div className="rk-attr-ico">{a.ico}</div>
            <div className="rk-attr-name">{a.name}</div>
            <div className="rk-attr-desc">{a.desc}</div>
          </div>
        ))}
      </div>

      <div className="rk-cabins">
        <div className="rk-section-label">Elige tu cabaña</div>
        {cabins.map(cabin => (
          <div className="rk-cabin" key={cabin.id}>
            <div className="rk-cabin-avail">
              <span className="rk-cabin-avail-dot" />
              Disponible
            </div>
            <div className="rk-cabin-name">{cabin.name}</div>
            <div className="rk-specs">
              {[
                ["Capacidad", `${cabin.capacity} personas`],
                ["Estadía mínima", "2 noches"],
                ["Check-in", "14:00 hrs"],
                ["Check-out", "12:00 hrs"],
              ].map(([label, val]) => (
                <div className="rk-spec" key={label}>
                  <div className="rk-spec-label">{label}</div>
                  <div className="rk-spec-val">{val}</div>
                </div>
              ))}
            </div>
            <div className="rk-price-row">
              <span className="rk-price-big">{fmt(cabin.price)}</span>
              <span className="rk-price-label">/ noche</span>
              <span className="rk-price-extra">+personas extra $5.000/noche</span>
            </div>
            
              className="rk-btn"
              href={`/reservar?cabin_id=${cabin.id}&cabin_name=${encodeURIComponent(cabin.name)}`}
            >
              Reservar {cabin.name} →
            </a>
          </div>
        ))}
      </div>

      <div className="rk-nature">
        <div className="rk-nature-title">Qué hacer en Licanray</div>
        {[
          { ico: "🚣", name: "Kayak y deportes acuáticos", desc: "El Lago Calafquén invita a navegar, pescar y nadar en aguas de origen volcánico a lo largo de todo el año." },
          { ico: "🥾", name: "Senderismo y trekking", desc: "Rutas que atraviesan bosque nativo con vistas al Volcán Villarrica y la Cordillera de los Andes." },
          { ico: "🌋", name: "Volcán Villarrica", desc: "A 45 min de Licanray — uno de los volcanes más activos y espectaculares de Sudamérica." },
          { ico: "♨️", name: "Termas de Coñaripe", desc: "Aguas termales naturales a solo 20 min, rodeadas de montaña y bosque nativo." },
          { ico: "🌿", name: "Gastronomía y cultura", desc: "Mercado artesanal mapuche, productos locales y la mejor cocina del sur de Chile a tu alcance." },
        ].map(n => (
          <div className="rk-nat" key={n.name}>
            <div className="rk-nat-ico">{n.ico}</div>
            <div>
              <div className="rk-nat-name">{n.name}</div>
              <div className="rk-nat-desc">{n.desc}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="rk-footer">Rukatraro · Licanray · Lago Calafquén · Chile</div>
    </div>
  )
}

export default function InicioPage() {
  return (
    <Suspense fallback={<div style={{ padding: "32px", background: "#0d1a12", minHeight: "100vh" }} />}>
      <InicioInner />
    </Suspense>
  )
}