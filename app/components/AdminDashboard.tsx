"use client"
import { useState, useMemo } from "react"
import AuditClient from "./AuditClient"
import NewClientOnboarding from "./NewClientOnboarding"
import { parseNotes } from "@/lib/parse-notes"

// ── helpers ──────────────────────────────
function fmt(n: number) { return "$" + Math.round(n).toLocaleString("es-CL") }
function fmtDate(s: string) { if (!s) return ""; return new Date(s.length === 10 ? s + "T12:00:00" : s).toLocaleDateString("es-CL", { day: "2-digit", month: "2-digit", year: "numeric" }) }
function fmtDT(s: string) { if (!s) return ""; return new Date(s).toLocaleString("es-CL", { day: "2-digit", month: "2-digit", year: "2-digit", hour: "2-digit", minute: "2-digit" }) }
const MONTHS = ["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"]

// ── stat card ─────────────────────────────
function StatCard({ label, value, sub, color }: { label: string; value: string | number; sub?: string; color?: string }) {
  return (
    <div style={{ background: "#100d14", border: "1px solid #2a1e38", borderRadius: "14px", padding: "18px 20px" }}>
      <div style={{ fontSize: "10px", letterSpacing: "1.5px", textTransform: "uppercase" as const, color: "#5a4870", marginBottom: "6px" }}>{label}</div>
      <div style={{ fontFamily: "Georgia,serif", fontSize: "26px", color: color || "#e8d5a3", marginBottom: "2px" }}>{value}</div>
      {sub && <div style={{ fontSize: "11px", color: "#3a2e50" }}>{sub}</div>}
    </div>
  )
}

// ── section header ────────────────────────
function SectionHeader({ title, action }: { title: string; action?: React.ReactNode }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px" }}>
      <div style={{ fontSize: "10px", letterSpacing: "2px", textTransform: "uppercase" as const, color: "#7a5a98", fontWeight: 600 }}>{title}</div>
      {action}
    </div>
  )
}

// ── table styles ──────────────────────────
const TH: React.CSSProperties = { padding: "10px 14px", fontSize: "10px", letterSpacing: "1.5px", textTransform: "uppercase", color: "#4a3868", fontWeight: 600, borderBottom: "1px solid #1e1428", background: "#080610", textAlign: "left", whiteSpace: "nowrap" }
const TD: React.CSSProperties = { padding: "11px 14px", fontSize: "12px", color: "#c8b8e0", borderBottom: "1px solid #ffffff05", verticalAlign: "middle" }
const BTN = (color = "#7a5a98"): React.CSSProperties => ({ background: "transparent", border: "1px solid " + color + "60", borderRadius: "7px", color, fontSize: "11px", padding: "5px 12px", cursor: "pointer", fontFamily: "sans-serif", fontWeight: 600 })
const MODAL_BG: React.CSSProperties = { position: "fixed", inset: 0, background: "#000000b0", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 2000, padding: "20px" }
const MODAL_BOX: React.CSSProperties = { background: "#0d0918", border: "1px solid #2a1e38", borderRadius: "20px", padding: "28px", width: "100%", maxWidth: "480px", maxHeight: "80vh", overflowY: "auto" }
const INPUT: React.CSSProperties = { width: "100%", background: "#080610", border: "1px solid #2a1e38", borderRadius: "8px", color: "#c8b8e0", fontSize: "13px", padding: "10px 12px", outline: "none", fontFamily: "sans-serif", boxSizing: "border-box" }
const LABEL: React.CSSProperties = { fontSize: "11px", color: "#5a4870", letterSpacing: "1px", textTransform: "uppercase", display: "block", marginBottom: "6px" }

// ── main component ────────────────────────
export default function AdminDashboard({ tenants: initTenants, cabins: initCabins, tokens: initTokens, bookings, auditRows, stats, adminToken }: any) {
  const [tab, setTab] = useState(0)
  const [tenants, setTenants] = useState<any[]>(initTenants)
  const [cabins, setCabins] = useState<any[]>(initCabins)
  const [tokens, setTokens] = useState<any[]>(initTokens)
  const [modal, setModal] = useState<any>(null)
  const [saving, setSaving] = useState(false)
  const [newTokenValue, setNewTokenValue] = useState<string | null>(null)
  const [tenantSort, setTenantSort] = useState<{ key: "business_name" | "created_at"; dir: "asc" | "desc" }>({ key: "created_at", dir: "desc" })
  const [cabinSort, setCabinSort] = useState<{ key: "tenant_name" | "created_at"; dir: "asc" | "desc" }>({ key: "tenant_name", dir: "asc" })
  const [filterCabinTenant, setFilterCabinTenant] = useState("")
  const [filterCabinEstado, setFilterCabinEstado] = useState("")
  const [filterCabinCapacidad, setFilterCabinCapacidad] = useState("")

  const tenantMap = useMemo(() => { const m: Record<string,string> = {}; tenants.forEach((t: any) => { m[t.id] = t.business_name }); return m }, [tenants])
  const cabinMap = useMemo(() => { const m: Record<string,string> = {}; cabins.forEach((c: any) => { m[c.id] = c.name }); return m }, [cabins])

  const sortedTenants = useMemo(() => [...tenants].sort((a, b) => {
    if (tenantSort.key === "business_name") { const c = a.business_name.localeCompare(b.business_name, "es"); return tenantSort.dir === "asc" ? c : -c }
    const c = new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    return tenantSort.dir === "asc" ? c : -c
  }), [tenants, tenantSort])

  const sortedCabins = useMemo(() => [...cabins].sort((a, b) => {
    if (cabinSort.key === "tenant_name") { const an = tenantMap[a.tenant_id] || ""; const bn = tenantMap[b.tenant_id] || ""; const c = an.localeCompare(bn, "es"); return cabinSort.dir === "asc" ? c : -c }
    const c = new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    return cabinSort.dir === "asc" ? c : -c
  }), [cabins, cabinSort, tenantMap])

  const filteredCabins = useMemo(() => {
    return sortedCabins.filter((c: any) => {
      if (filterCabinTenant && (tenantMap[c.tenant_id] || "") !== filterCabinTenant) return false
      if (filterCabinEstado === "activa" && !c.active) return false
      if (filterCabinEstado === "inactiva" && c.active) return false
      if (filterCabinCapacidad && String(c.capacity) !== filterCabinCapacidad) return false
      return true
    })
  }, [sortedCabins, filterCabinTenant, filterCabinEstado, filterCabinCapacidad, tenantMap])

  async function apiCall(path: string, body: any) {
    const res = await fetch(path, { method: "POST", headers: { "Content-Type": "application/json", "x-admin-token": adminToken }, body: JSON.stringify(body) })
    return res.json()
  }

  async function saveTenant(data: any) {
    setSaving(true)
    const r = await apiCall("/api/admin/tenants", data)
    setSaving(false)
    if (r.success) {
      if (data.action === "create") setTenants(p => [...p, r.tenant])
      if (data.action === "update") setTenants(p => p.map((t: any) => t.id === r.tenant.id ? r.tenant : t))
      if (data.action === "toggle") setTenants(p => p.map((t: any) => t.id === r.tenant.id ? r.tenant : t))
      if (data.action === "verify") setTenants(p => p.map((t: any) => t.id === r.tenant.id ? r.tenant : t))
      setModal(null)
    } else alert(r.error || "Error")
  }

  async function saveCabin(data: any) {
    setSaving(true)
    const r = await apiCall("/api/admin/cabins", data)
    setSaving(false)
    if (r.success) {
      if (data.action === "create") setCabins(p => [...p, r.cabin])
      if (data.action === "update") setCabins(p => p.map((c: any) => c.id === r.cabin.id ? r.cabin : c))
      if (data.action === "toggle") setCabins(p => p.map((c: any) => c.id === r.cabin.id ? r.cabin : c))
      setModal(null)
    } else alert(r.error || "Error")
  }

  async function savePatch(data: { id: string; mp_access_token?: string; mp_enabled?: boolean; whatsapp_enabled?: boolean }) {
    setSaving(true)
    const res = await fetch("/api/admin/tenants", {
      method: "PATCH",
      headers: { "Content-Type": "application/json", "x-admin-token": adminToken },
      body: JSON.stringify(data),
    })
    const r = await res.json()
    setSaving(false)
    if (r.success) {
      setTenants(p => p.map((t: any) => t.id === data.id ? { ...t, ...data } : t))
    } else alert(r.error || "Error al guardar")
  }
  const saveMp = savePatch

  async function generateToken(tenant_id: string) {
    setSaving(true)
    const r = await apiCall("/api/admin/tokens", { action: "create", tenant_id })
    setSaving(false)
    if (r.success) {
      setTokens(p => [...p, r.token])
      setNewTokenValue(r.raw_token)
    } else alert(r.error || "Error")
  }

  async function deactivateToken(id: string) {
    if (!confirm("Desactivar este token? El propietario perderá acceso.")) return
    setSaving(true)
    const r = await apiCall("/api/admin/tokens", { action: "deactivate", id })
    setSaving(false)
    if (r.success) setTokens(p => p.map((t: any) => t.id === id ? { ...t, active: false } : t))
    else alert(r.error || "Error")
  }

  async function deleteTenant(id: string) {
    setSaving(true)
    const r = await apiCall("/api/admin/tenants", { action: "delete", id })
    setSaving(false)
    if (r.success) {
      setTenants(p => p.filter((t: any) => t.id !== id))
      setCabins(p => p.filter((c: any) => c.tenant_id !== id))
      setModal(null)
    } else alert(r.error || "Error al eliminar")
  }

  async function deleteCabin(id: string) {
    setSaving(true)
    const r = await apiCall("/api/admin/cabins", { action: "delete", id })
    setSaving(false)
    if (r.success) {
      setCabins(p => p.filter((c: any) => c.id !== id))
      setModal(null)
    } else alert(r.error || "Error al eliminar")
  }

  const tabs = ["Resumen", "Clientes", "Cabañas", "Reservas", "Tokens", "Auditoría", "Comisiones"]

  return (
    <div style={{ background: "#09070a", minHeight: "100vh", fontFamily: "sans-serif", color: "#e8d5f8" }}>
      {/* NAV */}
      <nav style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 28px", height: "54px", borderBottom: "1px solid #1a1028", background: "#060410", position: "sticky" as const, top: 0, zIndex: 100 }}>
        <div style={{ fontFamily: "Georgia,serif", fontSize: "15px", letterSpacing: "3.5px", color: "#c8b878", textTransform: "uppercase" as const }}>Takai Admin</div>
        <div style={{ fontSize: "9px", color: "#2a1e38", letterSpacing: "2px", textTransform: "uppercase" as const }}>God Mode</div>
      </nav>

      {/* TABS */}
      <div style={{ display: "flex", gap: "4px", padding: "16px 28px 0", borderBottom: "1px solid #1a1028", background: "#060410" }}>
        {tabs.map((t, i) => (
          <button key={t} onClick={() => setTab(i)}
            style={{ background: "transparent", border: "none", padding: "8px 18px", cursor: "pointer", fontFamily: "sans-serif", fontSize: "12px", fontWeight: tab === i ? 700 : 400, color: tab === i ? "#c8b878" : "#4a3868", borderBottom: tab === i ? "2px solid #c8b878" : "2px solid transparent", letterSpacing: "0.5px", transition: "color 0.15s" }}>
            {t}
          </button>
        ))}
      </div>

      <main style={{ padding: "28px 28px", maxWidth: "1400px", margin: "0 auto" }}>

        {/* ══ TAB 0: RESUMEN ══ */}
        {tab === 0 && (
          <div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(175px, 1fr))", gap: "12px", marginBottom: "28px" }}>
              <StatCard label={"Ingresos " + stats.thisYear} value={fmt(stats.totalRevenueThisYear)} sub={stats.totalRevenueLastYear > 0 ? ("vs " + fmt(stats.totalRevenueLastYear) + " el año anterior") : undefined} color="#c8b878" />
              <StatCard label={"Reservas " + stats.thisYear} value={stats.totalBookingsThisYear} color="#7ab87a" />
              <StatCard label="Clientes activos" value={tenants.filter((t: any) => t.active).length + " / " + tenants.length} color="#9a78c8" />
              <StatCard label="Pendientes de pago" value={stats.totalPendingBookings} color="#f97316" />
              <StatCard label="Comisiones pendientes" value={fmt(stats.pendingCommissions)} color="#c8b878" />
            </div>

            {/* Monthly chart */}
            <div style={{ background: "#100d14", border: "1px solid #2a1e38", borderRadius: "14px", padding: "20px", marginBottom: "24px" }}>
              <div style={{ fontSize: "10px", letterSpacing: "2px", textTransform: "uppercase" as const, color: "#5a4870", marginBottom: "16px" }}>Ingresos mensuales {stats.thisYear}</div>
              <div style={{ display: "flex", alignItems: "flex-end", gap: "6px", height: "80px" }}>
                {(() => {
                  const max = Math.max(...stats.monthlyRevenue.map((m: any) => m.revenue), 1)
                  return stats.monthlyRevenue.map((m: any) => (
                    <div key={m.month} style={{ flex: 1, display: "flex", flexDirection: "column" as const, alignItems: "center", gap: "4px" }}>
                      <div style={{ width: "100%", background: m.revenue > 0 ? "#7a5a9860" : "#1a1428", borderRadius: "4px 4px 0 0", height: Math.max(4, Math.round((m.revenue / max) * 64)) + "px", transition: "height 0.3s" }} />
                      <div style={{ fontSize: "9px", color: "#3a2e50" }}>{MONTHS[m.month]}</div>
                    </div>
                  ))
                })()}
              </div>
            </div>

            {/* Tenant breakdown */}
            <SectionHeader title="Resumen por cliente" />
            <div style={{ overflowX: "auto" as const, borderRadius: "14px", border: "1px solid #1e1428" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" as const }}>
                <thead>
                  <tr>
                    {["Cliente", "Propietaria", "Cabañas", "Reservas " + stats.thisYear, "Ingresos " + stats.thisYear, "Pendientes", "Estado"].map(h => <th key={h} style={TH}>{h}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {tenants.map((t: any) => {
                    const tcabins = cabins.filter((c: any) => c.tenant_id === t.id && c.active).length
                    return (
                      <tr key={t.id}>
                        <td style={{ ...TD, color: "#e8d5f8", fontWeight: 600 }}>{t.business_name}</td>
                        <td style={TD}>{t.owner_name}</td>
                        <td style={TD}>{tcabins}</td>
                        <td style={{ ...TD, color: "#7ab87a" }}>{stats.bookingsByTenant[t.id] || 0}</td>
                        <td style={{ ...TD, fontFamily: "Georgia,serif", color: "#c8b878" }}>{fmt(stats.revenueByTenant[t.id] || 0)}</td>
                        <td style={{ ...TD, color: (stats.pendingByTenant[t.id] || 0) > 0 ? "#f97316" : "#3a2e50" }}>{stats.pendingByTenant[t.id] || 0}</td>
                        <td style={TD}>
                          <span style={{ fontSize: "11px", fontWeight: 600, color: t.active ? "#27ae60" : "#e63946", background: t.active ? "#27ae6015" : "#e6394615", border: "1px solid " + (t.active ? "#27ae6030" : "#e6394630"), padding: "2px 8px", borderRadius: "6px" }}>
                            {t.active ? "Activo" : "Inactivo"}
                          </span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ══ TAB 1: CLIENTES ══ */}
        {tab === 1 && (
          <div>
            <SectionHeader title="Clientes" action={
              <button onClick={() => setModal({ type: "tenant-new" })} style={{ ...BTN("#c8b878"), background: "#1a1428" }}>
                + Nuevo cliente
              </button>
            } />
            <div style={{ overflowX: "auto" as const, borderRadius: "14px", border: "1px solid #1e1428" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" as const }}>
                <thead>
                  <tr>
                    <th style={{ ...TH, cursor: "pointer", userSelect: "none" as const }} onClick={() => setTenantSort(s => ({ key: "business_name", dir: s.key === "business_name" ? (s.dir === "asc" ? "desc" : "asc") : "asc" }))}>
                      Negocio{tenantSort.key === "business_name" ? (tenantSort.dir === "asc" ? " ↑" : " ↓") : " ↕"}
                    </th>
                    {["Propietaria", "WhatsApp", "Depósito %", "Estado", "Verificado", "WA Notif."].map(h => <th key={h} style={TH}>{h}</th>)}
                    <th style={{ ...TH, cursor: "pointer", userSelect: "none" as const }} onClick={() => setTenantSort(s => ({ key: "created_at", dir: s.key === "created_at" ? (s.dir === "asc" ? "desc" : "asc") : "desc" }))}>
                      Fecha de ingreso{tenantSort.key === "created_at" ? (tenantSort.dir === "asc" ? " ↑" : " ↓") : " ↕"}
                    </th>
                    <th style={TH}>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedTenants.map((t: any) => (
                    <tr key={t.id}>
                      <td style={{ ...TD, color: "#e8d5f8", fontWeight: 600 }}>{t.business_name}</td>
                      <td style={TD}>{t.owner_name}</td>
                      <td style={{ ...TD, fontFamily: "monospace", fontSize: "11px" }}>{t.owner_whatsapp || "—"}</td>
                      <td style={TD}>{t.deposit_percent || 20}%</td>
                      <td style={TD}>
                        <span style={{ fontSize: "11px", fontWeight: 600, color: t.active ? "#27ae60" : "#e63946" }}>
                          {t.active ? "Activo" : "Inactivo"}
                        </span>
                      </td>
                      <td style={TD}>
                        <button onClick={() => saveTenant({ action: "verify", id: t.id, verified: !t.verified })} style={BTN(t.verified ? "#c8b878" : "#3a2e50")}>
                          {t.verified ? "✓ Verificado" : "Verificar"}
                        </button>
                      </td>
                      <td style={TD}>
                        <button
                          onClick={() => savePatch({ id: t.id, whatsapp_enabled: !t.whatsapp_enabled })}
                          disabled={saving}
                          style={BTN(t.whatsapp_enabled !== false ? "#27ae60" : "#e63946")}
                        >
                          {t.whatsapp_enabled !== false ? "ON" : "OFF"}
                        </button>
                      </td>
                      <td style={{ ...TD, fontSize: "11px", color: "#5a4870" }}>{fmtDate(t.created_at)}</td>
                      <td style={TD}>
                        <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" as const }}>
                          <button onClick={() => setModal({ type: "tenant", data: { ...t } })} style={BTN("#9a78c8")}>Editar</button>
                          <button onClick={() => saveTenant({ action: "toggle", id: t.id, active: !t.active })} style={BTN(t.active ? "#e63946" : "#27ae60")}>
                            {t.active ? "Desactivar" : "Activar"}
                          </button>
                          {t.slug && (
                            <a href={"https://reservas.takai.cl/" + t.slug} target="_blank" rel="noopener noreferrer" style={{ ...BTN("#7ab87a"), textDecoration: "none", display: "inline-flex", alignItems: "center" }}>
                              Ver página
                            </a>
                          )}
                          {t.dashboard_token && (
                            <a href={(process.env.NEXT_PUBLIC_APP_URL ?? "https://panel.takai.cl") + "/?token=" + t.dashboard_token} target="_blank" rel="noopener noreferrer" style={{ ...BTN("#c8b878"), textDecoration: "none", display: "inline-flex", alignItems: "center" }}>
                              Abrir panel
                            </a>
                          )}
                          <button onClick={() => setModal({ type: "delete-tenant", data: { id: t.id, business_name: t.business_name } })} style={BTN("#e63946")}>Eliminar</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ══ TAB 2: CABAÑAS ══ */}
        {tab === 2 && (
          <div>
            <SectionHeader title="Cabañas" action={
              <button onClick={() => setModal({ type: "cabin", data: { active: true } })} style={{ ...BTN("#c8b878"), background: "#1a1428" }}>
                + Nueva cabaña
              </button>
            } />

            <div style={{ display: "flex", flexWrap: "wrap" as const, gap: "12px", marginBottom: "18px", alignItems: "flex-end" }}>
              <div style={{ display: "flex", flexDirection: "column" as const, gap: "5px" }}>
                <span style={{ fontSize: "10px", letterSpacing: "1.5px", textTransform: "uppercase" as const, color: "#5a4870" }}>Cliente</span>
                <select
                  value={filterCabinTenant}
                  onChange={e => setFilterCabinTenant(e.target.value)}
                  style={{ background: "#0d0918", border: "1px solid #2a1e38", borderRadius: "8px", color: "#c8b8e0", fontSize: "13px", padding: "9px 14px", outline: "none", fontFamily: "sans-serif", cursor: "pointer", minWidth: "190px" }}>
                  <option value="">— Todos los clientes —</option>
                  {Array.from(new Set(cabins.map((c: any) => tenantMap[c.tenant_id] || ""))).filter(Boolean).sort().map((name: any) => (
                    <option key={name} value={name}>{name}</option>
                  ))}
                </select>
              </div>
              <div style={{ display: "flex", flexDirection: "column" as const, gap: "5px" }}>
                <span style={{ fontSize: "10px", letterSpacing: "1.5px", textTransform: "uppercase" as const, color: "#5a4870" }}>Estado</span>
                <select
                  value={filterCabinEstado}
                  onChange={e => setFilterCabinEstado(e.target.value)}
                  style={{ background: "#0d0918", border: "1px solid #2a1e38", borderRadius: "8px", color: "#c8b8e0", fontSize: "13px", padding: "9px 14px", outline: "none", fontFamily: "sans-serif", cursor: "pointer", minWidth: "150px" }}>
                  <option value="">— Todos —</option>
                  <option value="activa">{"✓ Activa"}</option>
                  <option value="inactiva">{"✗ Inactiva"}</option>
                </select>
              </div>
              <div style={{ display: "flex", flexDirection: "column" as const, gap: "5px" }}>
                <span style={{ fontSize: "10px", letterSpacing: "1.5px", textTransform: "uppercase" as const, color: "#5a4870" }}>Capacidad</span>
                <select
                  value={filterCabinCapacidad}
                  onChange={e => setFilterCabinCapacidad(e.target.value)}
                  style={{ background: "#0d0918", border: "1px solid #2a1e38", borderRadius: "8px", color: "#c8b8e0", fontSize: "13px", padding: "9px 14px", outline: "none", fontFamily: "sans-serif", cursor: "pointer", minWidth: "150px" }}>
                  <option value="">— Todas —</option>
                  {Array.from(new Set(cabins.map((c: any) => c.capacity))).sort((a: any, b: any) => a - b).map((cap: any) => (
                    <option key={cap} value={String(cap)}>{cap} personas</option>
                  ))}
                </select>
              </div>
              <div style={{ display: "flex", alignItems: "flex-end", gap: "10px", marginLeft: "auto" }}>
                <span style={{ fontSize: "11px", color: "#4a3868", paddingBottom: "10px" }}>
                  {filteredCabins.length} de {cabins.length} cabañas
                </span>
                {(filterCabinTenant || filterCabinEstado || filterCabinCapacidad) && (
                  <button
                    onClick={() => { setFilterCabinTenant(""); setFilterCabinEstado(""); setFilterCabinCapacidad("") }}
                    style={{ background: "transparent", border: "1px solid #e63946", borderRadius: "8px", color: "#e63946", fontSize: "12px", padding: "8px 16px", cursor: "pointer", fontFamily: "sans-serif" }}>
                    Limpiar ✕
                  </button>
                )}
              </div>
            </div>
            <div style={{ overflowX: "auto" as const, borderRadius: "14px", border: "1px solid #1e1428" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" as const }}>
                <thead>
                  <tr>
                    <th style={{ ...TH, cursor: "pointer", userSelect: "none" as const }} onClick={() => setCabinSort(s => ({ key: "tenant_name", dir: s.key === "tenant_name" ? (s.dir === "asc" ? "desc" : "asc") : "asc" }))}>
                      Cliente{cabinSort.key === "tenant_name" ? (cabinSort.dir === "asc" ? " ↑" : " ↓") : " ↕"}
                    </th>
                    {["Nombre", "Capacidad", "Precio/noche", "Limpieza", "Estado"].map(h => <th key={h} style={TH}>{h}</th>)}
                    <th style={{ ...TH, cursor: "pointer", userSelect: "none" as const }} onClick={() => setCabinSort(s => ({ key: "created_at", dir: s.key === "created_at" ? (s.dir === "asc" ? "desc" : "asc") : "asc" }))}>
                      Fecha de ingreso{cabinSort.key === "created_at" ? (cabinSort.dir === "asc" ? " ↑" : " ↓") : " ↕"}
                    </th>
                    <th style={TH}>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredCabins.length === 0
                    ? <tr><td colSpan={8} style={{ padding: "40px", textAlign: "center" as const, color: "#3a2e50", fontSize: "13px" }}>Sin resultados con esos filtros</td></tr>
                    : null}
                  {filteredCabins.map((c: any) => (
                    <tr key={c.id}>
                      <td style={{ ...TD, color: "#9a78c8", fontSize: "11px" }}>{tenantMap[c.tenant_id] || c.tenant_id}</td>
                      <td style={{ ...TD, color: "#e8d5f8", fontWeight: 600 }}>{c.name}</td>
                      <td style={TD}>{c.capacity} personas</td>
                      <td style={{ ...TD, fontFamily: "Georgia,serif", color: "#c8b878" }}>{fmt(c.base_price_night || 0)}</td>
                      <td style={{ ...TD, color: "#6a5888" }}>{c.cleaning_fee ? fmt(c.cleaning_fee) : "—"}</td>
                      <td style={TD}>
                        <span style={{ fontSize: "11px", fontWeight: 600, color: c.active ? "#27ae60" : "#e63946" }}>
                          {c.active ? "Activa" : "Inactiva"}
                        </span>
                      </td>
                      <td style={{ ...TD, fontSize: "11px", color: "#5a4870" }}>{fmtDate(c.created_at)}</td>
                      <td style={TD}>
                        <div style={{ display: "flex", gap: "6px" }}>
                          <button onClick={() => setModal({ type: "cabin", data: { ...c } })} style={BTN("#9a78c8")}>Editar</button>
                          <button onClick={() => saveCabin({ action: "toggle", id: c.id, active: !c.active })} style={BTN(c.active ? "#e63946" : "#27ae60")}>
                            {c.active ? "Desactivar" : "Activar"}
                          </button>
                          <button onClick={() => setModal({ type: "delete-cabin", data: { id: c.id, name: c.name } })} style={BTN("#e63946")}>Eliminar</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ══ TAB 3: RESERVAS ══ */}
        {tab === 3 && <ReservasTab bookings={bookings} tenantMap={tenantMap} cabinMap={cabinMap} />}

        {/* ══ TAB 4: TOKENS ══ */}
        {tab === 4 && (
          <div>
            <SectionHeader title="Tokens de acceso" />
            {newTokenValue && (
              <div style={{ background: "#0a1a0a", border: "1px solid #27ae6060", borderRadius: "12px", padding: "16px 20px", marginBottom: "20px" }}>
                <div style={{ fontSize: "11px", color: "#27ae60", marginBottom: "8px", fontWeight: 600 }}>Token generado — cópialo ahora, no volverá a mostrarse</div>
                <div style={{ fontFamily: "monospace", fontSize: "13px", color: "#7ab87a", wordBreak: "break-all" as const, background: "#060e06", padding: "10px 14px", borderRadius: "8px" }}>{newTokenValue}</div>
                <div style={{ fontSize: "11px", color: "#3a5a38", marginTop: "8px" }}>URL de acceso: /?token={newTokenValue}</div>
                <button onClick={() => setNewTokenValue(null)} style={{ ...BTN("#e63946"), marginTop: "10px" }}>Cerrar</button>
              </div>
            )}
            <div style={{ overflowX: "auto" as const, borderRadius: "14px", border: "1px solid #1e1428" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" as const }}>
                <thead>
                  <tr>
                    {["Cliente", "Token (hash parcial)", "Estado", "Creado", "Último acceso", "Acciones"].map(h => <th key={h} style={TH}>{h}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {tokens.map((tk: any) => (
                    <tr key={tk.id}>
                      <td style={{ ...TD, color: "#9a78c8" }}>{tenantMap[tk.tenant_id] || tk.tenant_id}</td>
                      <td style={{ ...TD, fontFamily: "monospace", fontSize: "11px", color: "#5a4870" }}>{tk.token_hash.slice(0, 16) + "..."}</td>
                      <td style={TD}>
                        <span style={{ fontSize: "11px", fontWeight: 600, color: tk.active ? "#27ae60" : "#e63946" }}>
                          {tk.active ? "Activo" : "Inactivo"}
                        </span>
                      </td>
                      <td style={{ ...TD, fontSize: "11px" }}>{fmtDT(tk.created_at)}</td>
                      <td style={{ ...TD, fontSize: "11px", color: "#5a4870" }}>{tk.last_used_at ? fmtDT(tk.last_used_at) : "—"}</td>
                      <td style={TD}>
                        {tk.active && <button onClick={() => deactivateToken(tk.id)} disabled={saving} style={BTN("#e63946")}>Revocar</button>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div style={{ marginTop: "24px" }}>
              <SectionHeader title="Generar nuevo token" />
              <div style={{ display: "flex", flexWrap: "wrap" as const, gap: "10px" }}>
                {tenants.filter((t: any) => t.active).map((t: any) => (
                  <button key={t.id} onClick={() => generateToken(t.id)} disabled={saving}
                    style={{ background: "#100d14", border: "1px solid #2a1e38", borderRadius: "10px", color: "#9a78c8", fontSize: "12px", padding: "10px 18px", cursor: saving ? "not-allowed" : "pointer", fontFamily: "sans-serif" }}>
                    {t.business_name}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ══ TAB 5: AUDITORÍA ══ */}
        {tab === 5 && (
          <div>
            <AuditClient
              rows={auditRows}
              tenantMap={tenantMap}
              cabinMap={cabinMap}
            />
          </div>
        )}

        {/* ══ TAB 6: COMISIONES ══ */}
        {tab === 6 && <ComisionesTab bookings={bookings} tenants={tenants} tenantMap={tenantMap} adminToken={adminToken} />}

      </main>

      {/* ══ ONBOARDING NUEVO CLIENTE ══ */}
      {modal?.type === "tenant-new" && (
        <NewClientOnboarding
          adminToken={adminToken}
          onClose={() => setModal(null)}
          onCreated={(data) => {
            setTenants((p) => [...p, data.tenant])
            setCabins((p) => [...p, ...((data.cabins || []) as Record<string, unknown>[])])
            setTokens((p) => [...p, data.dashboard_link])
          }}
        />
      )}

      {/* ══ MODAL TENANT (editar) ══ */}
      {modal?.type === "tenant" && modal.data?.id && (
        <TenantModal data={modal.data} saving={saving} onSave={saveTenant} onSaveMp={saveMp} onClose={() => setModal(null)} tenants={tenants} />
      )}

      {/* ══ MODAL CABIN ══ */}
      {modal?.type === "cabin" && (
        <CabinModal data={modal.data} saving={saving} onSave={saveCabin} onClose={() => setModal(null)} tenants={tenants} />
      )}

      {/* ══ MODAL ELIMINAR TENANT ══ */}
      {modal?.type === "delete-tenant" && (
        <div style={MODAL_BG} onClick={e => { if (e.target === e.currentTarget) setModal(null) }}>
          <div style={MODAL_BOX}>
            <div style={{ fontFamily: "Georgia,serif", fontSize: "18px", color: "#e8d5a3", marginBottom: "16px" }}>Eliminar cliente</div>
            <p style={{ fontSize: "14px", color: "#c8b8e0", lineHeight: 1.7, marginBottom: "8px" }}>
              {"¿Estás seguro de eliminar "}<strong style={{ color: "#e8d5f8" }}>{modal.data.business_name}</strong>{"? Se eliminarán todas sus cabañas, reservas y links de acceso. Esta acción no se puede deshacer."}
            </p>
            <div style={{ display: "flex", gap: "10px", marginTop: "24px" }}>
              <button onClick={() => deleteTenant(modal.data.id)} disabled={saving}
                style={{ flex: 1, padding: "12px", background: "#e63946", border: "none", borderRadius: "10px", color: "white", fontSize: "13px", fontWeight: 700, cursor: saving ? "not-allowed" : "pointer", fontFamily: "sans-serif" }}>
                {saving ? "Eliminando..." : "Eliminar definitivamente"}
              </button>
              <button onClick={() => setModal(null)} style={{ flex: 1, padding: "12px", background: "transparent", border: "1px solid #2a1e38", borderRadius: "10px", color: "#5a4870", fontSize: "13px", cursor: "pointer", fontFamily: "sans-serif" }}>
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══ MODAL ELIMINAR CABAÑA ══ */}
      {modal?.type === "delete-cabin" && (
        <div style={MODAL_BG} onClick={e => { if (e.target === e.currentTarget) setModal(null) }}>
          <div style={MODAL_BOX}>
            <div style={{ fontFamily: "Georgia,serif", fontSize: "18px", color: "#e8d5a3", marginBottom: "16px" }}>{"Eliminar caba\u00f1a"}</div>
            <p style={{ fontSize: "14px", color: "#c8b8e0", lineHeight: 1.7, marginBottom: "8px" }}>
              {"¿Estás seguro de eliminar la cabaña "}<strong style={{ color: "#e8d5f8" }}>{modal.data.name}</strong>{"? Se eliminarán todos sus bloques de calendario y reservas. Esta acción no se puede deshacer."}
            </p>
            <div style={{ display: "flex", gap: "10px", marginTop: "24px" }}>
              <button onClick={() => deleteCabin(modal.data.id)} disabled={saving}
                style={{ flex: 1, padding: "12px", background: "#e63946", border: "none", borderRadius: "10px", color: "white", fontSize: "13px", fontWeight: 700, cursor: saving ? "not-allowed" : "pointer", fontFamily: "sans-serif" }}>
                {saving ? "Eliminando..." : "Eliminar definitivamente"}
              </button>
              <button onClick={() => setModal(null)} style={{ flex: 1, padding: "12px", background: "transparent", border: "1px solid #2a1e38", borderRadius: "10px", color: "#5a4870", fontSize: "13px", cursor: "pointer", fontFamily: "sans-serif" }}>
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ══ RESERVAS TAB ══════════════════════════
function ReservasTab({ bookings, tenantMap, cabinMap }: any) {
  const [search, setSearch] = useState("")
  const [filterTenant, setFilterTenant] = useState("")
  const [filterStatus, setFilterStatus] = useState("")
  const [filterYear, setFilterYear] = useState(new Date().getFullYear().toString())
  const IS: React.CSSProperties = { background: "#080610", border: "1px solid #2a1e38", borderRadius: "8px", color: "#c8b8e0", fontSize: "12px", padding: "7px 12px", outline: "none", fontFamily: "sans-serif" }

  const rows = useMemo(() => bookings.map((b: any) => {
    const n = parseNotes(b.notes)
    return {
      _b: b,
      Cliente: tenantMap[b.tenant_id] || b.tenant_id,
      Cabaña: cabinMap[b.cabin_id] || b.cabin_id,
      Nombre: n.nombre || "—",
      "Check-in": fmtDate(b.check_in),
      "Check-out": fmtDate(b.check_out),
      Noches: b.nights,
      Total: fmt(b.total_amount || 0),
      Estado: b.deleted_at ? "Cancelada" : b.status === "confirmed" ? "Confirmada" : "Pendiente",
      _color: b.deleted_at ? "#e63946" : b.status === "confirmed" ? "#27ae60" : "#f97316",
      Origen: n.origen || "—",
      Creada: fmtDate(b.created_at),
    }
  }), [bookings, tenantMap, cabinMap])

  const tenantNames = useMemo(() => Array.from(new Set(rows.map((r: any) => r.Cliente))).sort(), [rows])
  const years = useMemo(() => Array.from(new Set(bookings.map((b: any) => new Date(b.created_at).getFullYear().toString()))).sort((a: any, bv: any) => Number(bv) - Number(a)), [bookings])

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return rows.filter((r: any) => {
      if (filterTenant && r.Cliente !== filterTenant) return false
      if (filterStatus === "confirmada" && r.Estado !== "Confirmada") return false
      if (filterStatus === "pendiente" && r.Estado !== "Pendiente") return false
      if (filterStatus === "cancelada" && r.Estado !== "Cancelada") return false
      if (filterYear && new Date(r._b.created_at).getFullYear().toString() !== filterYear) return false
      if (q && ![r.Nombre, r.Cliente, r["Cabaña"]].some((v: string) => v.toLowerCase().includes(q))) return false
      return true
    })
  }, [rows, search, filterTenant, filterStatus, filterYear])

  const cols = ["Cliente", "Cabaña", "Nombre", "Check-in", "Check-out", "Noches", "Total", "Estado", "Origen", "Creada"]

  return (
    <div>
      <div style={{ display: "flex", flexWrap: "wrap" as const, gap: "10px", marginBottom: "18px", alignItems: "center" }}>
        <input type="text" placeholder="Buscar nombre, cliente..." value={search} onChange={e => setSearch(e.target.value)} style={{ ...IS, width: "200px" }} />
        <select value={filterTenant} onChange={e => setFilterTenant(e.target.value)} style={IS}>
          <option value="">Todos los clientes</option>
          {(tenantNames as string[]).map(t => <option key={t} value={t}>{t}</option>)}
        </select>
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} style={IS}>
          <option value="">Todos los estados</option>
          <option value="confirmada">Confirmada</option>
          <option value="pendiente">Pendiente</option>
          <option value="cancelada">Cancelada</option>
        </select>
        <select value={filterYear} onChange={e => setFilterYear(e.target.value)} style={IS}>
          <option value="">Todos los años</option>
          {(years as string[]).map(y => <option key={y} value={y}>{y}</option>)}
        </select>
        <span style={{ fontSize: "11px", color: "#3a2e50", marginLeft: "auto" }}>{filtered.length} reservas</span>
      </div>
      <div style={{ overflowX: "auto" as const, borderRadius: "14px", border: "1px solid #1e1428" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" as const }}>
          <thead><tr>{cols.map(c => <th key={c} style={TH}>{c}</th>)}</tr></thead>
          <tbody>
            {filtered.length === 0
              ? <tr><td colSpan={cols.length} style={{ ...TD, textAlign: "center" as const, padding: "40px", color: "#3a2e50" }}>Sin resultados</td></tr>
              : filtered.map((r: any, i: number) => (
                <tr key={i} style={{ background: r._b.deleted_at ? "#120808" : "transparent" }}>
                  {cols.map(c => (
                    <td key={c} style={{ ...TD, color: c === "Estado" ? r._color : c === "Total" ? "#c8b878" : "#c8b8e0", fontFamily: c === "Total" ? "Georgia,serif" : "sans-serif", fontWeight: c === "Estado" || c === "Total" ? 600 : 400 }}>
                      {(r as any)[c]}
                    </td>
                  ))}
                </tr>
              ))
            }
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ══ TENANT MODAL ══════════════════════════
function TenantModal({ data, saving, onSave, onSaveMp, onClose }: any) {
  const isNew = !data.id
  const [form, setForm] = useState({
    business_name: data.business_name || "",
    owner_name: data.owner_name || "",
    owner_whatsapp: data.owner_whatsapp || "",
    email_owner: data.email_owner || "",
    deposit_percent: data.deposit_percent || 20,
    gender: data.gender || "female",
    bank_name: data.bank_name || "",
    bank_account_type: data.bank_account_type || "",
    bank_account_number: data.bank_account_number || "",
    bank_account_holder: data.bank_account_holder || "",
    bank_rut: data.bank_rut || "",
    mp_access_token: data.mp_access_token || "",
    mp_enabled: data.mp_enabled ?? false,
    whatsapp_enabled: data.whatsapp_enabled ?? true,
    country: data.country || "CL",
    currency: data.currency || "CLP",
    location_text: data.location_text || "",
    location_maps_url: data.location_maps_url || "",
    tagline: data.tagline || "",
    activities: (data.activities || []) as Array<{icon: string; name: string}>,
    page_rules: (data.page_rules || []) as string[],
  })
  const set = (k: string) => (e: any) => setForm(p => ({ ...p, [k]: e.target.value }))
  const [newActIcon, setNewActIcon] = useState("")
  const [newActName, setNewActName] = useState("")
  const [newRule, setNewRule] = useState("")
  return (
    <div style={MODAL_BG} onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div style={MODAL_BOX}>
        <div style={{ fontFamily: "Georgia,serif", fontSize: "20px", color: "#e8d5a3", marginBottom: "22px" }}>
          {isNew ? "Nuevo cliente" : "Editar cliente"}
        </div>
        {[
          { key: "business_name", label: "Nombre del negocio", type: "text" },
          { key: "owner_name", label: "Nombre propietaria", type: "text" },
          { key: "owner_whatsapp", label: "WhatsApp propietaria", type: "text" },
          { key: "email_owner", label: "Email del propietario", type: "email" },
          { key: "deposit_percent", label: "% depósito (default 20)", type: "number" },
        ].map(f => (
          <div key={f.key} style={{ marginBottom: "16px" }}>
            <label style={LABEL}>{f.label}</label>
            <input type={f.type} value={(form as any)[f.key]} onChange={set(f.key)} style={INPUT} />
          </div>
        ))}
        <div style={{ marginBottom: "16px" }}>
          <label style={LABEL}>Género</label>
          <select value={form.gender} onChange={e => setForm(p => ({ ...p, gender: e.target.value }))} style={{ ...INPUT }}>
            <option value="female">Mujer — Bienvenida</option>
            <option value="male">Hombre — Bienvenido</option>
          </select>
        </div>
        <div style={{ marginBottom: "16px" }}>
          <label style={LABEL}>País (define la moneda)</label>
          <select value={form.country} onChange={e => {
            const countryToCurrency: Record<string, string> = { CL: "CLP", EC: "USD", CO: "COP", PE: "PEN", AR: "ARS", MX: "MXN", US: "USD" }
            setForm(p => ({ ...p, country: e.target.value, currency: countryToCurrency[e.target.value] || "CLP" }))
          }} style={{ ...INPUT }}>
            <option value="CL">Chile — CLP ($)</option>
            <option value="EC">Ecuador — USD ($)</option>
            <option value="CO">Colombia — COP ($)</option>
            <option value="PE">Perú — PEN (S/)</option>
            <option value="AR">Argentina — ARS ($)</option>
            <option value="MX">México — MXN ($)</option>
          </select>
        </div>
        <div style={{ marginBottom: "16px", background: "#0d0918", border: "1px solid #2a1e38", borderRadius: "8px", padding: "8px 12px", fontSize: "12px", color: "#5a4870" }}>
          Moneda configurada: <strong style={{ color: "#c8b878" }}>{form.currency}</strong>
        </div>
        <div style={{ marginBottom: "16px" }}>
          <label style={LABEL}>Frase del hero (tagline)</label>
          <input type="text" value={form.tagline} onChange={set("tagline")}
            placeholder="Ej: Naturaleza, silencio y tú." style={INPUT} />
        </div>
        <div style={{ marginBottom: "16px" }}>
          <label style={LABEL}>Ubicación (texto visible)</label>
          <input type="text" value={form.location_text} onChange={set("location_text")}
            placeholder="Ej: Cacagual, Pichincha · Ecuador" style={INPUT} />
        </div>
        <div style={{ marginBottom: "16px" }}>
          <label style={LABEL}>Link Google Maps</label>
          <input type="text" value={form.location_maps_url} onChange={set("location_maps_url")}
            placeholder="https://maps.google.com/..." style={INPUT} />
        </div>
        <div style={{ marginBottom: "16px" }}>
          <label style={LABEL}>Actividades cercanas</label>
          <div style={{ display: "flex", flexDirection: "column" as const, gap: "5px", marginBottom: "8px" }}>
            {form.activities.map((act: any, i: number) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: "8px", background: "#080610", border: "1px solid #2a1e38", borderRadius: "8px", padding: "6px 10px" }}>
                <span style={{ fontSize: "16px" }}>{act.icon}</span>
                <span style={{ flex: 1, fontSize: "12px", color: "#c8b8e0" }}>{act.name}</span>
                <button onClick={() => setForm(p => ({ ...p, activities: p.activities.filter((_: any, j: number) => j !== i) }))}
                  style={{ background: "transparent", border: "none", color: "#e63946", cursor: "pointer", fontSize: "16px", padding: "0 4px" }}>×</button>
              </div>
            ))}
          </div>
          <div style={{ display: "flex", gap: "6px" }}>
            <input placeholder="Emoji" value={newActIcon} onChange={e => setNewActIcon(e.target.value)}
              style={{ ...INPUT, width: "60px", textAlign: "center" as const }} />
            <input placeholder="Nombre actividad" value={newActName} onChange={e => setNewActName(e.target.value)}
              style={{ ...INPUT, flex: 1 }} />
            <button onClick={() => {
              if (!newActName.trim()) return
              setForm(p => ({ ...p, activities: [...p.activities, { icon: newActIcon || "📍", name: newActName.trim() }] }))
              setNewActIcon(""); setNewActName("")
            }} style={{ background: "#7a5a98", border: "none", borderRadius: "8px", color: "white", fontSize: "12px", padding: "0 12px", cursor: "pointer", fontFamily: "sans-serif", whiteSpace: "nowrap" as const }}>
              + Agregar
            </button>
          </div>
        </div>
        <div style={{ marginBottom: "16px" }}>
          <label style={LABEL}>Normas del lugar</label>
          <div style={{ display: "flex", flexDirection: "column" as const, gap: "5px", marginBottom: "8px" }}>
            {form.page_rules.map((rule: string, i: number) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: "8px", background: "#080610", border: "1px solid #2a1e38", borderRadius: "8px", padding: "6px 10px" }}>
                <span style={{ flex: 1, fontSize: "12px", color: "#c8b8e0" }}>{rule}</span>
                <button onClick={() => setForm(p => ({ ...p, page_rules: p.page_rules.filter((_: any, j: number) => j !== i) }))}
                  style={{ background: "transparent", border: "none", color: "#e63946", cursor: "pointer", fontSize: "16px", padding: "0 4px" }}>×</button>
              </div>
            ))}
          </div>
          <div style={{ display: "flex", gap: "6px" }}>
            <input placeholder="Ej: No fumar adentro" value={newRule} onChange={e => setNewRule(e.target.value)}
              style={{ ...INPUT, flex: 1 }} />
            <button onClick={() => {
              if (!newRule.trim()) return
              setForm(p => ({ ...p, page_rules: [...p.page_rules, newRule.trim()] }))
              setNewRule("")
            }} style={{ background: "#7a5a98", border: "none", borderRadius: "8px", color: "white", fontSize: "12px", padding: "0 12px", cursor: "pointer", fontFamily: "sans-serif", whiteSpace: "nowrap" as const }}>
              + Agregar
            </button>
          </div>
        </div>
        <div style={{ marginBottom: "16px", display: "flex", alignItems: "center", gap: "12px" }}>
          <input
            type="checkbox"
            id="wa-enabled"
            checked={form.whatsapp_enabled}
            onChange={e => setForm(p => ({ ...p, whatsapp_enabled: e.target.checked }))}
            style={{ width: "16px", height: "16px", cursor: "pointer" }}
          />
          <label htmlFor="wa-enabled" style={{ ...LABEL, marginBottom: 0, cursor: "pointer" }}>
            Notificaciones WhatsApp habilitadas
          </label>
        </div>
        <div style={{ borderTop: "1px solid #2a1e38", paddingTop: "16px", marginBottom: "4px" }}>
          <div style={{ fontSize: "10px", letterSpacing: "1.5px", textTransform: "uppercase" as const, color: "#5a4870", marginBottom: "14px" }}>Datos bancarios</div>
        </div>
        {[
          { key: "bank_name", label: "Nombre del banco" },
          { key: "bank_account_type", label: "Tipo de cuenta" },
          { key: "bank_account_number", label: "Número de cuenta" },
          { key: "bank_account_holder", label: "Titular de la cuenta" },
          { key: "bank_rut", label: "RUT titular" },
        ].map(f => (
          <div key={f.key} style={{ marginBottom: "16px" }}>
            <label style={LABEL}>{f.label}</label>
            <input type="text" value={(form as any)[f.key]} onChange={set(f.key)} style={INPUT} />
          </div>
        ))}
        {!isNew && (
          <>
            <div style={{ borderTop: "1px solid #2a1e38", paddingTop: "16px", marginBottom: "4px" }}>
              <div style={{ fontSize: "10px", letterSpacing: "1.5px", textTransform: "uppercase" as const, color: "#5a4870", marginBottom: "14px" }}>Mercado Pago</div>
            </div>
            <div style={{ marginBottom: "16px" }}>
              <label style={LABEL}>Access Token</label>
              <input type="text" value={form.mp_access_token} onChange={e => setForm(p => ({ ...p, mp_access_token: e.target.value }))} placeholder="APP_USR-..." style={INPUT} />
            </div>
            <div style={{ marginBottom: "16px", display: "flex", alignItems: "center", gap: "12px" }}>
              <input
                type="checkbox"
                id="mp-enabled"
                checked={form.mp_enabled}
                disabled={!form.mp_access_token.trim()}
                onChange={e => setForm(p => ({ ...p, mp_enabled: e.target.checked }))}
                style={{ width: "16px", height: "16px", cursor: form.mp_access_token.trim() ? "pointer" : "not-allowed" }}
              />
              <label htmlFor="mp-enabled" style={{ ...LABEL, marginBottom: 0, cursor: form.mp_access_token.trim() ? "pointer" : "not-allowed", opacity: form.mp_access_token.trim() ? 1 : 0.5 }}>
                Activar pago con Mercado Pago
              </label>
            </div>
            <button
              onClick={() => onSaveMp({ id: data.id, mp_access_token: form.mp_access_token, mp_enabled: form.mp_enabled })}
              disabled={saving}
              style={{ width: "100%", padding: "10px", background: "#009ee3", border: "none", borderRadius: "10px", color: "white", fontSize: "13px", fontWeight: 700, cursor: saving ? "not-allowed" : "pointer", fontFamily: "sans-serif", marginBottom: "16px", opacity: saving ? 0.8 : 1 }}
            >
              {saving ? "Guardando..." : "Guardar configuración MP"}
            </button>
          </>
        )}
        <div style={{ display: "flex", gap: "10px", marginTop: "8px" }}>
          <button onClick={() => onSave({ action: isNew ? "create" : "update", id: data.id, ...form })} disabled={saving}
            style={{ flex: 1, padding: "12px", background: "#7a5a98", border: "none", borderRadius: "10px", color: "white", fontSize: "13px", fontWeight: 700, cursor: saving ? "not-allowed" : "pointer", fontFamily: "sans-serif" }}>
            {saving ? "Guardando..." : "Guardar"}
          </button>
          <button onClick={onClose} style={{ flex: 1, padding: "12px", background: "transparent", border: "1px solid #2a1e38", borderRadius: "10px", color: "#5a4870", fontSize: "13px", cursor: "pointer", fontFamily: "sans-serif" }}>
            Cancelar
          </button>
        </div>
      </div>
    </div>
  )
}

// ══ COMISIONES TAB ════════════════════════
function ComisionesTab({ bookings, tenants, tenantMap, adminToken }: any) {
  const [filterTenant, setFilterTenant] = useState("")
  const [filterStatus, setFilterStatus] = useState("")
  const [filterYear, setFilterYear] = useState(new Date().getFullYear().toString())
  const [saving, setSaving] = useState(false)
  const IS: React.CSSProperties = { background: "#080610", border: "1px solid #2a1e38", borderRadius: "8px", color: "#c8b8e0", fontSize: "12px", padding: "7px 12px", outline: "none", fontFamily: "sans-serif" }

  const commissionable = useMemo(() =>
    bookings.filter((b: any) =>
      b.status === "confirmed" &&
      !b.deleted_at &&
      b.commission_status !== "not_applicable" &&
      b.commission_amount > 0
    ), [bookings])

  const tenantNames = useMemo(() => Array.from(new Set(commissionable.map((b: any) => tenantMap[b.tenant_id] || b.tenant_id))).sort(), [commissionable, tenantMap])
  const years = useMemo(() => Array.from(new Set(commissionable.map((b: any) => new Date(b.check_in).getFullYear().toString()))).sort((a: any, b: any) => Number(b) - Number(a)), [commissionable])

  const filtered = useMemo(() => {
    return commissionable.filter((b: any) => {
      if (filterTenant && tenantMap[b.tenant_id] !== filterTenant) return false
      if (filterStatus && b.commission_status !== filterStatus) return false
      if (filterYear && new Date(b.check_in).getFullYear().toString() !== filterYear) return false
      return true
    })
  }, [commissionable, filterTenant, filterStatus, filterYear, tenantMap])

  const totalPending = filtered.filter((b: any) => b.commission_status === "pending").reduce((s: number, b: any) => s + (b.commission_amount || 0), 0)
  const totalPaid = filtered.filter((b: any) => b.commission_status === "paid").reduce((s: number, b: any) => s + (b.commission_amount || 0), 0)
  const totalFiltered = filtered.reduce((s: number, b: any) => s + (b.commission_amount || 0), 0)

  async function markPaid(bookingId: string) {
    setSaving(true)
    try {
      const res = await fetch("/api/admin/commissions", {
        method: "PATCH",
        headers: { "Content-Type": "application/json", "x-admin-token": adminToken },
        body: JSON.stringify({ booking_id: bookingId, commission_status: "paid" }),
      })
      if (res.ok) {
        window.location.reload()
      } else {
        const r = await res.json()
        alert(r.error || "Error al marcar como pagada")
      }
    } finally {
      setSaving(false)
    }
  }

  const statusColor = (s: string) => s === "paid" ? "#27ae60" : s === "pending" ? "#f97316" : "#5a4870"
  const statusLabel = (s: string) => s === "paid" ? "Pagada" : s === "pending" ? "Pendiente" : s || "—"

  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "12px", marginBottom: "24px" }}>
        <div style={{ background: "#100d14", border: "1px solid #2a1e38", borderRadius: "14px", padding: "16px 18px" }}>
          <div style={{ fontSize: "10px", letterSpacing: "1.5px", textTransform: "uppercase" as const, color: "#5a4870", marginBottom: "6px" }}>Pendientes</div>
          <div style={{ fontFamily: "Georgia,serif", fontSize: "22px", color: "#f97316" }}>{fmt(totalPending)}</div>
        </div>
        <div style={{ background: "#100d14", border: "1px solid #2a1e38", borderRadius: "14px", padding: "16px 18px" }}>
          <div style={{ fontSize: "10px", letterSpacing: "1.5px", textTransform: "uppercase" as const, color: "#5a4870", marginBottom: "6px" }}>Pagadas</div>
          <div style={{ fontFamily: "Georgia,serif", fontSize: "22px", color: "#27ae60" }}>{fmt(totalPaid)}</div>
        </div>
        <div style={{ background: "#100d14", border: "1px solid #2a1e38", borderRadius: "14px", padding: "16px 18px" }}>
          <div style={{ fontSize: "10px", letterSpacing: "1.5px", textTransform: "uppercase" as const, color: "#5a4870", marginBottom: "6px" }}>Total vista</div>
          <div style={{ fontFamily: "Georgia,serif", fontSize: "22px", color: "#c8b878" }}>{fmt(totalFiltered)}</div>
        </div>
      </div>

      <div style={{ display: "flex", flexWrap: "wrap" as const, gap: "10px", marginBottom: "18px", alignItems: "center" }}>
        <select value={filterTenant} onChange={e => setFilterTenant(e.target.value)} style={IS}>
          <option value="">Todos los clientes</option>
          {(tenantNames as string[]).map(t => <option key={t} value={t}>{t}</option>)}
        </select>
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} style={IS}>
          <option value="">Todos los estados</option>
          <option value="pending">Pendiente</option>
          <option value="paid">Pagada</option>
        </select>
        <select value={filterYear} onChange={e => setFilterYear(e.target.value)} style={IS}>
          <option value="">Todos los años</option>
          {(years as string[]).map(y => <option key={y} value={y}>{y}</option>)}
        </select>
        <span style={{ fontSize: "11px", color: "#3a2e50", marginLeft: "auto" }}>{filtered.length} reservas</span>
      </div>

      <div style={{ overflowX: "auto" as const, borderRadius: "14px", border: "1px solid #1e1428" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" as const }}>
          <thead>
            <tr>
              {["Cliente", "Check-in", "Huésped", "Total", "Comisión", "Estado", "Acción"].map(h => <th key={h} style={TH}>{h}</th>)}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0
              ? <tr><td colSpan={7} style={{ ...TD, textAlign: "center" as const, padding: "40px", color: "#3a2e50" }}>Sin comisiones con esos filtros</td></tr>
              : filtered.map((b: any) => (
                <tr key={b.id}>
                  <td style={{ ...TD, color: "#9a78c8", fontSize: "11px" }}>{tenantMap[b.tenant_id] || "—"}</td>
                  <td style={{ ...TD, fontSize: "11px" }}>{fmtDate(b.check_in)}</td>
                  <td style={{ ...TD, fontSize: "12px" }}>{(() => { try { const n = JSON.parse(b.notes || "{}"); return n.nombre || "—" } catch { return "—" } })()}</td>
                  <td style={{ ...TD, fontFamily: "Georgia,serif", color: "#c8b878" }}>{fmt(b.total_amount || 0)}</td>
                  <td style={{ ...TD, fontFamily: "Georgia,serif", color: "#e8d5a3", fontWeight: 600 }}>{fmt(b.commission_amount || 0)}</td>
                  <td style={TD}>
                    <span style={{ fontSize: "11px", fontWeight: 600, color: statusColor(b.commission_status), background: statusColor(b.commission_status) + "15", border: "1px solid " + statusColor(b.commission_status) + "30", padding: "2px 8px", borderRadius: "6px" }}>
                      {statusLabel(b.commission_status)}
                    </span>
                  </td>
                  <td style={TD}>
                    {b.commission_status === "pending" && (
                      <button
                        onClick={() => markPaid(b.id)}
                        disabled={saving}
                        style={BTN("#27ae60")}
                      >
                        Marcar pagada
                      </button>
                    )}
                  </td>
                </tr>
              ))
            }
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ══ CABIN MODAL ═══════════════════════════
function CabinModal({ data, saving, onSave, onClose, tenants }: any) {
  const isNew = !data.id
  const [form, setForm] = useState({
    tenant_id: data.tenant_id || (tenants[0]?.id || ""),
    name: data.name || "",
    capacity: data.capacity || 4,
    base_price_night: data.base_price_night || 0,
    cleaning_fee: data.cleaning_fee || 0,
    extra_person_price: data.extra_person_price || 0,
    amenities: data.amenities || "",
    description: data.description || "",
    extras: (data.extras || []) as Array<{name: string; price: number}>,
    pricing_tiers: (data?.pricing_tiers || []) as Array<{min_guests: number; max_guests: number; price_per_night: number}>,
  })
  const set = (k: string) => (e: any) => setForm(p => ({ ...p, [k]: e.target.value }))
  const [newExtraName, setNewExtraName] = useState("")
  const [newExtraPrice, setNewExtraPrice] = useState("")
  return (
    <div style={MODAL_BG} onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div style={MODAL_BOX}>
        <div style={{ fontFamily: "Georgia,serif", fontSize: "20px", color: "#e8d5a3", marginBottom: "22px" }}>
          {isNew ? "Nueva cabaña" : "Editar cabaña"}
        </div>
        {isNew && (
          <div style={{ marginBottom: "16px" }}>
            <label style={LABEL}>Cliente</label>
            <select value={form.tenant_id} onChange={set("tenant_id")} style={{ ...INPUT }}>
              {tenants.map((t: any) => <option key={t.id} value={t.id}>{t.business_name}</option>)}
            </select>
          </div>
        )}
        {[
          { key: "name", label: "Nombre de la cabaña", type: "text" },
          { key: "capacity", label: "Capacidad (personas)", type: "number" },
          { key: "base_price_night", label: "Precio base por noche ($)", type: "number" },
          { key: "cleaning_fee", label: "Fee de limpieza ($)", type: "number" },
          { key: "extra_person_price", label: "Precio por persona extra ($)", type: "number" },
        ].map(f => (
          <div key={f.key} style={{ marginBottom: "16px" }}>
            <label style={LABEL}>{f.label}</label>
            <input type={f.type} value={(form as any)[f.key]} onChange={set(f.key)} style={INPUT} />
          </div>
        ))}
        <div style={{ marginBottom: "16px" }}>
          <label style={LABEL}>Descripción de la cabaña</label>
          <textarea value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
            placeholder="Describe la cabaña, sus características, vistas, etc."
            style={{ ...INPUT, minHeight: "80px", resize: "vertical" as const }} />
        </div>
        <div style={{ marginBottom: "16px" }}>
          <label style={LABEL}>Amenidades (una por línea)</label>
          <textarea value={form.amenities} onChange={e => setForm(p => ({ ...p, amenities: e.target.value }))}
            placeholder={"Agua caliente\nVista al lago\nCama king\nEstacionamiento"}
            style={{ ...INPUT, minHeight: "80px", resize: "vertical" as const }} />
        </div>
        <div style={{ marginBottom: "16px" }}>
          <label style={LABEL}>Extras con precio</label>
          <div style={{ display: "flex", flexDirection: "column" as const, gap: "6px", marginBottom: "10px" }}>
            {form.extras.map((ex: any, i: number) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: "8px", background: "#080610", border: "1px solid #2a1e38", borderRadius: "8px", padding: "7px 10px" }}>
                <span style={{ flex: 1, fontSize: "13px", color: "#c8b8e0" }}>{ex.name}</span>
                <span style={{ fontSize: "13px", color: "#c8b878" }}>${ex.price}</span>
                <button onClick={() => setForm(p => ({ ...p, extras: p.extras.filter((_: any, j: number) => j !== i) }))}
                  style={{ background: "transparent", border: "none", color: "#e63946", cursor: "pointer", fontSize: "16px", padding: "0 4px" }}>×</button>
              </div>
            ))}
          </div>
          <div style={{ display: "flex", gap: "8px" }}>
            <input placeholder="Nombre del extra" value={newExtraName} onChange={e => setNewExtraName(e.target.value)}
              style={{ ...INPUT, flex: 2 }} />
            <input placeholder="Precio" type="number" value={newExtraPrice} onChange={e => setNewExtraPrice(e.target.value)}
              style={{ ...INPUT, flex: 1 }} />
            <button onClick={() => {
              if (!newExtraName.trim() || !newExtraPrice) return
              setForm(p => ({ ...p, extras: [...p.extras, { name: newExtraName.trim(), price: Number(newExtraPrice) }] }))
              setNewExtraName(""); setNewExtraPrice("")
            }} style={{ background: "#7a5a98", border: "none", borderRadius: "8px", color: "white", fontSize: "13px", padding: "0 14px", cursor: "pointer", fontFamily: "sans-serif", whiteSpace: "nowrap" as const }}>
              + Agregar
            </button>
          </div>
        </div>
        <div style={{ marginBottom: "20px", borderTop: "1px solid #1a0e2a", paddingTop: "20px" }}>
          <label style={LABEL}>PRECIOS POR OCUPACIÓN (OPCIONAL)</label>
          <div style={{ fontSize: "11px", color: "#5a4870", marginBottom: "10px" }}>Si el precio varía según cuántas personas van, configúralo aquí.</div>
          {(form.pricing_tiers || []).map((tier: any, i: number) => (
            <div key={i} style={{ display: "flex", gap: "8px", alignItems: "flex-end", marginBottom: "8px" }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: "10px", color: "#5a4870", marginBottom: "4px" }}>Desde</div>
                <input type="number" value={tier.min_guests}
                  onChange={e => { const v = Number(e.target.value); setForm(p => ({ ...p, pricing_tiers: p.pricing_tiers.map((t: any, j: number) => j === i ? { ...t, min_guests: v } : t) })) }}
                  style={INPUT} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: "10px", color: "#5a4870", marginBottom: "4px" }}>Hasta</div>
                <input type="number" value={tier.max_guests}
                  onChange={e => { const v = Number(e.target.value); setForm(p => ({ ...p, pricing_tiers: p.pricing_tiers.map((t: any, j: number) => j === i ? { ...t, max_guests: v } : t) })) }}
                  style={INPUT} />
              </div>
              <div style={{ flex: 2 }}>
                <div style={{ fontSize: "10px", color: "#5a4870", marginBottom: "4px" }}>Precio/noche</div>
                <input type="number" value={tier.price_per_night}
                  onChange={e => { const v = Number(e.target.value); setForm(p => ({ ...p, pricing_tiers: p.pricing_tiers.map((t: any, j: number) => j === i ? { ...t, price_per_night: v } : t) })) }}
                  style={INPUT} />
              </div>
              <button onClick={() => setForm(p => ({ ...p, pricing_tiers: p.pricing_tiers.filter((_: any, j: number) => j !== i) }))}
                style={{ background: "transparent", border: "none", color: "#e63946", cursor: "pointer", fontSize: "18px", padding: "8px 4px", flexShrink: 0 }}>
                ×
              </button>
            </div>
          ))}
          <button onClick={() => setForm(p => ({ ...p, pricing_tiers: [...p.pricing_tiers, { min_guests: 1, max_guests: 2, price_per_night: 0 }] }))}
            style={{ background: "transparent", border: "1px solid #2a1e38", borderRadius: "8px", color: "#7a5a98", fontSize: "12px", padding: "8px 16px", cursor: "pointer", fontFamily: "sans-serif" }}>
            + Agregar tramo
          </button>
        </div>
        <div style={{ display: "flex", gap: "10px", marginTop: "24px" }}>
          <button onClick={() => onSave({ action: isNew ? "create" : "update", id: data.id, ...form })} disabled={saving}
            style={{ flex: 1, padding: "12px", background: "#7a5a98", border: "none", borderRadius: "10px", color: "white", fontSize: "13px", fontWeight: 700, cursor: saving ? "not-allowed" : "pointer", fontFamily: "sans-serif" }}>
            {saving ? "Guardando..." : "Guardar"}
          </button>
          <button onClick={onClose} style={{ flex: 1, padding: "12px", background: "transparent", border: "1px solid #2a1e38", borderRadius: "10px", color: "#5a4870", fontSize: "13px", cursor: "pointer", fontFamily: "sans-serif" }}>
            Cancelar
          </button>
        </div>
      </div>
    </div>
  )
}
