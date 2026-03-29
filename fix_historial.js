const fs = require("fs")
const path = require("path")

// ──────────────────────────────────────────────
// app/historial/page.tsx  (Server Component)
// ──────────────────────────────────────────────
const pageTsx = `import { createClient } from "@supabase/supabase-js"
import crypto from "crypto"
import HistorialClient from "../components/HistorialClient"
export const revalidate = 0

export default async function HistorialPage({
  searchParams,
}: {
  searchParams: { token?: string }
}) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const token = searchParams.token
  if (!token) {
    return (
      <div style={{ background: "#0a1208", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "sans-serif", color: "#3a5a38" }}>
        Acceso no autorizado
      </div>
    )
  }

  const tokenHash = crypto.createHash("sha256").update(token, "utf8").digest("hex")
  const { data: link } = await supabase
    .from("dashboard_links")
    .select("tenant_id")
    .eq("token_hash", tokenHash)
    .eq("active", true)
    .maybeSingle()

  if (!link) {
    return (
      <div style={{ background: "#0a1208", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "sans-serif", color: "#3a5a38" }}>
        Acceso no autorizado
      </div>
    )
  }

  const { data: tenant } = await supabase
    .from("tenants")
    .select("business_name, owner_name")
    .eq("id", link.tenant_id)
    .maybeSingle()

  const { data: cabins } = await supabase
    .from("cabins")
    .select("id, name")
    .eq("tenant_id", link.tenant_id)

  // Traer TODAS las reservas incluyendo canceladas (deleted_at no null)
  const { data: bookings } = await supabase
    .from("bookings")
    .select("id, cabin_id, check_in, check_out, nights, guests, total_amount, deposit_amount, balance_amount, status, notes, created_at, deleted_at, deleted_by")
    .eq("tenant_id", link.tenant_id)
    .order("created_at", { ascending: false })

  const cabinMap: Record<string, string> = {}
  ;(cabins || []).forEach((c: any) => { cabinMap[c.id] = c.name })

  return (
    <div style={{ background: "#0d1a12", minHeight: "100vh", fontFamily: "sans-serif", color: "#f0ede8" }}>
      <nav style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 28px", height: "54px", borderBottom: "1px solid #111e11", background: "#050d05" }}>
        <div style={{ fontFamily: "Georgia,serif", fontSize: "15px", letterSpacing: "3.5px", color: "#c8b878", textTransform: "uppercase" as const }}>
          {tenant?.business_name || "Panel"}
        </div>
        <div style={{ fontSize: "9px", color: "#253825", letterSpacing: "2px", textTransform: "uppercase" as const }}>Historial</div>
      </nav>

      <main style={{ padding: "36px 24px", maxWidth: "1200px", margin: "0 auto" }}>
        <div style={{ marginBottom: "32px" }}>
          <a href={"/?token=" + token}
            style={{ display: "inline-flex", alignItems: "center", gap: "6px", color: "#6a8a68", fontSize: "11px", padding: "7px 16px", border: "1px solid #1a2e1a", borderRadius: "20px", textDecoration: "none", letterSpacing: "0.5px", marginBottom: "20px" }}>
            {"\u2190 Volver al panel"}
          </a>
          <div style={{ fontSize: "9px", letterSpacing: "3px", textTransform: "uppercase" as const, color: "#4a7a48", marginBottom: "6px", fontWeight: 600 }}>
            Historial de reservas
          </div>
          <h1 style={{ fontFamily: "Georgia,serif", fontSize: "28px", color: "#e8d5a3", margin: "0 0 4px 0", fontWeight: 400 }}>
            {tenant?.business_name || ""}
          </h1>
          <div style={{ width: "40px", height: "1px", background: "linear-gradient(90deg, #c8b87860, transparent)", margin: "10px 0" }} />
          <p style={{ color: "#3a5a38", fontSize: "12px", margin: 0 }}>
            {"Registro completo de todas las reservas. Las canceladas aparecen marcadas."}
          </p>
        </div>

        <HistorialClient
          bookings={(bookings || []) as any[]}
          cabinMap={cabinMap}
          businessName={tenant?.business_name || ""}
        />
      </main>
    </div>
  )
}
`

// ──────────────────────────────────────────────
// app/components/HistorialClient.tsx  (Client Component)
// ──────────────────────────────────────────────
const clientTsx = `"use client"
import { useState, useMemo } from "react"

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

function parseNotes(notes: any): Record<string, string> {
  if (!notes) return {}
  const obj =
    typeof notes === "object"
      ? notes
      : typeof notes === "string" && notes.trimStart().startsWith("{")
        ? (() => { try { return JSON.parse(notes) } catch { return null } })()
        : null
  if (obj) return { nombre: obj.nombre || obj.Nombre || "", whatsapp: obj.whatsapp || obj.WhatsApp || "", codigo: obj.codigo || obj.Codigo || "", origen: obj.origen || "", tinaja: obj.tinaja || "" }
  const result: Record<string, string> = {}
  String(notes).split("|").forEach((part) => {
    const idx = part.indexOf(":")
    if (idx > -1) result[part.slice(0, idx).trim().toLowerCase()] = part.slice(idx + 1).trim()
  })
  return result
}

function fmt(n: number) { return "$" + Math.round(n).toLocaleString("es-CL") }

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
  return o || "\u2014"
}

function downloadCSV(rows: any[], businessName: string) {
  const cols = ["Codigo", "Cabana", "Nombre", "WhatsApp", "Check-in", "Check-out", "Noches", "Personas", "Total", "Deposito", "Saldo", "Estado", "Origen", "Creada", "Cancelada", "Cancelada por"]
  const lines = rows.map((r: any) => cols.map((c: any) => {
    const v = r[c] == null ? "" : String(r[c])
    return '"' + v.replace(/"/g, '""') + '"'
  }).join(","))
  const csv = "\uFEFF" + cols.join(",") + "\\n" + lines.join("\\n")
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = "historial-" + businessName.replace(/\\s+/g, "-").toLowerCase() + "-" + new Date().getFullYear() + ".csv"
  a.click()
  URL.revokeObjectURL(url)
}

export default function HistorialClient({ bookings, cabinMap, businessName }: { bookings: Booking[]; cabinMap: Record<string, string>; businessName: string }) {
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
        Total: fmt(b.total_amount),
        Deposito: fmt(b.deposit_amount),
        Saldo: fmt(b.balance_amount),
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
          placeholder="Buscar nombre, WhatsApp, c\u00f3digo..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ ...inputStyle, width: "220px" }}
        />
        <select value={filterCabin} onChange={(e) => setFilterCabin(e.target.value)} style={inputStyle}>
          <option value="">Todas las caba\u00f1as</option>
          {cabinNames.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} style={inputStyle}>
          <option value="">Todos los estados</option>
          <option value="confirmada">Confirmada</option>
          <option value="pendiente">Pendiente</option>
          <option value="cancelada">Cancelada</option>
        </select>
        <select value={filterYear} onChange={(e) => setFilterYear(e.target.value)} style={inputStyle}>
          <option value="">Todos los a\u00f1os</option>
          {years.map((y) => <option key={y} value={y}>{y}</option>)}
        </select>
        <select value={filterOrigen} onChange={(e) => setFilterOrigen(e.target.value)} style={inputStyle}>
          <option value="">Todos los or\u00edgenes</option>
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
`

const historialDir = path.join(__dirname, "app", "historial")
if (!fs.existsSync(historialDir)) fs.mkdirSync(historialDir, { recursive: true })

fs.writeFileSync(path.join(historialDir, "page.tsx"), pageTsx, "utf8")
console.log("Written: app/historial/page.tsx")

fs.writeFileSync(path.join(__dirname, "app", "components", "HistorialClient.tsx"), clientTsx, "utf8")
console.log("Written: app/components/HistorialClient.tsx")
