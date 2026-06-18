"use client"

import { useEffect, useState } from "react"
import { useSearchParams } from "next/navigation"
import { Suspense } from "react"
import { getPersistedToken } from "@/lib/takai-token"

type SubData = {
  plan: string
  amount: number
  currency: string
  status: string
  billing_mode: string
  commission_rate: number
  free_until: string | null
  trial_ends_at: string | null
  last_payment_at: string | null
  next_billing_at: string | null
  failed_payments: number
  mp_preapproval_id: string | null
}

type StatementRow = {
  id: string
  period_year: number
  period_month: number
  kind: string
  bookings_count: number
  bookings_total: number
  currency: string
  commission_amount: number
  commission_rate: number
  status: string
  payment_method: string | null
  paid_at: string | null
  created_at: string
}

type BillingPayload = {
  tenant_id: string
  business_name: string
  billing_status: string
  manual_billing: boolean
  currency: string
  bank: {
    bank_name: string | null
    bank_account_type: string | null
    bank_account_number: string | null
    bank_account_holder: string | null
    bank_rut: string | null
    bank_email: string | null
  }
  subscription: SubData | null
  statements: StatementRow[]
}

const PANEL_BG = "#0d1a12"
const CARD = "#162618"
const BORDER = "#2a3e28"
const GOLD = "#e8d5a3"
const GREEN = "#7ab87a"
const MUTED = "#5a7058"
const RED = "#e63946"
const YELLOW = "#f59e0b"

function formatCurrency(amount: number, currency: string): string {
  if (currency === "USD") return "$" + amount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  if (currency === "COP") return "$" + Math.round(amount).toLocaleString("es-CO")
  return "$" + Math.round(amount).toLocaleString("es-CL")
}

function statusLabel(s: string): { text: string; color: string; bg: string } {
  switch (s) {
    case "trial":      return { text: "Prueba gratuita", color: "#60a5fa", bg: "#0a1a2e" }
    case "pending":    return { text: "Pago pendiente", color: YELLOW, bg: "#1a1400" }
    case "active":     return { text: "Activa", color: "#4ade80", bg: "#0a2010" }
    case "past_due":   return { text: "Pago fallido", color: YELLOW, bg: "#1a1400" }
    case "suspended":  return { text: "Suspendida", color: RED, bg: "#2a0a0a" }
    case "cancelled":  return { text: "Cancelada", color: MUTED, bg: CARD }
    default:           return { text: s, color: MUTED, bg: CARD }
  }
}

function stmtStatusLabel(s: string): { text: string; color: string } {
  switch (s) {
    case "pending":            return { text: "Pendiente", color: YELLOW }
    case "sent":               return { text: "Enviado", color: "#60a5fa" }
    case "transfer_reported":  return { text: "Transferencia reportada", color: GREEN }
    case "paid":               return { text: "Pagado", color: "#4ade80" }
    default:                   return { text: s, color: MUTED }
  }
}

function daysLeft(isoDate: string | null): number {
  if (!isoDate) return 0
  return Math.max(0, Math.ceil((new Date(isoDate).getTime() - Date.now()) / 86400000))
}

function formatDate(isoDate: string | null): string {
  if (!isoDate) return "—"
  return new Date(isoDate).toLocaleDateString("es-CL", { day: "numeric", month: "long", year: "numeric" })
}

function monthLabel(year: number, month: number): string {
  return new Date(year, month - 1, 1).toLocaleDateString("es-CL", { month: "long", year: "numeric" })
}

function FacturacionInner() {
  const searchParams = useSearchParams()
  const [token, setToken] = useState<string | null>(null)
  const [payload, setPayload] = useState<BillingPayload | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [subscribing, setSubscribing] = useState(false)
  const [subMsg, setSubMsg] = useState<string | null>(null)
  const [payingId, setPayingId] = useState<string | null>(null)
  const [reportingId, setReportingId] = useState<string | null>(null)
  const [reportedIds, setReportedIds] = useState<Set<string>>(new Set())

  useEffect(() => {
    const t = searchParams.get("token") || getPersistedToken()
    if (!t) { setLoading(false); setError("Sin token de acceso"); return }
    setToken(t)
    fetch(`/api/billing/status?token=${encodeURIComponent(t)}`, { cache: "no-store" })
      .then(r => r.json())
      .then(d => {
        if (d.error) { setError(d.error); setLoading(false); return }
        setPayload(d)
        setLoading(false)
      })
      .catch(() => { setError("Error al cargar datos"); setLoading(false) })
  }, [searchParams])

  async function handleSubscribe() {
    if (!token) return
    setSubscribing(true)
    setSubMsg(null)
    try {
      const res = await fetch("/api/billing/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      })
      const d = await res.json()
      if (!res.ok || d.error) {
        setSubMsg(d.error || "Error al iniciar suscripción")
        setSubscribing(false)
        return
      }
      window.location.href = d.init_point
    } catch {
      setSubMsg("Error de conexión. Intenta nuevamente.")
      setSubscribing(false)
    }
  }

  async function handlePayCard(statementId: string) {
    if (!token) return
    setPayingId(statementId)
    try {
      const res = await fetch("/api/billing/commission-pay", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, statement_id: statementId }),
      })
      const d = await res.json()
      if (!res.ok || d.error) {
        alert(d.error || "Error al generar enlace de pago")
        setPayingId(null)
        return
      }
      window.location.href = d.init_point
    } catch {
      alert("Error de conexión.")
      setPayingId(null)
    }
  }

  async function handleReportTransfer(statementId: string) {
    if (!token) return
    setReportingId(statementId)
    try {
      const res = await fetch("/api/billing/report-transfer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, statement_id: statementId }),
      })
      const d = await res.json()
      if (!res.ok || d.error) {
        alert(d.error || "Error al reportar transferencia")
        setReportingId(null)
        return
      }
      setReportedIds(prev => new Set(Array.from(prev).concat(statementId)))
      setReportingId(null)
    } catch {
      alert("Error de conexión.")
      setReportingId(null)
    }
  }

  if (loading) return (
    <div style={{ background: PANEL_BG, minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", color: MUTED, fontFamily: "sans-serif" }}>
      Cargando…
    </div>
  )

  if (error || !payload) return (
    <div style={{ background: PANEL_BG, minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", color: RED, fontFamily: "sans-serif" }}>
      {error || "Error desconocido"}
    </div>
  )

  const { billing_status, manual_billing, subscription: sub, business_name, statements } = payload
  const billingMode = sub?.billing_mode ?? "subscription"
  const isCommission = billingMode === "commission"
  const badge = statusLabel(billing_status)
  const isTrialActive = billing_status === "trial" && daysLeft(sub?.trial_ends_at ?? null) > 0
  const canSubscribe = !manual_billing && !isCommission && (
    billing_status === "trial" || billing_status === "suspended" || billing_status === "past_due" || billing_status === "pending" || billing_status === "cancelled"
  )

  return (
    <div style={{ background: PANEL_BG, minHeight: "100vh", fontFamily: "sans-serif", color: "#f0ede8" }}>
      <nav style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 28px", borderBottom: `1px solid ${BORDER}`, background: "#0a1510" }}>
        <span style={{ fontFamily: "Georgia,serif", fontSize: "16px", letterSpacing: "4px", color: GOLD, textTransform: "uppercase" as const }}>
          {business_name}
        </span>
        <a href="/" style={{ color: MUTED, fontSize: "13px", textDecoration: "none" }}>
          ← Volver al panel
        </a>
      </nav>

      <div style={{ maxWidth: "600px", margin: "48px auto", padding: "0 20px" }}>
        <h1 style={{ fontFamily: "Georgia,serif", fontSize: "26px", fontWeight: 400, color: GOLD, marginBottom: "6px" }}>
          Facturación
        </h1>
        <p style={{ color: MUTED, fontSize: "13px", marginBottom: "32px" }}>
          {isCommission ? "Comisiones y estados de cuenta mensuales." : "Gestiona tu suscripción a Takai."}
        </p>

        {/* Plan / Estado */}
        <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: "12px", padding: "28px", marginBottom: "20px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "20px" }}>
            <span style={{ fontSize: "11px", letterSpacing: "2px", textTransform: "uppercase" as const, color: MUTED }}>
              {isCommission ? "Modelo de pago" : "Estado de suscripción"}
            </span>
            {isCommission ? (
              <span style={{ background: "#0a2010", color: "#4ade80", padding: "4px 14px", borderRadius: "20px", fontSize: "12px", fontWeight: 700 }}>
                Comisión {sub?.commission_rate ?? 10}%
              </span>
            ) : (
              <span style={{ background: badge.bg, color: badge.color, padding: "4px 14px", borderRadius: "20px", fontSize: "12px", fontWeight: 700 }}>
                {badge.text}
              </span>
            )}
          </div>

          {isCommission ? (
            <div style={{ background: "#0a2010", border: "1px solid #1a4020", borderRadius: "8px", padding: "16px" }}>
              <p style={{ color: GREEN, fontSize: "14px", margin: "0 0 8px" }}>
                Plan comisión — sin mensualidad fija.
              </p>
              <p style={{ color: MUTED, fontSize: "13px", margin: 0, lineHeight: 1.6 }}>
                Pagas el {sub?.commission_rate ?? 10}% de las reservas confirmadas del mes anterior.
                {sub?.free_until
                  ? " Sin comisión hasta el " + formatDate(sub.free_until) + "."
                  : " Sin comisión por tiempo indefinido (acuerdo vigente)."}
              </p>
            </div>
          ) : (
            <>
              {isTrialActive && (
                <div style={{ background: "#0a1a2e", border: "1px solid #1e3a5f", borderRadius: "8px", padding: "16px", marginBottom: "16px" }}>
                  <div style={{ color: "#60a5fa", fontSize: "28px", fontFamily: "Georgia,serif", marginBottom: "4px" }}>
                    {daysLeft(sub?.trial_ends_at ?? null)}
                  </div>
                  <div style={{ color: MUTED, fontSize: "12px" }}>días restantes de prueba gratuita</div>
                  <div style={{ color: MUTED, fontSize: "11px", marginTop: "4px" }}>
                    Termina el {formatDate(sub?.trial_ends_at ?? null)}
                  </div>
                </div>
              )}

              {billing_status === "suspended" && (
                <div style={{ background: "#2a0a0a", border: `1px solid ${RED}`, borderRadius: "8px", padding: "16px", marginBottom: "16px" }}>
                  <p style={{ color: RED, fontSize: "14px", margin: 0, lineHeight: 1.5 }}>
                    Tu suscripción está suspendida. Las reservas en línea están pausadas. Activa tu suscripción para reanudar el servicio.
                  </p>
                </div>
              )}

              {billing_status === "past_due" && (
                <div style={{ background: "#1a1400", border: `1px solid ${YELLOW}`, borderRadius: "8px", padding: "16px", marginBottom: "16px" }}>
                  <p style={{ color: YELLOW, fontSize: "14px", margin: 0, lineHeight: 1.5 }}>
                    Tuvimos un problema con tu último pago ({sub?.failed_payments ?? 0} intento(s) fallido(s)). Actualiza tu método de pago para evitar la suspensión.
                  </p>
                </div>
              )}

              {billing_status === "active" && (
                <div style={{ background: "#0a2010", border: "1px solid #1a4020", borderRadius: "8px", padding: "16px", marginBottom: "16px" }}>
                  <p style={{ color: GREEN, fontSize: "14px", margin: 0 }}>Tu suscripción está activa. Todo funciona con normalidad.</p>
                </div>
              )}

              {manual_billing && (
                <div style={{ background: "#111", border: `1px solid ${BORDER}`, borderRadius: "8px", padding: "16px" }}>
                  <p style={{ color: MUTED, fontSize: "14px", margin: 0, lineHeight: 1.5 }}>
                    Tu facturación está gestionada directamente con Takai. Contáctanos por WhatsApp para cualquier consulta.
                  </p>
                </div>
              )}

              {!manual_billing && sub && (
                <div style={{ marginTop: "8px" }}>
                  <Row label="Plan" value={sub.plan.charAt(0).toUpperCase() + sub.plan.slice(1)} />
                  <Row label="Precio" value={formatCurrency(sub.amount, sub.currency) + "/mes"} highlight />
                  {sub.last_payment_at && <Row label="Último pago" value={formatDate(sub.last_payment_at)} />}
                  {sub.next_billing_at && <Row label="Próximo cobro" value={formatDate(sub.next_billing_at)} />}
                </div>
              )}
            </>
          )}
        </div>

        {/* Activar suscripción (solo subscription mode) */}
        {canSubscribe && (
          <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: "12px", padding: "28px", marginBottom: "20px" }}>
            <p style={{ color: GOLD, fontFamily: "Georgia,serif", fontSize: "18px", marginBottom: "8px" }}>
              {sub ? `Plan ${sub.plan.charAt(0).toUpperCase() + sub.plan.slice(1)} — ${formatCurrency(sub.amount, sub.currency)}/mes` : "Plan Fundador — $19.990 CLP/mes"}
            </p>
            <p style={{ color: MUTED, fontSize: "13px", lineHeight: 1.7, marginBottom: "24px" }}>
              Precio congelado de por vida para clientes fundadores. Incluye panel de reservas completo, MercadoPago nativo, calendario, emails y soporte.
            </p>
            {subMsg && (
              <div style={{ background: "#2a0a0a", border: `1px solid ${RED}`, borderRadius: "6px", padding: "12px", marginBottom: "16px", color: RED, fontSize: "13px" }}>
                {subMsg}
              </div>
            )}
            <button
              onClick={handleSubscribe}
              disabled={subscribing}
              style={{ background: subscribing ? "#2a3e28" : GREEN, color: subscribing ? MUTED : "#0a1510", border: "none", padding: "14px 32px", borderRadius: "8px", fontFamily: "sans-serif", fontSize: "14px", fontWeight: 700, cursor: subscribing ? "default" : "pointer", width: "100%", letterSpacing: "1px" }}
            >
              {subscribing ? "Redirigiendo a MercadoPago…" : billing_status === "suspended" ? "Reactivar suscripción →" : "Activar suscripción →"}
            </button>
            <p style={{ color: MUTED, fontSize: "11px", marginTop: "12px", textAlign: "center" as const }}>
              Serás redirigido a MercadoPago para autorizar el cobro mensual.
            </p>
          </div>
        )}

        {billing_status === "active" && !manual_billing && !isCommission && (
          <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: "12px", padding: "20px", textAlign: "center" as const, marginBottom: "20px" }}>
            <p style={{ color: MUTED, fontSize: "13px", margin: 0 }}>
              Para cancelar o modificar tu suscripción, contacta a Takai por WhatsApp.
            </p>
          </div>
        )}

        {/* Estados de cuenta (solo commission mode) */}
        {isCommission && (
          <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: "12px", padding: "28px" }}>
            <h2 style={{ fontFamily: "Georgia,serif", fontSize: "18px", fontWeight: 400, color: GOLD, margin: "0 0 20px" }}>
              Estados de cuenta
            </h2>

            {statements.length === 0 ? (
              <p style={{ color: MUTED, fontSize: "13px", margin: 0 }}>
                Aún no hay estados de cuenta generados. El primero llegará el 1° del próximo mes.
              </p>
            ) : (
              statements.map((stmt, idx) => {
                const stLabel = stmtStatusLabel(stmt.status)
                const alreadyReported = reportedIds.has(stmt.id) || stmt.status === "transfer_reported"
                const isPaid = stmt.status === "paid"
                const canPay = !isPaid && !alreadyReported
                const isClp = stmt.currency === "CLP"

                return (
                  <div
                    key={stmt.id}
                    style={{ borderTop: idx > 0 ? `1px solid ${BORDER}` : "none", paddingTop: idx > 0 ? "20px" : "0", marginTop: idx > 0 ? "20px" : "0" }}
                  >
                    <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "12px", flexWrap: "wrap" as const, gap: "8px" }}>
                      <div>
                        <div style={{ color: "#c8c8c8", fontSize: "14px", fontWeight: 600, marginBottom: "2px", textTransform: "capitalize" as const }}>
                          {monthLabel(stmt.period_year, stmt.period_month)}
                        </div>
                        <div style={{ color: MUTED, fontSize: "12px" }}>
                          {stmt.bookings_count} reserva(s) · {formatCurrency(stmt.bookings_total, stmt.currency)} facturado
                        </div>
                      </div>
                      <div style={{ textAlign: "right" as const }}>
                        <div style={{ color: GOLD, fontFamily: "Georgia,serif", fontSize: "18px" }}>
                          {formatCurrency(stmt.commission_amount, stmt.currency)}
                        </div>
                        <div style={{ color: stLabel.color, fontSize: "11px", marginTop: "2px" }}>
                          {stLabel.text}
                        </div>
                      </div>
                    </div>

                    {isPaid && (
                      <div style={{ color: "#4ade80", fontSize: "12px", background: "#0a2010", padding: "8px 14px", borderRadius: "6px", display: "inline-block" }}>
                        Pagado el {formatDate(stmt.paid_at)}{stmt.payment_method === "card" ? " · tarjeta" : " · transferencia"}
                      </div>
                    )}

                    {alreadyReported && !isPaid && (
                      <div style={{ color: GREEN, fontSize: "12px", background: "#0a2010", padding: "8px 14px", borderRadius: "6px", display: "inline-block" }}>
                        Transferencia reportada — Takai confirmará el pago pronto.
                      </div>
                    )}

                    {canPay && (
                      <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" as const }}>
                        {isClp && (
                          <button
                            onClick={() => handlePayCard(stmt.id)}
                            disabled={payingId === stmt.id}
                            style={{ background: GREEN, color: "#0a1510", border: "none", padding: "10px 20px", borderRadius: "6px", fontSize: "13px", fontWeight: 700, cursor: payingId === stmt.id ? "default" : "pointer" }}
                          >
                            {payingId === stmt.id ? "Redirigiendo…" : "Pagar con tarjeta →"}
                          </button>
                        )}
                        <button
                          onClick={() => handleReportTransfer(stmt.id)}
                          disabled={reportingId === stmt.id}
                          style={{ background: "transparent", color: GREEN, border: `1px solid ${GREEN}`, padding: "10px 20px", borderRadius: "6px", fontSize: "13px", fontWeight: 600, cursor: reportingId === stmt.id ? "default" : "pointer" }}
                        >
                          {reportingId === stmt.id ? "Enviando…" : "Ya transferí"}
                        </button>
                      </div>
                    )}
                  </div>
                )
              })
            )}
          </div>
        )}
      </div>
    </div>
  )
}

function Row({ label, value, highlight = false }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", borderTop: `1px solid ${BORDER}` }}>
      <span style={{ color: MUTED, fontSize: "12px" }}>{label}</span>
      <span style={{ color: highlight ? GOLD : "#c8c8c8", fontSize: "13px", fontFamily: highlight ? "Georgia,serif" : "sans-serif" }}>{value}</span>
    </div>
  )
}

export default function FacturacionPage() {
  return (
    <Suspense fallback={<div style={{ background: "#0d1a12", minHeight: "100vh" }} />}>
      <FacturacionInner />
    </Suspense>
  )
}
