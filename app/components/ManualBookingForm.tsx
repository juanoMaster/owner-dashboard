"use client"
import { useState, useEffect, CSSProperties } from "react"

interface Cabin { id: string; name: string; capacity: number; base_price_night: number }
interface Props { cabins: Cabin[]; tenantId: string }

function fmt(n: number) { return "$" + Math.round(n).toLocaleString("es-CL") }

export default function ManualBookingForm({ cabins, tenantId }: Props) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState<{ code: string; total: number; nights: number } | null>(null)
  const [cabinId, setCabinId] = useState(cabins[0]?.id || "")
  const [checkIn, setCheckIn] = useState("")
  const [checkOut, setCheckOut] = useState("")
  const [guestName, setGuestName] = useState("")
  const [guestWhatsapp, setGuestWhatsapp] = useState("")
  const [guestCount, setGuestCount] = useState("2")
  const [tinajaUse, setTinajaUse] = useState(false)
  const [tinajaDays, setTinajaDays] = useState("1")
  const [notes, setNotes] = useState("")
  const [dispStatus, setDispStatus] = useState<"idle" | "checking" | "ok" | "occupied">("idle")

  const selectedCabin = cabins.find(c => c.id === cabinId)

  useEffect(() => {
    const nights = checkIn && checkOut
      ? Math.round((new Date(checkOut + "T12:00:00").getTime() - new Date(checkIn + "T12:00:00").getTime()) / 86400000)
      : 0
    if (!checkIn || !checkOut || nights < 1) { setDispStatus("idle"); return }
    setDispStatus("checking")
    const controller = new AbortController()
    fetch("/api/availability?cabin_id=" + cabinId + "&check_in=" + checkIn + "&check_out=" + checkOut, { signal: controller.signal })
      .then(r => r.json())
      .then(data => setDispStatus(data.available ? "ok" : "occupied"))
      .catch(() => {})
    return () => controller.abort()
  }, [checkIn, checkOut, cabinId])

  function calcNights() {
    if (!checkIn || !checkOut) return 0
    const n = Math.round((new Date(checkOut + "T12:00:00").getTime() - new Date(checkIn + "T12:00:00").getTime()) / 86400000)
    return n > 0 ? n : 0
  }

  function calcTotal() {
    const n = calcNights()
    if (!selectedCabin || n === 0) return { subtotal: 0, extras: 0, tinaja: 0, total: 0, deposit: 0 }
    const extra = Math.max(0, parseInt(guestCount) - (selectedCabin.capacity - 2))
    const subtotal = selectedCabin.base_price_night * n
    const extras = extra * 5000 * n
    const tinaja = tinajaUse ? parseInt(tinajaDays) * 30000 : 0
    const total = subtotal + extras + tinaja
    return { subtotal, extras, tinaja, total, deposit: Math.round(total * 0.2) }
  }

  function reset() {
    setCabinId(cabins[0]?.id || ""); setCheckIn(""); setCheckOut(""); setGuestName(""); setGuestWhatsapp(""); setGuestCount("2"); setTinajaUse(false); setTinajaDays("1"); setNotes(""); setError(""); setSuccess(null); setDispStatus("idle")
  }

  async function handleSubmit() {
    setError("")
    if (!checkIn || !checkOut || !guestName || !guestWhatsapp) { setError("Por favor completa todos los campos obligatorios."); return }
    if (calcNights() < 1) { setError("Las fechas no son v\u00e1lidas."); return }
    setLoading(true)
    try {
      const res = await fetch("/api/bookings/manual", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ tenant_id: tenantId, cabin_id: cabinId, check_in: checkIn, check_out: checkOut, guest_name: guestName, guest_whatsapp: guestWhatsapp, guests: guestCount, tinaja_days: tinajaUse ? tinajaDays : "0", notes }) })
      const data = await res.json()
      if (!data.success) setError(data.message || "Error al guardar.")
      else {
  setSuccess({ code: data.booking_code, total: data.total, nights: data.nights })
  setTimeout(() => { window.location.reload() }, 2000)
}
    } catch { setError("Error de conexi\u00f3n.") } finally { setLoading(false) }
  }

  const nights = calcNights()
  const calc = calcTotal()
  const today = new Date().toISOString().split("T")[0]

  const inp: CSSProperties = { width: "100%", padding: "10px 12px", border: "1px solid #2a3e28", borderRadius: "8px", fontSize: "14px", color: "#e8d5a3", background: "#0d1a12", boxSizing: "border-box", outline: "none" }
  const sel: CSSProperties = { ...inp, cursor: "pointer" }
  const lbl: CSSProperties = { display: "block", fontSize: "13px", fontWeight: 600, color: "#8a9e88", marginBottom: "6px" }
  const fg: CSSProperties = { marginBottom: "16px" }
  const r2: CSSProperties = { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "16px" }
  const ov: CSSProperties = { position: "fixed", inset: "0", background: "rgba(0,0,0,0.65)", zIndex: 50, display: "flex", alignItems: "flex-start", justifyContent: "center", overflowY: "auto", padding: "24px 16px" }
  const mdl: CSSProperties = { background: "#111a11", border: "1px solid #2a3e28", borderRadius: "16px", padding: "28px", width: "100%", maxWidth: "540px", marginTop: "20px" }
  const sumBox: CSSProperties = { background: "#0d1a12", border: "1px solid #7ab87a44", borderRadius: "8px", padding: "16px", marginBottom: "20px" }
  const sumRow: CSSProperties = { display: "flex", justifyContent: "space-between", fontSize: "13px", color: "#8a9e88", marginBottom: "6px" }
  const sumTotal: CSSProperties = { display: "flex", justifyContent: "space-between", fontSize: "16px", fontWeight: 700, color: "#7ab87a", borderTop: "1px solid #2a3e28", paddingTop: "10px", marginTop: "6px" }
  const errBox: CSSProperties = { background: "#3a0d0d", border: "1px solid #c0392b44", borderRadius: "8px", padding: "12px", color: "#e67a7a", fontSize: "14px", marginBottom: "16px" }
  const sucBox: CSSProperties = { background: "#0d1a12", border: "1px solid #7ab87a44", borderRadius: "8px", padding: "20px", textAlign: "center" }
  const btnG: CSSProperties = { background: "#7ab87a", color: "#0d1a12", border: "none", borderRadius: "8px", padding: "12px 24px", fontSize: "14px", fontWeight: 700, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: "8px" }
  const btnS: CSSProperties = { background: "transparent", color: "#5a7058", border: "1px solid #2a3e28", borderRadius: "8px", padding: "10px 20px", fontSize: "14px", cursor: "pointer" }
  const btnOk: CSSProperties = { background: "#27ae60", color: "white", border: "none", borderRadius: "8px", padding: "12px 24px", fontSize: "14px", fontWeight: 700, cursor: "pointer", flex: 1 }
  const btnDis: CSSProperties = { background: "#2a3e28", color: "#5a7058", border: "none", borderRadius: "8px", padding: "12px 24px", fontSize: "14px", cursor: "not-allowed", flex: 1 }

  return (
    <div style={{ marginTop: "24px", paddingTop: "24px", borderTop: "1px solid #2a3e28" }}>
      <button style={btnG} onClick={() => setOpen(true)}>{"+ Nueva reserva manual"}</button>
      {open && (
        <div style={ov} onClick={e => { if (e.target === e.currentTarget) { setOpen(false); reset() } }}>
          <div style={mdl}>
            {success ? (
              <div>
                <div style={sucBox}>
                  <div style={{ fontSize: "36px" }}>{"\u2705"}</div>
                  <div style={{ fontSize: "16px", fontWeight: 700, color: "#7ab87a", marginTop: "8px" }}>{"Reserva guardada con \u00e9xito"}</div>
                  <div style={{ fontSize: "20px", fontWeight: 700, color: "#e8d5a3", letterSpacing: "2px", margin: "12px 0" }}>{success.code}</div>
                  <div style={{ fontSize: "13px", color: "#5a7058" }}>{success.nights} {success.nights === 1 ? "noche" : "noches"} {"\u00b7"} Total: {fmt(success.total)}</div>
                  <div style={{ fontSize: "11px", color: "#4a6a48", marginTop: "6px" }}>{"Calendario bloqueado autom\u00e1ticamente"}</div>
                </div>
                <div style={{ marginTop: "16px", display: "flex", gap: "12px" }}>
                  <button style={{ ...btnS, flex: 1 }} onClick={() => reset()}>{"Agregar otra"}</button>
                  <button style={{ ...btnG, flex: 1, justifyContent: "center" }} onClick={() => { setOpen(false); reset() }}>{"Cerrar"}</button>
                </div>
              </div>
            ) : (
              <>
                <div style={{ fontFamily: "Georgia, serif", fontSize: "20px", color: "#e8d5a3", marginBottom: "6px" }}>{"Nueva reserva manual"}</div>
                <div style={{ fontSize: "12px", color: "#5a7058", marginBottom: "20px" }}>{"Reservas de clientes propios. Sin comisi\u00f3n Takai."}</div>
                {error && <div style={errBox}>{error}</div>}
                <div style={fg}>
                  <label style={lbl}>{"Caba\u00f1a"}</label>
                  <select style={sel} value={cabinId} onChange={e => setCabinId(e.target.value)}>
                    {cabins.map(c => <option key={c.id} value={c.id}>{c.name} {"\u2014"} {fmt(c.base_price_night)}/noche</option>)}
                  </select>
                </div>
                <div style={r2}>
                  <div><label style={lbl}>{"Check-in"}</label><input type="date" style={inp} min={today} value={checkIn} onChange={e => { setCheckIn(e.target.value); if (checkOut && e.target.value >= checkOut) setCheckOut("") }} /></div>
                  <div><label style={lbl}>{"Check-out"}</label><input type="date" style={inp} min={checkIn || today} value={checkOut} onChange={e => setCheckOut(e.target.value)} /></div>
                </div>
                {dispStatus === "checking" && (
                  <div style={{ fontSize: "12px", color: "#8a9e88", marginTop: "-10px", marginBottom: "14px" }}>{"Verificando..."}</div>
                )}
                {dispStatus === "ok" && (
                  <div style={{ fontSize: "12px", color: "#27ae60", marginTop: "-10px", marginBottom: "14px" }}>{"Fechas disponibles"}</div>
                )}
                {dispStatus === "occupied" && (
                  <div style={{ fontSize: "12px", color: "#e63946", marginTop: "-10px", marginBottom: "14px" }}>{"Estas fechas no est\u00e1n disponibles"}</div>
                )}
                <div style={fg}>
                  <label style={lbl}>{"Nombre del cliente *"}</label>
                  <input type="text" style={inp} placeholder={"Nombre completo"} value={guestName} onChange={e => setGuestName(e.target.value)} />
                </div>
                <div style={r2}>
                  <div><label style={lbl}>{"WhatsApp *"}</label><input type="tel" style={inp} placeholder={"+56 9 XXXX XXXX"} value={guestWhatsapp} onChange={e => setGuestWhatsapp(e.target.value)} /></div>
                  <div><label style={lbl}>{"N\u00famero de hu\u00e9spedes"}</label><select style={sel} value={guestCount} onChange={e => setGuestCount(e.target.value)}>{Array.from({ length: selectedCabin?.capacity || 4 }, (_, i) => i + 1).map(n => <option key={n} value={n}>{n} {n === 1 ? "persona" : "personas"}</option>)}</select></div>
                </div>
                <div style={{ ...fg, display: "flex", alignItems: "center", gap: "12px" }}>
                  <input type="checkbox" id="tinaja-m" checked={tinajaUse} onChange={e => setTinajaUse(e.target.checked)} style={{ width: "18px", height: "18px", cursor: "pointer" }} />
                  <label htmlFor="tinaja-m" style={{ ...lbl, marginBottom: "0", cursor: "pointer" }}>{"Tinaja de madera ($30.000/d\u00eda)"}</label>
                  {tinajaUse && <select style={{ ...sel, width: "auto" }} value={tinajaDays} onChange={e => setTinajaDays(e.target.value)}>{Array.from({ length: nights || 7 }, (_, i) => i + 1).map(n => <option key={n} value={n}>{n} {n === 1 ? "d\u00eda" : "d\u00edas"}</option>)}</select>}
                </div>
                <div style={fg}>
                  <label style={lbl}>{"Notas (opcional)"}</label>
                  <input type="text" style={inp} placeholder={"Pago efectivo, llegada tarde, etc."} value={notes} onChange={e => setNotes(e.target.value)} />
                </div>
                {nights > 0 && calc.total > 0 && (
                  <div style={sumBox}>
                    <div style={sumRow}><span>{"Alojamiento"}</span><span>{fmt(calc.subtotal)} ({nights} {nights === 1 ? "noche" : "noches"})</span></div>
                    {calc.extras > 0 && <div style={sumRow}><span>{"Personas extra"}</span><span>{fmt(calc.extras)}</span></div>}
                    {calc.tinaja > 0 && <div style={sumRow}><span>{"Tinaja"}</span><span>{fmt(calc.tinaja)}</span></div>}
                    <div style={sumTotal}><span>{"Total"}</span><span>{fmt(calc.total)}</span></div>
                    <div style={{ ...sumRow, marginTop: "8px", fontSize: "11px", color: "#4a6a48" }}><span>{"Adelanto 20%"}</span><span>{fmt(calc.deposit)}</span></div>
                  </div>
                )}
                <div style={{ display: "flex", gap: "12px", marginTop: "8px" }}>
                  <button style={btnS} onClick={() => { setOpen(false); reset() }}>{"Cancelar"}</button>
                  <button style={(loading || dispStatus !== "ok") ? btnDis : btnOk} onClick={handleSubmit} disabled={loading || dispStatus !== "ok"}>{loading ? "Guardando..." : "Guardar reserva"}</button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
