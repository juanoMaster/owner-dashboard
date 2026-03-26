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
  notes: string | Record<string, string> | null
  created_at: string
}

interface Cabin {
  id: string
  name: string
}

function parseNotes(notes: any): Record<string, string> {
  const result: Record<string, string> = {}
  if (!notes) return result

  // Supabase puede devolver JSONB como objeto JS, o la API puede guardar JSON.stringify
  const obj: Record<string, string> | null =
    typeof notes === "object"
      ? notes
      : typeof notes === "string" && notes.trimStart().startsWith("{")
        ? (() => { try { return JSON.parse(notes) } catch { return null } })()
        : null

  if (obj) {
    if (obj.nombre || obj.Nombre)     result["Nombre"]   = obj.nombre   || obj.Nombre   || ""
    if (obj.whatsapp || obj.WhatsApp) result["WhatsApp"] = obj.whatsapp || obj.WhatsApp || ""
    if (obj.codigo || obj.Codigo)     result["Codigo"]   = obj.codigo   || obj.Codigo   || ""
    if (obj.tinaja || obj.Tinaja)     result["Tinaja"]   = obj.tinaja   || obj.Tinaja   || ""
    return result
  }

  // Formato pipe-delimited: "Nombre:Juan|WhatsApp:+56912345678|..."
  (notes as string).split("|").forEach((part) => {
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

export default function BookingsList({ bookings: initial, cabins, tenantId }: { bookings: Booking[]; cabins: Cabin[]; tenantId: string }) {
  const [bookings, setBookings] = useState(initial)
  const [loadingId, setLoadingId] = useState<string | null>(null)

  const cabinMap: Record<string, string> = {}
  cabins.forEach((c) => { cabinMap[c.id] = c.name })

  async function handleConfirm(id: string) {
    if (!confirm("Confirmar esta reserva? El pago quedar\u00e1 registrado como recibido.")) return
    setLoadingId(id)
    try {
      const res = await fetch("/api/bookings/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ booking_id: id, tenant_id: tenantId }),
      })
      const data = await res.json()
      if (res.ok) {
        setBookings((prev) => prev.filter((b) => b.id !== id))
      } else {
        alert("Error al confirmar: " + (data.error || data.message || "c\u00f3digo " + res.status))
      }
    } catch (e) {
      alert("Error de conexi\u00f3n")
    }
    setLoadingId(null)
  }

  async function handleCancel(id: string) {
    if (!confirm("Cancelar esta reserva? Las fechas se liberar\u00e1n.")) return
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
      alert("Error de conexi\u00f3n")
    }
    setLoadingId(null)
  }

  return (
    <div style={{ marginTop: "28px" }}>
      <div style={{ fontSize: "10px", letterSpacing: "2.5px", textTransform: "uppercase" as const, color: "#4a6a48", marginBottom: "14px" }}>
        {"Reservas pendientes (" + bookings.length + ")"}
      </div>

      {bookings.length === 0 ? (
        <div style={{ textAlign: "center" as const, padding: "28px 20px", background: "#111a11", border: "1px solid #2a3a2a", borderRadius: "14px", fontSize: "13px", color: "#5a7058" }}>
          No hay reservas pendientes por confirmar
        </div>
      ) : (
        bookings.map((b) => {
          const info = parseNotes(b.notes || "")
          const nombre = info["Nombre"] || "Sin nombre"
          const whatsapp = info["WhatsApp"] || ""
          const codigo = info["Codigo"] || info["C\u00f3digo"] || ""
          const tinajaRaw = info["Tinaja"] || ""
          const tinajaDias = parseInt(tinajaRaw) || 0
          const isLoading = loadingId === b.id
          const phone = cleanPhone(whatsapp)

          return (
            <div key={b.id} style={{ background: "#111a11", border: "1px solid #2a3a2a", borderRadius: "14px", padding: "18px 16px", marginBottom: "12px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
                {codigo && <div style={{ fontSize: "11px", color: "#5a7058", letterSpacing: "1px", fontFamily: "monospace" }}>{codigo}</div>}
                <div style={{ fontSize: "10px", color: "#c0392b", background: "#c0392b15", border: "1px solid #c0392b33", padding: "2px 8px", borderRadius: "8px" }}>Pendiente</div>
              </div>

              <div style={{ fontFamily: "Georgia, serif", fontSize: "17px", color: "#e8d5a3", marginBottom: "4px" }}>{nombre}</div>
              <div style={{ fontSize: "12px", color: "#6a8a68", marginBottom: "12px" }}>{cabinMap[b.cabin_id] || "Caba\u00f1a"}</div>

              <div style={{ background: "#0d1a12", border: "1px solid #2a3e28", borderRadius: "10px", padding: "12px", marginBottom: "12px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", padding: "4px 0" }}>
                  <span style={{ color: "#5a7058" }}>Fechas</span>
                  <span style={{ color: "#c8d8c0" }}>{formatDate(b.check_in)} &#8594; {formatDate(b.check_out)} ({b.nights} noches)</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", padding: "4px 0" }}>
                  <span style={{ color: "#5a7058" }}>Total</span>
                  <span style={{ color: "#c8d8c0", fontWeight: 600 }}>{fmt(b.total_amount)}</span>
                </div>
                {tinajaDias > 0 && (
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", padding: "4px 0" }}>
                    <span style={{ color: "#5a7058" }}>Tinaja</span>
                    <span style={{ color: "#c8d8c0" }}>{tinajaDias} {tinajaDias === 1 ? "d\u00eda" : "d\u00edas"}</span>
                  </div>
                )}
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "#c0392b12", border: "1px solid #c0392b28", borderRadius: "10px", padding: "10px 14px", marginBottom: "14px" }}>
                <span style={{ fontSize: "12px", color: "#e67a7a" }}>Transferencia a confirmar</span>
                <span style={{ fontSize: "16px", fontWeight: 700, color: "#e67a7a", fontFamily: "Georgia, serif" }}>{fmt(b.deposit_amount)}</span>
              </div>

              {phone && (
                <div style={{ marginBottom: "14px" }}>
                  <a href={"https://wa.me/" + phone.replace("+", "")} target="_blank" rel="noopener noreferrer"
                    style={{ display: "inline-flex", alignItems: "center", gap: "6px", background: "#25d366", color: "white", borderRadius: "8px", padding: "8px 14px", fontSize: "12px", fontWeight: 600, textDecoration: "none" }}>
                    {"WhatsApp: " + whatsapp}
                  </a>
                </div>
              )}

              <div style={{ display: "flex", gap: "8px" }}>
                <button onClick={() => handleConfirm(b.id)} disabled={isLoading}
                  style={{ flex: 1, padding: "11px", border: "none", borderRadius: "10px", fontSize: "13px", fontWeight: 700, cursor: isLoading ? "not-allowed" : "pointer", background: isLoading ? "#2a3e28" : "#27ae60", color: "white", opacity: isLoading ? 0.5 : 1, fontFamily: "sans-serif" }}>
                  {isLoading ? "..." : "Confirmar pago"}
                </button>
                <button onClick={() => handleCancel(b.id)} disabled={isLoading}
                  style={{ flex: 1, padding: "11px", border: "1px solid #c0392b44", borderRadius: "10px", fontSize: "13px", fontWeight: 600, cursor: isLoading ? "not-allowed" : "pointer", background: "transparent", color: "#e67a7a", opacity: isLoading ? 0.5 : 1, fontFamily: "sans-serif" }}>
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