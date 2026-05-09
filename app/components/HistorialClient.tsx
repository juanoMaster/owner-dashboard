"use client"
import { useState, useMemo } from "react"
import { parseNotes } from "@/lib/parse-notes"

interface Booking {
  id: string
  cabin_id: string
  check_in: string
  check_out: string
  nights: number
  guests: number
  total_amount: number
  deposit_amount: number
  balance_amount: number
  status: string
  notes: string | null
  created_at: string
  deleted_at: string | null
  deleted_by: string | null
}


function fmtCurrency(n: number, currency: string) {
  if (currency === "USD") return "$" + Math.round(n).toLocaleString("en-US")
  if (currency === "COP") return "$" + Math.round(n).toLocaleString("es-CO")
  return "$" + Math.round(n).toLocaleString("es-CL")
}

function fmtDate(s: string) {
  if (!s) return ""
  return new Date(s.length === 10 ? s + "T12:00:00" : s).toLocaleDateString("es-CL", { day: "2-digit", month: "2-digit", year: "numeric" })
}

function fmtDateTime(s: string) {
  if (!s) return ""
  return new Date(s).toLocaleString("es-CL", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })
}

function statusLabel(b: Booking) {
  if (b.deleted_at) return "Cancelada"
  if (b.status === "confirmed") return "Confirmada"
  return "Pendiente"
}

function statusColor(b: Booking) {
  if (b.deleted_at) return "#e63946"
  if (b.status === "confirmed") return "#27ae60"
  return "#f97316"
}

function origenLabel(o: string) {
  if (o === "manual") return "Panel propietario"
  if (o === "web") return "Formulario turista"
  if (o === "bot" || o === "bot_whatsapp") return "WhatsApp bot"
  return o || "—"
}

function downloadCSV(rows: any[], businessName: string) {
  const cols = ["Codigo", "Cabana", "Nombre", "WhatsApp", "Check-in", "Check-out", "Noches", "Personas", "Total", "Deposito", "Saldo", "Estado", "Origen", "Creada", "Cancelada", "Cancelada por"]
  const lines = rows.map((r: any) => cols.map((c: any) => {
    const v = r[c] == null ? "" : String(r[c])
    return '"' + v.replace(/"/g, '""') + '"'
  }).join(","))
  const csv = "﻿" + cols.join(",") + "\n" + lines.join("\n")
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = "historial-" + businessName.replace(/\s+/g, "-").toLowerCase() + "-" + new Date().getFullYear() + ".csv"
  a.click()
  URL.revokeObjectURL(url)
}

export default function HistorialClient({ bookings, cabinMap, businessName, currency = "CLP" }: { bookings: Booking[]; cabinMap: Record<string, string>; businessName: string; currency?: string }) {
  const [search, setSearch] = useState("")
  const [filterCabin, setFilterCabin] = useState("")
  const [filterStatus, setFilterStatus] = useState("")
  const [filterYear, setFilterYear] = useState("")
  const [filterOrigen, setFilterOrigen] = useState("")

  const years = useMemo(() => {
    const s = new Set(bookings.map((b) => new Date(b.created_at).getFullYear().toString()))
    return Array.from(s).sort((a, b) => Number(b) - Number(a))
  }, [bookings])

  const cabinNames = useMemo(() => {
    const s = new Set(bookings.map((b) => cabinMap[b.cabin_id] || b.cabin_id))
    return Array.from(s).sort()
  }, [bookings, cabinMap])

  const rows = useMemo(() => {
    return bookings.map((b) => {
      const n = parseNotes(b.notes)
      return {
        _raw: b,
        Codigo: n.codigo || "",
        Cabana: cabinMap[b.cabin_id] || b.cabin_id,
        Nombre: n.nombre || "",
        WhatsApp: n.whatsapp || "",
        "Check-in": fmtDate(b.check_in),
        "Check-out": fmtDate(b.check_out),
        Noches: b.nights,
        Personas: b.guests,
        Total: fmtCurrency(b.total_amount, currency),
        Deposito: fmtCurrency(b.deposit_amount, currency),
        Saldo: fmtCurrency(b.balance_amount, currency),
        Estado: statusLabel(b),
        _statusColor: statusColor(b),
        Origen: origenLabel(n.origen),
        Creada: fmtDateTime(b.created_at),
        Cancelada: b.deleted_at ? fmtDateTime(b.deleted_at) : "",
        "Cancelada por": b.deleted_by || "",
      }
    })
  }, [bookings, cabinMap])

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return rows.filter((r) => {
      if (filterCabin && r.Cabana !== filterCabin) return false
      if (filterStatus === "pendiente" && r.Estado !== "Pendiente") return false
      if (filterStatus === "confirmada" && r.Estado !== "Confirmada") return false
      if (filterStatus === "cancelada" && r.Estado !== "Cancelada") return false
      if (filterYear && !r.Creada.endsWith(filterYear) && !r.Creada.includes("/" + filterYear)) return false
      if (filterOrigen && r.Origen !== filterOrigen) return false
      if (q && ![r.Codigo, r.Nombre, r.WhatsApp, r["Check-in"], r.Cabana].some((v) => v.toLowerCase().includes(q))) return false
      return true
    })
  }, [rows, search, filterCabin, filterStatus, filterYear, filterOrigen])

  const inputStyle = { background: "#0a1510", border: "1px solid #1a2e1a", borderRadius: "8px", color: "#c8d8c0", fontSize: "12px", padding: "7px 12px", outline: "none", fontFamily: "sans-serif" }
  const thStyle = { padding: "10px 12px", fontSize: "10px", letterSpacing: "1.5px", textTransform: "uppercase" as const, color: "#4a6a48", fontWeight: 600, whiteSpace: "nowrap" as const, borderBottom: "1px solid #1a2e1a", background: "#050d05", textAlign: "left" as const }
  const tdStyle = { padding: "10px 12px", fontSize: "12px", color: "#c8d8c0", borderBottom: "1px solid #ffffff06", whiteSpace: "nowrap" as const }

  const columns = ["Codigo", "Cabana", "Nombre", "WhatsApp", "Check-in", "Check-out", "Noches", "Personas", "Total", "Deposito", "Saldo", "Estado", "Origen", "Creada", "Cancelada", "Cancelada por"]

  return (
    <div>
      <div style={{ display: "flex", flexWrap: "wrap" as const, gap: "10px", marginBottom: "20px", alignItems: "center" }}>
        <input
          type="text"
          placeholder="Buscar nombre, WhatsApp, código..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ ...inputStyle, width: "220px" }}
        />
        <select value={filterCabin} onChange={(e) => setFilterCabin(e.target.value)} style={inputStyle}>
          <option value="">Todas las cabañas</option>
          {cabinNames.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} style={inputStyle}>
          <option value="">Todos los estados</option>
          <option value="confirmada">Confirmada</option>
          <option value="pendiente">Pendiente</option>
          <option value="cancelada">Cancelada</option>
        </select>
        <select value={filterYear} onChange={(e) => setFilterYear(e.target.value)} style={inputStyle}>
          <option value="">Todos los años</option>
          {years.map((y) => <option key={y} value={y}>{y}</option>)}
        </select>
        <select value={filterOrigen} onChange={(e) => setFilterOrigen(e.target.value)} style={inputStyle}>
          <option value="">Todos los orígenes</option>
          <option value="Panel propietario">Panel propietario</option>
          <option value="Formulario turista">Formulario turista</option>
          <option value="WhatsApp bot">WhatsApp bot</option>
        </select>
        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: "12px" }}>
          <span style={{ fontSize: "11px", color: "#3a5a38" }}>{filtered.length} registros</span>
          <button
            onClick={() => downloadCSV(filtered, businessName)}
            style={{ background: "#162618", border: "1px solid #2a3e28", borderRadius: "8px", color: "#7ab87a", fontSize: "11px", padding: "8px 16px", cursor: "pointer", fontFamily: "sans-serif", fontWeight: 600, letterSpacing: "0.5px" }}>
            Descargar CSV
          </button>
        </div>
      </div>

      <div style={{ overflowX: "auto" as const, borderRadius: "14px", border: "1px solid #1a2e1a" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" as const, fontSize: "12px" }}>
          <thead>
            <tr>
              {columns.map((c) => <th key={c} style={thStyle}>{c}</th>)}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={columns.length} style={{ ...tdStyle, textAlign: "center" as const, padding: "40px", color: "#3a5a38" }}>
                  No hay registros con estos filtros
                </td>
              </tr>
            ) : (
              filtered.map((r, i) => (
                <tr key={i} style={{ background: r._raw.deleted_at ? "#1a0a0a" : "transparent" }}>
                  {columns.map((c) => (
                    <td key={c} style={{
                      ...tdStyle,
                      color: c === "Estado" ? r._statusColor : c === "Cancelada" || c === "Cancelada por" ? "#6a4040" : "#c8d8c0",
                      fontWeight: c === "Estado" ? 600 : c === "Total" ? 600 : 400,
                      fontFamily: c === "Total" || c === "Deposito" || c === "Saldo" ? "Georgia, serif" : "sans-serif",
                    }}>
                      {(r as any)[c]}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
