"use client"
export const dynamic = "force-dynamic"

import { Suspense, useEffect, useState } from "react"
import { useSearchParams } from "next/navigation"

interface BankInfo {
  booking_code: string
  total_amount: number
  deposit_amount: number
  check_in: string
  check_out: string
  guest_name: string
  created_at: string
  bank_name: string | null
  bank_account_type: string | null
  bank_account_number: string | null
  bank_account_holder: string | null
  bank_rut: string | null
  transfer_timeout_hours: number
  whatsapp_number: string | null
}

function fmtCLP(n: number) {
  return "$" + Math.round(n).toLocaleString("es-CL")
}

function fmtDate(d: string) {
  return new Date(d + "T12:00:00").toLocaleDateString("es-CL", {
    weekday: "short", day: "numeric", month: "short"
  })
}

function useCountdown(createdAt: string, timeoutHours: number) {
  const deadline = new Date(createdAt).getTime() + timeoutHours * 3600 * 1000
  const [remaining, setRemaining] = useState(deadline - Date.now())

  useEffect(() => {
    const iv = setInterval(() => setRemaining(deadline - Date.now()), 1000)
    return () => clearInterval(iv)
  }, [deadline])

  const totalSecs = Math.max(0, Math.floor(remaining / 1000))
  const hrs = Math.floor(totalSecs / 3600)
  const mins = Math.floor((totalSecs % 3600) / 60)
  const secs = totalSecs % 60
  const expired = remaining <= 0
  const pct = Math.max(0, Math.min(100, (remaining / (timeoutHours * 3600 * 1000)) * 100))
  return { hrs, mins, secs, expired, pct }
}

function CountdownBar({ createdAt, timeoutHours }: { createdAt: string; timeoutHours: number }) {
  const { hrs, mins, secs, expired, pct } = useCountdown(createdAt, timeoutHours)
  const color = pct > 40 ? "#7ab87a" : pct > 15 ? "#e8d5a3" : "#e63946"

  if (expired) {
    return (
      <div style={{ background: "#1a0d0d", border: "1px solid #e63946", borderRadius: "10px", padding: "14px 16px", textAlign: "center" as const }}>
        <div style={{ color: "#e63946", fontFamily: "Georgia,serif", fontSize: "15px" }}>
          ⏱ Tiempo agotado — la reserva puede haber sido cancelada
        </div>
        <div style={{ color: "#8a9e88", fontSize: "12px", marginTop: "4px" }}>
          Si ya enviaste el comprobante, el propietario lo revisará igualmente.
        </div>
      </div>
    )
  }

  const pad = (n: number) => String(n).padStart(2, "0")
  return (
    <div style={{ background: "#162618", border: "1px solid #2a3e28", borderRadius: "10px", padding: "14px 16px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
        <span style={{ fontSize: "12px", color: "#8a9e88" }}>⏱ Tiempo para enviar comprobante</span>
        <span style={{ fontFamily: "Georgia,serif", fontSize: "18px", color, letterSpacing: "2px" }}>
          {pad(hrs)}:{pad(mins)}:{pad(secs)}
        </span>
      </div>
      <div style={{ background: "#0d1a12", borderRadius: "4px", height: "6px", overflow: "hidden" }}>
        <div style={{ height: "100%", borderRadius: "4px", background: color, width: `${pct}%`, transition: "width 1s linear, background 1s" }} />
      </div>
    </div>
  )
}

function PagoPendienteInner() {
  const searchParams = useSearchParams()
  const bookingId = searchParams.get("booking_id") ?? searchParams.get("external_reference")
  const [info, setInfo] = useState<BankInfo | null>(null)
  const [loading, setLoading] = useState(!!bookingId)

  useEffect(() => {
    if (!bookingId) return
    fetch(`/api/bookings/bank-info?booking_id=${bookingId}`)
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d && !d.error) setInfo(d) })
      .finally(() => setLoading(false))
  }, [bookingId])

  // Fallback: pantalla genérica MP (sin booking_id o mientras carga)
  if (!bookingId || (!loading && !info)) {
    return (
      <div style={{ background: "#0d1a12", minHeight: "100vh", fontFamily: "sans-serif", color: "#f0ede8", display: "flex", alignItems: "center", justifyContent: "center", padding: "24px" }}>
        <div style={{ maxWidth: "420px", width: "100%", textAlign: "center" as const }}>
          <div style={{ fontSize: "56px", marginBottom: "20px", lineHeight: 1 }}>{"⏳"}</div>
          <div style={{ fontFamily: "Georgia,serif", fontSize: "28px", color: "#e8d5a3", marginBottom: "12px" }}>
            {"Pago en proceso"}
          </div>
          <div style={{ fontSize: "14px", color: "#8a9e88", lineHeight: 1.75, marginBottom: "32px" }}>
            {"Tu pago está siendo procesado. Te notificaremos por email cuando se confirme."}
          </div>
          <a href="/" style={{ display: "block", width: "100%", boxSizing: "border-box" as const, background: "#7ab87a", color: "#0d1a12", borderRadius: "12px", padding: "16px", fontSize: "15px", fontWeight: 700, textAlign: "center" as const, textDecoration: "none" }}>
            Volver al inicio
          </a>
        </div>
      </div>
    )
  }

  if (loading) {
    return <div style={{ background: "#0d1a12", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}><div style={{ color: "#8a9e88" }}>Cargando...</div></div>
  }

  const hasBankData = info && (info.bank_name || info.bank_account_number)
  const depositAmt = info!.deposit_amount || info!.total_amount

  return (
    <div style={{ background: "#0d1a12", minHeight: "100vh", fontFamily: "sans-serif", color: "#f0ede8", padding: "24px 16px" }}>
      <div style={{ maxWidth: "480px", margin: "0 auto" }}>

        {/* Header */}
        <div style={{ textAlign: "center" as const, marginBottom: "28px" }}>
          <div style={{ fontSize: "40px", marginBottom: "10px" }}>🏡</div>
          <div style={{ fontFamily: "Georgia,serif", fontSize: "22px", color: "#e8d5a3", marginBottom: "4px" }}>
            ¡Reserva recibida!
          </div>
          <div style={{ fontSize: "13px", color: "#8a9e88" }}>
            {fmtDate(info!.check_in)} → {fmtDate(info!.check_out)}
          </div>
        </div>

        {/* Código de reserva — grande y visible */}
        <div style={{ background: "#162618", border: "2px solid #7ab87a", borderRadius: "14px", padding: "20px", textAlign: "center" as const, marginBottom: "16px" }}>
          <div style={{ fontSize: "11px", letterSpacing: "2px", color: "#7ab87a", marginBottom: "8px" }}>TU CÓDIGO DE RESERVA</div>
          <div style={{ fontFamily: "Georgia,serif", fontSize: "30px", color: "#e8d5a3", letterSpacing: "4px", fontWeight: 700 }}>
            {info!.booking_code}
          </div>
          <div style={{ fontSize: "12px", color: "#8a9e88", marginTop: "6px" }}>
            Incluye este código al enviar el comprobante
          </div>
        </div>

        {/* Cuenta regresiva */}
        {info!.created_at && (
          <div style={{ marginBottom: "16px" }}>
            <CountdownBar createdAt={info!.created_at} timeoutHours={info!.transfer_timeout_hours} />
          </div>
        )}

        {/* Monto a transferir */}
        <div style={{ background: "#162618", border: "1px solid #2a3e28", borderRadius: "14px", padding: "16px", marginBottom: "16px" }}>
          <div style={{ fontSize: "11px", letterSpacing: "1.5px", color: "#8a9e88", marginBottom: "10px" }}>MONTO A TRANSFERIR</div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: "13px", color: "#8a9e88" }}>Anticipo ({info!.deposit_amount && info!.total_amount ? Math.round((info!.deposit_amount / info!.total_amount) * 100) : 20}%)</span>
            <span style={{ fontFamily: "Georgia,serif", fontSize: "22px", color: "#e8d5a3", fontWeight: 700 }}>{fmtCLP(depositAmt)}</span>
          </div>
          <div style={{ borderTop: "1px solid #2a3e28", marginTop: "10px", paddingTop: "10px", display: "flex", justifyContent: "space-between" }}>
            <span style={{ fontSize: "12px", color: "#5a7058" }}>Total estadía</span>
            <span style={{ fontSize: "14px", color: "#8a9e88" }}>{fmtCLP(info!.total_amount)}</span>
          </div>
        </div>

        {/* Datos bancarios */}
        {hasBankData && (
          <div style={{ background: "#162618", border: "1px solid #2a3e28", borderRadius: "14px", padding: "16px", marginBottom: "16px" }}>
            <div style={{ fontSize: "11px", letterSpacing: "1.5px", color: "#8a9e88", marginBottom: "12px" }}>DATOS DE TRANSFERENCIA</div>
            {[
              ["Banco", info!.bank_name],
              ["Tipo de cuenta", info!.bank_account_type],
              ["N° de cuenta", info!.bank_account_number],
              ["Titular", info!.bank_account_holder],
              ["RUT titular", info!.bank_rut],
            ].filter(([, v]) => v).map(([label, value]) => (
              <div key={label as string} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid #2a3e2840" }}>
                <span style={{ fontSize: "12px", color: "#5a7058" }}>{label}</span>
                <span style={{ fontSize: "13px", color: "#e8d5a3", fontWeight: 500, textAlign: "right" as const, maxWidth: "60%" }}>{value}</span>
              </div>
            ))}
          </div>
        )}

        {/* Instrucciones paso a paso */}
        <div style={{ background: "#0a1510", border: "1px solid #2a3e28", borderRadius: "14px", padding: "18px", marginBottom: "24px" }}>
          <div style={{ fontSize: "11px", letterSpacing: "1.5px", color: "#8a9e88", marginBottom: "14px" }}>CÓMO CONFIRMAR TU RESERVA</div>
          {[
            { n: "1", text: `Transfiere ${fmtCLP(depositAmt)} a la cuenta indicada` },
            { n: "2", text: info!.whatsapp_number ? `Envía tu comprobante por WhatsApp al ${info!.whatsapp_number}` : "Envía tu comprobante por WhatsApp al propietario" },
            { n: "3", text: `Incluye tu código ${info!.booking_code} en el mensaje` },
            { n: "4", text: "Recibirás confirmación en minutos" },
          ].map(({ n, text }) => (
            <div key={n} style={{ display: "flex", gap: "12px", alignItems: "flex-start", marginBottom: "12px" }}>
              <div style={{ minWidth: "26px", height: "26px", borderRadius: "50%", background: "#7ab87a22", border: "1px solid #7ab87a44", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "12px", color: "#7ab87a", fontWeight: 700, flexShrink: 0 }}>{n}</div>
              <span style={{ fontSize: "13px", color: "#c8d8c0", lineHeight: 1.6, paddingTop: "3px" }}>{text}</span>
            </div>
          ))}
        </div>

        {/* WhatsApp CTA */}
        {info!.whatsapp_number && (
          <a
            href={`https://wa.me/${info!.whatsapp_number.replace(/\D/g, "")}?text=Comprobante%20de%20transferencia%20para%20reserva%20${info!.booking_code}`}
            target="_blank"
            rel="noopener noreferrer"
            style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "10px", width: "100%", boxSizing: "border-box" as const, background: "#25D366", color: "#fff", borderRadius: "12px", padding: "16px", fontSize: "15px", fontWeight: 700, textDecoration: "none", marginBottom: "12px" }}
          >
            <span style={{ fontSize: "20px" }}>📲</span>
            Enviar comprobante por WhatsApp
          </a>
        )}

        <a href="/" style={{ display: "block", textAlign: "center" as const, color: "#5a7058", fontSize: "13px", textDecoration: "underline" }}>
          Volver al inicio
        </a>

      </div>
    </div>
  )
}

export default function PagoPendientePage() {
  return (
    <Suspense fallback={<div style={{ background: "#0d1a12", minHeight: "100vh" }} />}>
      <PagoPendienteInner />
    </Suspense>
  )
}
