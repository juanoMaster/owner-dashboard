"use client"

import { useEffect, useState, useCallback } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import BookingsList from "./BookingsList"
import ManualBookingForm from "./ManualBookingForm"
import { getPersistedToken, setPersistedToken, clearPersistedToken } from "@/lib/takai-token"

type TenantRow = {
  owner_name: string | null
  business_name: string | null
  gender: string | null
}

type DashboardPayload = {
  tenant_id: string
  tenant: TenantRow | null
  cabins: Array<{
    id: string
    name: string
    capacity: number
    base_price_night: number
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
    created_at: string
  }>
}

function AccessDenied() {
  return (
    <div
      style={{
        background: "#0d1a12",
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "sans-serif",
        color: "#5a7058",
      }}
    >
      Acceso no autorizado
    </div>
  )
}

function LoadingScreen() {
  return (
    <div
      style={{
        background: "#0d1a12",
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "sans-serif",
        color: "#5a7058",
      }}
    >
      Cargando panel…
    </div>
  )
}

export default function HomeDashboardClient() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [status, setStatus] = useState<"loading" | "ready" | "denied">("loading")
  const [payload, setPayload] = useState<DashboardPayload | null>(null)
  const [sessionToken, setSessionToken] = useState<string | null>(null)

  const load = useCallback(
    async (token: string, fromUrl: boolean) => {
      setStatus("loading")
      const res = await fetch("/api/dashboard?token=" + encodeURIComponent(token), { cache: "no-store" })
      if (!res.ok) {
        if (!fromUrl) {
          clearPersistedToken()
        }
        setPayload(null)
        setSessionToken(null)
        setStatus("denied")
        return
      }
      const data = (await res.json()) as DashboardPayload
      try {
        setPersistedToken(token)
        if (fromUrl) {
          router.replace("/")
        }
      } catch {
        /* ignore */
      }
      setSessionToken(token)
      setPayload(data)
      setStatus("ready")
    },
    [router]
  )

  const refreshDashboard = useCallback(async (): Promise<boolean> => {
    const token = sessionToken
    if (!token) return false
    const res = await fetch("/api/dashboard?token=" + encodeURIComponent(token), { cache: "no-store" })
    if (!res.ok) return false
    const data = (await res.json()) as DashboardPayload
    setPayload(data)
    return true
  }, [sessionToken])

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
    return () => {
      cancelled = true
    }
  }, [searchParams, load, sessionToken, payload])

  if (status === "denied") {
    return <AccessDenied />
  }

  if (status === "loading" || !payload || !sessionToken) {
    return <LoadingScreen />
  }

  const tenant = payload.tenant
  const ownerName = tenant?.owner_name?.split(" ")[0] || "Propietaria"
  const greeting = tenant?.gender === "male" ? "Bienvenido" : "Bienvenida"
  const businessName = tenant?.business_name || "Panel"
  const cabins = payload.cabins || []
  const bookings = payload.bookings || []

  return (
    <div style={{ background: "#0d1a12", minHeight: "100vh", fontFamily: "sans-serif", color: "#f0ede8" }}>
      <nav
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "14px 24px",
          borderBottom: "1px solid #ffffff0f",
          background: "#0a1510",
        }}
      >
        <div
          style={{
            fontFamily: "Georgia,serif",
            fontSize: "20px",
            letterSpacing: "4px",
            color: "#e8d5a3",
            textTransform: "uppercase",
          }}
        >
          {businessName.split(" ").map(function (word, i) {
            return (
              <span key={i} style={{ color: i === 0 ? "#e8d5a3" : "#7ab87a" }}>
                {i > 0 ? " " : ""}
                {word.toUpperCase()}
              </span>
            )
          })}
        </div>
        <div />
      </nav>

      <main style={{ padding: "28px 20px", maxWidth: "680px", margin: "0 auto" }}>
        <div style={{ marginBottom: "28px" }}>
          <div
            style={{
              fontSize: "10px",
              letterSpacing: "2px",
              textTransform: "uppercase",
              color: "#7ab87a",
              marginBottom: "8px",
            }}
          >
            Panel del Propietario
          </div>
          <h1
            style={{
              fontFamily: "Georgia,serif",
              fontSize: "26px",
              color: "#e8d5a3",
              margin: "0 0 6px 0",
              fontWeight: 400,
            }}
          >
            {greeting}, {ownerName}
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
          }))}
          tenantId={payload.tenant_id}
        />

        <a
          href="/historial"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "8px",
            color: "#5a7058",
            fontSize: "11px",
            padding: "8px 16px",
            border: "1px solid #1a2e1a",
            borderRadius: "20px",
            textDecoration: "none",
            letterSpacing: "0.5px",
            marginTop: "8px",
          }}
        >
          {"Ver historial de reservas →"}
        </a>

        <div style={{ borderTop: "1px solid #2a3e28", margin: "24px 0" }} />

        <div
          style={{
            fontSize: "10px",
            fontWeight: 600,
            letterSpacing: "2px",
            textTransform: "uppercase",
            color: "#7ab87a",
            marginBottom: "14px",
          }}
        >
          Tus cabañas
        </div>

        {cabins.map((cabin) => (
          <div
            key={cabin.id}
            style={{
              marginBottom: "12px",
              padding: "18px 20px",
              background: "#162618",
              border: "1px solid #2a3e28",
              borderRadius: "16px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <div>
              <div style={{ fontFamily: "Georgia,serif", fontSize: "16px", color: "#e8d5a3", marginBottom: "3px" }}>
                {cabin.name}
              </div>
              <div style={{ color: "#5a7058", fontSize: "12px" }}>
                {cabin.capacity} personas · ${Number(cabin.base_price_night).toLocaleString("es-CL")}/noche
              </div>
            </div>
            <a
              href={"/calendar?cabin_id=" + encodeURIComponent(cabin.id)}
              style={{
                background: "#7ab87a",
                color: "#0d1a12",
                padding: "9px 18px",
                borderRadius: "10px",
                textDecoration: "none",
                fontSize: "12px",
                fontWeight: 700,
                letterSpacing: "0.5px",
              }}
            >
              Ver Calendario
            </a>
          </div>
        ))}

        <BookingsList
          bookings={bookings}
          cabins={cabins.map((c) => ({ id: c.id, name: c.name }))}
          tenantId={payload.tenant_id}
          onDashboardRefresh={refreshDashboard}
        />
      </main>
    </div>
  )
}
