"use client"

import { useEffect, useState, Suspense } from "react"
import { useSearchParams } from "next/navigation"
import FullCalendar from "@fullcalendar/react"
import dayGridPlugin from "@fullcalendar/daygrid"
import interactionPlugin from "@fullcalendar/interaction"
import esLocale from "@fullcalendar/core/locales/es"

function CalendarContent() {
  const searchParams = useSearchParams()
  const cabinId = searchParams.get("cabin_id") || ""
  const token = searchParams.get("token") || ""
  const [events, setEvents] = useState<any[]>([])
  const [cabinName, setCabinName] = useState<string>("Cabana")
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<string>("")

  async function loadEvents() {
    if (!cabinId) return
    const res = await fetch("/api/calendar?cabin_id=" + cabinId)
    const data = await res.json()
    if (data.cabin_name) setCabinName(data.cabin_name)
    const list = data.events || []
    const eventsFormatted = list.map((e: any) => {
      const d = new Date(e.end + "T12:00:00")
      d.setDate(d.getDate() + 1)
      return {
        id: e.id,
        title: "Ocupado",
        start: e.start,
        end: d.toISOString().split("T")[0],
        color: "#e63946",
        allDay: true,
        display: "block",
      }
    })
    setEvents(eventsFormatted)
  }

  useEffect(() => { loadEvents() }, [cabinId])

  async function handleDateClick(info: any) {
    const date = info.dateStr
    const today = new Date().toISOString().split("T")[0]
    if (date < today) { alert("No se pueden modificar fechas pasadas"); return }
    if (!confirm("Marcar este dia como ocupado?")) return
    setLoading(true); setMessage("")
    const res = await fetch("/api/calendar", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ date, cabin_id: cabinId }),
    })
    const data = await res.json()
    setLoading(false)
    setMessage(data.success ? "Dia marcado como ocupado" : "Error al bloquear el dia.")
    if (data.success) await loadEvents()
  }

  async function handleEventClick(info: any) {
    const start = info.event.startStr
    const endExclusive = info.event.end
    const endStr = endExclusive
      ? new Date(endExclusive.getTime() - 86400000).toISOString().split("T")[0]
      : start
    const rangeText = start === endStr ? start : start + " al " + endStr
    if (!confirm("Liberar fechas bloqueadas: " + rangeText + "?")) return
    setLoading(true); setMessage("")
    const res = await fetch("/api/calendar/delete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cabin_id: cabinId, id: info.event.id }),
    })
    const data = await res.json()
    setLoading(false)
    setMessage(data.success ? "Fechas liberadas correctamente" : "Error al liberar las fechas.")
    if (data.success) await loadEvents()
  }

  if (!cabinId) return (
    <div style={{ background: "#0d1a12", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", color: "#5a7058", fontFamily: "sans-serif" }}>
      Cabana no especificada
    </div>
  )

  return (
    <div style={{ background: "#0d1a12", minHeight: "100vh", fontFamily: "sans-serif", color: "#f0ede8" }}>
      <style>{`
        .fc { --fc-border-color: #2a3e28; --fc-today-bg-color: #7ab87a18; --fc-neutral-bg-color: #162618; --fc-list-event-hover-bg-color: #162618; color: #c8d8c0; }
        .fc .fc-toolbar-title { color: #e8d5a3; font-family: Georgia, serif; font-size: 18px; }
        .fc .fc-button { background: #162618 !important; border-color: #2a3e28 !important; color: #8a9e88 !important; font-size: 12px !important; }
        .fc .fc-button:hover { background: #1e3020 !important; color: #c8d8c0 !important; }
        .fc .fc-button-primary:not(:disabled).fc-button-active { background: #7ab87a !important; border-color: #7ab87a !important; color: #0d1a12 !important; }
        .fc .fc-col-header-cell { background: #0a1510; }
        .fc .fc-col-header-cell-cushion { color: #5a7058; font-size: 11px; letter-spacing: 1px; text-transform: uppercase; text-decoration: none; }
        .fc .fc-daygrid-day-number { color: #8a9e88; text-decoration: none; font-size: 13px; }
        .fc .fc-day-today .fc-daygrid-day-number { color: #7ab87a; font-weight: 700; }
        .fc .fc-daygrid-day:hover { background: #162618 !important; }
        .fc-theme-standard td, .fc-theme-standard th { border-color: #2a3e28; }
        .fc-theme-standard .fc-scrollgrid { border-color: #2a3e28; }
        .fc .fc-daygrid-body { background: #0d1a12; }
      `}</style>

      {/* Nav */}
      <nav style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "18px 24px", borderBottom: "1px solid #ffffff0f", background: "#0a1510" }}>
        <div style={{ fontFamily: "Georgia,serif", fontSize: "18px", letterSpacing: "3px", color: "#e8d5a3", textTransform: "uppercase" }}>
          RUKA <span style={{ color: "#7ab87a" }}>TRARO</span>
        </div>
        <a
          href={"/?token=" + token}
          style={{ background: "transparent", border: "1px solid #2a3e28", color: "#8a9e88", fontSize: "12px", padding: "7px 16px", borderRadius: "20px", cursor: "pointer", textDecoration: "none", letterSpacing: "0.5px" }}
        >
          ← Volver al panel
        </a>
      </nav>

      <div style={{ padding: "24px 20px", maxWidth: "900px", margin: "0 auto" }}>
        <div style={{ marginBottom: "20px" }}>
          <div style={{ fontSize: "10px", letterSpacing: "2px", textTransform: "uppercase", color: "#7ab87a", marginBottom: "6px" }}>
            Calendario
          </div>
          <h1 style={{ fontFamily: "Georgia,serif", fontSize: "24px", color: "#e8d5a3", margin: 0 }}>
            {cabinName}
          </h1>
          <p style={{ color: "#5a7058", fontSize: "12px", marginTop: "6px", letterSpacing: "0.5px" }}>
            Toca un día libre para bloquearlo · Toca un día ocupado para liberarlo
          </p>
        </div>

        {loading && (
          <div style={{ marginBottom: "14px", padding: "12px 16px", background: "#162618", border: "1px solid #2a3e28", borderRadius: "10px", fontSize: "13px", color: "#8a9e88" }}>
            Guardando cambio...
          </div>
        )}
        {message && !loading && (
          <div style={{
            marginBottom: "14px", padding: "12px 16px",
            background: message.includes("Error") ? "#e6394615" : "#7ab87a18",
            border: message.includes("Error") ? "1px solid #e6394633" : "1px solid #7ab87a33",
            borderRadius: "10px", fontSize: "13px",
            color: message.includes("Error") ? "#e67a7a" : "#7ab87a",
          }}>
            {message}
          </div>
        )}

        <div style={{ background: "#162618", border: "1px solid #2a3e28", borderRadius: "16px", padding: "20px" }}>
          <FullCalendar
            plugins={[dayGridPlugin, interactionPlugin]}
            initialView="dayGridMonth"
            locale={esLocale}
            dateClick={handleDateClick}
            eventClick={handleEventClick}
            events={events}
            height="auto"
          />
        </div>
      </div>
    </div>
  )
}

export default function CalendarPage() {
  return (
    <Suspense fallback={
      <div style={{ background: "#0d1a12", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", color: "#5a7058", fontFamily: "sans-serif" }}>
        Cargando...
      </div>
    }>
      <CalendarContent />
    </Suspense>
  )
}
