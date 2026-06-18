"use client"
import { useState, useEffect } from "react"
import AdminDashboard from "../components/AdminDashboard"

const STORAGE_KEY = "takai_admin_token"

export default function AdminPage() {
  const [token, setToken] = useState<string | null>(null)
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [input, setInput] = useState("")
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const saved = sessionStorage.getItem(STORAGE_KEY)
    if (saved) loadData(saved)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function loadData(t: string) {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch("/api/admin/data", {
        headers: { "x-admin-token": t },
        cache: "no-store",
      })
      if (!res.ok) {
        sessionStorage.removeItem(STORAGE_KEY)
        setError("Token inválido")
        return
      }
      const json = await res.json()
      setToken(t)
      setData(json)
    } catch {
      setError("Error de conexión")
    } finally {
      setLoading(false)
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!input.trim()) return
    sessionStorage.setItem(STORAGE_KEY, input.trim())
    loadData(input.trim())
  }

  if (data && token) {
    return (
      <AdminDashboard
        tenants={data.tenants}
        cabins={data.cabins}
        tokens={data.tokens}
        bookings={data.bookings}
        auditRows={data.auditRows}
        stats={data.stats}
        subscriptions={data.subscriptions || []}
        statements={data.statements || []}
        adminToken={token}
      />
    )
  }

  return (
    <div
      style={{
        background: "#09070a",
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "sans-serif",
      }}
    >
      {loading ? (
        <div style={{ color: "#5a4870", fontSize: "14px", letterSpacing: "2px" }}>
          CARGANDO...
        </div>
      ) : (
        <form
          onSubmit={handleSubmit}
          style={{
            background: "#110d15",
            border: "1px solid #2a1e38",
            borderRadius: "12px",
            padding: "40px 32px",
            display: "flex",
            flexDirection: "column",
            gap: "16px",
            minWidth: "320px",
          }}
        >
          <div
            style={{
              fontSize: "10px",
              letterSpacing: "3px",
              textTransform: "uppercase",
              color: "#7a5a98",
              textAlign: "center",
            }}
          >
            TAKAI · ADMIN
          </div>
          <input
            type="password"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Token de acceso"
            autoFocus
            style={{
              background: "#1a1220",
              border: "1px solid #3a2a4a",
              borderRadius: "6px",
              padding: "10px 14px",
              color: "#e8d5a3",
              fontSize: "14px",
              outline: "none",
            }}
          />
          {error && (
            <div style={{ color: "#e63946", fontSize: "12px", textAlign: "center" }}>
              {error}
            </div>
          )}
          <button
            type="submit"
            style={{
              background: "#7ab87a",
              color: "#0a1510",
              border: "none",
              borderRadius: "6px",
              padding: "10px",
              fontWeight: 700,
              fontSize: "12px",
              letterSpacing: "2px",
              textTransform: "uppercase",
              cursor: "pointer",
            }}
          >
            ENTRAR
          </button>
        </form>
      )}
    </div>
  )
}
