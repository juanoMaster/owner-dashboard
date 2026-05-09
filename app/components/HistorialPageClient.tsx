"use client"

import { useEffect, useState, useCallback } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import HistorialClient from "./HistorialClient"
import { getPersistedToken, setPersistedToken, clearPersistedToken } from "@/lib/takai-token"

type HistorialPayload = {
  tenant: { business_name: string | null; owner_name: string | null; currency?: string | null } | null
  cabins: Array<{ id: string; name: string }>
  bookings: any[]
}

function AccessDenied() {
  return (
    <div
      style={{
        background: "#0a1208",
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "sans-serif",
        color: "#3a5a38",
      }}
    >
      Acceso no autorizado
    </div>
  )
}

function Loading() {
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
      Cargando historial…
    </div>
  )
}

export default function HistorialPageClient() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [status, setStatus] = useState<"init" | "loading" | "ready" | "denied">("init")
  const [payload, setPayload] = useState<HistorialPayload | null>(null)
  const [sessionToken, setSessionToken] = useState<string | null>(null)

  const load = useCallback(async (token: string, fromUrl: boolean) => {
    setStatus("loading")
    const res = await fetch("/api/historial?token=" + encodeURIComponent(token))
    if (!res.ok) {
      if (!fromUrl) {
        clearPersistedToken()
      }
      setPayload(null)
      setSessionToken(null)
      setStatus("denied")
      return
    }
    const data = (await res.json()) as HistorialPayload
    try {
      setPersistedToken(token)
      if (fromUrl) {
        router.replace("/historial")
      }
    } catch {
      /* ignore */
    }
    setSessionToken(token)
    setPayload(data)
    setStatus("ready")
  }, [router])

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

  if (status === "init" || status === "loading" || !payload || !sessionToken) {
    return <Loading />
  }

  const cabinMap: Record<string, string> = {}
  ;(payload.cabins || []).forEach((c) => {
    cabinMap[c.id] = c.name
  })

  return (
    <div style={{ background: "#0d1a12", minHeight: "100vh", fontFamily: "sans-serif", color: "#f0ede8" }}>
      <nav
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 28px",
          height: "54px",
          borderBottom: "1px solid #111e11",
          background: "#050d05",
        }}
      >
        <div
          style={{
            fontFamily: "Georgia,serif",
            fontSize: "15px",
            letterSpacing: "3.5px",
            color: "#c8b878",
            textTransform: "uppercase" as const,
          }}
        >
          {payload.tenant?.business_name || "Panel"}
        </div>
        <div
          style={{
            fontSize: "9px",
            color: "#253825",
            letterSpacing: "2px",
            textTransform: "uppercase" as const,
          }}
        >
          Historial
        </div>
      </nav>

      <main style={{ padding: "36px 24px", maxWidth: "1200px", margin: "0 auto" }}>
        <div style={{ marginBottom: "32px" }}>
          <a
            href="/"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "8px",
              color: "#6a8a68",
              fontSize: "14px",
              padding: "11px 24px",
              border: "1px solid #1a2e1a",
              borderRadius: "20px",
              textDecoration: "none",
              letterSpacing: "0.5px",
              marginBottom: "20px",
            }}
          >
            {"← Volver al panel"}
          </a>
          <div
            style={{
              fontSize: "9px",
              letterSpacing: "3px",
              textTransform: "uppercase" as const,
              color: "#4a7a48",
              marginBottom: "6px",
              fontWeight: 600,
            }}
          >
            Historial de reservas
          </div>
          <h1
            style={{
              fontFamily: "Georgia,serif",
              fontSize: "28px",
              color: "#e8d5a3",
              margin: "0 0 4px 0",
              fontWeight: 400,
            }}
          >
            {payload.tenant?.business_name || ""}
          </h1>
          <div
            style={{
              width: "40px",
              height: "1px",
              background: "linear-gradient(90deg, #c8b87860, transparent)",
              margin: "10px 0",
            }}
          />
          <p style={{ color: "#3a5a38", fontSize: "12px", margin: 0 }}>
            {"Registro completo de todas las reservas. Las canceladas aparecen marcadas."}
          </p>
        </div>

        <HistorialClient
          bookings={payload.bookings || []}
          cabinMap={cabinMap}
          businessName={payload.tenant?.business_name || ""}
          currency={payload.tenant?.currency || "CLP"}
        />
      </main>
    </div>
  )
}
