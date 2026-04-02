"use client"
import { Suspense, useState, useEffect } from "react"
import { useSearchParams } from "next/navigation"
import type { CSSProperties } from "react"

function fmt(n: number) {
  return "$" + n.toLocaleString("es-CL")
}

const TRINIDAD_CABIN_IDS = new Set([
  "b0fd873b-fe33-479a-b00c-908c3ac6c52d",
  "6802b931-398e-4f38-9b08-b724a672b702",
  "6650debc-4258-4045-9b4c-55c9352d6fcf",
])

const BANK_INFO: Record<string, { banco: string; tipo: string; numero: string; titular: string; rut?: string }> = {
  "11518e5f-6a0b-4bdc-bb6a-a1e142544579": { banco: "BancoEstado", tipo: "Cuenta RUT", numero: "15.665.466-3", titular: "Rukatraro" },
  "db307f3e-fd56-49b3-b4c5-868c7607c31e": { banco: "BancoEstado", tipo: "Cuenta RUT", numero: "15.157.523", titular: "Angélica Ancalef", rut: "13.157.523-8" },
}

function LogoNegocio({ businessName, tenantId }: { businessName: string; tenantId: string }) {
  const isTrinidad = tenantId === "db307f3e-fd56-49b3-b4c5-868c7607c31e"
  const parts = businessName.split(" ")
  const first = parts[0] || "Takai"
  const rest = parts.slice(1).join(" ")
  const logoStyle: CSSProperties = { fontFamily: "Georgia,serif", fontSize: "20px", letterSpacing: "3px", color: "#e8d5a3", textTransform: "uppercase" }
  const spanStyle: CSSProperties = { color: "#7ab87a" }

  if (isTrinidad) return <div style={logoStyle}>{"CABAÑAS"}<span style={spanStyle}>{" TRINIDAD"}</span></div>
  return <div style={logoStyle}>{first}<span style={spanStyle}>{rest ? " " + rest : ""}</span></div>
}

function ReservarInner() {
  const params = useSearchParams()
  const cabin_id = params.get("cabin_id") || ""
  const cabin_name = params.get("cabin_name") || "Cabaña"
  const visitedParam = params.get("visited") || ""
  const visitedCabins = visitedParam ? visitedParam.split(",").filter(Boolean) : []

  const isTrinidad = TRINIDAD_CABIN_IDS.has(cabin_id)
  const precio_noche = Number(params.get("price")) || 30000
  const capacidad = Number(params.get("capacity")) || 4
  const today = new Date().toISOString().split("T")[0]

  const [tenantId, setTenantId] = useState("")
  const [businessName, setBusinessName] = useState("Cabaña")
  const [ownerName, setOwnerName] = useState("")
  const [slug, setSlug] = useState("")
  const [hasTinaja, setHasTinaja] = useState(true)

  const [paso, setPaso] = useState(1)
  const [checkIn, setCheckIn] = useState("")
  const [checkOut, setCheckOut] = useState("")
  const [guests, setGuests] = useState(2)
  const [tinajaDias, setTinajaDias] = useState(0)
  const [nombre, setNombre] = useState("")
  const [whatsapp, setWhatsapp] = useState("")
  const [email, setEmail] = useState("")
  const [metodoPago, setMetodoPago] = useState("transferencia")
  const [loading, setLoading] = useState(false)
  const [submitError, setSubmitError] = useState("")
  const [codigo, setCodigo] = useState("")
  const [dispStatus, setDispStatus] = useState("idle")
  const [autoAssignId, setAutoAssignId] = useState("")
  const [suggest, setSuggest] = useState<any>(null)
  const [redTakai, setRedTakai] = useState(false)

  useEffect(() => {
    if (!cabin_id) return
    fetch("/api/tenant-by-cabin?cabin_id=" + cabin_id)
      .then(r => r.json())
      .then(data => {
        if (data.tenant_id) setTenantId(data.tenant_id)
        if (data.business_name) setBusinessName(data.business_name)
        if (data.owner_name) setOwnerName(data.owner_name)
        if (data.slug) setSlug(data.slug)
        if (typeof data.has_tinaja === "boolean") setHasTinaja(data.has_tinaja)
      })
      .catch(() => {})
  }, [cabin_id])

  const noches = checkIn && checkOut
    ? Math.max(0, Math.round((new Date(checkOut).getTime() - new Date(checkIn).getTime()) / 86400000))
    : 0
  const extrasPersonas = Math.max(0, guests - capacidad) * 5000 * noches
  const subtotal = precio_noche * noches + extrasPersonas
  const tinaja = tinajaDias * 30000
  const total = subtotal + tinaja
  const deposito = Math.round(total * 0.2)
  const noches_ok = noches >= 2
  const fechas_ok = noches_ok && dispStatus === "ok"
  const form_ok = fechas_ok && nombre.trim().length > 0 && whatsapp.trim().length > 0

  const bank = tenantId ? BANK_INFO[tenantId] : null
  const bankRows = bank
    ? [
        ["Banco", bank.banco],
        ["Tipo", bank.tipo],
        ["Número", bank.numero],
        ["Titular", bank.titular],
        ...(bank.rut ? [["RUT", bank.rut]] : []),
        ["Monto exacto", fmt(deposito)],
      ]
    : [["Monto exacto", fmt(deposito)]]

  const bankRowsFinal = bank
    ? [
        ["Banco", bank.banco],
        ["Cuenta RUT", bank.numero],
        ["Titular", bank.titular],
        ...(bank.rut ? [["RUT titular", bank.rut]] : []),
        ["Monto exacto", fmt(deposito)],
        ["Glosa / Concepto", codigo],
      ]
    : [["Monto exacto", fmt(deposito)], ["Glosa / Concepto", codigo]]

  useEffect(() => {
    if (!checkIn || !checkOut || !noches_ok || !cabin_id) {
      setDispStatus("idle"); setAutoAssignId(""); setSuggest(null); setRedTakai(false); return
    }
    setDispStatus("checking")
    const timer = setTimeout(async () => {
      try {
        const vParam = visitedCabins.join(",")
        const res = await fetch("/api/availability?cabin_id=" + cabin_id + "&check_in=" + checkIn + "&check_out=" + checkOut + "&visited=" + encodeURIComponent(vParam))
        const data = await res.json()
        if (data.available) { setDispStatus("ok"); setAutoAssignId(""); setSuggest(null); setRedTakai(false) }
        else if (data.auto_assign) { setAutoAssignId(data.auto_assign.cabin_id); setDispStatus("ok"); setSuggest(null); setRedTakai(false) }
        else if (data.suggest) { setDispStatus("occupied"); setSuggest(data.suggest); setRedTakai(false); setAutoAssignId("") }
        else if (data.red_takai) { setDispStatus("occupied"); setSuggest(null); setRedTakai(true); setAutoAssignId("") }
        else { setDispStatus("occupied"); setSuggest(null); setRedTakai(false); setAutoAssignId("") }
      } catch (e) { setDispStatus("idle") }
    }, 700)
    return () => clearTimeout(timer)
  }, [checkIn, checkOut, cabin_id, noches_ok])

  async function confirmar() {
    setLoading(true); setSubmitError("")
    try {
      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cabin_id: autoAssignId || cabin_id,
          check_in: checkIn, check_out: checkOut, guests, nights: noches,
          subtotal, total, deposit: deposito, tinaja_days: tinajaDias,
          nombre: nombre.trim(), whatsapp: whatsapp.trim(), email: email.trim(), metodo_pago: metodoPago,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.message || data.error || "Error al confirmar")
      setCodigo(data.booking_code); setPaso(4)
    } catch (e: any) { setSubmitError(e.message) }
    finally { setLoading(false) }
  }

  const newVisited = [...visitedCabins, cabin_id].join(",")
  const backHref = slug ? "/" + slug : "/"

  const s: Record<string, CSSProperties> = {
    page: { fontFamily: "sans-serif", color: "#f0ede8", background: "#0d1a12", minHeight: "100vh" },
    nav: { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "18px 24px", borderBottom: "1px solid #ffffff0f", background: "#0a1510" },
    backBtn: { background: "transparent", border: "1px solid #2a3e28", color: "#8a9e88", fontSize: "12px", padding: "7px 16px", borderRadius: "20px", cursor: "pointer" },
    steps: { display: "flex", background: "#0a1510", borderBottom: "1px solid #ffffff08" },
    stepBase: { flex: 1, padding: "14px 6px", textAlign: "center" as const, fontSize: "10px", letterSpacing: "1.5px", textTransform: "uppercase" as const, color: "#2a3e28", borderBottom: "2px solid transparent" },
    stepActive: { flex: 1, padding: "14px 6px", textAlign: "center" as const, fontSize: "10px", letterSpacing: "1.5px", textTransform: "uppercase" as const, color: "#7ab87a", borderBottom: "2px solid #7ab87a" },
    stepDone: { flex: 1, padding: "14px 6px", textAlign: "center" as const, fontSize: "10px", letterSpacing: "1.5px", textTransform: "uppercase" as const, color: "#4a6e48", borderBottom: "2px solid #4a6e48" },
    body: { padding: "24px 20px", maxWidth: "480px", margin: "0 auto" },
    eye: { fontSize: "10px", letterSpacing: "2px", textTransform: "uppercase" as const, color: "#7ab87a", marginBottom: "6px" },
    title: { fontFamily: "Georgia,serif", fontSize: "28px", color: "#e8d5a3", marginBottom: "20px" },
    card: { background: "#162618", border: "1px solid #2a3e28", borderRadius: "16px", padding: "20px", marginBottom: "14px" },
    cardTitle: { fontFamily: "Georgia,serif", fontSize: "16px", color: "#e8d5a3", marginBottom: "16px", paddingBottom: "12px", borderBottom: "1px solid #ffffff0a" },
    g2: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px", marginBottom: "14px" },
    lbl: { display: "block", fontSize: "10px", fontWeight: 600, letterSpacing: "1.5px", textTransform: "uppercase" as const, color: "#5a7058", marginBottom: "6px" },
    inp: { width: "100%", boxSizing: "border-box" as const, padding: "10px 8px", background: "#0d1a12", border: "1px solid #2a3e28", borderRadius: "10px", fontSize: "12px", color: "#c8d8c0", fontFamily: "sans-serif", outline: "none" },
    sel: { width: "100%", padding: "12px 14px", background: "#0d1a12", border: "1px solid #2a3e28", borderRadius: "10px", fontSize: "14px", color: "#c8d8c0", fontFamily: "sans-serif", outline: "none", marginBottom: "14px" },
    err: { background: "#e6394615", border: "1px solid #e6394633", borderRadius: "10px", padding: "14px", fontSize: "13px", color: "#e67a7a", marginBottom: "14px", lineHeight: 1.6 },
    ok: { background: "#7ab87a18", border: "1px solid #7ab87a33", borderRadius: "10px", padding: "10px 14px", marginBottom: "14px", fontSize: "12px", color: "#7ab87a" },
    info: { background: "#7ab87a10", border: "1px solid #7ab87a22", borderRadius: "10px", padding: "12px 14px", marginBottom: "14px", fontSize: "12px", color: "#7ab87a", lineHeight: 1.6 },
    warn: { background: "#e8a21a18", border: "1px solid #e8a21a33", borderRadius: "10px", padding: "14px", marginBottom: "14px" },
    warnTitle: { fontSize: "13px", fontWeight: 600, color: "#e8b84a", marginBottom: "4px" },
    warnDesc: { fontSize: "12px", color: "#c8a060", lineHeight: 1.6 },
    priceBox: { background: "#0d1a12", border: "1px solid #2a3e28", borderRadius: "12px", padding: "16px" },
    priceRow: { display: "flex", justifyContent: "space-between", fontSize: "13px", padding: "5px 0" },
    priceKey: { color: "#6a7e68" },
    priceVal: { color: "#c8d8c0", fontWeight: 500 },
    hr: { border: "none", borderTop: "1px solid #ffffff0a", margin: "10px 0" },
    totalRow: { display: "flex", justifyContent: "space-between", alignItems: "baseline", padding: "8px 0 0" },
    totalKey: { fontSize: "12px", color: "#8a9e88" },
    totalVal: { fontFamily: "Georgia,serif", fontSize: "28px", color: "#e8d5a3" },
    deposit: { display: "flex", justifyContent: "space-between", alignItems: "center", background: "#7ab87a14", border: "1px solid #7ab87a2a", borderRadius: "10px", padding: "12px 14px", margin: "14px 0" },
    depKey: { fontSize: "12px", color: "#7ab87a" },
    depVal: { fontSize: "17px", fontWeight: 700, color: "#7ab87a" },
    btn: { width: "100%", background: "#7ab87a", color: "#0d1a12", border: "none", borderRadius: "12px", padding: "16px", fontSize: "15px", fontWeight: 700, cursor: "pointer", fontFamily: "sans-serif" },
    btnDisabled: { width: "100%", background: "#2a3e28", color: "#4a6e48", border: "none", borderRadius: "12px", padding: "16px", fontSize: "15px", fontWeight: 700, cursor: "not-allowed" as const, fontFamily: "sans-serif" },
    btnBack: { width: "100%", background: "transparent", color: "#8a9e88", border: "1px solid #2a3e28", borderRadius: "12px", padding: "14px", fontSize: "14px", fontWeight: 500, cursor: "pointer", fontFamily: "sans-serif", marginTop: "10px" },
    payOpt: { border: "2px solid #2a3e28", borderRadius: "14px", padding: "18px", marginBottom: "12px", cursor: "pointer", background: "#0d1a12" },
    payOptSel: { border: "2px solid #7ab87a", borderRadius: "14px", padding: "18px", marginBottom: "12px", cursor: "pointer", background: "#7ab87a0a" },
    payHead: { display: "flex", alignItems: "center", gap: "12px", marginBottom: "6px" },
    radio: { width: "18px", height: "18px", borderRadius: "50%", border: "2px solid #4a6e48", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" },
    radioSel: { width: "18px", height: "18px", borderRadius: "50%", border: "2px solid #7ab87a", background: "#7ab87a", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" },
    radioDot: { width: "8px", height: "8px", borderRadius: "50%", background: "#0d1a12" },
    payTitle: { fontSize: "14px", fontWeight: 600, color: "#e8d5a3" },
    paySub: { fontSize: "11px", color: "#5a7058" },
    payBody: { fontSize: "12px", color: "#8a9e88", lineHeight: 1.6, paddingLeft: "30px", marginTop: "8px" },
    payLogos: { display: "flex", gap: "8px", flexWrap: "wrap" as const, paddingLeft: "30px", marginTop: "10px", marginBottom: "6px" },
    payLogo: { display: "inline-flex", alignItems: "center", justifyContent: "center", padding: "4px 10px", borderRadius: "6px", fontSize: "10px", fontWeight: 700, letterSpacing: "0.5px", border: "1px solid #2a3e28", background: "#0d1a12" },
    successWrap: { textAlign: "center" as const, padding: "40px 20px" },
    successIco: { fontSize: "48px", marginBottom: "20px" },
    successTitle: { fontFamily: "Georgia,serif", fontSize: "28px", color: "#e8d5a3", marginBottom: "10px" },
    successCode: { fontFamily: "Georgia,serif", fontSize: "22px", color: "#7ab87a", background: "#7ab87a14", border: "1px solid #7ab87a2a", borderRadius: "12px", padding: "14px 20px", margin: "16px 0", letterSpacing: "2px" },
    successDesc: { fontSize: "13px", color: "#8a9e88", lineHeight: 1.75, marginBottom: "20px" },
    bank: { background: "#162618", border: "1px solid #2a3e28", borderRadius: "14px", padding: "18px", textAlign: "left" as const },
    bankTitle: { fontSize: "11px", letterSpacing: "1.5px", textTransform: "uppercase" as const, color: "#5a7058", marginBottom: "12px" },
    bankRow: { display: "flex", justifyContent: "space-between", fontSize: "13px", padding: "6px 0", borderBottom: "1px solid #ffffff07" },
    bankKey: { color: "#6a7e68" },
    bankVal: { color: "#c8d8c0", fontWeight: 500 },
    cardCompact: { background: "#162618", border: "1px solid #2a3e28", borderRadius: "14px", padding: "14px 16px", marginBottom: "12px" },
    cardTitleCompact: { fontFamily: "Georgia,serif", fontSize: "14px", color: "#e8d5a3", marginBottom: "10px", paddingBottom: "8px", borderBottom: "1px solid #ffffff0a" },
    resItemCompact: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "5px 0", borderBottom: "1px solid #ffffff07" },
    resKeyCompact: { fontSize: "12px", color: "#6a7e68" },
    resValCompact: { fontSize: "12px", color: "#c8d8c0", fontWeight: 500 },
    priceBoxCompact: { background: "#0d1a12", border: "1px solid #2a3e28", borderRadius: "10px", padding: "12px" },
    priceRowCompact: { display: "flex", justifyContent: "space-between", fontSize: "12px", padding: "4px 0" },
    totalRowCompact: { display: "flex", justifyContent: "space-between", alignItems: "baseline", padding: "6px 0 0" },
    totalValCompact: { fontFamily: "Georgia,serif", fontSize: "24px", color: "#e8d5a3" },
    depositCompact: { display: "flex", justifyContent: "space-between", alignItems: "center", background: "#7ab87a14", border: "1px solid #7ab87a2a", borderRadius: "8px", padding: "10px 12px", marginTop: "10px" },
  }

  function stepStyle(i: number) {
    if (paso === i + 1) return s.stepActive
    if (paso > i + 1) return s.stepDone
    return s.stepBase
  }

  const showTinaja = !isTrinidad

  return (
    <div style={s.page}>
      <style>{"@media (min-width: 768px) { .reservar-body { max-width: 820px !important; } .paso1-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; } .paso1-grid > div:nth-child(2) { grid-column: 1; grid-row: 2; } .paso1-grid > div:nth-child(3) { grid-column: 2; grid-row: 1 / 3; align-self: start; } .paso2-row { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; } }"}</style>

      <nav style={s.nav}>
        <LogoNegocio businessName={businessName} tenantId={tenantId} />
        {paso === 1 && (
          <a href={backHref} style={{ ...s.backBtn, textDecoration: "none" }}>&#8592; Volver</a>
        )}
        {paso > 1 && paso < 4 && (
          <button style={s.backBtn} onClick={() => { setSubmitError(""); setPaso(p => p - 1) }}>Volver</button>
        )}
      </nav>

      {paso < 4 && (
        <div style={s.steps}>
          {["Datos", "Resumen", "Pago"].map((label, i) => (
            <div key={label} style={stepStyle(i)}>{label}</div>
          ))}
        </div>
      )}

      <div className="reservar-body" style={s.body}>

        {paso === 1 && (
          <>
            <div style={s.eye}>Reserva directa</div>
            <div style={s.title}>{cabin_name}</div>
            <div className="paso1-grid">
              <div style={s.card}>
                <div style={s.cardTitle}>{"Fechas de estadía"}</div>
                <div style={s.g2}>
                  <div>
                    <span style={s.lbl}>Check-in</span>
                    <input style={s.inp} type="date" min={today} value={checkIn}
                      onChange={e => { setCheckIn(e.target.value); setCheckOut(""); setDispStatus("idle") }} />
                  </div>
                  <div>
                    <span style={s.lbl}>Check-out</span>
                    <input style={s.inp} type="date" min={checkIn || today} value={checkOut}
                      onChange={e => setCheckOut(e.target.value)} />
                  </div>
                </div>
                {checkIn && checkOut && !noches_ok && <div style={s.err}>{"La estadía mínima es de 2 noches."}</div>}
                {dispStatus === "checking" && <div style={{ fontSize: "12px", color: "#6a7e68", padding: "8px 0" }}>Verificando disponibilidad...</div>}
                {dispStatus === "ok" && <div style={s.ok}>Fechas disponibles. Puedes continuar.</div>}
                {dispStatus === "occupied" && suggest && (
                  <div style={s.err}>
                    <strong>{cabin_name} no tiene disponibilidad para esas fechas.</strong>
                    <br /><br />Puedes probar con:<br /><br />
                    <a href={"/reservar?cabin_id=" + suggest.cabin_id + "&cabin_name=" + encodeURIComponent(suggest.cabin_name) + "&visited=" + encodeURIComponent(newVisited)}
                      style={{ color: "#e8b84a", textDecoration: "underline", fontWeight: 600 }}>
                      {suggest.cabin_name}{" — hasta "}{suggest.capacity}{" personas — "}{fmt(suggest.price || 0)}/noche
                    </a>
                    <br /><br />O elige otras fechas para {cabin_name}.
                  </div>
                )}
                {dispStatus === "occupied" && redTakai && (
                  <div style={s.err}>
                    <strong>{"Todas las cabañas de " + businessName + " están ocupadas para esas fechas."}</strong>
                    <br /><br />{"Te recomendamos elegir otras fechas."}
                  </div>
                )}
                {dispStatus === "occupied" && !suggest && !redTakai && (
                  <div style={s.err}>{"Estas fechas no están disponibles. Por favor elige otras."}</div>
                )}
              </div>

              <div style={s.card}>
                <div style={s.cardTitle}>{"Huéspedes y extras"}</div>
                <span style={s.lbl}>{"Número de personas (cap. " + capacidad + ")"}</span>
                <select style={s.sel} value={guests} onChange={e => setGuests(Number(e.target.value))}>
                  {Array.from({ length: capacidad + 2 }, (_, i) => i + 1).map(n => (
                    <option key={n} value={n}>
                      {n}{n === 1 ? " persona" : " personas"}{n > capacidad ? " (+" + fmt(5000) + "/noche)" : ""}
                    </option>
                  ))}
                </select>
                {showTinaja && (<>
                  <span style={s.lbl}>{"Tinaja de madera (+$30.000/día)"}</span>
                  <select style={s.sel} value={tinajaDias} onChange={e => setTinajaDias(Number(e.target.value))}>
                    <option value={0}>Sin tinaja</option>
                    {Array.from({ length: Math.max(1, noches) }, (_, i) => i + 1).map(n => (
                      <option key={n} value={n}>{n}{n === 1 ? " día" : " días"}{" — "}{fmt(n * 30000)}</option>
                    ))}
                  </select>
                </>)}
              </div>

              <div style={s.card}>
                <div style={s.cardTitle}>Tus datos de contacto</div>
                <div style={s.info}>{"Revisa bien tu número de WhatsApp y correo. Ahí recibirás la confirmación de tu reserva."}</div>
                <span style={s.lbl}>Nombre completo</span>
                <input style={{ ...s.inp, marginBottom: "14px" }} type="text" placeholder="Ej: Renata Núñez"
                  value={nombre} onChange={e => setNombre(e.target.value)} />
                <span style={s.lbl}>WhatsApp</span>
                <input style={{ ...s.inp, marginBottom: "14px" }} type="tel" placeholder="+56 9 1234 5678"
                  value={whatsapp} onChange={e => setWhatsapp(e.target.value)} />
                <span style={s.lbl}>{"Correo electrónico"}</span>
                <input style={s.inp} type="email" placeholder="tu@correo.com"
                  value={email} onChange={e => setEmail(e.target.value)} />
              </div>
            </div>

            <button style={form_ok ? s.btn : s.btnDisabled} disabled={!form_ok} onClick={() => setPaso(2)}>
              Reservar ahora con 20% de anticipo
            </button>
            <a href={backHref} style={{ display: "block", width: "100%", boxSizing: "border-box" as const, background: "transparent", color: "#8a9e88", border: "1px solid #2a3e28", borderRadius: "12px", padding: "14px", fontSize: "14px", fontWeight: 500, textAlign: "center" as const, textDecoration: "none", fontFamily: "sans-serif", marginTop: "10px" }}>
              {"← Volver"}
            </a>
          </>
        )}

        {paso === 2 && (
          <>
            <div style={s.eye}>Resumen de tu reserva</div>
            <div style={{ ...s.title, marginBottom: "14px" }}>{cabin_name}</div>
            {tinajaDias === 0 && showTinaja && (
              <div style={{ ...s.warn, padding: "12px", marginBottom: "12px" }}>
                <div style={s.warnTitle}>{"¿Olvidaste la tinaja?"}</div>
                <div style={{ ...s.warnDesc, fontSize: "11px" }}>{"Tinaja de madera calentada a leña. Solo $30.000/día."}</div>
                <select style={{ width: "100%", padding: "8px 10px", background: "#0d1a12", border: "1px solid #2a3e28", borderRadius: "8px", fontSize: "12px", color: "#c8d8c0", fontFamily: "sans-serif", marginTop: "8px", outline: "none" }}
                  value={tinajaDias} onChange={e => setTinajaDias(Number(e.target.value))}>
                  <option value={0}>Sin tinaja</option>
                  {Array.from({ length: Math.max(1, noches) }, (_, i) => i + 1).map(n => (
                    <option key={n} value={n}>{n}{n === 1 ? " día" : " días"}{" — "}{fmt(n * 30000)}</option>
                  ))}
                </select>
              </div>
            )}
            <div className="paso2-row">
              <div style={s.cardCompact}>
                <div style={s.cardTitleCompact}>Detalle</div>
                {[
                  ["Huésped", nombre], ["WhatsApp", whatsapp], ["Correo", email || "—"],
                  ["Check-in", checkIn], ["Check-out", checkOut],
                  ["Noches", String(noches)], ["Personas", String(guests)],
                  ["Tinaja", tinajaDias > 0 ? tinajaDias + (tinajaDias === 1 ? " día" : " días") : "No"],
                ].map(([k, v], idx) => (
                  <div key={k} style={{ ...s.resItemCompact, borderBottom: idx === 7 ? "none" : "1px solid #ffffff07" }}>
                    <span style={s.resKeyCompact}>{k}</span>
                    <span style={s.resValCompact}>{v}</span>
                  </div>
                ))}
              </div>
              <div style={s.cardCompact}>
                <div style={s.cardTitleCompact}>Precio</div>
                <div style={s.priceBoxCompact}>
                  <div style={s.priceRowCompact}><span style={s.priceKey}>{fmt(precio_noche)} x {noches} noches</span><span style={s.priceVal}>{fmt(precio_noche * noches)}</span></div>
                  {extrasPersonas > 0 && <div style={s.priceRowCompact}><span style={s.priceKey}>Personas extra</span><span style={s.priceVal}>{fmt(extrasPersonas)}</span></div>}
                  {tinaja > 0 && <div style={s.priceRowCompact}><span style={s.priceKey}>Tinaja {tinajaDias}{tinajaDias === 1 ? " día" : " días"}</span><span style={s.priceVal}>{fmt(tinaja)}</span></div>}
                  <hr style={{ ...s.hr, margin: "6px 0" }} />
                  <div style={s.totalRowCompact}><span style={{ ...s.totalKey, fontSize: "11px" }}>{"Total estadía"}</span><span style={s.totalValCompact}>{fmt(total)}</span></div>
                </div>
                <div style={s.depositCompact}><span style={{ ...s.depKey, fontSize: "11px" }}>Adelanto 20%</span><span style={{ ...s.depVal, fontSize: "16px" }}>{fmt(deposito)}</span></div>
              </div>
            </div>
            <button style={s.btn} onClick={() => setPaso(3)}>Continuar al pago</button>
            <button style={s.btnBack} onClick={() => setPaso(1)}>Volver y modificar</button>
          </>
        )}

        {paso === 3 && (
          <>
            <div style={s.eye}>{"Elige cómo pagar"}</div>
            <div style={s.title}>Adelanto: {fmt(deposito)}</div>
            <div style={metodoPago === "tarjeta" ? s.payOptSel : s.payOpt} onClick={() => setMetodoPago("tarjeta")}>
              <div style={s.payHead}>
                <div style={metodoPago === "tarjeta" ? s.radioSel : s.radio}>{metodoPago === "tarjeta" && <div style={s.radioDot} />}</div>
                <div><div style={s.payTitle}>{"Tarjeta de crédito o débito"}</div><div style={s.paySub}>{"Próximamente disponible"}</div></div>
              </div>
              <div style={s.payLogos}>
                <span style={{ ...s.payLogo, color: "#1a1f71", background: "#e8eaf6" }}>VISA</span>
                <span style={{ ...s.payLogo, color: "#333", background: "#fff3e0" }}>
                  <span style={{ display: "inline-flex", gap: "2px", alignItems: "center" }}>
                    <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#eb001b", display: "inline-block" }} />
                    <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#f79e1b", display: "inline-block", marginLeft: "-4px" }} />
                    <span style={{ marginLeft: "4px", fontSize: "10px", fontWeight: 700 }}>Mastercard</span>
                  </span>
                </span>
                <span style={{ ...s.payLogo, color: "#00529b", background: "#e3f2fd" }}>Redcompra</span>
                <span style={{ ...s.payLogo, color: "#1b3a6b", background: "#e8eaf6" }}>Transbank</span>
              </div>
              {metodoPago === "tarjeta" && (
                <div style={s.payBody}>
                  {"Tu reserva se "}<strong>{"confirma automáticamente"}</strong>{" al pagar."}<br /><br />
                  <em style={{ color: "#e8a21a", fontSize: "11px" }}>{"Esta opción estará disponible muy pronto."}</em>
                </div>
              )}
            </div>
            <div style={metodoPago === "transferencia" ? s.payOptSel : s.payOpt} onClick={() => setMetodoPago("transferencia")}>
              <div style={s.payHead}>
                <div style={metodoPago === "transferencia" ? s.radioSel : s.radio}>{metodoPago === "transferencia" && <div style={s.radioDot} />}</div>
                <div><div style={s.payTitle}>Transferencia bancaria</div><div style={s.paySub}>{"BancoEstado · Cuenta RUT"}</div></div>
              </div>
              {metodoPago === "transferencia" && (
                <div style={s.payBody}>
                  <div style={{ ...s.priceBox, marginTop: "10px" }}>
                    {bankRows.map(([k, v]) => (
                      <div key={k} style={s.priceRow}><span style={s.priceKey}>{k}</span><span style={s.priceVal}>{v}</span></div>
                    ))}
                  </div>
                  <div style={{ marginTop: "12px", fontSize: "12px", color: "#8a9e88", lineHeight: 1.6 }}>
                    {"Una vez que " + (ownerName || businessName) + " verifique tu transferencia, recibirás la confirmación en tu WhatsApp" + (whatsapp ? " (" + whatsapp + ")" : "") + "."}
                  </div>
                </div>
              )}
            </div>
            {submitError && <div style={s.err}>{submitError}</div>}
            <div style={{ fontSize: "12px", color: "#6a7e68", marginBottom: "16px", lineHeight: 1.6 }}>
              {"Al confirmar quedará registrada tu solicitud con un código único. Úsalo como glosa en tu transferencia. La transferencia debe realizarse dentro de las próximas 24 horas. Si no se recibe el pago en ese plazo, la reserva será cancelada automáticamente y las fechas quedarán disponibles nuevamente."}
            </div>
            <button style={loading || metodoPago === "tarjeta" ? s.btnDisabled : s.btn}
              disabled={loading || metodoPago === "tarjeta"} onClick={confirmar}>
              {loading ? "Registrando..." : metodoPago === "tarjeta" ? "Próximamente disponible" : "Reservar ahora con 20% de anticipo"}
            </button>
            <button style={s.btnBack} onClick={() => setPaso(2)}>Volver al resumen</button>
          </>
        )}

        {paso === 4 && (
          <div style={s.successWrap}>
            <div style={s.successIco}>🌿</div>
            <div style={s.successTitle}>Solicitud enviada</div>
            <div style={{ fontSize: "12px", color: "#5a7058", marginBottom: "8px", letterSpacing: "1px", textTransform: "uppercase" as const }}>{"Tu código de reserva"}</div>
            <div style={s.successCode}>{codigo}</div>
            <div style={s.successDesc}>
              Hola <strong style={{ color: "#c8d8c0" }}>{nombre}</strong>, tu solicitud fue recibida.<br /><br />
              {"Una vez que " + (ownerName || businessName) + " verifique tu transferencia de "}
              <strong style={{ color: "#7ab87a" }}>{fmt(deposito)}</strong>
              {", recibirás la confirmación en tu WhatsApp" + (whatsapp ? " (" + whatsapp + ")" : "") + (email ? " y en " + email : "") + "."}
            </div>
            <div style={s.bank}>
              <div style={s.bankTitle}>Datos para la transferencia</div>
              {bankRowsFinal.map(([k, v], idx, arr) => (
                <div key={k} style={{ ...s.bankRow, borderBottom: idx === arr.length - 1 ? "none" : "1px solid #ffffff07" }}>
                  <span style={s.bankKey}>{k}</span><span style={s.bankVal}>{v}</span>
                </div>
              ))}
            </div>
            <div style={{ marginTop: "16px", fontSize: "12px", color: "#5a7058", lineHeight: 1.6 }}>
              {"Usa "}<strong style={{ color: "#7ab87a" }}>{codigo}</strong>{" como glosa para que " + (ownerName || businessName) + " identifique tu pago. Tienes un máximo de 24 horas para realizar la transferencia. Pasado ese plazo, la reserva será cancelada y las fechas quedarán disponibles nuevamente."}
            </div>
            <a href={backHref} style={{ display: "block", marginTop: "24px", width: "100%", boxSizing: "border-box" as const, background: "#7ab87a", color: "#0d1a12", borderRadius: "12px", padding: "16px", fontSize: "15px", fontWeight: 700, textAlign: "center" as const, textDecoration: "none", fontFamily: "sans-serif" }}>
              Volver al inicio
            </a>
          </div>
        )}

      </div>
    </div>
  )
}

export default function ReservarPage() {
  return (
    <Suspense fallback={<div style={{ padding: "32px", background: "#0d1a12", minHeight: "100vh" }} />}>
      <ReservarInner />
    </Suspense>
  )
}
