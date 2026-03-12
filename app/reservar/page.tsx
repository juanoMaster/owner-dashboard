"use client"

import { useState } from "react"
import { useSearchParams } from "next/navigation"
import { Suspense } from "react"

const PRICE_CABIN: Record<string, number> = {
  "f935a02e-2572-4272-9a08-af40b29f0912": 30000,
  "100598b1-5232-46a0-adf5-6dc969ce2f9f": 40000,
}

function ReservarInner() {
  const searchParams = useSearchParams()
  const cabinId = searchParams.get("cabin_id") || ""
  const cabinName = searchParams.get("cabin_name") || "Cabaña"

  const [checkIn, setCheckIn] = useState("")
  const [checkOut, setCheckOut] = useState("")
  const [guests, setGuests] = useState(2)
  const [tinajaDias, setTinajaDias] = useState(0)
  const [name, setName] = useState("")
  const [whatsapp, setWhatsapp] = useState("")
  const [step, setStep] = useState<"form" | "resumen" | "confirmado">("form")

  const pricePerNight = PRICE_CABIN[cabinId] || 30000
  const nights = checkIn && checkOut
    ? Math.max(0, Math.round((new Date(checkOut).getTime() - new Date(checkIn).getTime()) / 86400000))
    : 0
  const extraGuests = Math.max(0, guests - 4)
  const extraGuestCost = extraGuests * 5000 * nights
  const tinajaCost = tinajaDias * 30000
  const subtotal = pricePerNight * nights + extraGuestCost + tinajaCost
  const deposit = Math.round(subtotal * 0.2)

  function handleContinuar() {
    if (!checkIn || !checkOut) { alert("Selecciona fechas de entrada y salida"); return }
    if (nights < 2) { alert("La estadía mínima es 2 noches"); return }
    if (!name.trim()) { alert("Ingresa tu nombre"); return }
    if (!whatsapp.trim()) { alert("Ingresa tu WhatsApp"); return }
    setStep("resumen")
  }

  if (step === "confirmado") {
    return (
      <div style={{ padding: "32px 20px", fontFamily: "sans-serif", maxWidth: "480px", margin: "0 auto", textAlign: "center" }}>
        <div style={{ fontSize: "48px", marginBottom: "16px" }}>✅</div>
        <h1 style={{ fontSize: "22px", fontWeight: "700", marginBottom: "12px" }}>Reserva Solicitada</h1>
        <p style={{ color: "#555", fontSize: "15px", marginBottom: "8px" }}>
          Hola <strong>{name}</strong>, recibimos tu solicitud para <strong>{cabinName}</strong>.
        </p>
        <p style={{ color: "#555", fontSize: "15px", marginBottom: "24px" }}>
          Johanna te contactará pronto por WhatsApp para coordinar el adelanto de <strong>${deposit.toLocaleString("es-CL")} CLP</strong>.
        </p>
        <p style={{ color: "#888", fontSize: "13px" }}>
          Check-in: {checkIn} — Check-out: {checkOut}
        </p>
      </div>
    )
  }

  if (step === "resumen") {
    return (
      <div style={{ padding: "32px 20px", fontFamily: "sans-serif", maxWidth: "480px", margin: "0 auto" }}>
        <button onClick={() => setStep("form")} style={{ background: "none", border: "none", color: "#c0392b", fontWeight: "600", fontSize: "14px", cursor: "pointer", marginBottom: "16px" }}>
          ← Volver
        </button>
        <h1 style={{ fontSize: "20px", fontWeight: "700", marginBottom: "20px" }}>Resumen de tu Reserva</h1>

        {[
          ["Cabaña", cabinName],
          ["Check-in", checkIn],
          ["Check-out", checkOut],
          ["Noches", `${nights}`],
          ["Huéspedes", `${guests}`],
          tinajaDias > 0 ? ["Días de tinaja", `${tinajaDias} día${tinajaDias > 1 ? "s" : ""}`] : null,
          ["Precio por noche", `$${pricePerNight.toLocaleString("es-CL")}`],
          extraGuests > 0 ? ["Personas extra", `$${extraGuestCost.toLocaleString("es-CL")}`] : null,
          tinajaDias > 0 ? ["Tinaja", `$${tinajaCost.toLocaleString("es-CL")}`] : null, null,
          ["Total", `$${subtotal.toLocaleString("es-CL")}`],
          ["Adelanto (20%)", `$${deposit.toLocaleString("es-CL")}`],
        ].filter(Boolean).map((row: any) => (
          <div key={row[0]} style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", borderBottom: "1px solid #eee", fontSize: "14px" }}>
            <span style={{ color: "#666" }}>{row[0]}</span>
            <span style={{ fontWeight: row[0] === "Total" || row[0] === "Adelanto (20%)" ? "700" : "400" }}>{row[1]}</span>
          </div>
        ))}

        <p style={{ fontSize: "12px", color: "#888", margin: "16px 0" }}>
          El adelanto se coordina por WhatsApp a BancoEstado Cuenta RUT 15.665.466-3
        </p>

        <button
          onClick={() => setStep("confirmado")}
          style={{ width: "100%", background: "#c0392b", color: "white", border: "none", borderRadius: "8px", padding: "14px", fontSize: "15px", fontWeight: "700", cursor: "pointer" }}
        >
          Confirmar Solicitud
        </button>
      </div>
    )
  }

  return (
    <div style={{ padding: "32px 20px", fontFamily: "sans-serif", maxWidth: "480px", margin: "0 auto" }}>
      <h1 style={{ fontSize: "20px", fontWeight: "700", marginBottom: "4px" }}>Reservar — {decodeURIComponent(cabinName)}</h1>
      <p style={{ color: "#888", fontSize: "12px", marginBottom: "24px" }}>Licanray, Lago Calafquén · Estadía mínima 2 noches</p>

      <label style={labelStyle}>Fecha de entrada</label>
      <input type="date" value={checkIn} onChange={e => setCheckIn(e.target.value)} style={inputStyle} />

      <label style={labelStyle}>Fecha de salida</label>
      <input type="date" value={checkOut} onChange={e => setCheckOut(e.target.value)} style={inputStyle} />

      <label style={labelStyle}>Cantidad de huéspedes</label>
      <select value={guests} onChange={e => setGuests(Number(e.target.value))} style={inputStyle}>
        {[1,2,3,4,5,6].map(n => <option key={n} value={n}>{n} persona{n > 1 ? "s" : ""}</option>)}
      </select>

      <label style={labelStyle}>Días de tinaja de madera (+$30.000/día)</label>
      <select value={tinajaDias} onChange={e => setTinajaDias(Number(e.target.value))} style={inputStyle} disabled={nights < 2}>
        <option value={0}>Sin tinaja</option>
        {Array.from({ length: nights }, (_, i) => i + 1).map(n => (
          <option key={n} value={n}>{n} día{n > 1 ? "s" : ""} — ${(n * 30000).toLocaleString("es-CL")}</option>
        ))}
      </select>

      <label style={labelStyle}>Tu nombre completo</label>
      <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="Ej: María González" style={inputStyle} />

      <label style={labelStyle}>Tu WhatsApp</label>
      <input type="tel" value={whatsapp} onChange={e => setWhatsapp(e.target.value)} placeholder="+56 9 1234 5678" style={inputStyle} />

      {nights >= 2 && (
        <div style={{ background: "#fff8f8", border: "1px solid #f5c6c6", borderRadius: "8px", padding: "12px 16px", marginBottom: "16px", fontSize: "13px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
            <span style={{ color: "#666" }}>Total estimado</span>
            <strong>${subtotal.toLocaleString("es-CL")}</strong>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span style={{ color: "#666" }}>Adelanto 20%</span>
            <strong style={{ color: "#c0392b" }}>${deposit.toLocaleString("es-CL")}</strong>
          </div>
        </div>
      )}

      <button onClick={handleContinuar} style={{ width: "100%", background: "#c0392b", color: "white", border: "none", borderRadius: "8px", padding: "14px", fontSize: "15px", fontWeight: "700", cursor: "pointer" }}>
        Ver resumen →
      </button>
    </div>
  )
}

const labelStyle: React.CSSProperties = { display: "block", fontSize: "13px", fontWeight: "600", color: "#333", marginBottom: "6px", marginTop: "16px" }
const inputStyle: React.CSSProperties = { width: "100%", padding: "10px 12px", borderRadius: "8px", border: "1px solid #ddd", fontSize: "14px", boxSizing: "border-box" }

export default function ReservarPage() {
  return (
    <Suspense fallback={<div style={{ padding: "32px" }}>Cargando...</div>}>
      <ReservarInner />
    </Suspense>
  )
}