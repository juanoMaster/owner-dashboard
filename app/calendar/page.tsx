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

  if (!cabinId) return <div style={{ padding: "40px", fontFamily: "sans-serif" }}>Cabana no especificada</div>

  return (
    <div style={{ padding: "32px 40px", fontFamily: "sans-serif", maxWidth: "900px" }}>
      <div style={{ marginBottom: "24px" }}>
        <a href={"/?token=" + token} style={{ fontSize: "14px", color: "#555", textDecoration: "none", display: "inline-flex", alignItems: "center", gap: "6px", marginBottom: "16px" }}>
          Volver al panel
        </a>
        <h1 style={{ fontSize: "22px", fontWeight: 500 }}>
          Calendario - {cabinName}
        </h1>
        <p style={{ color: "#888", fontSize: "13px", marginTop: "4px" }}>
          Toca un dia libre para bloquearlo. Toca un dia ocupado para liberarlo.
        </p>
      </div>
      {loading && (
        <div style={{ marginBottom: "12px", padding: "10px 14px", background: "#f5f5f5", borderRadius: "8px", fontSize: "13px", color: "#555" }}>
          Guardando cambio...
        </div>
      )}
      {message && !loading && (
        <div style={{
          marginBottom: "12px", padding: "10px 14px",
          background: message.includes("Error") ? "#FCEBEB" : "#EAF3DE",
          borderRadius: "8px", fontSize: "13px",
          color: message.includes("Error") ? "#A32D2D" : "#27500A",
        }}>
          {message}
        </div>
      )}
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
  )
}

export default function CalendarPage() {
  return (
    <Suspense fallback={<div style={{ padding: "40px", fontFamily: "sans-serif" }}>Cargando...</div>}>
      <CalendarContent />
    </Suspense>
  )
}
