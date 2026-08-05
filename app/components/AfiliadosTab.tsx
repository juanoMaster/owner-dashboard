"use client"

// Tab "Afiliados" del panel admin — todo lo que Juan necesita para pagarle a
// cada partner, sin tener que interpretar nada ni acordarse de nada.
//
// El programa paga DOS cosas distintas y la pantalla las separa a propósito:
//   · Alojamientos que trajo → comisión ÚNICA (tramos por nº de cabañas).
//     Se paga una vez y esa relación se cierra.
//   · Reservas que generó por su link → 5% de cada una, mientras siga trayendo.
// Un centro traído NO renta solo por existir: si recibe reservas sin su link,
// el 10% es íntegro de Takai.

import { useEffect, useState } from "react"
import { TRAMOS_REFERIDO } from "@/lib/referral"

const DIRECTORIO = "https://takai-directorio.vercel.app"
const REGISTRO = "https://reservas.takai.cl/registro"

const C = {
  card: "#1a1228",
  cardAlt: "#120c1c",
  line: "#2d1f44",
  text: "#e8d5f8",
  muted: "#6b5a8a",
  gold: "#c8b878",
  green: "#4ade80",
  amber: "#e6a23c",
  red: "#e63946",
}

function clp(n: number) {
  return "$" + Math.round(n).toLocaleString("es-CL")
}

type Centro = {
  tenant_id: string; business_name: string; slug: string; publicado: boolean
  cabanas: number; tramo: string; a_convenir: boolean; monto: number | null; pagado_el: string | null
}
type Reserva = {
  booking_id: string; booking_code: string; alojamiento: string; cabana: string
  check_in: string; total: number; confirmada: boolean; comision: number
  takai_neto: number; pagado_el: string | null
}
type Partner = {
  id: string; code: string; name: string; contact: string | null
  commission_rate: number; active: boolean
  centros: Centro[]; reservas: Reserva[]
  totales: {
    centros_traidos: number; centros_por_pagar: number; centros_a_convenir: number
    reservas_generadas: number; reservas_confirmadas: number; volumen_confirmado: number
    comision_reservas_pendiente: number; comision_centros_pendiente: number
    a_pagar: number; ya_pagado: number
  }
}

const card: React.CSSProperties = { background: C.card, border: "1px solid " + C.line, borderRadius: "10px", padding: "18px", marginBottom: "14px" }
const inp: React.CSSProperties = { width: "100%", boxSizing: "border-box", background: C.cardAlt, border: "1px solid " + C.line, borderRadius: "6px", padding: "10px 12px", color: C.text, fontSize: "13px", marginTop: "5px" }
const lbl: React.CSSProperties = { fontSize: "11px", color: C.muted, letterSpacing: "0.5px" }
const btn = (bg: string, fg = "#fff"): React.CSSProperties => ({ background: bg, color: fg, border: "none", borderRadius: "6px", padding: "8px 16px", fontSize: "12px", fontWeight: 700, cursor: "pointer" })

function sugerirCode(n: string): string {
  return n.trim().toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 32)
}

export default function AfiliadosTab({ adminToken }: { adminToken: string }) {
  const [lista, setLista] = useState<Partner[]>([])
  const [totalGeneral, setTotalGeneral] = useState(0)
  const [loading, setLoading] = useState(false)
  const [creando, setCreando] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)
  const [nuevo, setNuevo] = useState<any>(null)
  const [copiado, setCopiado] = useState<string | null>(null)
  const [abierto, setAbierto] = useState<string | null>(null)
  const [montoConvenir, setMontoConvenir] = useState<Record<string, string>>({})
  const [mostrarAlta, setMostrarAlta] = useState(false)

  const [name, setName] = useState("")
  const [contact, setContact] = useState("")
  const [code, setCode] = useState("")
  const [rate, setRate] = useState("5")

  function load() {
    setLoading(true)
    fetch("/api/admin/affiliates", { headers: { "x-admin-token": adminToken } })
      .then((r) => r.json())
      .then((d) => { setLista(d.affiliates || []); setTotalGeneral(d.total_a_pagar || 0) })
      .catch(() => setLista([]))
      .finally(() => setLoading(false))
  }
  useEffect(load, [])

  function crear() {
    if (!name.trim()) { setMsg("Escribe el nombre del partner"); return }
    const finalCode = code.trim() || sugerirCode(name)
    if (!finalCode) { setMsg("Escribe el código a mano"); return }
    setCreando(true); setMsg(null); setNuevo(null)
    fetch("/api/admin/affiliates", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-admin-token": adminToken },
      body: JSON.stringify({ name, contact, code: finalCode, commission_rate: Number(rate) }),
    })
      .then((r) => r.json())
      .then((d) => {
        if (d.error) { setMsg(d.error); return }
        setNuevo(d); setName(""); setContact(""); setCode(""); setRate("5"); setMostrarAlta(false); load()
      })
      .catch(() => setMsg("Error de conexión"))
      .finally(() => setCreando(false))
  }

  function toggle(a: Partner) {
    fetch("/api/admin/affiliates", {
      method: "PATCH",
      headers: { "Content-Type": "application/json", "x-admin-token": adminToken },
      body: JSON.stringify({ id: a.id, active: !a.active }),
    }).then(load)
  }

  function pagar(tipo: "centro" | "reserva", id: string, monto?: string, undo = false) {
    fetch("/api/admin/affiliates/pay", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-admin-token": adminToken },
      body: JSON.stringify({ tipo, id, monto, undo }),
    })
      .then((r) => r.json())
      .then((d) => { if (d.error) setMsg(d.error); else load() })
      .catch(() => setMsg("Error de conexión"))
  }

  function copiar(valor: string, etiqueta: string) {
    navigator.clipboard?.writeText(valor)
    setCopiado(etiqueta)
    setTimeout(() => setCopiado(null), 1500)
  }

  return (
    <div>
      {/* ── LO QUE DEBES AHORA ──────────────────────────────────────── */}
      <div style={{ ...card, background: totalGeneral > 0 ? "#1a1a12" : C.card, border: "1px solid " + (totalGeneral > 0 ? C.gold : C.line), display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "14px" }}>
        <div>
          <div style={lbl}>TOTAL POR PAGAR A PARTNERS</div>
          <div style={{ fontFamily: "Georgia, serif", fontSize: "38px", color: totalGeneral > 0 ? C.gold : C.muted, lineHeight: 1.1, marginTop: "4px" }}>
            {clp(totalGeneral)}
          </div>
          <div style={{ fontSize: "12px", color: C.muted, marginTop: "4px" }}>
            {totalGeneral > 0 ? "Suma de comisiones confirmadas y aún no liquidadas" : "No hay comisiones pendientes"}
          </div>
        </div>
        <div style={{ display: "flex", gap: "8px" }}>
          <button onClick={() => setMostrarAlta((v) => !v)} style={btn("#27ae60")}>
            {mostrarAlta ? "Cancelar" : "+ Nuevo partner"}
          </button>
          <button onClick={load} style={{ ...btn("transparent", C.gold), border: "1px solid " + C.line }}>
            Actualizar
          </button>
        </div>
      </div>

      {msg && (
        <div style={{ ...card, border: "1px solid " + C.amber, color: C.amber, fontSize: "13px" }}>
          {msg} <button onClick={() => setMsg(null)} style={{ background: "none", border: "none", color: C.muted, cursor: "pointer", textDecoration: "underline", marginLeft: "8px" }}>ocultar</button>
        </div>
      )}

      {/* ── ALTA ────────────────────────────────────────────────────── */}
      {mostrarAlta && (
        <div style={card}>
          <div style={{ fontSize: "15px", color: C.gold, fontWeight: 600, marginBottom: "4px" }}>Dar de alta un partner</div>
          <div style={{ fontSize: "12px", color: C.muted, marginBottom: "16px", lineHeight: 1.6 }}>
            Cuando alguien te escriba queriendo recomendar Takai, créalo aquí y entrégale sus links.
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "12px" }}>
            <div style={{ flex: "1 1 200px" }}>
              <span style={lbl}>Nombre</span>
              <input style={inp} value={name} onChange={(e) => setName(e.target.value)} placeholder="Camila Rojas" />
            </div>
            <div style={{ flex: "1 1 200px" }}>
              <span style={lbl}>Contacto</span>
              <input style={inp} value={contact} onChange={(e) => setContact(e.target.value)} placeholder="+56912345678" />
            </div>
            <div style={{ flex: "1 1 160px" }}>
              <span style={lbl}>Código (va en el link)</span>
              <input style={inp} value={code} onChange={(e) => setCode(e.target.value)} placeholder={name ? sugerirCode(name) : "camila-rojas"} />
            </div>
            <div style={{ flex: "0 1 120px" }}>
              <span style={lbl}>% por reserva</span>
              <input style={inp} type="number" min={0} max={5} step={0.5} value={rate} onChange={(e) => setRate(e.target.value)} />
            </div>
          </div>
          <button onClick={crear} disabled={creando} style={{ ...btn(creando ? C.line : "#27ae60"), marginTop: "14px", padding: "11px 22px", fontSize: "13px" }}>
            {creando ? "Creando…" : "Crear partner"}
          </button>
        </div>
      )}

      {/* ── LINKS DEL PARTNER RECIÉN CREADO (se ven una vez) ────────── */}
      {nuevo && (
        <div style={{ ...card, border: "1px solid " + C.gold }}>
          <div style={{ fontSize: "14px", color: C.gold, fontWeight: 700, marginBottom: "4px" }}>
            Listo. Cópiale esto ahora — el acceso no se vuelve a mostrar.
          </div>
          <div style={{ fontSize: "12px", color: C.muted, marginBottom: "16px" }}>
            Si lo pierde, hay que crear un partner nuevo.
          </div>
          {[
            ["Link para recomendar cabañas (turistas)", DIRECTORIO + "/?ref=" + nuevo.affiliate.code],
            ["Link para recomendar Takai a dueños de cabañas", REGISTRO + "?ref=" + nuevo.affiliate.code],
            ["Su panel privado", nuevo.dashboard_url],
          ].map(([etq, val]) => (
            <div key={etq} style={{ marginBottom: "12px" }}>
              <div style={lbl}>{etq}</div>
              <div style={{ display: "flex", gap: "8px", alignItems: "center", marginTop: "4px" }}>
                <code style={{ flex: 1, background: C.cardAlt, border: "1px solid " + C.line, borderRadius: "6px", padding: "9px 11px", color: C.text, fontSize: "12px", wordBreak: "break-all" }}>{val}</code>
                <button onClick={() => copiar(val, etq)} style={{ ...btn("transparent", C.gold), border: "1px solid " + C.line, whiteSpace: "nowrap" }}>
                  {copiado === etq ? "Copiado" : "Copiar"}
                </button>
              </div>
            </div>
          ))}
          <button onClick={() => setNuevo(null)} style={{ background: "none", border: "none", color: C.muted, fontSize: "12px", cursor: "pointer", textDecoration: "underline", padding: 0 }}>
            Ya lo copié, ocultar
          </button>
        </div>
      )}

      {/* ── PARTNERS ────────────────────────────────────────────────── */}
      {loading && <div style={{ color: C.muted, fontSize: "13px" }}>Cargando…</div>}
      {!loading && lista.length === 0 && (
        <div style={{ ...card, color: C.muted, fontSize: "13px" }}>
          Aún no hay partners. Crea el primero con “+ Nuevo partner”.
        </div>
      )}

      {lista.map((a) => {
        const t = a.totales
        const open = abierto === a.id
        return (
          <div key={a.id} style={{ ...card, opacity: a.active ? 1 : 0.6 }}>
            {/* Cabecera */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "12px", flexWrap: "wrap" }}>
              <div>
                <div style={{ fontSize: "16px", color: C.text, fontWeight: 600 }}>
                  {a.name} {!a.active && <span style={{ fontSize: "11px", color: C.red }}>· inactivo</span>}
                </div>
                <div style={{ fontSize: "12px", color: C.muted, marginTop: "3px" }}>
                  ?ref={a.code} · {a.commission_rate}% por reserva · {a.contact || "sin contacto"}
                </div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={lbl}>LE DEBES</div>
                <div style={{ fontFamily: "Georgia, serif", fontSize: "24px", color: t.a_pagar > 0 ? C.gold : C.muted }}>
                  {clp(t.a_pagar)}
                </div>
              </div>
            </div>

            {/* Resumen en una línea */}
            <div style={{ display: "flex", flexWrap: "wrap", gap: "18px", marginTop: "14px", paddingTop: "14px", borderTop: "1px solid " + C.line, fontSize: "12.5px", color: C.muted }}>
              <span>🏡 {t.centros_traidos} alojamiento(s) traído(s){t.centros_por_pagar > 0 && <span style={{ color: C.amber }}> · {t.centros_por_pagar} por pagar</span>}</span>
              <span>📅 {t.reservas_confirmadas}/{t.reservas_generadas} reserva(s) confirmada(s)</span>
              <span>💰 {clp(t.volumen_confirmado)} generados</span>
              {t.ya_pagado > 0 && <span style={{ color: C.green }}>✓ {clp(t.ya_pagado)} ya pagado</span>}
            </div>

            <button
              onClick={() => setAbierto(open ? null : a.id)}
              style={{ ...btn("transparent", C.gold), border: "1px solid " + C.line, marginTop: "14px" }}
            >
              {open ? "Ocultar detalle" : "Ver detalle y pagar"}
            </button>
            <button onClick={() => toggle(a)} style={{ ...btn("transparent", a.active ? C.red : C.green), border: "1px solid " + C.line, marginTop: "14px", marginLeft: "8px" }}>
              {a.active ? "Desactivar" : "Activar"}
            </button>

            {open && (
              <div style={{ marginTop: "18px" }}>
                {/* ── Alojamientos traídos ── */}
                <div style={{ ...lbl, marginBottom: "8px" }}>ALOJAMIENTOS QUE TRAJO — comisión única, se paga una vez</div>
                {a.centros.length === 0 && <div style={{ fontSize: "13px", color: C.muted, marginBottom: "16px" }}>Todavía no ha traído alojamientos.</div>}
                {a.centros.map((c) => (
                  <div key={c.tenant_id} style={{ background: C.cardAlt, border: "1px solid " + C.line, borderRadius: "8px", padding: "12px", marginBottom: "8px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "12px", flexWrap: "wrap" }}>
                      <div>
                        <div style={{ fontSize: "14px", color: C.text }}>{c.business_name}</div>
                        <div style={{ fontSize: "12px", color: C.muted, marginTop: "2px" }}>
                          {c.cabanas} cabaña(s) · {c.tramo}
                          {!c.publicado && <span style={{ color: C.amber }}> · aún sin aprobar</span>}
                        </div>
                      </div>
                      <div style={{ textAlign: "right" }}>
                        {c.pagado_el ? (
                          <div style={{ color: C.green, fontSize: "13px" }}>
                            ✓ {clp(c.monto ?? 0)} pagado
                            <br />
                            <button onClick={() => pagar("centro", c.tenant_id, undefined, true)} style={{ background: "none", border: "none", color: C.muted, fontSize: "11px", cursor: "pointer", textDecoration: "underline", padding: 0 }}>
                              deshacer
                            </button>
                          </div>
                        ) : c.a_convenir ? (
                          <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
                            <input
                              style={{ ...inp, width: "120px", marginTop: 0 }}
                              placeholder="A convenir"
                              value={montoConvenir[c.tenant_id] ?? ""}
                              onChange={(e) => setMontoConvenir((p) => ({ ...p, [c.tenant_id]: e.target.value }))}
                            />
                            <button
                              onClick={() => pagar("centro", c.tenant_id, montoConvenir[c.tenant_id])}
                              disabled={!c.publicado || !montoConvenir[c.tenant_id]}
                              style={btn(c.publicado && montoConvenir[c.tenant_id] ? "#27ae60" : C.line)}
                            >
                              Pagar
                            </button>
                          </div>
                        ) : (
                          <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                            <span style={{ color: C.gold, fontFamily: "Georgia, serif", fontSize: "17px" }}>{clp(c.monto ?? 0)}</span>
                            <button onClick={() => pagar("centro", c.tenant_id)} disabled={!c.publicado} style={btn(c.publicado ? "#27ae60" : C.line)}>
                              Marcar pagado
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}

                {/* ── Reservas generadas ── */}
                <div style={{ ...lbl, margin: "20px 0 8px" }}>RESERVAS QUE GENERÓ POR SU LINK — {a.commission_rate}% de cada una</div>
                {a.reservas.length === 0 && <div style={{ fontSize: "13px", color: C.muted }}>Todavía no ha generado reservas.</div>}
                {a.reservas.map((r) => (
                  <div key={r.booking_id} style={{ background: C.cardAlt, border: "1px solid " + C.line, borderRadius: "8px", padding: "12px", marginBottom: "8px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "12px", flexWrap: "wrap" }}>
                      <div>
                        <div style={{ fontSize: "13px", color: C.text }}>{r.booking_code} · {r.alojamiento}</div>
                        <div style={{ fontSize: "12px", color: C.muted, marginTop: "2px" }}>
                          {r.cabana} · llega {r.check_in} · {clp(r.total)}
                          {r.confirmada
                            ? <span style={{ color: C.green }}> · confirmada</span>
                            : <span style={{ color: C.amber }}> · pendiente de pago del turista</span>}
                        </div>
                        {r.confirmada && (
                          <div style={{ fontSize: "11px", color: C.muted, marginTop: "4px" }}>
                            De tu 10% ({clp(r.comision + r.takai_neto)}): {clp(r.comision)} al partner, {clp(r.takai_neto)} netos para Takai
                          </div>
                        )}
                      </div>
                      <div style={{ textAlign: "right" }}>
                        {!r.confirmada ? (
                          <span style={{ color: C.muted, fontSize: "12px" }}>—</span>
                        ) : r.pagado_el ? (
                          <div style={{ color: C.green, fontSize: "13px" }}>
                            ✓ {clp(r.comision)} pagado
                            <br />
                            <button onClick={() => pagar("reserva", r.booking_id, undefined, true)} style={{ background: "none", border: "none", color: C.muted, fontSize: "11px", cursor: "pointer", textDecoration: "underline", padding: 0 }}>
                              deshacer
                            </button>
                          </div>
                        ) : (
                          <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                            <span style={{ color: C.gold, fontFamily: "Georgia, serif", fontSize: "17px" }}>{clp(r.comision)}</span>
                            <button onClick={() => pagar("reserva", r.booking_id)} style={btn("#27ae60")}>Marcar pagado</button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )
      })}

      {/* Recordatorio de los tramos, para no tener que buscarlos */}
      <div style={{ ...card, background: "transparent", border: "1px dashed " + C.line }}>
        <div style={{ ...lbl, marginBottom: "8px" }}>TRAMOS POR TRAER UN ALOJAMIENTO</div>
        <div style={{ fontSize: "13px", color: C.muted, lineHeight: 1.8 }}>
          {TRAMOS_REFERIDO.map((t) => (
            <div key={t.label}>
              {t.label}: <span style={{ color: C.text }}>{t.amount === null ? "a convenir (lo escribes tú)" : clp(t.amount)}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
