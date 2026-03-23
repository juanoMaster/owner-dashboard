"use client"
import { useState, useEffect, CSSProperties } from "react"
import FullCalendar from "@fullcalendar/react"
import dayGridPlugin from "@fullcalendar/daygrid"
import interactionPlugin from "@fullcalendar/interaction"
import esLocale from "@fullcalendar/core/locales/es"

const TODAY = new Date().toISOString().split("T")[0]

interface Cabin { id: string; name: string; capacity: number; base_price_night: number }
interface Props { cabin: Cabin; tenantId: string }

function fmt(n: number) { return "$" + Math.round(n).toLocaleString("es-CL") }
function fdate(d: string) { return new Date(d + "T12:00:00").toLocaleDateString("es-CL", { day: "numeric", month: "short" }) }
function parseNotes(notes: string): Record<string,string> {
  if (!notes) return {}
  try { return JSON.parse(notes) } catch {}
  const r: Record<string,string> = {}
  notes.split("|").forEach(p => { const i = p.indexOf(":"); if (i > -1) r[p.slice(0,i).trim()] = p.slice(i+1).trim() })
  return r
}

export default function CabinCalendar({ cabin, tenantId }: Props) {
  const [events, setEvents] = useState<any[]>([])
  const [rangeStart, setRangeStart] = useState<string|null>(null)
  const [hoverDate, setHoverDate] = useState<string|null>(null)
  const [modal, setModal] = useState<any>(null)
  const [busy, setBusy] = useState(false)

  async function loadEvents() {
    const res = await fetch("/api/calendar?cabin_id=" + cabin.id)
    const data = await res.json()
    setEvents((data.events || []).map((e: any) => {
      const ep1 = new Date(e.end + "T00:00:00"); ep1.setDate(ep1.getDate() + 1)
      const color = e.reason === "system_booking" ? "#2e7d32" : e.reason === "transfer_pending" ? "#c0392b" : "#2563eb"
      const title = e.reason === "system_booking" ? "Confirmada" : e.reason === "transfer_pending" ? "Pendiente pago" : "Bloqueado"
      return { id: e.id, title, start: e.start, end: ep1.toISOString().split("T")[0], color, allDay: true, display: "block", extendedProps: { reason: e.reason, booking: e.booking, booking_id: e.booking_id } }
    }))
  }

  useEffect(() => { loadEvents() }, [cabin.id])

  function isBlocked(d: string) {
    return events.some(e => new Date(d + "T00:00:00") >= new Date(e.start + "T00:00:00") && new Date(d + "T00:00:00") < new Date(e.end + "T00:00:00"))
  }

  function previewEvents() {
    if (!rangeStart) return []
    const end = hoverDate && hoverDate >= rangeStart ? hoverDate : rangeStart
    const ep1 = new Date(end + "T00:00:00"); ep1.setDate(ep1.getDate() + 1)
    return [{ id: "__preview__", title: "Seleccionado", start: rangeStart, end: ep1.toISOString().split("T")[0], backgroundColor: "rgba(122,184,122,0.25)", borderColor: "#7ab87a", textColor: "#7ab87a", allDay: true, display: "block" }]
  }

  async function delBlock(id: string) {
    setBusy(true)
    await fetch("/api/calendar/delete", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ cabin_id: cabin.id, id }) })
    setModal(null); setBusy(false); loadEvents()
  }

  async function confirmBook(bookingId: string) {
    setBusy(true)
    await fetch("/api/bookings/confirm", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ booking_id: bookingId, tenant_id: tenantId }) })
    setModal(null); setBusy(false); loadEvents()
  }

  async function cancelBook(bookingId: string) {
    if (!confirm("Cancelar esta reserva?")) return
    setBusy(true)
    await fetch("/api/bookings/cancel", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ booking_id: bookingId, tenant_id: tenantId }) })
    setModal(null); setBusy(false); loadEvents()
  }

  async function handleDateClick(info: any) {
    const date = info.dateStr
    if (date < TODAY) { alert("No se pueden modificar fechas pasadas"); return }
    if (isBlocked(date)) return
    if (!rangeStart) { setRangeStart(date); setHoverDate(date); return }
    const start = rangeStart < date ? rangeStart : date
    const end = rangeStart < date ? date : rangeStart
    if (!confirm("Bloquear del " + start + " al " + end + "?")) { setRangeStart(null); setHoverDate(null); return }
    const res = await fetch("/api/calendar", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ start_date: start, end_date: end, cabin_id: cabin.id }) })
    const data = await res.json()
    if (data.error) alert("Error: " + data.error)
    setRangeStart(null); setHoverDate(null); loadEvents()
  }

  function handleEventClick(info: any) {
    if (info.event.id === "__preview__") return
    const p = info.event.extendedProps
    setModal({ id: info.event.id, reason: p.reason, booking: p.booking, booking_id: p.booking_id, start: info.event.startStr, end: info.event.endStr, title: info.event.title })
  }

  function handleMouseEnter(info: any) {
    if (!rangeStart) return
    const d = info.date.toISOString().split("T")[0]
    if (d >= TODAY && !isBlocked(d)) setHoverDate(d)
  }

  const ov: CSSProperties = { position: "fixed", inset: "0", background: "rgba(0,0,0,0.65)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: "20px" }
  const md: CSSProperties = { background: "#111a11", border: "1px solid #2a3e28", borderRadius: "16px", maxWidth: "400px", width: "100%", maxHeight: "90vh", overflowY: "auto" }
  const mh: CSSProperties = { padding: "18px 20px", borderBottom: "1px solid #1e2e1e", display: "flex", justifyContent: "space-between", alignItems: "center" }
  const mb: CSSProperties = { padding: "16px 20px" }
  const db: CSSProperties = { background: "#0d1a12", border: "1px solid #2a3e28", borderRadius: "10px", padding: "12px", marginBottom: "14px" }
  const dr: CSSProperties = { display: "flex", justifyContent: "space-between", fontSize: "12px", padding: "4px 0", borderBottom: "1px solid #ffffff07" }
  const drl: CSSProperties = { display: "flex", justifyContent: "space-between", fontSize: "12px", padding: "4px 0" }
  const dk: CSSProperties = { color: "#5a7058" }
  const dv: CSSProperties = { color: "#c8d8c0", fontWeight: 500 }
  const mr: CSSProperties = { display: "flex", gap: "10px", marginBottom: "14px" }
  const mbx: CSSProperties = { flex: 1, background: "#0d1a12", border: "1px solid #2a3e28", borderRadius: "10px", padding: "10px", textAlign: "center" }
  const mbxg: CSSProperties = { flex: 1, background: "#7ab87a14", border: "1px solid #7ab87a2a", borderRadius: "10px", padding: "10px", textAlign: "center" }
  const delBtn: CSSProperties = { width: "100%", padding: "10px", border: "1px solid #c0392b44", borderRadius: "10px", fontSize: "12px", fontWeight: 600, cursor: "pointer", background: "transparent", color: "#e67a7a", marginBottom: "8px" }
  const closeBtn: CSSProperties = { width: "100%", padding: "10px", border: "1px solid #2a3e28", borderRadius: "10px", fontSize: "12px", cursor: "pointer", background: "transparent", color: "#5a7058" }
  const badge: CSSProperties = { fontSize: "10px", padding: "3px 10px", borderRadius: "8px", fontWeight: 600 }
  const waBtn: CSSProperties = { display: "flex", alignItems: "center", justifyContent: "center", gap: "6px", background: "#25d366", color: "white", borderRadius: "10px", padding: "10px 14px", fontSize: "13px", fontWeight: 600, textDecoration: "none", marginBottom: "10px" }

  function Modal() {
    if (!modal) return null
    const endDisplay = modal.end ? fdate(new Date(new Date(modal.end + "T00:00:00").getTime() - 86400000).toISOString().split("T")[0]) : ""

    if (modal.reason === "manual") {
      return (
        <div style={ov} onClick={() => setModal(null)}>
          <div style={md} onClick={e => e.stopPropagation()}>
            <div style={mh}>
              <div>
                <div style={{ fontSize: "10px", letterSpacing: "2px", textTransform: "uppercase" as const, color: "#4a6a48", marginBottom: "4px" }}>Bloqueo manual</div>
                <div style={{ fontFamily: "Georgia, serif", fontSize: "18px", color: "#e8d5a3" }}>Fechas bloqueadas</div>
              </div>
              <div style={{ ...badge, color: "#2563eb", background: "#2563eb20", border: "1px solid #2563eb44" }}>Manual</div>
            </div>
            <div style={mb}>
              <div style={db}>
                <div style={dr}><span style={dk}>Desde</span><span style={dv}>{fdate(modal.start)}</span></div>
                <div style={drl}><span style={dk}>Hasta</span><span style={dv}>{endDisplay}</span></div>
              </div>
              <button style={delBtn} disabled={busy} onClick={() => { if (confirm("Liberar este bloqueo?")) delBlock(modal.id) }}>{busy ? "..." : "Liberar bloqueo"}</button>
              <button style={closeBtn} onClick={() => setModal(null)}>Cerrar</button>
            </div>
          </div>
        </div>
      )
    }

    if (modal.booking && modal.booking_id) {
      const b = modal.booking
      const info = parseNotes(b.notes || "")
      const nombre = info["nombre"] || info["Nombre"] || "Sin nombre"
      const whatsapp = info["whatsapp"] || info["WhatsApp"] || ""
      const emailVal = info["email"] || info["Email"] || ""
      const codigo = info["codigo"] || info["Codigo"] || ""
      const tinajaDias = parseInt(info["tinaja"] || info["Tinaja"] || "0") || 0
      const phone = whatsapp.replace(/[^0-9+]/g, "")
      const isConfirmed = modal.reason === "system_booking"
      const isPending = modal.reason === "transfer_pending"
      return (
        <div style={ov} onClick={() => setModal(null)}>
          <div style={md} onClick={e => e.stopPropagation()}>
            <div style={mh}>
              <div>
                <div style={{ fontSize: "10px", letterSpacing: "2px", textTransform: "uppercase" as const, color: "#4a6a48", marginBottom: "4px" }}>Detalle de reserva</div>
                <div style={{ fontFamily: "Georgia, serif", fontSize: "18px", color: "#e8d5a3" }}>{nombre}</div>
              </div>
              {isConfirmed && <div style={{ ...badge, color: "#2e7d32", background: "#2e7d3220", border: "1px solid #2e7d3244" }}>Confirmada</div>}
              {isPending && <div style={{ ...badge, color: "#c0392b", background: "#c0392b20", border: "1px solid #c0392b44" }}>Pendiente</div>}
            </div>
            <div style={mb}>
              <div style={db}>
                <div style={dr}><span style={dk}>{"Caba\u00f1a"}</span><span style={dv}>{cabin.name}</span></div>
                <div style={dr}><span style={dk}>Fechas</span><span style={dv}>{fdate(modal.start)} {"\u2192"} {endDisplay}</span></div>
                <div style={dr}><span style={dk}>Noches</span><span style={dv}>{b.nights}</span></div>
                <div style={dr}><span style={dk}>Personas</span><span style={dv}>{b.guests}</span></div>
                {tinajaDias > 0 && <div style={dr}><span style={dk}>Tinaja</span><span style={dv}>{tinajaDias} {tinajaDias === 1 ? "d\u00eda" : "d\u00edas"}</span></div>}
                {emailVal && <div style={dr}><span style={dk}>Correo</span><span style={dv}>{emailVal}</span></div>}
                <div style={drl}><span style={dk}>{"C\u00f3digo"}</span><span style={{ color: "#7ab87a", fontWeight: 600, fontFamily: "monospace", fontSize: "12px" }}>{codigo}</span></div>
              </div>
              <div style={mr}>
                <div style={mbx}><div style={{ fontSize: "10px", color: "#5a7058", marginBottom: "2px" }}>Total</div><div style={{ fontFamily: "Georgia, serif", fontSize: "18px", color: "#e8d5a3" }}>{fmt(b.total_amount)}</div></div>
                <div style={mbxg}><div style={{ fontSize: "10px", color: "#7ab87a", marginBottom: "2px" }}>Adelanto 20%</div><div style={{ fontFamily: "Georgia, serif", fontSize: "18px", color: "#7ab87a" }}>{fmt(b.deposit_amount)}</div></div>
              </div>
              {phone && <a href={"https://wa.me/" + phone.replace("+", "")} target="_blank" rel="noopener noreferrer" style={waBtn}>{"WhatsApp: " + whatsapp}</a>}
              {isPending && (
                <div style={{ display: "flex", gap: "8px", marginBottom: "8px" }}>
                  <button style={{ flex: 1, padding: "10px", border: "none", borderRadius: "10px", fontSize: "13px", fontWeight: 700, cursor: "pointer", background: "#27ae60", color: "white" }} disabled={busy} onClick={() => confirmBook(modal.booking_id)}>{busy ? "..." : "Confirmar pago"}</button>
                  <button style={{ flex: 1, padding: "10px", border: "1px solid #c0392b44", borderRadius: "10px", fontSize: "12px", cursor: "pointer", background: "transparent", color: "#e67a7a" }} disabled={busy} onClick={() => cancelBook(modal.booking_id)}>{busy ? "..." : "Cancelar"}</button>
                </div>
              )}
              {isConfirmed && <button style={delBtn} disabled={busy} onClick={() => { if (confirm("Esta reserva ya est\u00e1 confirmada. \u00bfSeguro?")) cancelBook(modal.booking_id) }}>{busy ? "..." : "Cancelar reserva confirmada"}</button>}
              <button style={closeBtn} onClick={() => setModal(null)}>Cerrar</button>
            </div>
          </div>
        </div>
      )
    }

    return (
      <div style={ov} onClick={() => setModal(null)}>
        <div style={md} onClick={e => e.stopPropagation()}>
          <div style={mh}><div style={{ fontFamily: "Georgia, serif", fontSize: "18px", color: "#e8d5a3" }}>{modal.title}</div></div>
          <div style={mb}>
            <div style={db}>
              <div style={dr}><span style={dk}>Desde</span><span style={dv}>{fdate(modal.start)}</span></div>
              <div style={drl}><span style={dk}>Hasta</span><span style={dv}>{endDisplay}</span></div>
            </div>
            <button style={delBtn} disabled={busy} onClick={() => { if (confirm("Liberar estas fechas?")) delBlock(modal.id) }}>{busy ? "..." : "Liberar fechas"}</button>
            <button style={closeBtn} onClick={() => setModal(null)}>Cerrar</button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div>
      <div style={{ display: "flex", gap: "12px", marginBottom: "12px", flexWrap: "wrap" as const }}>
        {[{ color: "#2563eb", label: "Bloqueado manual" }, { color: "#c0392b", label: "Pendiente pago" }, { color: "#2e7d32", label: "Confirmada" }].map(({ color, label }) => (
          <span key={label} style={{ display: "flex", alignItems: "center", gap: "5px", fontSize: "11px", color: "#8a9e88" }}>
            <span style={{ borderRadius: "3px", width: "12px", height: "12px", display: "inline-block", background: color }} />
            {label}
          </span>
        ))}
      </div>
      {rangeStart && (
        <div style={{ background: "#162618", border: "1px solid #7ab87a44", borderRadius: "10px", padding: "10px 14px", marginBottom: "12px", fontSize: "13px", color: "#c8d8c0", display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" as const }}>
          {"Entrada: "}<strong>{rangeStart}</strong>
          {hoverDate && hoverDate !== rangeStart && <>{" \u2192 Salida: "}<strong>{hoverDate}</strong></>}
          <button onClick={() => { setRangeStart(null); setHoverDate(null) }} style={{ marginLeft: "auto", background: "none", border: "1px solid #2a3e28", borderRadius: "6px", padding: "3px 10px", cursor: "pointer", fontSize: "12px", color: "#8a9e88" }}>Cancelar</button>
        </div>
      )}
      <div style={{ fontSize: "12px", color: "#5a7058", marginBottom: "10px" }}>{"Toca una fecha libre para marcar entrada. Luego toca la fecha de salida."}</div>
      <div className="cal-dark">
        <FullCalendar
          plugins={[dayGridPlugin, interactionPlugin]}
          initialView="dayGridMonth"
          locale={esLocale}
          firstDay={1}
          dateClick={handleDateClick}
          eventClick={handleEventClick}
          dayCellDidMount={(info) => { info.el.addEventListener("mouseenter", () => handleMouseEnter(info)) }}
          events={[...events, ...previewEvents()]}
          height="auto"
          dayMaxEvents={2}
        />
      </div>
      <Modal />
    </div>
  )
}
