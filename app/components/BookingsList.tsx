"use client"

import { useState } from "react"

interface Booking {
  id: string
  cabin_id: string
  check_in: string
  check_out: string
  nights: number
  total_amount: number
  deposit_amount: number
  balance_amount: number
  notes: string
  created_at: string
}

interface Cabin {
  id: string
  name: string
}

function parseNotes(notes: string): Record<string, string> {
  const result: Record<string, string> = {}
  if (!notes) return result
  notes.split("|").forEach((part) => {
    const idx = part.indexOf(":")
    if (idx > -1) {
      const key = part.slice(0, idx).trim()
      const val = part.slice(idx + 1).trim()
      if (key && val) result[key] = val
    }
  })
  return result
}

function fmt(n: number): string {
  return "$" + Math.round(n).toLocaleString("es-CL")
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + "T12:00:00")
  return d.toLocaleDateString("es-CL", { day: "numeric", month: "short" })
}

function cleanPhone(phone: string): string {
  return phone.replace(/[^0-9+]/g, "")
}

const st = {
  section: { marginTop: "32px" },
  title: { fontSize: "18px", fontWeight: "700" as const, marginBottom: "16px" },
  empty: { color: "#999", fontSize: "14px", textAlign: "center" as const, padding: "24px", background: "#f9f9f9", borderRadius: "12px" },
  card: { border: "1px solid #e0e0e0", borderRadius: "12px", padding: "16px", marginBottom: "12px", background: "#fff", boxShadow: "0 1px 4px rgba(0,0,0,0.06)" },
  code: { fontSize: "12px", color: "#888", marginBottom: "8px" },
  name: { fontSize: "16px", fontWeight: "700" as const, marginBottom: "4px" },
  cabin: { fontSize: "13px", color: "#666", marginBottom: "8px" },
  dates: { fontSize: "14px", color: "#333", marginBottom: "4px" },
  money: { fontSize: "14px", color: "#333", marginBottom: "4px" },
  deposit: { fontSize: "14px", fontWeight: "600" as const, color: "#c0392b", marginBottom: "12px" },
  whatsapp: { display: "inline-block" as const, background: "#25d366", color: "white", borderRadius: "6px", padding: "6px 14px", fontSize: "13px", fontWeight: "600" as const, textDecoration: "none", marginBottom: "12px" },
  actions: { display: "flex" as const, gap: "8px", marginTop: "8px" },
  btnConfirm: { flex: 1, padding: "10px", border: "none", borderRadius: "8px", fontSize: "14px", fontWeight: "600" as const, cursor: "pointer", background: "#27ae60", color: "white" },
  btnCancel: { flex: 1, padding: "10px", border: "1px solid #e74c3c", borderRadius: "8px", fontSize: "14px", fontWeight: "600" as const, cursor: "pointer", background: "white", color: "#e74c3c" },
  btnDisabled: { opacity: 0.5, cursor: "not-allowed" as const },
}

export default function BookingsList({ bookings: initial, cabins, tenantId }: { bookings: Booking[]; cabins: Cabin[]; tenantId: string }) {
  const [bookings, setBookings] = useState(initial)
  const [loadingId, setLoadingId] = useState<string | null>(null)

  const cabinMap: Record<string, string> = {}
  cabins.forEach((c) => { cabinMap[c.id] = c.name })

  async function handleConfirm(id: string) {
    if (!confirm("Confirmar esta reserva? El turista queda confirmado y las fechas pasan a verde.")) return
    setLoadingId(id)
    try {
      const res = await fetch("/api/bookings/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ booking_id: id, tenant_id: tenantId }),
      })
      if (res.ok) {
        setBookings((prev) => prev.filter((b) => b.id !== id))
      } else {
        alert("Error al confirmar la reserva")
      }
    } catch (e) {
      alert("Error de conexion")
    }
    setLoadingId(null)
  }

  async function handleCancel(id: string) {
    if (!confirm("Cancelar esta reserva? Las fechas se liberaran en el calendario.")) return
    setLoadingId(id)
    try {
      const res = await fetch("/api/bookings/cancel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ booking_id: id, tenant_id: tenantId }),
      })
      if (res.ok) {
        setBookings((prev) => prev.filter((b) => b.id !== id))
      } else {
        alert("Error al cancelar la reserva")
      }
    } catch (e) {
      alert("Error de conexion")
    }
    setLoadingId(null)
  }

  return (
    <div style={st.section}>
      <div style={st.title}>Reservas pendientes ({bookings.length})</div>
      {bookings.length === 0 ? (
        <div style={st.empty}>No hay reservas pendientes por confirmar</div>
      ) : (
        bookings.map((b) => {
          const info = parseNotes(b.notes || "")
          const nombre = info["Nombre"] || "Sin nombre"
          const whatsapp = info["WhatsApp"] || ""
          const codigo = info["Codigo"] || info["C\u00f3digo"] || ""
          const tinaja = info["Tinaja"] || ""
          const isLoading = loadingId === b.id
          const phone = cleanPhone(whatsapp)

          return (
            <div key={b.id} style={st.card}>
              {codigo && <div style={st.code}>{codigo}</div>}
              <div style={st.name}>{nombre}</div>
              <div style={st.cabin}>{cabinMap[b.cabin_id] || "Caba\u00f1a"}</div>
              <div style={st.dates}>
                {formatDate(b.check_in)} &#8594; {formatDate(b.check_out)} ({b.nights} noches)
              </div>
              <div style={st.money}>Total: {fmt(b.total_amount)}</div>
              <div style={st.deposit}>Adelanto a verificar: {fmt(b.deposit_amount)}</div>
              {tinaja && tinaja !== "0" && (
                <div style={{ fontSize: "13px", color: "#666", marginBottom: "8px" }}>Tinaja: {tinaja}</div>
              )}
              {phone && (
                <div style={{ marginBottom: "12px" }}>
                  <a href={"https://wa.me/" + phone.replace("+", "")} target="_blank" rel="noopener noreferrer" style={st.whatsapp}>
                    WhatsApp: {whatsapp}
                  </a>
                </div>
              )}
              <div style={st.actions}>
                <button onClick={() => handleConfirm(b.id)} disabled={isLoading} style={{ ...st.btnConfirm, ...(isLoading ? st.btnDisabled : {}) }}>
                  {isLoading ? "..." : "Confirmar pago"}
                </button>
                <button onClick={() => handleCancel(b.id)} disabled={isLoading} style={{ ...st.btnCancel, ...(isLoading ? st.btnDisabled : {}) }}>
                  {isLoading ? "..." : "Cancelar"}
                </button>
              </div>
            </div>
          )
        })
      )}
    </div>
  )
}