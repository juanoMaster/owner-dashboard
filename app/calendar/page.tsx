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
  const [cabinName, setCabinName] = useState<string>("Cabaña")
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<string>("")

  function findEventForDate(dateStr: string) {
    const clicked = new Date(dateStr + "T00:00:00")
    return events.find((e: any) => {
      const start = new Date(e.start)
      const end = new Date(e.end)
      return clicked >= start && clicked < end
    })
  }

  async function loadEvents() {
    if (!cabinId) return
    const res = await fetch("/api/calendar?cabin_id=" + cabinId)
    const data = await res.json()
    if (data.cabin_name) setCabinName(data.cabin_name)
    const list = data.events || []
    const eventsFormatted = list.map((e: any) => {
      const endDate = new Date(e.end + "T00:00:00")
      endDate.setDate(endDate.getDate() + 1)
      return {
        id: e.id,
        title: "Ocupado",
        start: e.start,
        end: endDate.toISOString().split("T")[0],
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
    const existing = findEventForDate(date)
    if (existing) {
      if (!confirm("¿Liberar este día?")) return
      setLoading(true); setMessage("")
      const res = await fetch("/api/calendar/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cabin_id: cabinId, id: existing.id }),
      })
      const data = await res.json()
      setLoading(false)
      setMessage(data.success ? "Día liberado correctamente" : "Error al liberar el día.")
      if (data.success) await loadEvents()
      return
    }
    if (!confirm("¿Marcar este día como ocupado?")) return
    setLoading(true); setMessage("")
    const res = await fetch("/api/calendar", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ date, cabin_id: cabinId }),
    })
    const data = await res.json()
    setLoading(false)
    setMessage(data.success ? "Día marcado como ocupado" : "Error al bloquear el día.")
    if (data.success) await loadEvents()
  }

  async function handleEventClick(info: any) {
    if (!confirm("¿Liberar este día?")) return
    setLoading(true); setMessage("")
    const res = await fetch("/api/calendar/delete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cabin_id: cabinId, id: info.event.id }),
    })
    const data = await res.json()
    setLoading(false)
    setMessage(data.success ? "Día liberado correctamente" : "Error al liberar el día.")
    if (data.success) await loadEvents()
  }

  if (!cabinId) return <div style={{ padding: "40px", fontFamily: "sans-serif" }}>Cabaña no especificada</div>

  return (
    <div style={{ padding: "32px 40px", fontFamily: "sans-serif", maxWidth: "900px" }}>
      <div style={{ marginBottom: "24px" }}>
        <a href={"/?token=" + token} style={{ fontSize: "14px", color: "#555", textDecoration: "none", display: "inline-flex", alignItems: "center", gap: "6px", marginBottom: "16px" }}>
          ← Volver al panel
        </a>
        <h1 style={{ fontSize: "22px", fontWeight: 500 }}>
          Calendario — {cabinName}
        </h1>
        <p style={{ color: "#888", fontSize: "13px", marginTop: "4px" }}>
          Toca un día libre para bloquearlo. Toca un día ocupado para liberarlo.
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