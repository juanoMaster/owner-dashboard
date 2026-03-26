"use client"
import { useState, useMemo } from "react"

interface AuditRow {
  id: string
  tenant_id: string
  cabin_id: string | null
  action: string
  entity_type: string
  entity_id: string
  details: Record<string, any> | null
  performed_by: string | null
  created_at: string
}

function fmtDateTime(s: string) {
  if (!s) return ""
  return new Date(s).toLocaleString("es-CL", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit", second: "2-digit" })
}

function actionLabel(a: string) {
  const map: Record<string, string> = {
    booking_created: "Reserva creada",
    booking_confirmed: "Reserva confirmada",
    booking_cancelled: "Reserva cancelada",
    booking_blocks_released: "Fechas liberadas (con reserva)",
    block_deleted: "Bloque manual eliminado",
  }
  return map[a] || a
}

function actionColor(a: string) {
  if (a === "booking_created") return "#7ab87a"
  if (a === "booking_confirmed") return "#27ae60"
  if (a === "booking_cancelled") return "#e63946"
  if (a.includes("deleted") || a.includes("released")) return "#f97316"
  return "#6a8a68"
}

function performedByLabel(p: string | null) {
  const map: Record<string, string> = {
    owner_panel: "Panel propietario",
    calendar_panel: "Calendario",
    formulario_turista: "Formulario turista",
    bot_whatsapp: "WhatsApp bot",
    system: "Sistema",
  }
  return p ? (map[p] || p) : "—"
}

function fmtDetails(d: Record<string, any> | null) {
  if (!d) return ""
  const parts: string[] = []
  if (d.check_in) parts.push("in: " + d.check_in)
  if (d.check_out) parts.push("out: " + d.check_out)
  if (d.total_amount) parts.push("$" + Math.round(d.total_amount).toLocaleString("es-CL"))
  if (d.guest_name) parts.push(d.guest_name)
  if (d.origen) parts.push(d.origen)
  if (d.status_before) parts.push("antes: " + d.status_before)
  return parts.join(" · ")
}

function downloadCSV(rows: any[]) {
  const cols = ["Fecha/hora", "Cliente", "Cabana", "Accion", "Origen", "Entidad", "ID entidad", "Detalles"]
  const lines = rows.map((r: any) => cols.map((c: any) => {
    const v = r[c] == null ? "" : String(r[c]).replace(/"/g, '""')
    return '"' + v + '"'
  }).join(","))
  const csv = "﻿" + cols.join(",") + "\n" + lines.join("\n")
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = "auditoria-takai-" + new Date().toISOString().slice(0, 10) + ".csv"
  a.click()
  URL.revokeObjectURL(url)
}

export default function AuditClient({ rows, tenantMap, cabinMap }: { rows: AuditRow[]; tenantMap: Record<string, string>; cabinMap: Record<string, string> }) {
  const [search, setSearch] = useState("")
  const [filterTenant, setFilterTenant] = useState("")
  const [filterAction, setFilterAction] = useState("")
  const [filterBy, setFilterBy] = useState("")
  const [filterYear, setFilterYear] = useState("")

  const tenantNames = useMemo(() => {
    const s = new Set(rows.map((r) => tenantMap[r.tenant_id] || r.tenant_id))
    return Array.from(s).sort()
  }, [rows, tenantMap])

  const years = useMemo(() => {
    const s = new Set(rows.map((r) => new Date(r.created_at).getFullYear().toString()))
    return Array.from(s).sort((a, b) => Number(b) - Number(a))
  }, [rows])

  const tableRows = useMemo(() => rows.map((r) => ({
    _raw: r,
    "Fecha/hora": fmtDateTime(r.created_at),
    Cliente: tenantMap[r.tenant_id] || r.tenant_id,
    Cabana: r.cabin_id ? (cabinMap[r.cabin_id] || r.cabin_id) : "—",
    Accion: actionLabel(r.action),
    _actionColor: actionColor(r.action),
    Origen: performedByLabel(r.performed_by),
    Entidad: r.entity_type,
    "ID entidad": r.entity_id.slice(0, 8) + "...",
    _entityId: r.entity_id,
    Detalles: fmtDetails(r.details),
  })), [rows, tenantMap, cabinMap])

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return tableRows.filter((r) => {
      if (filterTenant && r.Cliente !== filterTenant) return false
      if (filterAction && r._raw.action !== filterAction) return false
      if (filterBy && r._raw.performed_by !== filterBy) return false
      if (filterYear && !r["Fecha/hora"].includes(filterYear)) return false
      if (q && ![r.Cliente, r.Cabana, r.Accion, r.Origen, r._entityId, r.Detalles].some((v) => v.toLowerCase().includes(q))) return false
      return true
    })
  }, [tableRows, search, filterTenant, filterAction, filterBy, filterYear])

  const inputStyle = { background: "#0f0808", border: "1px solid #2a1a1a", borderRadius: "8px", color: "#c8b8b0", fontSize: "12px", padding: "7px 12px", outline: "none", fontFamily: "sans-serif" }
  const thStyle = { padding: "10px 12px", fontSize: "10px", letterSpacing: "1.5px", textTransform: "uppercase" as const, color: "#5a3a38", fontWeight: 600, whiteSpace: "nowrap" as const, borderBottom: "1px solid #2a1a1a", background: "#060404", textAlign: "left" as const }
  const tdStyle = { padding: "9px 12px", fontSize: "12px", color: "#c8b8b0", borderBottom: "1px solid #ffffff05", whiteSpace: "nowrap" as const }

  const visibleCols = ["Fecha/hora", "Cliente", "Cabana", "Accion", "Origen", "Detalles"]

  return (
    <div>
      <div style={{ display: "flex", flexWrap: "wrap" as const, gap: "10px", marginBottom: "20px", alignItems: "center" }}>
        <input
          type="text"
          placeholder="Buscar cliente, acción, detalle..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ ...inputStyle, width: "220px" }}
        />
        <select value={filterTenant} onChange={(e) => setFilterTenant(e.target.value)} style={inputStyle}>
          <option value="">Todos los clientes</option>
          {tenantNames.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
        <select value={filterAction} onChange={(e) => setFilterAction(e.target.value)} style={inputStyle}>
          <option value="">Todas las acciones</option>
          <option value="booking_created">Reserva creada</option>
          <option value="booking_confirmed">Reserva confirmada</option>
          <option value="booking_cancelled">Reserva cancelada</option>
          <option value="booking_blocks_released">Fechas liberadas</option>
          <option value="block_deleted">Bloque eliminado</option>
        </select>
        <select value={filterBy} onChange={(e) => setFilterBy(e.target.value)} style={inputStyle}>
          <option value="">Todos los orígenes</option>
          <option value="owner_panel">Panel propietario</option>
          <option value="calendar_panel">Calendario</option>
          <option value="formulario_turista">Formulario turista</option>
          <option value="bot_whatsapp">WhatsApp bot</option>
          <option value="system">Sistema</option>
        </select>
        <select value={filterYear} onChange={(e) => setFilterYear(e.target.value)} style={inputStyle}>
          <option value="">Todos los años</option>
          {years.map((y) => <option key={y} value={y}>{y}</option>)}
        </select>
        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: "12px" }}>
          <span style={{ fontSize: "11px", color: "#4a3030" }}>{filtered.length} eventos</span>
          <button
            onClick={() => downloadCSV(filtered)}
            style={{ background: "#1a0f0f", border: "1px solid #3a2020", borderRadius: "8px", color: "#c8a878", fontSize: "11px", padding: "8px 16px", cursor: "pointer", fontFamily: "sans-serif", fontWeight: 600, letterSpacing: "0.5px" }}>
            Descargar CSV
          </button>
        </div>
      </div>

      <div style={{ overflowX: "auto" as const, borderRadius: "14px", border: "1px solid #2a1a1a" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" as const }}>
          <thead>
            <tr>
              {visibleCols.map((c) => <th key={c} style={thStyle}>{c}</th>)}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={visibleCols.length} style={{ ...tdStyle, textAlign: "center" as const, padding: "40px", color: "#3a2020" }}>
                  No hay eventos con estos filtros
                </td>
              </tr>
            ) : (
              filtered.map((r, i) => (
                <tr key={i}>
                  {visibleCols.map((c) => (
                    <td key={c} style={{
                      ...tdStyle,
                      color: c === "Accion" ? r._actionColor : c === "Fecha/hora" ? "#6a5848" : "#c8b8b0",
                      fontWeight: c === "Accion" ? 600 : 400,
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
