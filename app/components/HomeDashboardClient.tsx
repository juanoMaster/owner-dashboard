"use client"

import { useEffect, useState, useCallback } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts"
import BookingsList from "./BookingsList"
import ManualBookingForm from "./ManualBookingForm"
import EmbedIframeSnippet from "./EmbedIframeSnippet"
import CabinPhotos from "./CabinPhotos"
import { getPersistedToken, setPersistedToken, clearPersistedToken } from "@/lib/takai-token"

type TenantRow = {
  owner_name: string | null
  business_name: string | null
  slug: string | null
  deposit_percent: number | null
  currency: string | null
  guidebook?: Record<string, string> | null
  google_review_url?: string | null
}

type SeasonPrice = {
  name: string
  start_md: string
  end_md: string
  price_per_night: number
  min_nights?: number
}

type StatsMonth = {
  label: string
  month: number
  year: number
  revenue: number
  nights: number
  bookings: number
}

function fmtCurrency(n: number, currency: string): string {
  if (currency === "USD") return "$" + Math.round(n).toLocaleString("en-US")
  if (currency === "COP") return "$" + Math.round(n).toLocaleString("es-CO")
  return "$" + Math.round(n).toLocaleString("es-CL", { maximumFractionDigits: 0 })
}

type DashboardPayload = {
  tenant_id: string
  tenant: TenantRow | null
  cabins: Array<{
    id: string
    name: string
    capacity: number
    base_price_night: number
    description: string | null
    cleaning_fee: number | null
    photos: string[] | null
    pricing_tiers: Array<{ min_guests: number; max_guests: number; price_per_night: number }> | null
    has_tinaja: boolean | null
    tinaja_price: number | null
    season_prices: SeasonPrice[] | null
  }>
  bookings: Array<{
    id: string
    cabin_id: string
    check_in: string
    check_out: string
    nights: number
    total_amount: number
    deposit_amount: number
    balance_amount: number
    notes: string | Record<string, string> | null
    status: string
    guest_name: string | null
    guest_email: string | null
    guest_phone: string | null
    booking_code: string | null
    created_at: string
  }>
}

function AccessDenied() {
  return (
    <div style={{ background: "#0d1a12", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "sans-serif", color: "#5a7058" }}>
      Acceso no autorizado
    </div>
  )
}

function LoadingScreen() {
  return (
    <div style={{ background: "#0d1a12", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "sans-serif", color: "#5a7058" }}>
      Cargando panel…
    </div>
  )
}

function StatCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div style={{ background: "#162618", border: "1px solid #2a3e28", borderRadius: "14px", padding: "16px 18px" }}>
      <div style={{ fontSize: "10px", letterSpacing: "1.5px", textTransform: "uppercase" as const, color: "#4a6a48", marginBottom: "6px" }}>{label}</div>
      <div style={{ fontFamily: "Georgia,serif", fontSize: "22px", color: "#e8d5a3", marginBottom: "2px" }}>{value}</div>
      {sub && <div style={{ fontSize: "11px", color: "#3a5a38" }}>{sub}</div>}
    </div>
  )
}

function CustomTooltip({ active, payload, label, currency }: any) {
  if (!active || !payload || !payload.length) return null
  return (
    <div style={{ background: "#162618", border: "1px solid #2a3e28", borderRadius: "10px", padding: "10px 14px", fontFamily: "sans-serif" }}>
      <div style={{ fontSize: "11px", color: "#7ab87a", marginBottom: "4px" }}>{label}</div>
      {payload.map((p: any) => (
        <div key={p.dataKey} style={{ fontSize: "13px", color: "#e8d5a3", fontFamily: "Georgia,serif" }}>
          {p.dataKey === "revenue" ? fmtCurrency(p.value, currency) : p.value + (p.dataKey === "nights" ? " noches" : " reservas")}
        </div>
      ))}
    </div>
  )
}

export default function HomeDashboardClient() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [status, setStatus] = useState<"loading" | "ready" | "denied">("loading")
  const [payload, setPayload] = useState<DashboardPayload | null>(null)
  const [sessionToken, setSessionToken] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState(0)
  const [stats, setStats] = useState<StatsMonth[] | null>(null)
  const [statsLoading, setStatsLoading] = useState(false)
  const [editingPrice, setEditingPrice] = useState<{ cabinId: string; value: string } | null>(null)
  const [savingPrice, setSavingPrice] = useState(false)
  const [editingField, setEditingField] = useState<{ cabinId: string; field: "capacity" | "cleaning_fee" | "description"; value: string } | null>(null)
  const [savingField, setSavingField] = useState(false)

  // Temporadas
  const [editingSeasons, setEditingSeasons] = useState<{ cabinId: string; seasons: SeasonPrice[] } | null>(null)
  const [addSeasonForm, setAddSeasonForm] = useState<{ name: string; start_md: string; end_md: string; price_per_night: string; min_nights: string } | null>(null)
  const [savingSeasons, setSavingSeasons] = useState(false)

  // Guidebook
  const [guidebookDraft, setGuidebookDraft] = useState<Record<string, string>>({})
  const [editingGuidebook, setEditingGuidebook] = useState(false)
  const [savingGuidebook, setSavingGuidebook] = useState(false)
  const [googleReviewUrlDraft, setGoogleReviewUrlDraft] = useState("")
  const [savingReviewUrl, setSavingReviewUrl] = useState(false)

  const load = useCallback(
    async (token: string, fromUrl: boolean) => {
      setStatus("loading")
      try {
        const res = await fetch("/api/dashboard?token=" + encodeURIComponent(token), { cache: "no-store" })
        if (!res.ok) {
          if (!fromUrl) clearPersistedToken()
          setPayload(null)
          setSessionToken(null)
          setStatus("denied")
          return
        }
        const data = (await res.json()) as DashboardPayload
        try {
          setPersistedToken(token)
          if (fromUrl) router.replace("/")
        } catch { /* ignore */ }
        setSessionToken(token)
        setPayload(data)
        setStatus("ready")
      } catch {
        setPayload(null)
        setSessionToken(null)
        setStatus("denied")
      }
    },
    [router]
  )

  const refreshDashboard = useCallback(async (): Promise<boolean> => {
    const token = sessionToken
    if (!token) return false
    try {
      const res = await fetch("/api/dashboard?token=" + encodeURIComponent(token), { cache: "no-store" })
      if (!res.ok) return false
      const data = (await res.json()) as DashboardPayload
      setPayload(data)
      return true
    } catch {
      return false
    }
  }, [sessionToken])

  const fetchStats = useCallback(async () => {
    if (!sessionToken) return
    setStatsLoading(true)
    try {
      const res = await fetch("/api/stats?token=" + encodeURIComponent(sessionToken), { cache: "no-store" })
      if (res.ok) {
        const data = await res.json()
        setStats(data.months ?? [])
      }
    } finally {
      setStatsLoading(false)
    }
  }, [sessionToken])

  useEffect(() => {
    if (activeTab === 1 && !stats && !statsLoading) {
      fetchStats()
    }
  }, [activeTab, stats, statsLoading, fetchStats])

  useEffect(() => {
    if (payload?.tenant) {
      setGuidebookDraft((payload.tenant.guidebook as Record<string, string>) || {})
      setGoogleReviewUrlDraft(payload.tenant.google_review_url || "")
    }
  }, [payload])

  useEffect(() => {
    const urlToken = searchParams.get("token")
    const stored = typeof window !== "undefined" ? getPersistedToken() : null
    const candidate = urlToken || stored

    if (!candidate) {
      setStatus("denied")
      setPayload(null)
      setSessionToken(null)
      return
    }

    if (sessionToken === candidate && payload !== null) {
      setStatus("ready")
      return
    }

    let cancelled = false
    ;(async () => {
      if (cancelled) return
      await load(candidate, Boolean(urlToken))
    })()
    return () => { cancelled = true }
  }, [searchParams, load, sessionToken, payload])

  async function updateCabinField() {
    if (!sessionToken || !editingField) return
    setSavingField(true)
    try {
      const res = await fetch("/api/cabins/update", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token: sessionToken,
          cabin_id: editingField.cabinId,
          field: editingField.field,
          value: editingField.value,
        }),
      })
      if (res.ok) {
        await refreshDashboard()
        setEditingField(null)
      } else {
        const d = await res.json()
        alert(d.error || "Error al guardar")
      }
    } finally {
      setSavingField(false)
    }
  }

  async function updateCabinPrice() {
    if (!sessionToken || !editingPrice) return
    const price = Number(editingPrice.value)
    if (isNaN(price) || price <= 0) return
    setSavingPrice(true)
    try {
      const res = await fetch("/api/cabins/update-price", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: sessionToken, cabin_id: editingPrice.cabinId, base_price_night: price }),
      })
      if (res.ok) {
        await refreshDashboard()
        setEditingPrice(null)
      } else {
        alert("Error al guardar el precio")
      }
    } finally {
      setSavingPrice(false)
    }
  }

  async function saveSeasonPrices(cabinId: string, seasons: SeasonPrice[]) {
    if (!sessionToken) return
    setSavingSeasons(true)
    try {
      const res = await fetch("/api/cabins/update", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: sessionToken, cabin_id: cabinId, field: "season_prices", value: seasons }),
      })
      if (res.ok) {
        await refreshDashboard()
        setEditingSeasons(null)
        setAddSeasonForm(null)
      } else {
        const d = await res.json()
        alert(d.error || "Error al guardar temporadas")
      }
    } finally {
      setSavingSeasons(false)
    }
  }

  async function saveGuidebook() {
    if (!sessionToken) return
    setSavingGuidebook(true)
    try {
      const res = await fetch("/api/tenant/guidebook", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: sessionToken, guidebook: guidebookDraft }),
      })
      if (res.ok) {
        setEditingGuidebook(false)
        await refreshDashboard()
      } else {
        const d = await res.json()
        alert(d.error || "Error al guardar manual")
      }
    } finally {
      setSavingGuidebook(false)
    }
  }

  async function saveGoogleReviewUrl() {
    if (!sessionToken) return
    setSavingReviewUrl(true)
    try {
      const res = await fetch("/api/tenant/guidebook", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: sessionToken, google_review_url: googleReviewUrlDraft }),
      })
      if (res.ok) await refreshDashboard()
      else alert("Error al guardar URL de reseña")
    } finally {
      setSavingReviewUrl(false)
    }
  }

  if (status === "denied") return <AccessDenied />
  if (status === "loading" || !payload || !sessionToken) return <LoadingScreen />

  const tenant = payload.tenant
  const ownerName = tenant?.owner_name?.split(" ")[0] || "Propietario"
  const businessName = tenant?.business_name || "Panel"
  const currency = tenant?.currency || "CLP"
  const cabins = payload.cabins || []
  const bookings = payload.bookings || []

  const totalRevenue12m = (stats ?? []).reduce((s, m) => s + m.revenue, 0)
  const totalBookings12m = (stats ?? []).reduce((s, m) => s + m.bookings, 0)
  const totalNights12m = (stats ?? []).reduce((s, m) => s + m.nights, 0)
  const activeMths = (stats ?? []).filter(m => m.revenue > 0).length
  const avgRevenuePerMonth = activeMths > 0 ? totalRevenue12m / activeMths : 0

  const TABS = ["Inicio", "Estadísticas"]

  return (
    <div style={{ background: "#0d1a12", minHeight: "100vh", fontFamily: "sans-serif", color: "#f0ede8" }}>
      <nav style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 24px", borderBottom: "1px solid #ffffff0f", background: "#0a1510" }}>
        <div style={{ fontFamily: "Georgia,serif", fontSize: "20px", letterSpacing: "4px", color: "#e8d5a3", textTransform: "uppercase" as const }}>
          {businessName.split(" ").map(function (word, i) {
            return (
              <span key={i} style={{ color: i === 0 ? "#e8d5a3" : "#7ab87a" }}>
                {i > 0 ? " " : ""}{word.toUpperCase()}
              </span>
            )
          })}
        </div>
        <EmbedIframeSnippet slug={tenant?.slug} />
      </nav>

      {/* Tab bar */}
      <div style={{ display: "flex", gap: "0", padding: "0 24px", background: "#0a1510", borderBottom: "1px solid #1a2e1a" }}>
        {TABS.map((t, i) => (
          <button
            key={t}
            onClick={() => setActiveTab(i)}
            style={{
              background: "transparent",
              border: "none",
              borderBottom: activeTab === i ? "2px solid #7ab87a" : "2px solid transparent",
              color: activeTab === i ? "#7ab87a" : "#4a6a48",
              fontSize: "12px",
              fontWeight: activeTab === i ? 700 : 400,
              padding: "12px 20px",
              cursor: "pointer",
              fontFamily: "sans-serif",
              letterSpacing: "0.5px",
              transition: "color 0.15s",
            }}
          >
            {t}
          </button>
        ))}
      </div>

      <main style={{ padding: "28px 20px", maxWidth: "680px", margin: "0 auto" }}>

        {/* ── TAB 0: INICIO ── */}
        {activeTab === 0 && (
          <div>
            <div style={{ marginBottom: "28px" }}>
              <div style={{ fontSize: "10px", letterSpacing: "2px", textTransform: "uppercase" as const, color: "#7ab87a", marginBottom: "8px" }}>
                Panel del Propietario
              </div>
              <h1 style={{ fontFamily: "Georgia,serif", fontSize: "26px", color: "#e8d5a3", margin: "0 0 6px 0", fontWeight: 400 }}>
                Bienvenido/a, {ownerName}
              </h1>
              <p style={{ color: "#4a6a48", fontSize: "13px", margin: 0 }}>
                Desde aquí gestionas tus cabañas, confirmas pagos y bloqueas fechas en el calendario.
              </p>
            </div>

            <ManualBookingForm
              cabins={cabins.map((c) => ({
                id: c.id,
                name: c.name,
                capacity: c.capacity,
                base_price_night: Number(c.base_price_night),
                pricing_tiers: c.pricing_tiers ?? null,
                has_tinaja: c.has_tinaja ?? true,
                tinaja_price: c.tinaja_price ?? 30000,
              }))}
              tenantId={payload.tenant_id}
              tenantDepositPercent={tenant?.deposit_percent ?? 20}
              currency={currency}
            />

            <a
              href="/historial"
              style={{ display: "inline-flex", alignItems: "center", gap: "8px", color: "#5a7058", fontSize: "11px", padding: "8px 16px", border: "1px solid #1a2e1a", borderRadius: "20px", textDecoration: "none", letterSpacing: "0.5px", marginTop: "8px" }}
            >
              {"Ver historial de reservas →"}
            </a>

            <div style={{ borderTop: "1px solid #2a3e28", margin: "24px 0" }} />

            <div style={{ fontSize: "10px", fontWeight: 600, letterSpacing: "2px", textTransform: "uppercase" as const, color: "#7ab87a", marginBottom: "14px" }}>
              Tus cabañas
            </div>

            {cabins.map((cabin) => {
              const isEditing = editingPrice?.cabinId === cabin.id
              const isEditingCap = editingField?.cabinId === cabin.id && editingField?.field === "capacity"
              const isEditingFee = editingField?.cabinId === cabin.id && editingField?.field === "cleaning_fee"
              const isEditingDesc = editingField?.cabinId === cabin.id && editingField?.field === "description"
              const EBtn: React.CSSProperties = { background: "transparent", border: "1px solid #2a3e28", borderRadius: "5px", color: "#5a7058", fontSize: "10px", padding: "2px 7px", cursor: "pointer", fontFamily: "sans-serif", lineHeight: 1.4 }
              const SaveBtn: React.CSSProperties = { background: "#7ab87a", color: "#0d1a12", border: "none", borderRadius: "6px", fontSize: "11px", fontWeight: 700, padding: "3px 10px", cursor: "pointer", fontFamily: "sans-serif" }
              const CancelBtn: React.CSSProperties = { background: "transparent", color: "#5a7058", border: "none", fontSize: "11px", cursor: "pointer", fontFamily: "sans-serif" }
              const FieldInp: React.CSSProperties = { background: "#0d1a12", border: "1px solid #7ab87a", borderRadius: "6px", color: "#e8d5a3", fontSize: "12px", padding: "3px 8px", outline: "none", fontFamily: "sans-serif" }
              return (
                <div
                  key={cabin.id}
                  style={{ marginBottom: "12px", padding: "18px 20px", background: "#162618", border: "1px solid #2a3e28", borderRadius: "16px" }}
                >
                  <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "12px" }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontFamily: "Georgia,serif", fontSize: "16px", color: "#e8d5a3", marginBottom: "6px" }}>
                        {cabin.name}
                      </div>

                      {/* Capacidad */}
                      <div style={{ color: "#5a7058", fontSize: "12px", display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" as const, marginBottom: "4px" }}>
                        {isEditingCap ? (
                          <span style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
                            <input type="number" min={1} max={50} value={editingField!.value} autoFocus
                              onChange={e => setEditingField({ ...editingField!, value: e.target.value })}
                              onKeyDown={e => { if (e.key === "Enter") updateCabinField(); if (e.key === "Escape") setEditingField(null) }}
                              style={{ ...FieldInp, width: "60px" }} />
                            <span style={{ color: "#4a6a48" }}>personas</span>
                            <button onClick={updateCabinField} disabled={savingField} style={SaveBtn}>{savingField ? "..." : "OK"}</button>
                            <button onClick={() => setEditingField(null)} style={CancelBtn}>Cancelar</button>
                          </span>
                        ) : (
                          <span style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
                            <span>{cabin.capacity} personas</span>
                            <button onClick={() => setEditingField({ cabinId: cabin.id, field: "capacity", value: String(cabin.capacity) })} style={EBtn}>editar</button>
                          </span>
                        )}

                        <span style={{ color: "#2a3e28" }}>·</span>

                        {/* Precio/noche */}
                        {isEditing ? (
                          <span style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
                            <input type="number" value={editingPrice!.value} autoFocus
                              onChange={e => setEditingPrice({ cabinId: cabin.id, value: e.target.value })}
                              onKeyDown={e => { if (e.key === "Enter") updateCabinPrice(); if (e.key === "Escape") setEditingPrice(null) }}
                              style={{ ...FieldInp, width: "100px" }} />
                            <span style={{ color: "#4a6a48" }}>/noche</span>
                            <button onClick={updateCabinPrice} disabled={savingPrice} style={SaveBtn}>{savingPrice ? "..." : "Guardar"}</button>
                            <button onClick={() => setEditingPrice(null)} style={CancelBtn}>Cancelar</button>
                          </span>
                        ) : (
                          <span style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
                            <span>{fmtCurrency(Number(cabin.base_price_night), currency)}/noche</span>
                            <button onClick={() => setEditingPrice({ cabinId: cabin.id, value: String(Math.round(Number(cabin.base_price_night))) })} style={EBtn}>editar</button>
                          </span>
                        )}

                        <span style={{ color: "#2a3e28" }}>·</span>

                        {/* Tarifa limpieza */}
                        {isEditingFee ? (
                          <span style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
                            <input type="number" min={0} value={editingField!.value} autoFocus
                              onChange={e => setEditingField({ ...editingField!, value: e.target.value })}
                              onKeyDown={e => { if (e.key === "Enter") updateCabinField(); if (e.key === "Escape") setEditingField(null) }}
                              style={{ ...FieldInp, width: "100px" }} />
                            <span style={{ color: "#4a6a48" }}>limpieza</span>
                            <button onClick={updateCabinField} disabled={savingField} style={SaveBtn}>{savingField ? "..." : "OK"}</button>
                            <button onClick={() => setEditingField(null)} style={CancelBtn}>Cancelar</button>
                          </span>
                        ) : (
                          <span style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
                            <span>{cabin.cleaning_fee ? fmtCurrency(Number(cabin.cleaning_fee), currency) + " limpieza" : "sin tarifa limpieza"}</span>
                            <button onClick={() => setEditingField({ cabinId: cabin.id, field: "cleaning_fee", value: String(cabin.cleaning_fee ?? 0) })} style={EBtn}>editar</button>
                          </span>
                        )}
                      </div>

                      {/* Descripción */}
                      <div style={{ marginTop: "6px" }}>
                        {isEditingDesc ? (
                          <div>
                            <textarea value={editingField!.value} rows={3} autoFocus
                              onChange={e => setEditingField({ ...editingField!, value: e.target.value })}
                              style={{ width: "100%", background: "#0d1a12", border: "1px solid #7ab87a", borderRadius: "6px", color: "#e8d5a3", fontSize: "12px", padding: "6px 8px", outline: "none", fontFamily: "sans-serif", resize: "vertical" as const, boxSizing: "border-box" as const }} />
                            <div style={{ display: "flex", gap: "6px", marginTop: "5px" }}>
                              <button onClick={updateCabinField} disabled={savingField} style={SaveBtn}>{savingField ? "..." : "Guardar"}</button>
                              <button onClick={() => setEditingField(null)} style={CancelBtn}>Cancelar</button>
                            </div>
                          </div>
                        ) : (
                          <div style={{ display: "flex", alignItems: "flex-start", gap: "6px" }}>
                            <span style={{ fontSize: "12px", color: "#3a5a38", lineHeight: 1.5 }}>{cabin.description || "Sin descripción"}</span>
                            <button onClick={() => setEditingField({ cabinId: cabin.id, field: "description", value: cabin.description || "" })} style={{ ...EBtn, flexShrink: 0 }}>editar</button>
                          </div>
                        )}
                      </div>
                    </div>
                    <a
                      href={"/calendar?cabin_id=" + encodeURIComponent(cabin.id)}
                      style={{ background: "#7ab87a", color: "#0d1a12", padding: "9px 18px", borderRadius: "10px", textDecoration: "none", fontSize: "12px", fontWeight: 700, letterSpacing: "0.5px", flexShrink: 0 }}
                    >
                      Ver Calendario
                    </a>
                  </div>

                  <CabinPhotos
                    cabinId={cabin.id}
                    cabinName={cabin.name}
                    initialPhotos={cabin.photos ?? []}
                  />

                  {/* ── Temporadas ── */}
                  <div style={{ marginTop: "14px", borderTop: "1px solid #2a3e28", paddingTop: "14px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                      <div style={{ fontSize: "9px", letterSpacing: "2px", textTransform: "uppercase" as const, color: "#7ab87a" }}>
                        Precios por temporada
                      </div>
                      {editingSeasons?.cabinId !== cabin.id && (
                        <button
                          onClick={() => { setEditingSeasons({ cabinId: cabin.id, seasons: cabin.season_prices ? [...cabin.season_prices] : [] }); setAddSeasonForm(null) }}
                          style={{ background: "transparent", border: "1px solid #2a3e28", borderRadius: "5px", color: "#5a7058", fontSize: "10px", padding: "2px 7px", cursor: "pointer", fontFamily: "sans-serif" }}
                        >
                          editar
                        </button>
                      )}
                    </div>

                    {editingSeasons?.cabinId !== cabin.id && (
                      <div>
                        {(!cabin.season_prices || cabin.season_prices.length === 0) ? (
                          <div style={{ fontSize: "11px", color: "#3a5a38" }}>Sin temporadas configuradas. Precio base aplica todo el año.</div>
                        ) : (
                          cabin.season_prices.map((s, i) => (
                            <div key={i} style={{ fontSize: "11px", color: "#5a7058", display: "flex", justifyContent: "space-between", padding: "3px 0" }}>
                              <span>{s.name} ({s.start_md} → {s.end_md})</span>
                              <span style={{ color: "#e8d5a3", fontFamily: "Georgia,serif" }}>{fmtCurrency(s.price_per_night, currency)}/noche</span>
                            </div>
                          ))
                        )}
                      </div>
                    )}

                    {editingSeasons?.cabinId === cabin.id && (
                      <div>
                        {editingSeasons.seasons.length === 0 && (
                          <div style={{ fontSize: "11px", color: "#3a5a38", marginBottom: "8px" }}>Sin temporadas. Agrega una abajo.</div>
                        )}
                        {editingSeasons.seasons.map((s, i) => (
                          <div key={i} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "4px 0", borderBottom: "1px solid #2a3e2840" }}>
                            <span style={{ fontSize: "11px", color: "#5a7058" }}>{s.name} ({s.start_md}→{s.end_md}) · {fmtCurrency(s.price_per_night, currency)}{s.min_nights ? ` · mín ${s.min_nights}n` : ""}</span>
                            <button
                              onClick={() => setEditingSeasons({ cabinId: cabin.id, seasons: editingSeasons.seasons.filter((_, j) => j !== i) })}
                              style={{ background: "transparent", border: "none", color: "#e63946", fontSize: "10px", cursor: "pointer", fontFamily: "sans-serif" }}
                            >
                              eliminar
                            </button>
                          </div>
                        ))}

                        {!addSeasonForm ? (
                          <button
                            onClick={() => setAddSeasonForm({ name: "", start_md: "", end_md: "", price_per_night: "", min_nights: "" })}
                            style={{ background: "transparent", border: "1px dashed #2a3e28", borderRadius: "6px", color: "#5a7058", fontSize: "10px", padding: "5px 10px", cursor: "pointer", fontFamily: "sans-serif", marginTop: "8px", width: "100%" }}
                          >
                            + Agregar temporada
                          </button>
                        ) : (
                          <div style={{ background: "#0d1a12", border: "1px solid #2a3e28", borderRadius: "8px", padding: "12px", marginTop: "8px" }}>
                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", marginBottom: "8px" }}>
                              <div>
                                <div style={{ fontSize: "9px", color: "#5a7058", marginBottom: "3px" }}>Nombre</div>
                                <input type="text" placeholder="Temporada Alta" value={addSeasonForm.name}
                                  onChange={e => setAddSeasonForm({ ...addSeasonForm, name: e.target.value })}
                                  style={{ width: "100%", boxSizing: "border-box" as const, background: "#162618", border: "1px solid #2a3e28", borderRadius: "5px", color: "#e8d5a3", fontSize: "11px", padding: "4px 7px", outline: "none", fontFamily: "sans-serif" }} />
                              </div>
                              <div>
                                <div style={{ fontSize: "9px", color: "#5a7058", marginBottom: "3px" }}>Precio/noche</div>
                                <input type="number" placeholder="85000" value={addSeasonForm.price_per_night}
                                  onChange={e => setAddSeasonForm({ ...addSeasonForm, price_per_night: e.target.value })}
                                  style={{ width: "100%", boxSizing: "border-box" as const, background: "#162618", border: "1px solid #2a3e28", borderRadius: "5px", color: "#e8d5a3", fontSize: "11px", padding: "4px 7px", outline: "none", fontFamily: "sans-serif" }} />
                              </div>
                              <div>
                                <div style={{ fontSize: "9px", color: "#5a7058", marginBottom: "3px" }}>Inicio (MM-DD)</div>
                                <input type="text" placeholder="12-15" value={addSeasonForm.start_md}
                                  onChange={e => setAddSeasonForm({ ...addSeasonForm, start_md: e.target.value })}
                                  style={{ width: "100%", boxSizing: "border-box" as const, background: "#162618", border: "1px solid #2a3e28", borderRadius: "5px", color: "#e8d5a3", fontSize: "11px", padding: "4px 7px", outline: "none", fontFamily: "sans-serif" }} />
                              </div>
                              <div>
                                <div style={{ fontSize: "9px", color: "#5a7058", marginBottom: "3px" }}>Fin (MM-DD)</div>
                                <input type="text" placeholder="03-15" value={addSeasonForm.end_md}
                                  onChange={e => setAddSeasonForm({ ...addSeasonForm, end_md: e.target.value })}
                                  style={{ width: "100%", boxSizing: "border-box" as const, background: "#162618", border: "1px solid #2a3e28", borderRadius: "5px", color: "#e8d5a3", fontSize: "11px", padding: "4px 7px", outline: "none", fontFamily: "sans-serif" }} />
                              </div>
                              <div>
                                <div style={{ fontSize: "9px", color: "#5a7058", marginBottom: "3px" }}>Mín. noches (opcional)</div>
                                <input type="number" placeholder="3" value={addSeasonForm.min_nights}
                                  onChange={e => setAddSeasonForm({ ...addSeasonForm, min_nights: e.target.value })}
                                  style={{ width: "100%", boxSizing: "border-box" as const, background: "#162618", border: "1px solid #2a3e28", borderRadius: "5px", color: "#e8d5a3", fontSize: "11px", padding: "4px 7px", outline: "none", fontFamily: "sans-serif" }} />
                              </div>
                            </div>
                            <div style={{ display: "flex", gap: "6px" }}>
                              <button
                                onClick={() => {
                                  if (!addSeasonForm.name || !addSeasonForm.start_md || !addSeasonForm.end_md || !addSeasonForm.price_per_night) return
                                  const newSeason: SeasonPrice = {
                                    name: addSeasonForm.name,
                                    start_md: addSeasonForm.start_md,
                                    end_md: addSeasonForm.end_md,
                                    price_per_night: Number(addSeasonForm.price_per_night),
                                    ...(addSeasonForm.min_nights ? { min_nights: Number(addSeasonForm.min_nights) } : {}),
                                  }
                                  setEditingSeasons({ cabinId: cabin.id, seasons: [...editingSeasons.seasons, newSeason] })
                                  setAddSeasonForm(null)
                                }}
                                style={{ background: "#7ab87a", color: "#0d1a12", border: "none", borderRadius: "6px", fontSize: "11px", fontWeight: 700, padding: "5px 12px", cursor: "pointer", fontFamily: "sans-serif" }}
                              >
                                Agregar
                              </button>
                              <button onClick={() => setAddSeasonForm(null)} style={{ background: "transparent", color: "#5a7058", border: "none", fontSize: "11px", cursor: "pointer", fontFamily: "sans-serif" }}>
                                Cancelar
                              </button>
                            </div>
                          </div>
                        )}

                        <div style={{ display: "flex", gap: "6px", marginTop: "10px" }}>
                          <button
                            onClick={() => saveSeasonPrices(cabin.id, editingSeasons.seasons)}
                            disabled={savingSeasons}
                            style={{ background: "#7ab87a", color: "#0d1a12", border: "none", borderRadius: "6px", fontSize: "11px", fontWeight: 700, padding: "5px 14px", cursor: "pointer", fontFamily: "sans-serif" }}
                          >
                            {savingSeasons ? "..." : "Guardar temporadas"}
                          </button>
                          <button onClick={() => { setEditingSeasons(null); setAddSeasonForm(null) }} style={{ background: "transparent", color: "#5a7058", border: "none", fontSize: "11px", cursor: "pointer", fontFamily: "sans-serif" }}>
                            Cancelar
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )
            })}

            <BookingsList
              bookings={bookings}
              cabins={cabins.map((c) => ({ id: c.id, name: c.name }))}
              tenantId={payload.tenant_id}
              token={sessionToken}
              onDashboardRefresh={refreshDashboard}
            />

            {/* ── Manual de Bienvenida ── */}
            <div style={{ borderTop: "1px solid #2a3e28", margin: "24px 0" }} />
            <div style={{ fontSize: "10px", fontWeight: 600, letterSpacing: "2px", textTransform: "uppercase" as const, color: "#7ab87a", marginBottom: "14px" }}>
              Manual de Bienvenida
            </div>
            <div style={{ background: "#162618", border: "1px solid #2a3e28", borderRadius: "16px", padding: "18px 20px", marginBottom: "12px" }}>
              {!editingGuidebook ? (
                <div>
                  <div style={{ fontSize: "12px", color: "#5a7058", lineHeight: 1.7, marginBottom: "12px" }}>
                    El manual de bienvenida es una página que tus huéspedes reciben cuando confirmas su reserva. Incluye instrucciones de llegada, WiFi, reglas y más.
                  </div>
                  <div style={{ display: "flex", flexWrap: "wrap" as const, gap: "6px", marginBottom: "12px" }}>
                    {Object.entries(guidebookDraft).filter(([, v]) => v).map(([k]) => (
                      <span key={k} style={{ background: "#0d1a12", border: "1px solid #2a3e28", borderRadius: "4px", fontSize: "10px", color: "#5a7058", padding: "2px 8px" }}>{k.replace(/_/g, " ")}</span>
                    ))}
                    {Object.values(guidebookDraft).every(v => !v) && (
                      <span style={{ fontSize: "11px", color: "#3a5a38" }}>Sin contenido configurado.</span>
                    )}
                  </div>
                  <button
                    onClick={() => setEditingGuidebook(true)}
                    style={{ background: "#7ab87a", color: "#0d1a12", border: "none", borderRadius: "8px", fontSize: "12px", fontWeight: 700, padding: "8px 18px", cursor: "pointer", fontFamily: "sans-serif" }}
                  >
                    Editar manual
                  </button>
                </div>
              ) : (
                <div>
                  {([
                    ["arrival_instructions", "Instrucciones de llegada", "textarea"],
                    ["checkin_time", "Hora de check-in (ej: 15:00)", "text"],
                    ["checkout_time", "Hora de check-out (ej: 11:00)", "text"],
                    ["wifi_name", "Nombre de la red WiFi", "text"],
                    ["wifi_password", "Contraseña WiFi", "text"],
                    ["house_rules", "Reglas de la cabaña", "textarea"],
                    ["local_tips", "Tips locales", "textarea"],
                    ["checkout_instructions", "Instrucciones de salida", "textarea"],
                    ["emergency_contact", "Contacto de emergencia", "text"],
                  ] as [string, string, string][]).map(([key, label, type]) => (
                    <div key={key} style={{ marginBottom: "12px" }}>
                      <div style={{ fontSize: "9px", letterSpacing: "1.5px", textTransform: "uppercase" as const, color: "#5a7058", marginBottom: "5px" }}>{label}</div>
                      {type === "textarea" ? (
                        <textarea
                          rows={3}
                          value={guidebookDraft[key] || ""}
                          onChange={e => setGuidebookDraft({ ...guidebookDraft, [key]: e.target.value })}
                          style={{ width: "100%", boxSizing: "border-box" as const, background: "#0d1a12", border: "1px solid #2a3e28", borderRadius: "6px", color: "#e8d5a3", fontSize: "12px", padding: "8px 10px", outline: "none", fontFamily: "sans-serif", resize: "vertical" as const }}
                        />
                      ) : (
                        <input
                          type="text"
                          value={guidebookDraft[key] || ""}
                          onChange={e => setGuidebookDraft({ ...guidebookDraft, [key]: e.target.value })}
                          style={{ width: "100%", boxSizing: "border-box" as const, background: "#0d1a12", border: "1px solid #2a3e28", borderRadius: "6px", color: "#e8d5a3", fontSize: "12px", padding: "8px 10px", outline: "none", fontFamily: "sans-serif" }}
                        />
                      )}
                    </div>
                  ))}
                  <div style={{ display: "flex", gap: "8px", marginTop: "6px" }}>
                    <button
                      onClick={saveGuidebook}
                      disabled={savingGuidebook}
                      style={{ background: "#7ab87a", color: "#0d1a12", border: "none", borderRadius: "8px", fontSize: "12px", fontWeight: 700, padding: "8px 18px", cursor: "pointer", fontFamily: "sans-serif" }}
                    >
                      {savingGuidebook ? "Guardando..." : "Guardar manual"}
                    </button>
                    <button onClick={() => setEditingGuidebook(false)} style={{ background: "transparent", color: "#5a7058", border: "none", fontSize: "12px", cursor: "pointer", fontFamily: "sans-serif" }}>
                      Cancelar
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* ── URL de Reseña Google ── */}
            <div style={{ background: "#162618", border: "1px solid #2a3e28", borderRadius: "16px", padding: "18px 20px", marginBottom: "12px" }}>
              <div style={{ fontSize: "9px", letterSpacing: "2px", textTransform: "uppercase" as const, color: "#7ab87a", marginBottom: "10px" }}>
                Solicitud de Reseña (Google)
              </div>
              <div style={{ fontSize: "12px", color: "#5a7058", marginBottom: "10px", lineHeight: 1.6 }}>
                Si configuras esta URL, enviaremos automáticamente un email pidiendo reseña al día siguiente del check-out.
              </div>
              <input
                type="url"
                placeholder="https://g.page/r/..."
                value={googleReviewUrlDraft}
                onChange={e => setGoogleReviewUrlDraft(e.target.value)}
                style={{ width: "100%", boxSizing: "border-box" as const, background: "#0d1a12", border: "1px solid #2a3e28", borderRadius: "6px", color: "#e8d5a3", fontSize: "12px", padding: "8px 10px", outline: "none", fontFamily: "sans-serif", marginBottom: "10px" }}
              />
              <button
                onClick={saveGoogleReviewUrl}
                disabled={savingReviewUrl}
                style={{ background: "#7ab87a", color: "#0d1a12", border: "none", borderRadius: "8px", fontSize: "12px", fontWeight: 700, padding: "8px 18px", cursor: "pointer", fontFamily: "sans-serif" }}
              >
                {savingReviewUrl ? "Guardando..." : "Guardar URL"}
              </button>
            </div>
          </div>
        )}

        {/* ── TAB 1: ESTADÍSTICAS ── */}
        {activeTab === 1 && (
          <div>
            <div style={{ marginBottom: "24px" }}>
              <div style={{ fontSize: "10px", letterSpacing: "2px", textTransform: "uppercase" as const, color: "#7ab87a", marginBottom: "8px" }}>
                Estadísticas
              </div>
              <h1 style={{ fontFamily: "Georgia,serif", fontSize: "24px", color: "#e8d5a3", margin: "0 0 4px 0", fontWeight: 400 }}>
                Últimos 12 meses
              </h1>
              <p style={{ color: "#4a6a48", fontSize: "13px", margin: 0 }}>
                Solo reservas confirmadas.
              </p>
            </div>

            {statsLoading && (
              <div style={{ textAlign: "center" as const, padding: "60px 0", color: "#4a6a48", fontSize: "13px" }}>
                Cargando estadísticas…
              </div>
            )}

            {!statsLoading && stats && (
              <div>
                {/* Summary cards */}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "10px", marginBottom: "24px" }}>
                  <StatCard
                    label="Ingresos 12 meses"
                    value={fmtCurrency(totalRevenue12m, currency)}
                    sub={activeMths > 0 ? "Promedio " + fmtCurrency(avgRevenuePerMonth, currency) + "/mes" : undefined}
                  />
                  <StatCard
                    label="Reservas confirmadas"
                    value={String(totalBookings12m)}
                    sub={totalNights12m + " noches en total"}
                  />
                </div>

                {/* Revenue chart */}
                <div style={{ background: "#162618", border: "1px solid #2a3e28", borderRadius: "16px", padding: "20px", marginBottom: "16px" }}>
                  <div style={{ fontSize: "10px", fontWeight: 600, letterSpacing: "2px", textTransform: "uppercase" as const, color: "#7ab87a", marginBottom: "16px" }}>
                    Ingresos por mes
                  </div>
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={stats} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#2a3e2840" vertical={false} />
                      <XAxis dataKey="label" tick={{ fill: "#4a6a48", fontSize: 10 }} axisLine={false} tickLine={false} />
                      <YAxis hide />
                      <Tooltip content={<CustomTooltip currency={currency} />} cursor={{ fill: "#7ab87a15" }} />
                      <Bar dataKey="revenue" fill="#7ab87a" radius={[4, 4, 0, 0]} maxBarSize={36} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                {/* Bookings chart */}
                <div style={{ background: "#162618", border: "1px solid #2a3e28", borderRadius: "16px", padding: "20px", marginBottom: "16px" }}>
                  <div style={{ fontSize: "10px", fontWeight: 600, letterSpacing: "2px", textTransform: "uppercase" as const, color: "#7ab87a", marginBottom: "16px" }}>
                    Reservas por mes
                  </div>
                  <ResponsiveContainer width="100%" height={160}>
                    <BarChart data={stats} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#2a3e2840" vertical={false} />
                      <XAxis dataKey="label" tick={{ fill: "#4a6a48", fontSize: 10 }} axisLine={false} tickLine={false} />
                      <YAxis hide allowDecimals={false} />
                      <Tooltip content={<CustomTooltip currency={currency} />} cursor={{ fill: "#7ab87a15" }} />
                      <Bar dataKey="bookings" fill="#4a9a4a" radius={[4, 4, 0, 0]} maxBarSize={36} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                {/* Nights chart */}
                <div style={{ background: "#162618", border: "1px solid #2a3e28", borderRadius: "16px", padding: "20px" }}>
                  <div style={{ fontSize: "10px", fontWeight: 600, letterSpacing: "2px", textTransform: "uppercase" as const, color: "#7ab87a", marginBottom: "16px" }}>
                    Noches reservadas por mes
                  </div>
                  <ResponsiveContainer width="100%" height={160}>
                    <BarChart data={stats} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#2a3e2840" vertical={false} />
                      <XAxis dataKey="label" tick={{ fill: "#4a6a48", fontSize: 10 }} axisLine={false} tickLine={false} />
                      <YAxis hide allowDecimals={false} />
                      <Tooltip content={<CustomTooltip currency={currency} />} cursor={{ fill: "#7ab87a15" }} />
                      <Bar dataKey="nights" fill="#3a7a6a" radius={[4, 4, 0, 0]} maxBarSize={36} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  )
}
