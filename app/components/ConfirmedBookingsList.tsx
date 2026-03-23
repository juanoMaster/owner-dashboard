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
  base_price_night: number
}

function parseNotes(notes: string): Record<string, string> {
  if (!notes) return {}
  try { return JSON.parse(notes) } catch {}
  const r: Record<string, string> = {}
  notes.split("|").forEach(p => {
    const i = p.indexOf(":")
    if (i > -1) r[p.slice(0, i).trim()] = p.slice(i + 1).trim()
  })
  return r
}

function fmt(n: number): string {
  return "$" + Math.round(n).toLocaleString("es-CL")
}

function formatDate(d: string): string {
  return new Date(d + "T12:00:00").toLocaleDateString("es-CL", { day: "numeric", month: "short" })
}

export default function ConfirmedBookingsList({
  bookings: initial,
  cabins,
  tenantId
}: {
  bookings: Booking[]
  cabins: Cabin[]
  tenantId: string
}) {
  const [bookings, setBookings] = useState(initial)
  const [loadingId, setLoadingId] = useState<string | null>(null)

  const cabinMap: Record<string, Cabin> = {}
  cabins.forEach(c => { cabinMap[c.id] = c })

  async function handleCancel(id: string) {
    if (!confirm("Cancelar esta reserva confirmada? Las fechas se liberaran.")) return
    setLoadingId(id)
    try {
      const res = await fetch("/api/bookings/cancel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ booking_id: id, tenant_id: tenantId })
      })
      if (res.ok) setBookings(prev => prev.filter(b => b.id !== id))
      else alert("Error al cancelar")
    } catch { alert("Error de conexion") }
    setLoadingId(null)
  }

  if (bookings.length === 0) return (
    <div style={{ marginTop: "28px" }}>
      <div style={{ fontSize: "10px", letterSpacing: "2.5px", textTransform: "uppercase" as const, color: "#4a6a48", marginBottom: "14px" }}>
        {"Reservas confirmadas (0)"}
      </div>
      <div style={{ textAlign: "center" as const, padding: "28px 20px", background: "#111a11", border: "1px solid #2a3a2a", borderRadius: "14px", fontSize: "13px", color: "#5a7058" }}>
        No hay reservas confirmadas
      </div>
    </div>
  )

  return (
    <div style={{ marginTop: "28px" }}>
      <div style={{ fontSize: "10px", letterSpacing: "2.5px", textTransform: "uppercase" as const, color: "#4a6a48", marginBottom: "14px" }}>
        {"Reservas confirmadas (" + bookings.length + ")"}
      </div>

      {bookings.map(b => {
        const info = parseNotes(b.notes || "")
        const nombre = info["nombre"] || info["Nombre"] || "Sin nombre"
        const whatsapp = info["whatsapp"] || info["WhatsApp"] || ""
        const codigo = info["codigo"] || info["Codigo"] || ""
        const origen = info["origen"] || "sistema"
        const notas = info["notas"] || ""
        const tinajaDias = parseInt(info["tinaja"] || "0") || 0
        const phone = whatsapp.replace(/[^0-9+]/g, "")
        const cabin = cabinMap[b.cabin_id]
        const isLoading = loadingId === b.id
        const tinajaTotal = tinajaDias * 30000
        const subtotal = b.total_amount - tinajaTotal

        return (
          <div key={b.id} style={{ background: "#111a11", border: "1px solid #2a3a2a", borderRadius: "14px", padding: "18px 16px", marginBottom: "12px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
              {codigo && <div style={{ fontSize: "11px", color: "#5a7058", letterSpacing: "1px", fontFamily: "monospace" }}>{codigo}</div>}
              <div style={{ display: "flex", gap: "6px" }}>
                {origen === "manual" && <div style={{ fontSize: "10px", color: "#2563eb", background: "#2563eb15", border: "1px solid #2563eb33", padding: "2px 8px", borderRadius: "8px" }}>Manual</div>}
                <div style={{ fontSize: "10px", color: "#2e7d32", background: "#2e7d3215", border: "1px solid #2e7d3233", padding: "2px 8px", borderRadius: "8px" }}>Confirmada</div>
              </div>
            </div>

            <div style={{ fontFamily: "Georgia, serif", fontSize: "17px", color: "#e8d5a3", marginBottom: "4px" }}>{nombre}</div>
            <div style={{ fontSize: "12px", color: "#6a8a68", marginBottom: "12px" }}>{cabin?.name || "Cabana"}</div>

            <div style={{ background: "#0d1a12", border: "1px solid #2a3e28", borderRadius: "10px", padding: "12px", marginBottom: "12px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", padding: "4px 0", borderBottom: "1px solid #ffffff07" }}>
                <span style={{ color: "#5a7058" }}>Fechas</span>
                <span style={{ color: "#c8d8c0" }}>{formatDate(b.check_in)} {"\u2192"} {formatDate(b.check_out)} ({b.nights} {b.nights === 1 ? "noche" : "noches"})</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", padding: "4px 0", borderBottom: tinajaDias > 0 ? "1px solid #ffffff07" : "none" }}>
                <span style={{ color: "#5a7058" }}>Alojamiento</span>
                <span style={{ color: "#c8d8c0" }}>{fmt(subtotal)}</span>
              </div>
              {tinajaDias > 0 && (
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", padding: "4px 0", borderBottom: "1px solid #ffffff07" }}>
                  <span style={{ color: "#5a7058" }}>{"Tinaja (" + tinajaDias + (tinajaDias === 1 ? " dia" : " dias") + ")"}</span>
                  <span style={{ color: "#c8d8c0" }}>{fmt(tinajaTotal)}</span>
                </div>
              )}
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13px", padding: "8px 0 4px", fontWeight: 700 }}>
                <span style={{ color: "#7ab87a" }}>Total</span>
                <span style={{ color: "#7ab87a", fontFamily: "Georgia, serif" }}>{fmt(b.total_amount)}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px", padding: "2px 0" }}>
                <span style={{ color: "#5a7058" }}>Adelanto 20%</span>
                <span style={{ color: "#5a7058" }}>{fmt(b.deposit_amount)}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px", padding: "2px 0" }}>
                <span style={{ color: "#5a7058" }}>Saldo pendiente</span>
                <span style={{ color: "#5a7058" }}>{fmt(b.balance_amount)}</span>
              </div>
            </div>

            {notas !== "" && (
              <div style={{ fontSize: "12px", color: "#5a7058", background: "#0d1a12", border: "1px solid #2a3e28", borderRadius: "8px", padding: "8px 12px", marginBottom: "12px" }}>
                {notas}
              </div>
            )}

            {phone && (
              <div style={{ marginBottom: "12px" }}>
                <a href={"https://wa.me/" + phone.replace("+", "")} target="_blank" rel="noopener noreferrer"
                  style={{ display: "inline-flex", alignItems: "center", gap: "6px", background: "#25d366", color: "white", borderRadius: "8px", padding: "8px 14px", fontSize: "12px", fontWeight: 600, textDecoration: "none" }}>
                  {"WhatsApp: " + whatsapp}
                </a>
              </div>
            )}

            <button onClick={() => handleCancel(b.id)} disabled={isLoading}
              style={{ width: "100%", padding: "10px", border: "1px solid #c0392b44", borderRadius: "10px", fontSize: "12px", fontWeight: 600, cursor: isLoading ? "not-allowed" : "pointer", background: "transparent", color: "#e67a7a", opacity: isLoading ? 0.5 : 1, fontFamily: "sans-serif" }}>
              {isLoading ? "Cancelando..." : "Cancelar reserva"}
            </button>
          </div>
        )
      })}
    </div>
  )
}
