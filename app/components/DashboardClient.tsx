"use client"

import { useState, useEffect, CSSProperties } from "react"
import FullCalendar from "@fullcalendar/react"
import dayGridPlugin from "@fullcalendar/daygrid"
import interactionPlugin from "@fullcalendar/interaction"
import esLocale from "@fullcalendar/core/locales/es"

const TODAY = new Date().toISOString().split("T")[0]

interface Cabin {
  id: string
  name: string
  capacity: number
  base_price_night: number
}

interface Props {
  cabins: Cabin[]
  tenantId: string
}

function formatCLP(n: number) { return "$" + Math.round(n).toLocaleString("es-CL") }
function formatDate(d: string) { return new Date(d + "T12:00:00").toLocaleDateString("es-CL", { day: "numeric", month: "short" }) }
function parseNotes(notes: string): Record<string,string> {
  const r: Record<string,string> = {}
  if (!notes) return r
  try { return JSON.parse(notes) } catch {}
  notes.split("|").forEach(p => { const i = p.indexOf(":"); if (i > -1) { r[p.slice(0,i).trim()] = p.slice(i+1).trim() } })
  return r
}

function CabinCalendar({ cabin, tenantId }: { cabin: Cabin; tenantId: string }) {
  const [events, setEvents] = useState<any[]>([])
  const [rangeStart, setRangeStart] = useState<string|null>(null)
  const [hoverDate, setHoverDate] = useState<string|null>(null)
  const [modal, setModal] = useState<any>(null)
  const [loadingAction, setLoadingAction] = useState(false)

  async function loadEvents() {
    const res = await fetch("/api/calendar?cabin_id=" + cabin.id)
    const data = await res.json()
    const formatted = (data.events || []).map((e: any) => {
      const endPlusOne = new Date(e.end + "T00:00:00")
      endPlusOne.setDate(endPlusOne.getDate() + 1)
      const color = e.reason === "system_booking" ? "#2e7d32" : e.reason === "transfer_pending" ? "#c0392b" : "#2563eb"
      const title = e.reason === "system_booking" ? "Confirmada" : e.reason === "transfer_pending" ? "Pendiente pago" : "Bloqueado"
      return { id: e.id, title, start: e.start, end: endPlusOne.toISOString().split("T")[0], color, allDay: true, display: "block", extendedProps: { reason: e.reason, booking: e.booking, booking_id: e.booking_id } }
    })
    setEvents(formatted)
  }

  useEffect(() => { loadEvents() }, [cabin.id])

  function isDateBlocked(dateStr: string) {
    return events.some((e: any) => {
      const start = new Date(e.start + "T00:00:00")
      const end = new Date(e.end + "T00:00:00")
      const clicked = new Date(dateStr + "T00:00:00")
      return clicked >= start && clicked < end
    })
  }

  function getPreviewEvents() {
    if (!rangeStart) return []
    const end = hoverDate && hoverDate >= rangeStart ? hoverDate : rangeStart
    const endPlusOne = new Date(end + "T00:00:00")
    endPlusOne.setDate(endPlusOne.getDate() + 1)
    return [{ id: "__preview__", title: "Seleccionado", start: rangeStart, end: endPlusOne.toISOString().split("T")[0], backgroundColor: "rgba(122,184,122,0.25)", borderColor: "#7ab87a", textColor: "#7ab87a", allDay: true, display: "block" }]
  }

  async function deleteBlock(id: string) {
    setLoadingAction(true)
    await fetch("/api/calendar/delete", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ cabin_id: cabin.id, id }) })
    setModal(null); setLoadingAction(false); await loadEvents()
  }

  async function confirmBooking(bookingId: string) {
    setLoadingAction(true)
    await fetch("/api/bookings/confirm", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ booking_id: bookingId, tenant_id: tenantId }) })
    setModal(null); setLoadingAction(false); await loadEvents()
  }

  async function cancelBooking(bookingId: string) {
    if (!confirm("Cancelar esta reserva? Las fechas se liberarán.")) return
    setLoadingAction(true)
    await fetch("/api/bookings/cancel", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ booking_id: bookingId, tenant_id: tenantId }) })
    setModal(null); setLoadingAction(false); await loadEvents()
  }

  async function handleDateClick(info: any) {
    const date = info.dateStr
    if (date < TODAY) { alert("No se pueden modificar fechas pasadas"); return }
    if (isDateBlocked(date)) return
    if (!rangeStart) { setRangeStart(date); setHoverDate(date); return }
    const start = rangeStart < date ? rangeStart : date
    const end = rangeStart < date ? date : rangeStart
    if (!confirm("Bloquear del " + start + " al " + end + "?")) { setRangeStart(null); setHoverDate(null); return }
    const res = await fetch("/api/calendar", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ start_date: start, end_date: end, cabin_id: cabin.id }) })
    const data = await res.json()
    if (data.error) alert("Error: " + data.error)
    setRangeStart(null); setHoverDate(null); await loadEvents()
  }

  function handleEventClick(info: any) {
    if (info.event.id === "__preview__") return
    const props = info.event.extendedProps
    setModal({ id: info.event.id, reason: props.reason, booking: props.booking, booking_id: props.booking_id, start: info.event.startStr, end: info.event.endStr, title: info.event.title })
  }

  function handleMouseEnter(info: any) {
    if (!rangeStart) return
    const date = info.date.toISOString().split("T")[0]
    if (date >= TODAY && !isDateBlocked(date)) setHoverDate(date)
  }

  const cs: Record<string, CSSProperties> = {
    legendWrap: { display: "flex", gap: "12px", marginBottom: "12px", flexWrap: "wrap" },
    legendItem: { display: "flex", alignItems: "center", gap: "5px", fontSize: "11px", color: "#8a9e88" },
    legendDot: { borderRadius: "3px", width: "12px", height: "12px", display: "inline-block", flexShrink: 0 },
    rangeBar: { background: "#162618", border: "1px solid #7ab87a44", borderRadius: "10px", padding: "10px 14px", marginBottom: "12px", fontSize: "13px", color: "#c8d8c0", display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" },
    cancelRangeBtn: { marginLeft: "auto", background: "none", border: "1px solid #2a3e28", borderRadius: "6px", padding: "3px 10px", cursor: "pointer", fontSize: "12px", color: "#8a9e88" },
    overlay: { position: "fixed", inset: "0", background: "rgba(0,0,0,0.65)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: "20px" },
    modal: { background: "#111a11", border: "1px solid #2a3e28", borderRadius: "16px", maxWidth: "400px", width: "100%", maxHeight: "90vh", overflowY: "auto" },
    modalHeader: { padding: "18px 20px", borderBottom: "1px solid #1e2e1e", display: "flex", justifyContent: "space-between", alignItems: "center" },
    modalBody: { padding: "16px 20px" },
    dataBox: { background: "#0d1a12", border: "1px solid #2a3e28", borderRadius: "10px", padding: "12px", marginBottom: "14px" },
    dataRow: { display: "flex", justifyContent: "space-between", fontSize: "12px", padding: "4px 0", borderBottom: "1px solid #ffffff07" },
    dataRowLast: { display: "flex", justifyContent: "space-between", fontSize: "12px", padding: "4px 0" },
    dataKey: { color: "#5a7058" },
    dataVal: { color: "#c8d8c0", fontWeight: 500 },
    moneyRow: { display: "flex", gap: "10px", marginBottom: "14px" },
    moneyBox: { flex: 1, background: "#0d1a12", border: "1px solid #2a3e28", borderRadius: "10px", padding: "10px", textAlign: "center" },
    moneyBoxGreen: { flex: 1, background: "#7ab87a14", border: "1px solid #7ab87a2a", borderRadius: "10px", padding: "10px", textAlign: "center" },
    moneyLabel: { fontSize: "10px", color: "#5a7058", marginBottom: "2px" },
    moneyLabelGreen: { fontSize: "10px", color: "#7ab87a", marginBottom: "2px" },
    moneyVal: { fontFamily: "Georgia, serif", fontSize: "18px", color: "#e8d5a3" },
    moneyValGreen: { fontFamily: "Georgia, serif", fontSize: "18px", color: "#7ab87a" },
    waBtn: { display: "flex", alignItems: "center", justifyContent: "center", gap: "6px", background: "#25d366", color: "white", borderRadius: "10px", padding: "10px 14px", fontSize: "13px", fontWeight: 600, textDecoration: "none", marginBottom: "10px" },
    confirmBtn: { flex: 1, padding: "10px", border: "none", borderRadius: "10px", fontSize: "13px", fontWeight: 700, cursor: "pointer", background: "#27ae60", color: "white" },
    cancelBookBtn: { flex: 1, padding: "10px", border: "1px solid #c0392b44", borderRadius: "10px", fontSize: "12px", fontWeight: 600, cursor: "pointer", background: "transparent", color: "#e67a7a" },
    deleteBtn: { width: "100%", padding: "10px", border: "1px solid #c0392b44", borderRadius: "10px", fontSize: "12px", fontWeight: 600, cursor: "pointer", background: "transparent", color: "#e67a7a", marginBottom: "8px" },
    closeBtn: { width: "100%", padding: "10px", border: "1px solid #2a3e28", borderRadius: "10px", fontSize: "12px", cursor: "pointer", background: "transparent", color: "#5a7058" },
    badge: { fontSize: "10px", padding: "3px 10px", borderRadius: "8px", fontWeight: 600 },
  }

  function renderModal() {
    if (!modal) return null
    const isManual = modal.reason === "manual"
    const isBooking = modal.booking && modal.booking_id
    const isConfirmed = modal.reason === "system_booking"
    const isPending = modal.reason === "transfer_pending"

    if (isManual) return (
      <div style={cs.overlay} onClick={() => setModal(null)}>
        <div style={cs.modal} onClick={e => e.stopPropagation()}>
          <div style={cs.modalHeader}>
            <div>
              <div style={{ fontSize: "10px", letterSpacing: "2px", textTransform: "uppercase", color: "#4a6a48", marginBottom: "4px" }}>Bloqueo manual</div>
              <div style={{ fontFamily: "Georgia, serif", fontSize: "18px", color: "#e8d5a3" }}>Fechas bloqueadas</div>
            </div>
            <div style={{ ...cs.badge, color: "#2563eb", background: "#2563eb20", border: "1px solid #2563eb44" }}>Manual</div>
          </div>
          <div style={cs.modalBody}>
            <div style={cs.dataBox}>
              <div style={cs.dataRow}><span style={cs.dataKey}>Desde</span><span style={cs.dataVal}>{formatDate(modal.start)}</span></div>
              <div style={cs.dataRowLast}><span style={cs.dataKey}>Hasta</span><span style={cs.dataVal}>{modal.end ? formatDate(new Date(new Date(modal.end + "T00:00:00").getTime() - 86400000).toISOString().split("T")[0]) : ""}</span></div>
            </div>
            <button style={cs.deleteBtn} disabled={loadingAction} onClick={() => { if (confirm("Liberar este bloqueo?")) deleteBlock(modal.id) }}>{loadingAction ? "Liberando..." : "Liberar bloqueo"}</button>
            <button style={cs.closeBtn} onClick={() => setModal(null)}>Cerrar</button>
          </div>
        </div>
      </div>
    )

    if (isBooking) {
      const b = modal.booking
      const info = parseNotes(b.notes || "")
      const nombre = info["nombre"] || info["Nombre"] || "Sin nombre"
      const whatsapp = info["whatsapp"] || info["WhatsApp"] || ""
      const emailVal = info["email"] || info["Email"] || ""
      const codigo = info["codigo"] || info["Codigo"] || info["Código"] || ""
      const tinajaDias = parseInt(info["tinaja"] || info["Tinaja"] || "0") || 0
      const phone = whatsapp.replace(/[^0-9+]/g, "")
      return (
        <div style={cs.overlay} onClick={() => setModal(null)}>
          <div style={cs.modal} onClick={e => e.stopPropagation()}>
            <div style={cs.modalHeader}>
              <div>
                <div style={{ fontSize: "10px", letterSpacing: "2px", textTransform: "uppercase", color: "#4a6a48", marginBottom: "4px" }}>Detalle de reserva</div>
                <div style={{ fontFamily: "Georgia, serif", fontSize: "18px", color: "#e8d5a3" }}>{nombre}</div>
              </div>
              {isConfirmed && <div style={{ ...cs.badge, color: "#2e7d32", background: "#2e7d3220", border: "1px solid #2e7d3244" }}>Confirmada</div>}
              {isPending && <div style={{ ...cs.badge, color: "#c0392b", background: "#c0392b20", border: "1px solid #c0392b44" }}>Pendiente</div>}
            </div>
            <div style={cs.modalBody}>
              <div style={cs.dataBox}>
                <div style={cs.dataRow}><span style={cs.dataKey}>Cabaña</span><span style={cs.dataVal}>{cabin.name}</span></div>
                <div style={cs.dataRow}><span style={cs.dataKey}>Fechas</span><span style={cs.dataVal}>{formatDate(modal.start)} → {modal.end ? formatDate(new Date(new Date(modal.end + "T00:00:00").getTime() - 86400000).toISOString().split("T")[0]) : ""}</span></div>
                <div style={cs.dataRow}><span style={cs.dataKey}>Noches</span><span style={cs.dataVal}>{b.nights}</span></div>
                <div style={cs.dataRow}><span style={cs.dataKey}>Personas</span><span style={cs.dataVal}>{b.guests}</span></div>
                {tinajaDias > 0 && <div style={cs.dataRow}><span style={cs.dataKey}>Tinaja</span><span style={cs.dataVal}>{tinajaDias} {tinajaDias === 1 ? "día" : "días"}</span></div>}
                {emailVal && <div style={cs.dataRow}><span style={cs.dataKey}>Correo</span><span style={cs.dataVal}>{emailVal}</span></div>}
                <div style={cs.dataRowLast}><span style={cs.dataKey}>Código</span><span style={{ color: "#7ab87a", fontWeight: 600, fontFamily: "monospace", fontSize: "12px" }}>{codigo}</span></div>
              </div>
              <div style={cs.moneyRow}>
                <div style={cs.moneyBox}><div style={cs.moneyLabel}>Total</div><div style={cs.moneyVal}>{formatCLP(b.total_amount)}</div></div>
                <div style={cs.moneyBoxGreen}><div style={cs.moneyLabelGreen}>Adelanto 20%</div><div style={cs.moneyValGreen}>{formatCLP(b.deposit_amount)}</div></div>
              </div>
              {phone && <a href={"https://wa.me/" + phone.replace("+", "")} target="_blank" rel="noopener noreferrer" style={cs.waBtn}>{"WhatsApp: " + whatsapp}</a>}
              {isPending && (
                <div style={{ display: "flex", gap: "8px", marginBottom: "8px" }}>
                  <button style={cs.confirmBtn} disabled={loadingAction} onClick={() => confirmBooking(modal.booking_id)}>{loadingAction ? "..." : "Confirmar pago"}</button>
                  <button style={cs.cancelBookBtn} disabled={loadingAction} onClick={() => cancelBooking(modal.booking_id)}>{loadingAction ? "..." : "Cancelar"}</button>
                </div>
              )}
              {isConfirmed && (
                <button style={cs.deleteBtn} disabled={loadingAction} onClick={() => { if (confirm("Esta reserva ya está confirmada.
¿Seguro que deseas cancelarla?")) cancelBooking(modal.booking_id) }}>{loadingAction ? "Cancelando..." : "Cancelar reserva confirmada"}</button>
              )}
              <button style={cs.closeBtn} onClick={() => setModal(null)}>Cerrar</button>
            </div>
          </div>
        </div>
      )
    }

    return (
      <div style={cs.overlay} onClick={() => setModal(null)}>
        <div style={cs.modal} onClick={e => e.stopPropagation()}>
          <div style={cs.modalHeader}>
            <div style={{ fontFamily: "Georgia, serif", fontSize: "18px", color: "#e8d5a3" }}>{modal.title}</div>
          </div>
          <div style={cs.modalBody}>
            <div style={cs.dataBox}>
              <div style={cs.dataRow}><span style={cs.dataKey}>Desde</span><span style={cs.dataVal}>{formatDate(modal.start)}</span></div>
              <div style={cs.dataRowLast}><span style={cs.dataKey}>Hasta</span><span style={cs.dataVal}>{modal.end ? formatDate(new Date(new Date(modal.end + "T00:00:00").getTime() - 86400000).toISOString().split("T")[0]) : ""}</span></div>
            </div>
            <button style={cs.deleteBtn} disabled={loadingAction} onClick={() => { if (confirm("Liberar estas fechas?")) deleteBlock(modal.id) }}>{loadingAction ? "Liberando..." : "Liberar fechas"}</button>
            <button style={cs.closeBtn} onClick={() => setModal(null)}>Cerrar</button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div>
      <div style={cs.legendWrap}>
        {[{ color: "#2563eb", label: "Bloqueado manual" }, { color: "#c0392b", label: "Pendiente pago" }, { color: "#2e7d32", label: "Confirmada" }].map(({ color, label }) => (
          <span key={label} style={cs.legendItem}><span style={{ ...cs.legendDot, background: color }} />{label}</span>
        ))}
      </div>
      {rangeStart && (
        <div style={cs.rangeBar}>
          {"Entrada: "}<strong>{rangeStart}</strong>
          {hoverDate && hoverDate !== rangeStart && <>{" → Salida: "}<strong>{hoverDate}</strong></>}
          <button onClick={() => { setRangeStart(null); setHoverDate(null) }} style={cs.cancelRangeBtn}>Cancelar</button>
        </div>
      )}
      <div style={{ fontSize: "12px", color: "#5a7058", marginBottom: "10px" }}>
        {"Toca una fecha libre para marcar entrada. Luego toca la fecha de salida."}
      </div>
      <div className="cal-dark">
        <FullCalendar
          plugins={[dayGridPlugin, interactionPlugin]}
          initialView="dayGridMonth"
          locale={esLocale}
          firstDay={1}
          dateClick={handleDateClick}
          eventClick={handleEventClick}
          dayCellDidMount={(info) => { info.el.addEventListener("mouseenter", () => handleMouseEnter(info)) }}
          events={[...events, ...getPreviewEvents()]}
          height="auto"
          dayMaxEvents={2}
        />
      </div>
      {renderModal()}
    </div>
  )
}

function ManualBookingForm({ cabins, tenantId }: { cabins: Cabin[]; tenantId: string }) {
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
  const selectedCabin = cabins.find(c => c.id === cabinId)

  function calcNights() {
    if (!checkIn || !checkOut) return 0
    const n = Math.round((new Date(checkOut + "T12:00:00").getTime() - new Date(checkIn + "T12:00:00").getTime()) / 86400000)
    return n > 0 ? n : 0
  }

  function calcTotal() {
    const nights = calcNights()
    if (!selectedCabin || nights === 0) return { subtotal: 0, extras: 0, tinaja: 0, total: 0, deposit: 0 }
    const extra = Math.max(0, parseInt(guestCount) - (selectedCabin.capacity - 2))
    const subtotal = selectedCabin.base_price_night * nights
    const extras = extra * 5000 * nights
    const tinaja = tinajaUse ? parseInt(tinajaDays) * 30000 : 0
    const total = subtotal + extras + tinaja
    return { subtotal, extras, tinaja, total, deposit: Math.round(total * 0.2) }
  }

  function resetForm() {
    setCabinId(cabins[0]?.id || ""); setCheckIn(""); setCheckOut(""); setGuestName(""); setGuestWhatsapp(""); setGuestCount("2"); setTinajaUse(false); setTinajaDays("1"); setNotes(""); setError(""); setSuccess(null)
  }

  async function handleSubmit() {
    setError("")
    if (!checkIn || !checkOut || !guestName || !guestWhatsapp) { setError("Por favor completa todos los campos obligatorios."); return }
    if (calcNights() < 1) { setError("Las fechas no son válidas."); return }
    setLoading(true)
    try {
      const res = await fetch("/api/bookings/manual", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ tenant_id: tenantId, cabin_id: cabinId, check_in: checkIn, check_out: checkOut, guest_name: guestName, guest_whatsapp: guestWhatsapp, guests: guestCount, tinaja_days: tinajaUse ? tinajaDays : "0", notes }) })
      const data = await res.json()
      if (!data.success) { setError(data.message || "Error al guardar la reserva.") }
      else { setSuccess({ code: data.booking_code, total: data.total, nights: data.nights }) }
    } catch { setError("Error de conexión.") } finally { setLoading(false) }
  }

  const nights = calcNights()
  const calc = calcTotal()
  const today = new Date().toISOString().split("T")[0]

  const ms: Record<string, CSSProperties> = {
    overlay: { position: "fixed", inset: "0", background: "rgba(0,0,0,0.65)", zIndex: 50, display: "flex", alignItems: "flex-start", justifyContent: "center", overflowY: "auto", padding: "24px 16px" },
    modal: { background: "#111a11", border: "1px solid #2a3e28", borderRadius: "16px", padding: "28px", width: "100%", maxWidth: "540px", boxShadow: "0 20px 60px rgba(0,0,0,0.5)", marginTop: "20px" },
    label: { display: "block", fontSize: "13px", fontWeight: 600, color: "#8a9e88", marginBottom: "6px" },
    input: { width: "100%", padding: "10px 12px", border: "1px solid #2a3e28", borderRadius: "8px", fontSize: "14px", color: "#e8d5a3", background: "#0d1a12", boxSizing: "border-box", outline: "none" },
    select: { width: "100%", padding: "10px 12px", border: "1px solid #2a3e28", borderRadius: "8px", fontSize: "14px", color: "#e8d5a3", background: "#0d1a12", boxSizing: "border-box", outline: "none", cursor: "pointer" },
    row2: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "16px" },
    fieldGroup: { marginBottom: "16px" },
    summaryBox: { background: "#0d1a12", border: "1px solid #7ab87a44", borderRadius: "8px", padding: "16px", marginBottom: "20px" },
    summaryRow: { display: "flex", justifyContent: "space-between", fontSize: "13px", color: "#8a9e88", marginBottom: "6px" },
    summaryTotal: { display: "flex", justifyContent: "space-between", fontSize: "16px", fontWeight: 700, color: "#7ab87a", borderTop: "1px solid #2a3e28", paddingTop: "10px", marginTop: "6px" },
    errorBox: { background: "#3a0d0d", border: "1px solid #c0392b44", borderRadius: "8px", padding: "12px", color: "#e67a7a", fontSize: "14px", marginBottom: "16px" },
    successBox: { background: "#0d1a12", border: "1px solid #7ab87a44", borderRadius: "8px", padding: "20px", textAlign: "center" },
    btnPrimary: { background: "#7ab87a", color: "#0d1a12", border: "none", borderRadius: "8px", padding: "12px 24px", fontSize: "14px", fontWeight: 700, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: "8px" },
    btnSecondary: { background: "transparent", color: "#5a7058", border: "1px solid #2a3e28", borderRadius: "8px", padding: "10px 20px", fontSize: "14px", cursor: "pointer" },
    btnSuccess: { background: "#27ae60", color: "white", border: "none", borderRadius: "8px", padding: "12px 24px", fontSize: "14px", fontWeight: 700, cursor: "pointer", flex: 1 },
    btnDisabled: { background: "#2a3e28", color: "#5a7058", border: "none", borderRadius: "8px", padding: "12px 24px", fontSize: "14px", cursor: "not-allowed", flex: 1 },
  }

  return (
    <div style={{ marginTop: "24px", paddingTop: "24px", borderTop: "1px solid #2a3e28" }}>
      <button style={ms.btnPrimary} onClick={() => setOpen(true)}>
        {"+ Nueva reserva manual"}
      </button>
      {open && (
        <div style={ms.overlay} onClick={e => { if (e.target === e.currentTarget) { setOpen(false); resetForm() } }}>
          <div style={ms.modal}>
            {success ? (
              <div>
                <div style={ms.successBox}>
                  <div style={{ fontSize: "36px" }}>{"✅"}</div>
                  <div style={{ fontSize: "16px", fontWeight: 700, color: "#7ab87a", marginTop: "8px" }}>{"Reserva guardada con éxito"}</div>
                  <div style={{ fontSize: "20px", fontWeight: 700, color: "#e8d5a3", letterSpacing: "2px", margin: "12px 0" }}>{success.code}</div>
                  <div style={{ fontSize: "13px", color: "#5a7058" }}>{success.nights} {success.nights === 1 ? "noche" : "noches"} {"·"} Total: {formatCLP(success.total)}</div>
                  <div style={{ fontSize: "11px", color: "#4a6a48", marginTop: "6px" }}>{"Calendario bloqueado automáticamente"}</div>
                </div>
                <div style={{ marginTop: "16px", display: "flex", gap: "12px" }}>
                  <button style={{ ...ms.btnSecondary, flex: 1 }} onClick={() => resetForm()}>{"Agregar otra"}</button>
                  <button style={{ ...ms.btnPrimary, flex: 1, justifyContent: "center" }} onClick={() => { setOpen(false); resetForm() }}>{"Cerrar"}</button>
                </div>
              </div>
            ) : (
              <>
                <div style={{ fontFamily: "Georgia, serif", fontSize: "20px", color: "#e8d5a3", marginBottom: "6px" }}>{"Nueva reserva manual"}</div>
                <div style={{ fontSize: "12px", color: "#5a7058", marginBottom: "20px" }}>{"Reservas de clientes propios. Sin comisión Takai."}</div>
                {error && <div style={ms.errorBox}>{error}</div>}
                <div style={ms.fieldGroup}>
                  <label style={ms.label}>{"Cabaña"}</label>
                  <select style={ms.select} value={cabinId} onChange={e => setCabinId(e.target.value)}>
                    {cabins.map(c => <option key={c.id} value={c.id}>{c.name} — {formatCLP(c.base_price_night)}/noche</option>)}
                  </select>
                </div>
                <div style={ms.row2}>
                  <div><label style={ms.label}>{"Check-in"}</label><input type="date" style={ms.input} min={today} value={checkIn} onChange={e => { setCheckIn(e.target.value); if (checkOut && e.target.value >= checkOut) setCheckOut("") }} /></div>
                  <div><label style={ms.label}>{"Check-out"}</label><input type="date" style={ms.input} min={checkIn || today} value={checkOut} onChange={e => setCheckOut(e.target.value)} /></div>
                </div>
                <div style={ms.fieldGroup}>
                  <label style={ms.label}>{"Nombre del cliente *"}</label>
                  <input type="text" style={ms.input} placeholder={"Nombre completo"} value={guestName} onChange={e => setGuestName(e.target.value)} />
                </div>
                <div style={ms.row2}>
                  <div><label style={ms.label}>{"WhatsApp *"}</label><input type="tel" style={ms.input} placeholder={"+56 9 XXXX XXXX"} value={guestWhatsapp} onChange={e => setGuestWhatsapp(e.target.value)} /></div>
                  <div><label style={ms.label}>{"Número de huéspedes"}</label><select style={ms.select} value={guestCount} onChange={e => setGuestCount(e.target.value)}>{Array.from({ length: selectedCabin?.capacity || 4 }, (_, i) => i + 1).map(n => <option key={n} value={n}>{n} {n === 1 ? "persona" : "personas"}</option>)}</select></div>
                </div>
                <div style={{ ...ms.fieldGroup, display: "flex", alignItems: "center", gap: "12px" }}>
                  <input type="checkbox" id="tinaja-m" checked={tinajaUse} onChange={e => setTinajaUse(e.target.checked)} style={{ width: "18px", height: "18px", cursor: "pointer" }} />
                  <label htmlFor="tinaja-m" style={{ ...ms.label, marginBottom: "0", cursor: "pointer" }}>{"Tinaja de madera ($30.000/día)"}</label>
                  {tinajaUse && <select style={{ ...ms.select, width: "auto" }} value={tinajaDays} onChange={e => setTinajaDays(e.target.value)}>{Array.from({ length: nights || 7 }, (_, i) => i + 1).map(n => <option key={n} value={n}>{n} {n === 1 ? "día" : "días"}</option>)}</select>}
                </div>
                <div style={ms.fieldGroup}>
                  <label style={ms.label}>{"Notas (opcional)"}</label>
                  <input type="text" style={ms.input} placeholder={"Pago efectivo, llegada tarde, etc."} value={notes} onChange={e => setNotes(e.target.value)} />
                </div>
                {nights > 0 && calc.total > 0 && (
                  <div style={ms.summaryBox}>
                    <div style={ms.summaryRow}><span>{"Alojamiento"}</span><span>{formatCLP(calc.subtotal)} ({nights} {nights === 1 ? "noche" : "noches"})</span></div>
                    {calc.extras > 0 && <div style={ms.summaryRow}><span>{"Personas extra"}</span><span>{formatCLP(calc.extras)}</span></div>}
                    {calc.tinaja > 0 && <div style={ms.summaryRow}><span>{"Tinaja"}</span><span>{formatCLP(calc.tinaja)}</span></div>}
                    <div style={ms.summaryTotal}><span>{"Total"}</span><span>{formatCLP(calc.total)}</span></div>
                    <div style={{ ...ms.summaryRow, marginTop: "8px", fontSize: "11px", color: "#4a6a48" }}><span>{"Adelanto 20%"}</span><span>{formatCLP(calc.deposit)}</span></div>
                  </div>
                )}
                <div style={{ display: "flex", gap: "12px", marginTop: "8px" }}>
                  <button style={ms.btnSecondary} onClick={() => { setOpen(false); resetForm() }}>{"Cancelar"}</button>
                  <button style={loading ? ms.btnDisabled : ms.btnSuccess} onClick={handleSubmit} disabled={loading}>{loading ? "Guardando..." : "Guardar reserva"}</button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default function DashboardClient({ cabins, tenantId }: Props) {
  const [openCabinId, setOpenCabinId] = useState<string | null>(null)

  const s: Record<string, CSSProperties> = {
    page: { background: "#0a0f0a", minHeight: "100vh", color: "#f0ede8", fontFamily: "sans-serif" },
    nav: { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "18px 24px", borderBottom: "1px solid #ffffff0f", background: "#0a1510" },
    logo: { fontFamily: "Georgia, serif", fontSize: "20px", letterSpacing: "3px", color: "#e8d5a3", textTransform: "uppercase" },
    logoSpan: { color: "#7ab87a" },
    body: { padding: "24px 20px", maxWidth: "720px", margin: "0 auto" },
    eyebrow: { fontSize: "10px", letterSpacing: "2.5px", textTransform: "uppercase", color: "#4a6a48", marginBottom: "6px" },
    title: { fontFamily: "Georgia, serif", fontSize: "22px", color: "#e8d5a3", marginBottom: "20px" },
    cabinCard: { background: "#111a11", border: "1px solid #2a3e28", borderRadius: "14px", marginBottom: "16px", overflow: "hidden" },
    cabinHeader: { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "18px 20px", cursor: "pointer" },
    cabinName: { fontFamily: "Georgia, serif", fontSize: "18px", color: "#e8d5a3" },
    cabinMeta: { fontSize: "12px", color: "#5a7058", marginTop: "3px" },
    toggleBtn: { background: "#162618", border: "1px solid #2a3e28", color: "#7ab87a", borderRadius: "8px", padding: "8px 16px", fontSize: "12px", fontWeight: 600, cursor: "pointer" },
    calWrap: { padding: "0 20px 20px" },
  }

  return (
    <div style={s.page}>
      <nav style={s.nav}>
        <div style={s.logo}>Ruka<span style={s.logoSpan}>traro</span></div>
        <div style={{ fontSize: "10px", color: "#5a7058", letterSpacing: "1.5px", textTransform: "uppercase" }}>Panel Propietario</div>
      </nav>
      <div style={s.body}>
        <div style={s.eyebrow}>{"Mis cabañas"}</div>
        <div style={s.title}>{"Bienvenida, Johanna"}</div>
        {cabins.map(cabin => (
          <div key={cabin.id} style={s.cabinCard}>
            <div style={s.cabinHeader} onClick={() => setOpenCabinId(openCabinId === cabin.id ? null : cabin.id)}>
              <div>
                <div style={s.cabinName}>{cabin.name}</div>
                <div style={s.cabinMeta}>{formatCLP(cabin.base_price_night)}/noche {"·"} Cap. {cabin.capacity} personas</div>
              </div>
              <button style={s.toggleBtn}>{openCabinId === cabin.id ? "Cerrar calendario" : "Ver calendario"}</button>
            </div>
            {openCabinId === cabin.id && (
              <div style={s.calWrap}>
                <CabinCalendar cabin={cabin} tenantId={tenantId} />
              </div>
            )}
          </div>
        ))}
        <ManualBookingForm cabins={cabins} tenantId={tenantId} />
      </div>
      <style>{".cal-dark .fc { font-size: 13px; background: #111a11; border-radius: 12px; border: 1px solid #2a3a2a; overflow: hidden; }.cal-dark .fc-theme-standard td, .cal-dark .fc-theme-standard th { border-color: #1e2e1e; }.cal-dark .fc-theme-standard .fc-scrollgrid { border-color: #1e2e1e; }.cal-dark .fc-col-header-cell { background: #162618; }.cal-dark .fc-col-header-cell-cushion { color: #5a7058; font-size: 11px; padding: 8px 4px; text-decoration: none; font-weight: 600; text-transform: uppercase; letter-spacing: 1px; }.cal-dark .fc-daygrid-day-number { font-size: 14px; font-weight: 700; color: #c8d8c0; padding: 6px 8px; text-decoration: none; }.cal-dark .fc-daygrid-day { background: #111a11; }.cal-dark .fc-daygrid-day:hover { background: #1a2a1a; }.cal-dark .fc-day-today { background: #e8d5a30d !important; }.cal-dark .fc-day-today .fc-daygrid-day-number { color: #e8d5a3 !important; }.cal-dark .fc-day-past .fc-daygrid-day-number { color: #3a4a38; }.cal-dark .fc-daygrid-day-frame { min-height: 70px; }.cal-dark .fc-daygrid-event { border-radius: 4px; font-size: 10px; padding: 2px 6px; font-weight: 600; margin-bottom: 1px; border: none !important; cursor: pointer; }.cal-dark .fc-toolbar { padding: 14px 16px; background: #162618; border-bottom: 1px solid #1e2e1e; }.cal-dark .fc-toolbar-title { font-size: 17px; font-weight: 700; color: #e8d5a3; font-family: Georgia, serif; text-transform: capitalize; }.cal-dark .fc-button { font-size: 12px; padding: 6px 14px; background: #0d1a12; border: 1px solid #2a3e28; color: #8a9e88; border-radius: 8px; font-weight: 600; }.cal-dark .fc-button:hover { background: #1a2a1a; color: #c8d8c0; }.cal-dark .fc-day-sun .fc-daygrid-day-number { color: #c0392b !important; font-weight: 700; }"}</style>
    </div>
  )
}