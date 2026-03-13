"use client"

import { useState } from "react"
import { useSearchParams } from "next/navigation"
import { Suspense } from "react"

const PRICE_CABIN: Record<string, number> = {
  "f935a02e-2572-4272-9a08-af40b29f0912": 30000,
  "100598b1-5232-46a0-adf5-6dc969ce2f9f": 40000,
}
const CAPACITY_CABIN: Record<string, number> = {
  "f935a02e-2572-4272-9a08-af40b29f0912": 4,
  "100598b1-5232-46a0-adf5-6dc969ce2f9f": 5,
}

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;700&family=Inter:wght@300;400;500;600&display=swap');
*{box-sizing:border-box;margin:0;padding:0;}
html,body{background:#0d1a12;min-height:100vh;}
.rk{font-family:'Inter',sans-serif;color:#f0ede8;min-height:100vh;background:#0d1a12;}
.rk-nav{display:flex;align-items:center;justify-content:space-between;padding:20px 24px;border-bottom:1px solid #ffffff0f;}
.rk-nav-logo{font-family:'Playfair Display',serif;font-size:20px;letter-spacing:3px;color:#e8d5a3;text-transform:uppercase;}
.rk-nav-logo em{color:#7ab87a;font-style:normal;}
.rk-nav-pill{background:#ffffff0a;border:1px solid #ffffff15;color:#a8b8a0;font-size:11px;padding:5px 14px;border-radius:20px;letter-spacing:1.5px;text-transform:uppercase;}
.rk-hero{position:relative;padding:44px 24px 40px;background:linear-gradient(180deg,#0d1a12 0%,#162618 60%,#1a3020 100%);overflow:hidden;}
.rk-hero::after{content:'';position:absolute;bottom:0;left:0;right:0;height:1px;background:linear-gradient(90deg,transparent,#7ab87a33,transparent);}
.rk-hero-eyebrow{font-size:11px;letter-spacing:2.5px;text-transform:uppercase;color:#7ab87a;margin-bottom:12px;}
.rk-hero-title{font-family:'Playfair Display',serif;font-size:36px;font-weight:700;line-height:1.1;color:#f0ede8;margin-bottom:8px;}
.rk-hero-sub{font-size:13px;color:#8a9e88;display:flex;align-items:center;gap:8px;flex-wrap:wrap;}
.rk-hero-dot{color:#7ab87a;}
.rk-steps{display:flex;gap:0;border-bottom:1px solid #ffffff0a;background:#0d1a12;}
.rk-step{flex:1;padding:14px 8px;text-align:center;font-size:11px;letter-spacing:1px;text-transform:uppercase;color:#4a5a48;border-bottom:2px solid transparent;transition:all .2s;cursor:default;}
.rk-step.active{color:#7ab87a;border-bottom-color:#7ab87a;}
.rk-step.done{color:#4a7a48;}
.rk-body{padding:24px 20px 40px;max-width:520px;margin:0 auto;}
.rk-card{background:#162618;border:1px solid #ffffff0d;border-radius:16px;padding:22px 20px;margin-bottom:16px;}
.rk-card-title{font-family:'Playfair Display',serif;font-size:17px;color:#e8d5a3;margin-bottom:18px;padding-bottom:12px;border-bottom:1px solid #ffffff0a;}
.rk-grid2{display:grid;grid-template-columns:1fr 1fr;gap:12px;}
.rk-field{margin-bottom:0;}
.rk-label{display:block;font-size:11px;font-weight:600;letter-spacing:1.5px;text-transform:uppercase;color:#6a7e68;margin-bottom:8px;}
.rk-input{width:100%;padding:13px 14px;background:#0d1a12;border:1px solid #2a3e28;border-radius:10px;font-size:15px;font-family:'Inter',sans-serif;color:#f0ede8;outline:none;transition:border-color .2s;-webkit-appearance:none;color-scheme:dark;}
.rk-input:focus{border-color:#7ab87a;}
.rk-input option{background:#162618;}
.rk-price-display{background:#0d1a12;border:1px solid #2a3e28;border-radius:14px;padding:20px;margin-bottom:16px;}
.rk-price-line{display:flex;justify-content:space-between;align-items:center;padding:7px 0;font-size:14px;}
.rk-price-line-key{color:#6a7e68;}
.rk-price-line-val{color:#c8d8c0;font-weight:500;}
.rk-price-divider{border:none;border-top:1px solid #ffffff0a;margin:8px 0;}
.rk-price-total{display:flex;justify-content:space-between;align-items:baseline;padding:10px 0 0;}
.rk-price-total-key{font-size:13px;color:#8a9e88;}
.rk-price-total-val{font-family:'Playfair Display',serif;font-size:30px;font-weight:700;color:#e8d5a3;}
.rk-deposit{display:flex;justify-content:space-between;align-items:center;background:#7ab87a18;border:1px solid #7ab87a33;border-radius:12px;padding:14px 16px;margin-bottom:20px;}
.rk-deposit-key{font-size:13px;color:#8ab888;}
.rk-deposit-val{font-size:17px;font-weight:700;color:#7ab87a;}
.rk-btn{width:100%;background:#7ab87a;color:#0d1a12;border:none;border-radius:12px;padding:16px;font-size:15px;font-weight:700;font-family:'Inter',sans-serif;cursor:pointer;letter-spacing:.3px;transition:background .2s;}
.rk-btn:hover{background:#8ecb8e;}
.rk-btn-ghost{width:100%;background:transparent;color:#6a7e68;border:1px solid #2a3e28;border-radius:12px;padding:13px;font-size:14px;font-family:'Inter',sans-serif;cursor:pointer;margin-top:10px;transition:all .2s;}
.rk-btn-ghost:hover{border-color:#7ab87a55;color:#8ab888;}
.rk-summary-row{display:flex;justify-content:space-between;padding:11px 0;border-bottom:1px solid #ffffff07;font-size:14px;}
.rk-summary-row:last-child{border-bottom:none;}
.rk-sk{color:#6a7e68;}
.rk-sv{color:#c8d8c0;font-weight:500;text-align:right;max-width:60%;}
.rk-pay-opt{border:1px solid #2a3e28;border-radius:14px;padding:18px;margin-bottom:12px;cursor:pointer;transition:all .2s;}
.rk-pay-opt:hover{border-color:#7ab87a55;}
.rk-pay-opt.sel{border-color:#7ab87a;background:#7ab87a08;}
.rk-pay-head{display:flex;align-items:center;gap:12px;}
.rk-pay-ico{width:42px;height:42px;border-radius:10px;background:#0d1a12;display:flex;align-items:center;justify-content:center;font-size:20px;flex-shrink:0;}
.rk-pay-info{flex:1;}
.rk-pay-name{font-size:15px;font-weight:600;color:#e0ddd8;}
.rk-pay-hint{font-size:12px;color:#6a7e68;margin-top:2px;}
.rk-pay-check{width:20px;height:20px;border-radius:50%;border:2px solid #2a3e28;display:flex;align-items:center;justify-content:center;flex-shrink:0;transition:all .2s;}
.rk-pay-opt.sel .rk-pay-check{background:#7ab87a;border-color:#7ab87a;color:#0d1a12;font-size:12px;}
.rk-transfer-box{background:#0d1a12;border-radius:12px;padding:16px;margin-top:16px;}
.rk-tr-row{display:flex;justify-content:space-between;padding:7px 0;font-size:13px;border-bottom:1px solid #ffffff07;}
.rk-tr-row:last-child{border-bottom:none;}
.rk-tr-key{color:#6a7e68;}
.rk-tr-val{font-weight:600;color:#c8d8c0;}
.rk-soon{background:#ffffff09;color:#6a7e68;font-size:10px;padding:3px 9px;border-radius:20px;letter-spacing:1px;text-transform:uppercase;}
.rk-rules{background:#0d1a12;border-radius:12px;padding:16px;}
.rk-rule{font-size:12px;color:#6a7e68;padding:5px 0;display:flex;gap:8px;border-bottom:1px solid #ffffff05;}
.rk-rule:last-child{border-bottom:none;}
.rk-rule-dot{color:#7ab87a;flex-shrink:0;}
.rk-success{text-align:center;padding:32px 16px;}
.rk-success-ring{width:80px;height:80px;border-radius:50%;border:2px solid #7ab87a;display:flex;align-items:center;justify-content:center;margin:0 auto 24px;font-size:32px;}
.rk-footer{text-align:center;padding:24px 20px;font-size:11px;color:#3a4e38;letter-spacing:1px;text-transform:uppercase;}
`

function fmt(n: number) { return "$" + n.toLocaleString("es-CL") }
function fmtDate(d: string) {
  if (!d) return ""
  const [y, m, day] = d.split("-")
  return `${day}/${m}/${y}`
}

function ReservarInner() {
  const searchParams = useSearchParams()
  const cabinId = searchParams.get("cabin_id") || ""
  const cabinName = decodeURIComponent(searchParams.get("cabin_name") || "Cabaña")

  const [checkIn, setCheckIn] = useState("")
  const [checkOut, setCheckOut] = useState("")
  const [guests, setGuests] = useState(2)
  const [tinajaDias, setTinajaDias] = useState(0)
  const [guestName, setGuestName] = useState("")
  const [whatsapp, setWhatsapp] = useState("")
  const [step, setStep] = useState<"form"|"resumen"|"pago">("form")
  const [payMethod, setPayMethod] = useState<"transfer"|"card"|null>(null)

  const pricePerNight = PRICE_CABIN[cabinId] || 30000
  const capacity = CAPACITY_CABIN[cabinId] || 4
  const nights = checkIn && checkOut
    ? Math.max(0, Math.round((new Date(checkOut).getTime() - new Date(checkIn).getTime()) / 86400000))
    : 0
  const extraGuests = Math.max(0, guests - capacity)
  const extraCost = extraGuests * 5000 * nights
  const tinajaCost = tinajaDias * 30000
  const subtotal = pricePerNight * nights + extraCost + tinajaCost
  const deposit = Math.round(subtotal * 0.2)

  function validate() {
    if (!checkIn || !checkOut) { alert("Selecciona fechas de entrada y salida"); return false }
    if (nights < 2) { alert("La estadía mínima es 2 noches"); return false }
    if (!guestName.trim()) { alert("Ingresa tu nombre"); return false }
    if (!whatsapp.trim()) { alert("Ingresa tu WhatsApp"); return false }
    return true
  }

  const Nav = () => (
    <nav className="rk-nav">
      <div className="rk-nav-logo">Ruka<em>traro</em></div>
      <div className="rk-nav-pill">Reserva directa</div>
    </nav>
  )

  const Hero = () => (
    <div className="rk-hero">
      <div className="rk-hero-eyebrow">Cabaña en el lago</div>
      <div className="rk-hero-title">{cabinName}</div>
      <div className="rk-hero-sub">
        <span>Licanray</span>
        <span className="rk-hero-dot">·</span>
        <span>Lago Calafquén</span>
        <span className="rk-hero-dot">·</span>
        <span>Región de Los Ríos</span>
      </div>
    </div>
  )

  const Steps = ({ current }: { current: number }) => (
    <div className="rk-steps">
      {["Datos", "Resumen", "Pago"].map((s, i) => (
        <div key={s} className={`rk-step${i + 1 === current ? " active" : ""}${i + 1 < current ? " done" : ""}`}>
          {i + 1 < current ? "✓ " : `${i + 1}. `}{s}
        </div>
      ))}
    </div>
  )

  // PAGO
  if (step === "pago") return (
    <div className="rk"><style>{CSS}</style>
      <Nav />
      <Steps current={3} />
      <div className="rk-body">
        <div className="rk-card">
          <div className="rk-success">
            <div className="rk-success-ring">✓</div>
            <p style={{ fontFamily: "Playfair Display, serif", fontSize: "24px", marginBottom: "8px", color: "#e8d5a3" }}>
              ¡Solicitud recibida!
            </p>
            <p style={{ fontSize: "14px", color: "#8a9e88", lineHeight: "1.6" }}>
              Hola <strong style={{ color: "#c8d8c0" }}>{guestName}</strong> — ya tenemos tu solicitud para <strong style={{ color: "#c8d8c0" }}>{cabinName}</strong>.
            </p>
            <p style={{ fontSize: "13px", color: "#4a5a48", marginTop: "8px" }}>
              {fmtDate(checkIn)} → {fmtDate(checkOut)} · {nights} noche{nights > 1 ? "s" : ""}
            </p>
          </div>
        </div>

        <div className="rk-card">
          <div className="rk-card-title">Confirma pagando el adelanto</div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "#0d1a12", borderRadius: "12px", padding: "16px", marginBottom: "20px" }}>
            <span style={{ fontSize: "13px", color: "#6a7e68" }}>Adelanto requerido (20%)</span>
            <span style={{ fontFamily: "Playfair Display, serif", fontSize: "26px", color: "#e8d5a3" }}>{fmt(deposit)}</span>
          </div>

          <div className={`rk-pay-opt${payMethod === "transfer" ? " sel" : ""}`} onClick={() => setPayMethod("transfer")}>
            <div className="rk-pay-head">
              <div className="rk-pay-ico">🏦</div>
              <div className="rk-pay-info">
                <div className="rk-pay-name">Transferencia Bancaria</div>
                <div className="rk-pay-hint">BancoEstado · Inmediato</div>
              </div>
              <div className="rk-pay-check">{payMethod === "transfer" ? "✓" : ""}</div>
            </div>
            {payMethod === "transfer" && (
              <div className="rk-transfer-box">
                {[
                  ["Banco", "BancoEstado"],
                  ["Tipo de cuenta", "Cuenta RUT"],
                  ["RUT / Número", "15.665.466-3"],
                  ["Nombre", "Johanna Medina"],
                  ["Monto exacto", fmt(deposit)],
                  ["Asunto / Glosa", `Reserva ${cabinName}`],
                ].map(([k, v]) => (
                  <div className="rk-tr-row" key={k}>
                    <span className="rk-tr-key">{k}</span>
                    <span className="rk-tr-val">{v}</span>
                  </div>
                ))}
                <p style={{ fontSize: "12px", color: "#4a5a48", marginTop: "12px", lineHeight: "1.6" }}>
                  Envía el comprobante por WhatsApp a Johanna y ella confirmará tu reserva en menos de 24 horas.
                </p>
              </div>
            )}
          </div>

          <div className="rk-pay-opt" style={{ opacity: 0.5, cursor: "default" }}>
            <div className="rk-pay-head">
              <div className="rk-pay-ico">💳</div>
              <div className="rk-pay-info">
                <div className="rk-pay-name">Tarjeta / Débito online</div>
                <div className="rk-pay-hint">Pago seguro con Mercado Pago</div>
              </div>
              <div className="rk-soon">Próximo</div>
            </div>
          </div>
        </div>

        {payMethod === "transfer" && (
          <div className="rk-card">
            <div style={{ display: "flex", gap: "14px", alignItems: "center" }}>
              <div style={{ width: "44px", height: "44px", borderRadius: "50%", background: "#7ab87a22", border: "1px solid #7ab87a44", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "22px", flexShrink: 0 }}>💬</div>
              <div>
                <p style={{ fontSize: "13px", color: "#8a9e88", marginBottom: "2px" }}>Después de transferir, escríbele a</p>
                <p style={{ fontSize: "15px", fontWeight: "600", color: "#c8d8c0" }}>Johanna — Rukatraro</p>
                <p style={{ fontSize: "12px", color: "#4a5a48" }}>WhatsApp · responde en menos de 24 hrs</p>
              </div>
            </div>
          </div>
        )}
        <div className="rk-footer">Rukatraro · Licanray · Chile</div>
      </div>
    </div>
  )

  // RESUMEN
  if (step === "resumen") return (
    <div className="rk"><style>{CSS}</style>
      <Nav />
      <Steps current={2} />
      <div className="rk-body">
        <button className="rk-btn-ghost" style={{ width: "auto", padding: "8px 16px", marginBottom: "16px" }} onClick={() => setStep("form")}>
          ← Volver
        </button>

        <div className="rk-card">
          <div className="rk-card-title">Tu reserva</div>
          {[
            ["Cabaña", cabinName],
            ["Huésped", guestName],
            ["WhatsApp", whatsapp],
            ["Check-in", `${fmtDate(checkIn)} — 14:00 hrs`],
            ["Check-out", `${fmtDate(checkOut)} — 12:00 hrs`],
            ["Noches", `${nights}`],
            [`Huéspedes`, `${guests} persona${guests > 1 ? "s" : ""}`],
            tinajaDias > 0 ? ["Tinaja", `${tinajaDias} día${tinajaDias > 1 ? "s" : ""}`] : null,
          ].filter(Boolean).map((row: any) => (
            <div className="rk-summary-row" key={row[0]}>
              <span className="rk-sk">{row[0]}</span>
              <span className="rk-sv">{row[1]}</span>
            </div>
          ))}
        </div>

        <div className="rk-price-display">
          <div className="rk-price-line">
            <span className="rk-price-line-key">{fmt(pricePerNight)} × {nights} noche{nights > 1 ? "s" : ""}</span>
            <span className="rk-price-line-val">{fmt(pricePerNight * nights)}</span>
          </div>
          {extraCost > 0 && (
            <div className="rk-price-line">
              <span className="rk-price-line-key">{extraGuests} persona{extraGuests > 1 ? "s" : ""} extra</span>
              <span className="rk-price-line-val">{fmt(extraCost)}</span>
            </div>
          )}
          {tinajaCost > 0 && (
            <div className="rk-price-line">
              <span className="rk-price-line-key">Tinaja {tinajaDias} día{tinajaDias > 1 ? "s" : ""}</span>
              <span className="rk-price-line-val">{fmt(tinajaCost)}</span>
            </div>
          )}
          <hr className="rk-price-divider" />
          <div className="rk-price-total">
            <span className="rk-price-total-key">Total estadía</span>
            <span className="rk-price-total-val">{fmt(subtotal)}</span>
          </div>
        </div>

        <div className="rk-deposit">
          <span className="rk-deposit-key">Adelanto para confirmar (20%)</span>
          <span className="rk-deposit-val">{fmt(deposit)}</span>
        </div>

        <div className="rk-card">
          <div className="rk-card-title" style={{ marginBottom: "12px" }}>Reglamento</div>
          <div className="rk-rules">
            {[
              "No mascotas",
              "No fiestas ni visitas externas",
              "No fumar dentro de la cabaña",
              "No música a alto volumen",
              "No papeles al inodoro",
              "Cancelación: 50% devuelto con 14+ días de anticipación",
            ].map(r => (
              <div className="rk-rule" key={r}>
                <span className="rk-rule-dot">·</span>
                <span>{r}</span>
              </div>
            ))}
          </div>
        </div>

        <button className="rk-btn" onClick={() => setStep("pago")}>
          Continuar al pago →
        </button>
        <div className="rk-footer">Rukatraro · Licanray · Chile</div>
      </div>
    </div>
  )

  // FORMULARIO
  return (
    <div className="rk"><style>{CSS}</style>
      <Nav />
      <Hero />
      <Steps current={1} />
      <div className="rk-body">
        <div className="rk-card">
          <div className="rk-card-title">Fechas</div>
          <div className="rk-grid2" style={{ marginBottom: "16px" }}>
            <div className="rk-field">
              <label className="rk-label">Check-in</label>
              <input className="rk-input" type="date" value={checkIn}
                min={new Date().toISOString().split("T")[0]}
                onChange={e => { setCheckIn(e.target.value); setCheckOut(""); setTinajaDias(0) }} />
            </div>
            <div className="rk-field">
              <label className="rk-label">Check-out</label>
              <input className="rk-input" type="date" value={checkOut}
                min={checkIn}
                onChange={e => setCheckOut(e.target.value)} />
            </div>
          </div>
          <div style={{ marginBottom: "16px" }}>
            <label className="rk-label">Huéspedes</label>
            <select className="rk-input" value={guests} onChange={e => setGuests(Number(e.target.value))}>
              {[1,2,3,4,5,6].map(n => (
                <option key={n} value={n}>
                  {n} persona{n > 1 ? "s" : ""}{n > capacity ? ` — +${fmt(5000)}/noche extra` : ""}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="rk-label">Tinaja de madera (+$30.000/día)</label>
            <select className="rk-input" value={tinajaDias} onChange={e => setTinajaDias(Number(e.target.value))} disabled={nights < 2}>
              <option value={0}>Sin tinaja</option>
              {Array.from({ length: nights }, (_, i) => i + 1).map(n => (
                <option key={n} value={n}>{n} día{n > 1 ? "s" : ""} — {fmt(n * 30000)}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="rk-card">
          <div className="rk-card-title">Tus datos</div>
          <div style={{ marginBottom: "16px" }}>
            <label className="rk-label">Nombre completo</label>
            <input className="rk-input" type="text" value={guestName}
              onChange={e => setGuestName(e.target.value)}
              placeholder="Ej: María González" />
          </div>
          <div>
            <label className="rk-label">WhatsApp</label>
            <input className="rk-input" type="tel" value={whatsapp}
              onChange={e => setWhatsapp(e.target.value)}
              placeholder="+56 9 1234 5678" />
          </div>
        </div>

        {nights >= 2 && (
          <>
            <div className="rk-price-display">
              <div className="rk-price-line">
                <span className="rk-price-line-key">{fmt(pricePerNight)} × {nights} noche{nights > 1 ? "s" : ""}</span>
                <span className="rk-price-line-val">{fmt(pricePerNight * nights)}</span>
              </div>
              {extraCost > 0 && (
                <div className="rk-price-line">
                  <span className="rk-price-line-key">{extraGuests} persona{extraGuests > 1 ? "s" : ""} extra</span>
                  <span className="rk-price-line-val">{fmt(extraCost)}</span>
                </div>
              )}
              {tinajaCost > 0 && (
                <div className="rk-price-line">
                  <span className="rk-price-line-key">Tinaja</span>
                  <span className="rk-price-line-val">{fmt(tinajaCost)}</span>
                </div>
              )}
              <hr className="rk-price-divider" />
              <div className="rk-price-total">
                <span className="rk-price-total-key">Total estadía</span>
                <span className="rk-price-total-val">{fmt(subtotal)}</span>
              </div>
            </div>
            <div className="rk-deposit">
              <span className="rk-deposit-key">Adelanto para confirmar (20%)</span>
              <span className="rk-deposit-val">{fmt(deposit)}</span>
            </div>
          </>
        )}

        <button className="rk-btn" onClick={() => { if (validate()) setStep("resumen") }}>
          Ver resumen →
        </button>
        <div className="rk-footer">Rukatraro · Licanray · Chile</div>
      </div>
    </div>
  )
}

export default function ReservarPage() {
  return (
    <Suspense fallback={<div style={{ padding: "32px", fontFamily: "sans-serif", color: "#f0ede8", background: "#0d1a12", minHeight: "100vh" }}>Cargando...</div>}>
      <ReservarInner />
    </Suspense>
  )
}