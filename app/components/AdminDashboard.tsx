"use client"
import { useState, useMemo } from "react"
import AuditClient from "./AuditClient"
import NewClientOnboarding from "./NewClientOnboarding"

// ── helpers ──────────────────────────────
function fmt(n: number) { return "$" + Math.round(n).toLocaleString("es-CL") }
function fmtDate(s: string) { if (!s) return ""; return new Date(s.length === 10 ? s + "T12:00:00" : s).toLocaleDateString("es-CL", { day: "2-digit", month: "2-digit", year: "numeric" }) }
function fmtDT(s: string) { if (!s) return ""; return new Date(s).toLocaleString("es-CL", { day: "2-digit", month: "2-digit", year: "2-digit", hour: "2-digit", minute: "2-digit" }) }
const MONTHS = ["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"]
function parseNotes(notes: any): Record<string, string> {
  if (!notes) return {}
  const obj = typeof notes === "object" ? notes : typeof notes === "string" && notes.trimStart().startsWith("{") ? (() => { try { return JSON.parse(notes) } catch { return null } })() : null
  if (obj) return { nombre: obj.nombre || obj.Nombre || "", whatsapp: obj.whatsapp || obj.WhatsApp || "", origen: obj.origen || "" }
  const r: Record<string,string> = {}
  String(notes).split("|").forEach(p => { const i = p.indexOf(":"); if (i > -1) r[p.slice(0,i).trim().toLowerCase()] = p.slice(i+1).trim() })
  return r
}

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
const MODAL_BOX: React.CSSProperties = { background: "#0d0918", border: "1px solid #2a1e38", borderRadius: "20px", padding: "28px", width: "100%", maxWidth: "480px", maxHeight: "90vh", overflowY: "auto" }
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

  const tabs = ["Resumen", "Clientes", "Cabañas", "Reservas", "Tokens", "Auditoría"]

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
                    {["Propietaria", "WhatsApp", "Depósito %", "Estado", "Verificado"].map(h => <th key={h} style={TH}>{h}</th>)}
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
                      <td style={{ ...TD, fontSize: "11px", color: "#5a4870" }}>{fmtDate(t.created_at)}</td>
                      <td style={TD}>
                        <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" as const }}>
                          <button onClick={() => setModal({ type: "tenant", data: { ...t } })} style={BTN("#9a78c8")}>Editar</button>
                          <button onClick={() => saveTenant({ action: "toggle", id: t.id, active: !t.active })} style={BTN(t.active ? "#e63946" : "#27ae60")}>
                            {t.active ? "Desactivar" : "Activar"}
                          </button>
                          {t.slug && (
                            <a href={"https://" + t.slug + ".takai.cl"} target="_blank" rel="noopener noreferrer" style={{ ...BTN("#7ab87a"), textDecoration: "none", display: "inline-flex", alignItems: "center" }}>
                              Ver página
                            </a>
                          )}
                          {t.dashboard_token && (
                            <a href={"https://panel.takai.cl/?token=" + t.dashboard_token} target="_blank" rel="noopener noreferrer" style={{ ...BTN("#c8b878"), textDecoration: "none", display: "inline-flex", alignItems: "center" }}>
                              Abrir panel
                            </a>
                          )}
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
                  {sortedCabins.map((c: any) => (
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

      </main>

      {/* ══ ONBOARDING NUEVO CLIENTE ══ */}
      {modal?.type === "tenant-new" && (
        <NewClientOnboarding
          adminToken={adminToken}
          onClose={() => setModal(null)}
          onCreated={(data) => {
            setTenants((p) => [...p, data.tenant as any])
            setCabins((p) => [...p, ...((data.cabins || []) as any[])])
            setTokens((p) => [...p, data.dashboard_link as any])
          }}
        />
      )}

      {/* ══ MODAL TENANT (editar) ══ */}
      {modal?.type === "tenant" && modal.data?.id && (
        <TenantModal data={modal.data} saving={saving} onSave={saveTenant} onClose={() => setModal(null)} tenants={tenants} />
      )}

      {/* ══ MODAL CABIN ══ */}
      {modal?.type === "cabin" && (
        <CabinModal data={modal.data} saving={saving} onSave={saveCabin} onClose={() => setModal(null)} tenants={tenants} />
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
      if (filterYear && !r.Creada.includes(filterYear.slice(-2))) return false
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
function TenantModal({ data, saving, onSave, onClose }: any) {
  const isNew = !data.id
  const [form, setForm] = useState({
    business_name: data.business_name || "",
    owner_name: data.owner_name || "",
    owner_whatsapp: data.owner_whatsapp || "",
    deposit_percent: data.deposit_percent || 20,
    gender: data.gender || "female",
    bank_name: data.bank_name || "",
    bank_account_type: data.bank_account_type || "",
    bank_account_number: data.bank_account_number || "",
    bank_account_holder: data.bank_account_holder || "",
    bank_rut: data.bank_rut || "",
    has_tinaja: data.has_tinaja ?? true,
  })
  const set = (k: string) => (e: any) => setForm(p => ({ ...p, [k]: e.target.value }))
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
        <div style={{ marginBottom: "20px", display: "flex", alignItems: "center", gap: "12px" }}>
          <input type="checkbox" id="has-tinaja" checked={form.has_tinaja} onChange={e => setForm(p => ({ ...p, has_tinaja: e.target.checked }))} style={{ width: "16px", height: "16px", cursor: "pointer" }} />
          <label htmlFor="has-tinaja" style={{ ...LABEL, marginBottom: 0, cursor: "pointer" }}>¿Tiene tinaja de madera?</label>
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

// ══ CABIN MODAL ═══════════════════════════
function CabinModal({ data, saving, onSave, onClose, tenants }: any) {
  const isNew = !data.id
  const [form, setForm] = useState({
    tenant_id: data.tenant_id || (tenants[0]?.id || ""),
    name: data.name || "",
    capacity: data.capacity || 4,
    base_price_night: data.base_price_night || 0,
    cleaning_fee: data.cleaning_fee || 0,
  })
  const set = (k: string) => (e: any) => setForm(p => ({ ...p, [k]: e.target.value }))
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
        ].map(f => (
          <div key={f.key} style={{ marginBottom: "16px" }}>
            <label style={LABEL}>{f.label}</label>
            <input type={f.type} value={(form as any)[f.key]} onChange={set(f.key)} style={INPUT} />
          </div>
        ))}
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
