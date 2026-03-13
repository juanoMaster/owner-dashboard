"use client"

import { useState } from "react"
import { useSearchParams, } from "next/navigation"
import { Suspense } from "react"

const PRICE_CABIN: Record<string, number> = {
  "f935a02e-2572-4272-9a08-af40b29f0912": 30000,
  "100598b1-5232-46a0-adf5-6dc969ce2f9f": 40000,
}

const CAPACITY_CABIN: Record<string, number> = {
  "f935a02e-2572-4272-9a08-af40b29f0912": 4,
  "100598b1-5232-46a0-adf5-6dc969ce2f9f": 5,
}

function ReservarInner() {
  const searchParams = useSearchParams()
  const cabinId = searchParams.get("cabin_id") || ""
  const cabinName = decodeURIComponent(searchParams.get("cabin_name") || "Cabaña")

  const [checkIn, setCheckIn] = useState("")
  const [checkOut, setCheckOut] = useState("")
  const [guests, setGuests] = useState(2)
  const [tinajaDias, setTinajaDias] = useState(0)
  const [name, setName] = useState("")
  const [whatsapp, setWhatsapp] = useState("")
  const [step, setStep] = useState<"form" | "resumen" | "pago">("form")
  const [payMethod, setPayMethod] = useState<"transfer" | "card" | null>(null)

  const pricePerNight = PRICE_CABIN[cabinId] || 30000
  const capacity = CAPACITY_CABIN[cabinId] || 4
  const nights = checkIn && checkOut
    ? Math.max(0, Math.round((new Date(checkOut).getTime() - new Date(checkIn).getTime()) / 86400000))
    : 0
  const extraGuests = Math.max(0, guests - capacity)
  const extraGuestCost = extraGuests * 5000 * nights
  const tinajaCost = tinajaDias * 30000
  const subtotal = pricePerNight * nights + extraGuestCost + tinajaCost
  const deposit = Math.round(subtotal * 0.2)

  function fmt(n: number) { return "$" + n.toLocaleString("es-CL") }
  function fmtDate(d: string) {
    if (!d) return ""
    const [y, m, day] = d.split("-")
    return `${day}/${m}/${y}`
  }

  function handleContinuar() {
    if (!checkIn || !checkOut) { alert("Selecciona fechas de entrada y salida"); return }
    if (nights < 2) { alert("La estadía mínima es 2 noches"); return }
    if (!name.trim()) { alert("Ingresa tu nombre"); return }
    if (!whatsapp.trim()) { alert("Ingresa tu WhatsApp"); return }
    setStep("resumen")
  }

  const css = `
    @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;600;700&family=DM+Sans:wght@300;400;500;600&display=swap');
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { background: #f7f3ee; }
    .rk-wrap { min-height: 100vh; background: #f7f3ee; font-family: 'DM Sans', sans-serif; color: #2c2420; }
    .rk-header { background: #2c2420; padding: 18px 24px; display: flex; align-items: center; justify-content: space-between; }
    .rk-logo { font-family: 'Cormorant Garamond', serif; color: #e8ddd0; font-size: 22px; font-weight: 600; letter-spacing: 2px; text-transform: uppercase; }
    .rk-logo span { color: #c9a96e; }
    .rk-badge { background: #c9a96e22; border: 1px solid #c9a96e55; color: #c9a96e; font-size: 11px; padding: 4px 10px; border-radius: 20px; letter-spacing: 1px; text-transform: uppercase; }
    .rk-hero { background: linear-gradient(135deg, #2c2420 0%, #4a3728 100%); padding: 32px 24px 28px; position: relative; overflow: hidden; }
    .rk-hero::before { content: ''; position: absolute; top: -40px; right: -40px; width: 200px; height: 200px; border-radius: 50%; background: #c9a96e11; }
    .rk-hero-sub { font-size: 11px; color: #c9a96e; letter-spacing: 2px; text-transform: uppercase; margin-bottom: 8px; }
    .rk-hero-title { font-family: 'Cormorant Garamond', serif; font-size: 32px; font-weight: 700; color: #f7f3ee; line-height: 1.1; margin-bottom: 6px; }
    .rk-hero-loc { font-size: 13px; color: #b8a898; display: flex; align-items: center; gap: 6px; }
    .rk-body { padding: 24px 20px; max-width: 500px; margin: 0 auto; }
    .rk-card { background: #fff; border-radius: 16px; padding: 20px; margin-bottom: 16px; box-shadow: 0 2px 12px rgba(44,36,32,0.07); }
    .rk-section-title { font-family: 'Cormorant Garamond', serif; font-size: 18px; font-weight: 600; color: #2c2420; margin-bottom: 16px; padding-bottom: 10px; border-bottom: 1px solid #f0ebe5; }
    .rk-field { margin-bottom: 16px; }
    .rk-label { display: block; font-size: 12px; font-weight: 600; color: #8a7060; letter-spacing: 0.5px; text-transform: uppercase; margin-bottom: 6px; }
    .rk-input { width: 100%; padding: 12px 14px; border-radius: 10px; border: 1.5px solid #e8ddd0; font-size: 15px; font-family: 'DM Sans', sans-serif; color: #2c2420; background: #faf8f5; transition: border-color 0.2s; outline: none; }
    .rk-input:focus { border-color: #c9a96e; background: #fff; }
    .rk-input-row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
    .rk-price-box { background: linear-gradient(135deg, #2c2420 0%, #3d2d24 100%); border-radius: 14px; padding: 18px 20px; margin-bottom: 20px; }
    .rk-price-row { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; }
    .rk-price-label { font-size: 13px; color: #b8a898; }
    .rk-price-val { font-size: 13px; color: #e8ddd0; font-weight: 500; }
    .rk-price-total { border-top: 1px solid #ffffff22; padding-top: 12px; margin-top: 4px; }
    .rk-price-total .rk-price-label { font-size: 14px; color: #e8ddd0; font-weight: 500; }
    .rk-price-total .rk-price-val { font-family: 'Cormorant Garamond', serif; font-size: 26px; color: #c9a96e; font-weight: 700; }
    .rk-deposit-tag { background: #c9a96e22; border: 1px solid #c9a96e55; border-radius: 8px; padding: 10px 14px; display: flex; justify-content: space-between; margin-bottom: 20px; }
    .rk-deposit-tag span { font-size: 13px; color: #8a7060; }
    .rk-deposit-tag strong { font-size: 15px; color: #c9a96e; font-weight: 700; }
    .rk-btn { width: 100%; background: linear-gradient(135deg, #c9a96e 0%, #b8924a 100%); color: #fff; border: none; border-radius: 12px; padding: 16px; font-size: 15px; font-weight: 600; font-family: 'DM Sans', sans-serif; cursor: pointer; letter-spacing: 0.3px; transition: opacity 0.2s; }
    .rk-btn:hover { opacity: 0.92; }
    .rk-btn-outline { width: 100%; background: transparent; color: #8a7060; border: 1.5px solid #e8ddd0; border-radius: 12px; padding: 13px; font-size: 14px; font-family: 'DM Sans', sans-serif; cursor: pointer; margin-top: 10px; transition: all 0.2s; }
    .rk-btn-outline:hover { border-color: #c9a96e; color: #c9a96e; }
    .rk-summary-row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #f0ebe5; font-size: 14px; }
    .rk-summary-row:last-child { border-bottom: none; }
    .rk-summary-key { color: #8a7060; }
    .rk-summary-val { font-weight: 500; color: #2c2420; }
    .rk-pay-option { border: 2px solid #e8ddd0; border-radius: 14px; padding: 18px; margin-bottom: 12px; cursor: pointer; transition: all 0.2s; }
    .rk-pay-option:hover { border-color: #c9a96e; }
    .rk-pay-option.selected { border-color: #c9a96e; background: #fdf9f4; }
    .rk-pay-option-header { display: flex; align-items: center; gap: 12px; margin-bottom: 4px; }
    .rk-pay-icon { width: 40px; height: 40px; border-radius: 10px; display: flex; align-items: center; justify-content: center; font-size: 20px; background: #f7f3ee; }
    .rk-pay-title { font-weight: 600; font-size: 15px; color: #2c2420; }
    .rk-pay-desc { font-size: 12px; color: #8a7060; margin-left: 52px; }
    .rk-transfer-detail { background: #f7f3ee; border-radius: 10px; padding: 14px; margin-top: 14px; }
    .rk-transfer-row { display: flex; justify-content: space-between; font-size: 13px; margin-bottom: 6px; }
    .rk-transfer-row:last-child { margin-bottom: 0; }
    .rk-transfer-key { color: #8a7060; }
    .rk-transfer-val { font-weight: 600; color: #2c2420; }
    .rk-chip { display: inline-block; background: #2c242011; color: #2c2420; font-size: 11px; border-radius: 20px; padding: 3px 10px; margin-right: 6px; }
    .rk-rules { background: #faf8f5; border-radius: 12px; padding: 14px 16px; }
    .rk-rule { font-size: 12px; color: #8a7060; margin-bottom: 5px; display: flex; gap: 8px; }
    .rk-success { text-align: center; padding: 40px 20px; }
    .rk-success-icon { width: 72px; height: 72px; background: linear-gradient(135deg, #c9a96e, #b8924a); border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 20px; font-size: 32px; }
    .rk-footer { text-align: center; padding: 20px; font-size: 11px; color: #b8a898; letter-spacing: 0.5px; }
  `

  // PANTALLA PAGO
  if (step === "pago") {
    return (
      <div className="rk-wrap">
        <style>{css}</style>
        <div className="rk-header">
          <div className="rk-logo">RUKA<span>TRARO</span></div>
          <div className="rk-badge">Reserva Segura</div>
        </div>
        <div className="rk-body">
          <div className="rk-card">
            <div className="rk-success">
              <div className="rk-success-icon">✓</div>
              <p style={{ fontFamily: "Cormorant Garamond, serif", fontSize: "26px", fontWeight: "700", marginBottom: "8px" }}>¡Solicitud Recibida!</p>
              <p style={{ fontSize: "14px", color: "#8a7060", marginBottom: "4px" }}>Hola <strong style={{ color: "#2c2420" }}>{name}</strong>, ya tenemos tu solicitud.</p>
              <p style={{ fontSize: "13px", color: "#b8a898" }}>{cabinName} · {fmtDate(checkIn)} → {fmtDate(checkOut)} · {nights} noches</p>
            </div>
          </div>

          <div className="rk-card">
            <div className="rk-section-title">Confirma tu reserva pagando el adelanto</div>
            <div style={{ background: "#f7f3ee", borderRadius: "10px", padding: "14px", marginBottom: "18px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: "13px", color: "#8a7060" }}>Adelanto requerido (20%)</span>
              <span style={{ fontFamily: "Cormorant Garamond, serif", fontSize: "24px", fontWeight: "700", color: "#c9a96e" }}>{fmt(deposit)}</span>
            </div>

            <div
              className={`rk-pay-option${payMethod === "transfer" ? " selected" : ""}`}
              onClick={() => setPayMethod("transfer")}
            >
              <div className="rk-pay-option-header">
                <div className="rk-pay-icon">🏦</div>
                <span className="rk-pay-title">Transferencia Bancaria</span>
                {payMethod === "transfer" && <span style={{ marginLeft: "auto", color: "#c9a96e", fontSize: "18px" }}>✓</span>}
              </div>
              <div className="rk-pay-desc">Transferencia instantánea — BancoEstado</div>
              {payMethod === "transfer" && (
                <div className="rk-transfer-detail">
                  {[
                    ["Banco", "BancoEstado"],
                    ["Tipo", "Cuenta RUT"],
                    ["Número / RUT", "15.665.466-3"],
                    ["Nombre", "Johanna Medina"],
                    ["Monto exacto", fmt(deposit)],
                    ["Asunto", `Reserva ${cabinName}`],
                  ].map(([k, v]) => (
                    <div className="rk-transfer-row" key={k}>
                      <span className="rk-transfer-key">{k}</span>
                      <span className="rk-transfer-val">{v}</span>
                    </div>
                  ))}
                  <p style={{ fontSize: "12px", color: "#b8a898", marginTop: "10px" }}>
                    Envía el comprobante por WhatsApp a Johanna para confirmar tu reserva.
                  </p>
                </div>
              )}
            </div>

            <div
              className={`rk-pay-option${payMethod === "card" ? " selected" : ""}`}
              onClick={() => setPayMethod("card")}
              style={{ opacity: 0.6 }}
            >
              <div className="rk-pay-option-header">
                <div className="rk-pay-icon">💳</div>
                <span className="rk-pay-title">Tarjeta / Débito</span>
                <span style={{ marginLeft: "auto", background: "#f0ebe5", color: "#8a7060", fontSize: "10px", padding: "3px 8px", borderRadius: "20px", letterSpacing: "0.5px" }}>PRÓXIMAMENTE</span>
              </div>
              <div className="rk-pay-desc">Pago online seguro con Mercado Pago</div>
            </div>
          </div>

          {payMethod === "transfer" && (
            <div className="rk-card">
              <p style={{ fontSize: "13px", color: "#8a7060", lineHeight: "1.6" }}>
                Después de transferir, envía el comprobante por WhatsApp. Johanna confirmará tu reserva en menos de 24 horas.
              </p>
              <div style={{ display: "flex", alignItems: "center", gap: "10px", marginTop: "14px", padding: "12px", background: "#f7f3ee", borderRadius: "10px" }}>
                <span style={{ fontSize: "22px" }}>💬</span>
                <div>
                  <div style={{ fontSize: "12px", color: "#8a7060" }}>WhatsApp de Johanna</div>
                  <div style={{ fontSize: "15px", fontWeight: "600", color: "#2c2420" }}>+56 9 · Rukatraro</div>
                </div>
              </div>
            </div>
          )}

          <div className="rk-footer">RUKATRARO · Licanray, Lago Calafquén · Chile</div>
        </div>
      </div>
    )
  }

  // PANTALLA RESUMEN
  if (step === "resumen") {
    return (
      <div className="rk-wrap">
        <style>{css}</style>
        <div className="rk-header">
          <div className="rk-logo">RUKA<span>TRARO</span></div>
          <div className="rk-badge">Reserva Segura</div>
        </div>
        <div className="rk-body">
          <button className="rk-btn-outline" style={{ width: "auto", padding: "8px 16px", marginBottom: "16px" }} onClick={() => setStep("form")}>
            ← Volver
          </button>
          <div className="rk-card">
            <div className="rk-section-title">Resumen de tu Reserva</div>
            {[
              ["Cabaña", cabinName],
              ["Huésped", name],
              ["WhatsApp", whatsapp],
              ["Check-in", fmtDate(checkIn) + " — 14:00 hrs"],
              ["Check-out", fmtDate(checkOut) + " — 12:00 hrs"],
              ["Noches", `${nights}`],
              ["Huéspedes", `${guests} persona${guests > 1 ? "s" : ""}`],
              tinajaDias > 0 ? ["Tinaja", `${tinajaDias} día${tinajaDias > 1 ? "s" : ""}`] : null,
            ].filter(Boolean).map((row: any) => (
              <div className="rk-summary-row" key={row[0]}>
                <span className="rk-summary-key">{row[0]}</span>
                <span className="rk-summary-val">{row[1]}</span>
              </div>
            ))}
          </div>

          <div className="rk-price-box">
            {pricePerNight * nights > 0 && (
              <div className="rk-price-row">
                <span className="rk-price-label">{fmt(pricePerNight)} × {nights} noches</span>
                <span className="rk-price-val">{fmt(pricePerNight * nights)}</span>
              </div>
            )}
            {extraGuestCost > 0 && (
              <div className="rk-price-row">
                <span className="rk-price-label">Personas extra</span>
                <span className="rk-price-val">{fmt(extraGuestCost)}</span>
              </div>
            )}
            {tinajaCost > 0 && (
              <div className="rk-price-row">
                <span className="rk-price-label">Tinaja ({tinajaDias} días)</span>
                <span className="rk-price-val">{fmt(tinajaCost)}</span>
              </div>
            )}
            <div className="rk-price-row rk-price-total">
              <span className="rk-price-label">Total estadía</span>
              <span className="rk-price-val">{fmt(subtotal)}</span>
            </div>
          </div>

          <div className="rk-deposit-tag">
            <span>Adelanto para confirmar (20%)</span>
            <strong>{fmt(deposit)}</strong>
          </div>

          <div className="rk-card rk-rules">
            {["No mascotas", "No fiestas", "No visitas externas", "No fumar dentro", "Cancelación: 50% devuelto con 14+ días de anticipación"].map(r => (
              <div className="rk-rule" key={r}><span>·</span><span>{r}</span></div>
            ))}
          </div>

          <button className="rk-btn" style={{ marginTop: "16px" }} onClick={() => setStep("pago")}>
            Continuar al pago →
          </button>
        </div>
      </div>
    )
  }

  // PANTALLA FORMULARIO
  return (
    <div className="rk-wrap">
      <style>{css}</style>
      <div className="rk-header">
        <div className="rk-logo">RUKA<span>TRARO</span></div>
        <div className="rk-badge">Licanray, Chile</div>
      </div>
      <div className="rk-hero">
        <div className="rk-hero-sub">Reserva Directa</div>
        <div className="rk-hero-title">{cabinName}</div>
        <div className="rk-hero-loc">
          <span>📍</span>
          <span>Lago Calafquén · Estadía mínima 2 noches · Check-in 14:00</span>
        </div>
      </div>

      <div className="rk-body">
        <div className="rk-card">
          <div className="rk-section-title">Fechas y Huéspedes</div>
          <div className="rk-input-row">
            <div className="rk-field">
              <label className="rk-label">Check-in</label>
              <input className="rk-input" type="date" value={checkIn} min={new Date().toISOString().split("T")[0]} onChange={e => { setCheckIn(e.target.value); setCheckOut("") }} />
            </div>
            <div className="rk-field">
              <label className="rk-label">Check-out</label>
              <input className="rk-input" type="date" value={checkOut} min={checkIn} onChange={e => setCheckOut(e.target.value)} />
            </div>
          </div>
          <div className="rk-field">
            <label className="rk-label">Cantidad de Huéspedes</label>
            <select className="rk-input" value={guests} onChange={e => setGuests(Number(e.target.value))}>
              {[1,2,3,4,5,6].map(n => (
                <option key={n} value={n}>{n} persona{n > 1 ? "s" : ""}{n > capacity ? ` (+$${(5000).toLocaleString("es-CL")}/noche extra)` : ""}</option>
              ))}
            </select>
          </div>
          <div className="rk-field">
            <label className="rk-label">Tinaja de Madera (+$30.000/día)</label>
            <select className="rk-input" value={tinajaDias} onChange={e => setTinajaDias(Number(e.target.value))} disabled={nights < 2}>
              <option value={0}>Sin tinaja</option>
              {Array.from({ length: nights }, (_, i) => i + 1).map(n => (
                <option key={n} value={n}>{n} día{n > 1 ? "s" : ""} — {fmt(n * 30000)}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="rk-card">
          <div className="rk-section-title">Tus Datos</div>
          <div className="rk-field">
            <label className="rk-label">Nombre Completo</label>
            <input className="rk-input" type="text" value={name} onChange={e => setName(e.target.value)} placeholder="Ej: María González" />
          </div>
          <div className="rk-field">
            <label className="rk-label">WhatsApp</label>
            <input className="rk-input" type="tel" value={whatsapp} onChange={e => setWhatsapp(e.target.value)} placeholder="+56 9 1234 5678" />
          </div>
        </div>

        {nights >= 2 && (
          <div className="rk-price-box">
            {pricePerNight * nights > 0 && (
              <div className="rk-price-row">
                <span className="rk-price-label">{fmt(pricePerNight)} × {nights} noches</span>
                <span className="rk-price-val">{fmt(pricePerNight * nights)}</span>
              </div>
            )}
            {extraGuestCost > 0 && (
              <div className="rk-price-row">
                <span className="rk-price-label">Personas extra</span>
                <span className="rk-price-val">{fmt(extraGuestCost)}</span>
              </div>
            )}
            {tinajaCost > 0 && (
              <div className="rk-price-row">
                <span className="rk-price-label">Tinaja</span>
                <span className="rk-price-val">{fmt(tinajaCost)}</span>
              </div>
            )}
            <div className="rk-price-row rk-price-total">
              <span className="rk-price-label">Total</span>
              <span className="rk-price-val">{fmt(subtotal)}</span>
            </div>
          </div>
        )}

        {nights >= 2 && (
          <div className="rk-deposit-tag">
            <span>Adelanto para confirmar (20%)</span>
            <strong>{fmt(deposit)}</strong>
          </div>
        )}

        <button className="rk-btn" onClick={handleContinuar}>
          Ver resumen →
        </button>
        <div className="rk-footer">RUKATRARO · Licanray, Lago Calafquén · Chile</div>
      </div>
    </div>
  )
}

export default function ReservarPage() {
  return (
    <Suspense fallback={<div style={{ padding: "32px", fontFamily: "sans-serif" }}>Cargando...</div>}>
      <ReservarInner />
    </Suspense>
  )
}