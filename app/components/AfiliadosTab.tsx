"use client"

// Tab "Afiliados" del panel admin — gestión de partners/influencers.
//
// POR QUÉ EXISTE: la API `/api/admin/affiliates` estaba lista desde junio, pero
// no había ninguna interfaz. Cuando alguien escribía por WhatsApp queriendo
// recomendar Takai, no había forma de darlo de alta desde el panel: el programa
// de referidos era inoperable en la práctica.
//
// El token del partner se muestra UNA sola vez (en la BD solo queda el hash).

import { useEffect, useState } from "react"

const DIRECTORIO = "https://takai-directorio.vercel.app"
const REGISTRO = "https://reservas.takai.cl/registro"

type Afiliado = {
  id: string
  code: string
  name: string
  contact: string | null
  commission_rate: number
  active: boolean
  created_at: string
}

type Creado = {
  affiliate: { id: string; code: string }
  token: string
  dashboard_url: string
}

const card: React.CSSProperties = {
  background: "#1a1228",
  border: "1px solid #2d1f44",
  borderRadius: "10px",
  padding: "18px",
  marginBottom: "14px",
}
const inp: React.CSSProperties = {
  width: "100%",
  boxSizing: "border-box",
  background: "#120c1c",
  border: "1px solid #2d1f44",
  borderRadius: "6px",
  padding: "10px 12px",
  color: "#e8d5f8",
  fontSize: "13px",
  marginTop: "5px",
}
const lbl: React.CSSProperties = { fontSize: "11px", color: "#6b5a8a", letterSpacing: "0.5px" }

// El código es lo que viaja en ?ref=; se deriva del nombre para no pedirlo aparte.
function sugerirCode(n: string): string {
  return n
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 32)
}

export default function AfiliadosTab({ adminToken }: { adminToken: string }) {
  const [lista, setLista] = useState<Afiliado[]>([])
  const [loading, setLoading] = useState(false)
  const [creando, setCreando] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)
  const [nuevo, setNuevo] = useState<Creado | null>(null)
  const [copiado, setCopiado] = useState<string | null>(null)

  const [name, setName] = useState("")
  const [contact, setContact] = useState("")
  const [code, setCode] = useState("")
  const [rate, setRate] = useState("5")

  function load() {
    setLoading(true)
    fetch("/api/admin/affiliates", { headers: { "x-admin-token": adminToken } })
      .then((r) => r.json())
      .then((d) => setLista(d.affiliates || []))
      .catch(() => setLista([]))
      .finally(() => setLoading(false))
  }
  useEffect(load, [])

  function crear() {
    if (!name.trim()) {
      setMsg("Escribe el nombre del partner")
      return
    }
    const finalCode = code.trim() || sugerirCode(name)
    if (!finalCode) {
      setMsg("No se pudo generar el código: escríbelo a mano")
      return
    }
    setCreando(true)
    setMsg(null)
    setNuevo(null)
    fetch("/api/admin/affiliates", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-admin-token": adminToken },
      body: JSON.stringify({ name, contact, code: finalCode, commission_rate: Number(rate) }),
    })
      .then((r) => r.json())
      .then((d) => {
        if (d.error) {
          setMsg(d.error)
          return
        }
        setNuevo(d)
        setName("")
        setContact("")
        setCode("")
        setRate("5")
        load()
      })
      .catch(() => setMsg("Error de conexión"))
      .finally(() => setCreando(false))
  }

  function toggle(a: Afiliado) {
    fetch("/api/admin/affiliates", {
      method: "PATCH",
      headers: { "Content-Type": "application/json", "x-admin-token": adminToken },
      body: JSON.stringify({ id: a.id, active: !a.active }),
    }).then(() => load())
  }

  function copiar(valor: string, etiqueta: string) {
    navigator.clipboard?.writeText(valor)
    setCopiado(etiqueta)
    setTimeout(() => setCopiado(null), 1500)
  }

  return (
    <div>
      {/* ── Alta ─────────────────────────────────────────────────────── */}
      <div style={card}>
        <div style={{ fontSize: "15px", color: "#c8b878", fontWeight: 600, marginBottom: "4px" }}>
          Dar de alta un partner
        </div>
        <div style={{ fontSize: "12px", color: "#6b5a8a", marginBottom: "16px", lineHeight: 1.6 }}>
          Cuando alguien te escriba queriendo recomendar Takai, créalo aquí y entrégale sus links.
          Desde ese momento todo lo que traiga queda registrado solo.
        </div>

        <div style={{ display: "flex", flexWrap: "wrap", gap: "12px" }}>
          <div style={{ flex: "1 1 200px" }}>
            <span style={lbl}>Nombre</span>
            <input style={inp} value={name} onChange={(e) => setName(e.target.value)} placeholder="Camila Rojas" />
          </div>
          <div style={{ flex: "1 1 200px" }}>
            <span style={lbl}>Contacto (WhatsApp o correo)</span>
            <input style={inp} value={contact} onChange={(e) => setContact(e.target.value)} placeholder="+56912345678" />
          </div>
          <div style={{ flex: "1 1 160px" }}>
            <span style={lbl}>Código (va en el link)</span>
            <input
              style={inp}
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder={name ? sugerirCode(name) : "camila-rojas"}
            />
          </div>
          <div style={{ flex: "0 1 130px" }}>
            <span style={lbl}>% por reserva</span>
            <input style={inp} type="number" min={0} max={5} step={0.5} value={rate} onChange={(e) => setRate(e.target.value)} />
          </div>
        </div>

        <div style={{ fontSize: "11px", color: "#6b5a8a", marginTop: "8px", lineHeight: 1.6 }}>
          Máximo 5%: es lo que gana sobre cada reserva de turista que llegue por su link.
          La comisión por traer alojamientos se acuerda y se paga aparte.
        </div>

        {msg && <div style={{ color: "#e6a23c", fontSize: "13px", marginTop: "12px" }}>{msg}</div>}

        <button
          onClick={crear}
          disabled={creando}
          style={{
            marginTop: "14px",
            background: creando ? "#2d1f44" : "#27ae60",
            color: "#fff",
            border: "none",
            borderRadius: "6px",
            padding: "11px 22px",
            fontSize: "13px",
            fontWeight: 700,
            cursor: creando ? "default" : "pointer",
          }}
        >
          {creando ? "Creando…" : "Crear partner"}
        </button>
      </div>

      {/* ── Datos a entregar: se muestran UNA vez ────────────────────── */}
      {nuevo && (
        <div style={{ ...card, border: "1px solid #c8b878" }}>
          <div style={{ fontSize: "14px", color: "#c8b878", fontWeight: 700, marginBottom: "4px" }}>
            Listo. Cópiale esto ahora — el acceso no se vuelve a mostrar.
          </div>
          <div style={{ fontSize: "12px", color: "#6b5a8a", marginBottom: "16px", lineHeight: 1.6 }}>
            Pégaselo por WhatsApp tal cual. Si lo pierde, hay que crear un partner nuevo.
          </div>

          {[
            ["Para recomendar cabañas a turistas", DIRECTORIO + "/?ref=" + nuevo.affiliate.code],
            ["Para recomendar Takai a dueños de cabañas", REGISTRO + "?ref=" + nuevo.affiliate.code],
            ["Su panel privado (ver lo que lleva ganado)", nuevo.dashboard_url],
          ].map(([etiqueta, valor]) => (
            <div key={etiqueta} style={{ marginBottom: "12px" }}>
              <div style={lbl}>{etiqueta}</div>
              <div style={{ display: "flex", gap: "8px", alignItems: "center", marginTop: "4px" }}>
                <code
                  style={{
                    flex: 1,
                    background: "#120c1c",
                    border: "1px solid #2d1f44",
                    borderRadius: "6px",
                    padding: "9px 11px",
                    color: "#e8d5f8",
                    fontSize: "12px",
                    wordBreak: "break-all",
                  }}
                >
                  {valor}
                </code>
                <button
                  onClick={() => copiar(valor, etiqueta)}
                  style={{
                    background: "transparent",
                    border: "1px solid #2d1f44",
                    color: "#c8b878",
                    borderRadius: "6px",
                    padding: "9px 14px",
                    fontSize: "12px",
                    cursor: "pointer",
                    whiteSpace: "nowrap",
                  }}
                >
                  {copiado === etiqueta ? "Copiado" : "Copiar"}
                </button>
              </div>
            </div>
          ))}

          <button
            onClick={() => setNuevo(null)}
            style={{ background: "transparent", border: "none", color: "#6b5a8a", fontSize: "12px", cursor: "pointer", textDecoration: "underline", padding: 0 }}
          >
            Ya lo copié, ocultar
          </button>
        </div>
      )}

      {/* ── Listado ──────────────────────────────────────────────────── */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", margin: "22px 0 12px" }}>
        <div style={{ color: "#6b5a8a", fontSize: "12px" }}>
          {loading ? "Cargando…" : lista.length === 0 ? "Aún no hay partners registrados" : lista.length + " partner(s)"}
        </div>
        <button
          onClick={load}
          style={{ background: "transparent", border: "1px solid #2d1f44", color: "#c8b878", borderRadius: "6px", padding: "7px 14px", fontSize: "12px", cursor: "pointer" }}
        >
          Actualizar
        </button>
      </div>

      {lista.map((a) => (
        <div key={a.id} style={{ ...card, opacity: a.active ? 1 : 0.55 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "12px", flexWrap: "wrap" }}>
            <div>
              <div style={{ fontSize: "15px", color: "#e8d5f8", fontWeight: 600 }}>{a.name}</div>
              <div style={{ fontSize: "12px", color: "#6b5a8a", marginTop: "3px" }}>
                ?ref={a.code} · {a.commission_rate}% por reserva · {a.contact || "sin contacto"}
              </div>
            </div>
            <button
              onClick={() => toggle(a)}
              style={{
                background: a.active ? "transparent" : "#27ae60",
                border: a.active ? "1px solid #e63946" : "none",
                color: a.active ? "#e63946" : "#fff",
                borderRadius: "6px",
                padding: "8px 16px",
                fontSize: "12px",
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              {a.active ? "Desactivar" : "Activar"}
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}
