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
    photos: string[] | null
    pricing_tiers: Array<{ min_guests: number; max_guests: number; price_per_night: number }> | null
    has_tinaja: boolean | null
    tinaja_price: number | null
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
              return (
                <div
                  key={cabin.id}
                  style={{ marginBottom: "12px", padding: "18px 20px", background: "#162618", border: "1px solid #2a3e28", borderRadius: "16px" }}
                >
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px" }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontFamily: "Georgia,serif", fontSize: "16px", color: "#e8d5a3", marginBottom: "3px" }}>
                        {cabin.name}
                      </div>
                      <div style={{ color: "#5a7058", fontSize: "12px", display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" as const }}>
                        <span>{cabin.capacity} personas</span>
                        <span style={{ color: "#2a3e28" }}>·</span>
                        {isEditing ? (
                          <span style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
                            <input
                              type="number"
                              value={editingPrice.value}
                              onChange={e => setEditingPrice({ cabinId: cabin.id, value: e.target.value })}
                              onKeyDown={e => { if (e.key === "Enter") updateCabinPrice(); if (e.key === "Escape") setEditingPrice(null) }}
                              style={{ width: "100px", background: "#0d1a12", border: "1px solid #7ab87a", borderRadius: "6px", color: "#e8d5a3", fontSize: "12px", padding: "3px 8px", outline: "none", fontFamily: "sans-serif" }}
                              autoFocus
                            />
                            <span style={{ color: "#4a6a48" }}>/noche</span>
                            <button
                              onClick={updateCabinPrice}
                              disabled={savingPrice}
                              style={{ background: "#7ab87a", color: "#0d1a12", border: "none", borderRadius: "6px", fontSize: "11px", fontWeight: 700, padding: "3px 10px", cursor: "pointer", fontFamily: "sans-serif" }}
                            >
                              {savingPrice ? "..." : "Guardar"}
                            </button>
                            <button
                              onClick={() => setEditingPrice(null)}
                              style={{ background: "transparent", color: "#5a7058", border: "none", fontSize: "11px", cursor: "pointer", fontFamily: "sans-serif" }}
                            >
                              Cancelar
                            </button>
                          </span>
                        ) : (
                          <span style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
                            <span>{fmtCurrency(Number(cabin.base_price_night), currency)}/noche</span>
                            <button
                              onClick={() => setEditingPrice({ cabinId: cabin.id, value: String(Math.round(Number(cabin.base_price_night))) })}
                              style={{ background: "transparent", border: "1px solid #2a3e28", borderRadius: "5px", color: "#5a7058", fontSize: "10px", padding: "2px 7px", cursor: "pointer", fontFamily: "sans-serif", lineHeight: 1.4 }}
                            >
                              editar
                            </button>
                          </span>
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
                </div>
              )
            })}

            <BookingsList
              bookings={bookings}
              cabins={cabins.map((c) => ({ id: c.id, name: c.name }))}
              tenantId={payload.tenant_id}
              onDashboardRefresh={refreshDashboard}
            />
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
