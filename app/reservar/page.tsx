"use client"
import { Suspense, useState, useEffect } from "react"
import { useSearchParams } from "next/navigation"
import type { CSSProperties } from "react"

function fmt(n: number) {
  return "$" + n.toLocaleString("es-CL")
}

function ReservarInner() {
  const params = useSearchParams()
  const cabin_id = params.get("cabin_id") || ""
  const cabin_name = params.get("cabin_name") || "Cabana"
  const visitedParam = params.get("visited") || ""
  const visitedCabins = visitedParam ? visitedParam.split(",").filter(Boolean) : []

  const precio_noche = Number(params.get("price")) || 30000
  const capacidad = Number(params.get("capacity")) || 4
  const today = new Date().toISOString().split("T")[0]

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

  useEffect(() => {
    if (!checkIn || !checkOut || !noches_ok || !cabin_id) {
      setDispStatus("idle")
      setAutoAssignId("")
      setSuggest(null)
      setRedTakai(false)
      return
    }
    setDispStatus("checking")
    const timer = setTimeout(async () => {
      try {
        const vParam = visitedCabins.join(",")
        const res = await fetch(
          "/api/availability?cabin_id=" + cabin_id + "&check_in=" + checkIn + "&check_out=" + checkOut + "&visited=" + encodeURIComponent(vParam)
        )
        const data = await res.json()
        if (data.available) {
          setDispStatus("ok")
          setAutoAssignId("")
          setSuggest(null)
          setRedTakai(false)
        } else if (data.auto_assign) {
          setAutoAssignId(data.auto_assign.cabin_id)
          setDispStatus("ok")
          setSuggest(null)
          setRedTakai(false)
        } else if (data.suggest) {
          setDispStatus("occupied")
          setSuggest(data.suggest)
          setRedTakai(false)
          setAutoAssignId("")
        } else if (data.red_takai) {
          setDispStatus("occupied")
          setSuggest(null)
          setRedTakai(true)
          setAutoAssignId("")
        } else {
          setDispStatus("occupied")
          setSuggest(null)
          setRedTakai(false)
          setAutoAssignId("")
        }
      } catch (e) {
        setDispStatus("idle")
      }
    }, 700)
    return () => clearTimeout(timer)
  }, [checkIn, checkOut, cabin_id, noches_ok])

  async function confirmar() {
    setLoading(true)
    setSubmitError("")
    try {
      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cabin_id: autoAssignId || cabin_id,
          check_in: checkIn,
          check_out: checkOut,
          guests,
          nights: noches,
          subtotal,
          total,
          deposit: deposito,
          tinaja_days: tinajaDias,
          nombre: nombre.trim(),
          whatsapp: whatsapp.trim(),
          email: email.trim(),
          metodo_pago: metodoPago,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.message || data.error || "Error al confirmar")
      setCodigo(data.booking_code)
      setPaso(4)
    } catch (e: any) {
      setSubmitError(e.message)
    } finally {
      setLoading(false)
    }
  }

  const newVisited = [...visitedCabins, cabin_id].join(",")

  const s: Record<string, CSSProperties> = {
    page: { fontFamily: "sans-serif", color: "#f0ede8", background: "#0d1a12", minHeight: "100vh" },
    nav: { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "18px 24px", borderBottom: "1px solid #ffffff0f", background: "#0a1510" },
    logo: { fontFamily: "Georgia,serif", fontSize: "20px", letterSpacing: "3px", color: "#e8d5a3", textTransform: "uppercase" as const },
    logoSpan: { color: "#7ab87a" },
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
    resItem: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderBottom: "1px solid #ffffff07" },
    resKey: { fontSize: "13px", color: "#6a7e68" },
    resVal: { fontSize: "13px", color: "#c8d8c0", fontWeight: 500 },
    payOpt: { border: "2px solid #2a3e28", borderRadius: "14px", padding: "18px", marginBottom: "12px", cursor: "pointer", background: "#0d1a12" },
    payOptSel: { border: "2px solid #7ab87a", borderRadius: "14px", padding: "18px", marginBottom: "12px", cursor: "pointer", background: "#7ab87a0a" },
    payHead: { display: "flex", alignItems: "center", gap: "12px", marginBottom: "6px" },
    radio: { width: "18px", height: "18px", borderRadius: "50%", border: "2px solid #4a6e48", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" },
    radioSel: { width: "18px", height: "18px", borderRadius: "50%", border: "2px solid #7ab87a", background: "#7ab87a", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" },
    radioDot: { width: "8px", height: "8px", borderRadius: "50%", background: "#0d1a12" },
    payTitle: { fontSize: "14px", fontWeight: 600, color: "#e8d5a3" },
    paySub: { fontSize: "11px", color: "#5a7058" },
    payBody: { fontSize: "12px", color: "#8a9e88", lineHeight: 1.6, paddingLeft: "30px", marginTop: "8px" },
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
    payLogos: { display: "flex", gap: "8px", flexWrap: "wrap" as const, paddingLeft: "30px", marginTop: "10px", marginBottom: "6px" },
    payLogo: { display: "inline-flex", alignItems: "center", justifyContent: "center", padding: "4px 10px", borderRadius: "6px", fontSize: "10px", fontWeight: 700, letterSpacing: "0.5px", border: "1px solid #2a3e28", background: "#0d1a12" },
  }

  function stepStyle(i: number) {
    if (paso === i + 1) return s.stepActive
    if (paso > i + 1) return s.stepDone
    return s.stepBase
  }

  return (
    <div style={s.page}>
      <style>{"@media (min-width: 768px) { .reservar-body { max-width: 820px !important; } .paso1-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; } .paso1-grid > div:nth-child(2) { grid-column: 1; grid-row: 2; } .paso1-grid > div:nth-child(3) { grid-column: 2; grid-row: 1 / 3; align-self: start; } .paso2-row { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; } }"}</style>
      <nav style={s.nav}>
        <div style={s.logo}>Ruka<span style={s.logoSpan}>traro</span></div>
        {paso === 1 && (
          <a href="/inicio" style={{ ...s.backBtn, textDecoration: "none" }}>&#8592; Volver</a>
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
              <div style={s.cardTitle}>{"Fechas de estad\u00eda"}</div>
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

              {checkIn && checkOut && !noches_ok && (
                <div style={s.err}>{"La estad\u00eda m\u00ednima es de 2 noches."}</div>
              )}
              {dispStatus === "checking" && (
                <div style={{ fontSize: "12px", color: "#6a7e68", padding: "8px 0" }}>Verificando disponibilidad...</div>
              )}
              {dispStatus === "ok" && (
                <div style={s.ok}>Fechas disponibles. Puedes continuar.</div>
              )}
              {dispStatus === "occupied" && suggest && (
                <div style={s.err}>
                  <strong>{cabin_name} no tiene disponibilidad para esas fechas.</strong>
                  <br /><br />
                  Puedes probar con:<br /><br />
                  <a href={"/reservar?cabin_id=" + suggest.cabin_id + "&cabin_name=" + encodeURIComponent(suggest.cabin_name) + "&visited=" + encodeURIComponent(newVisited)}
                    style={{ color: "#e8b84a", textDecoration: "underline", fontWeight: 600 }}>
                    {suggest.cabin_name} {" \u2014 hasta "}{suggest.capacity}{" personas \u2014 "}{fmt(suggest.price || 0)}/noche
                  </a>
                  <br /><br />
                  O elige otras fechas para {cabin_name}.
                </div>
              )}
              {dispStatus === "occupied" && redTakai && (
                <div style={s.err}>
                  <strong>{"Todas las caba\u00f1as de Rukatraro est\u00e1n ocupadas para esas fechas."}</strong>
                  <br /><br />
                  {"Te recomendamos elegir otras fechas. Pronto podr\u00e1s ver otras caba\u00f1as disponibles en la zona."}
                </div>
              )}
              {dispStatus === "occupied" && !suggest && !redTakai && (
                <div style={s.err}>{"Estas fechas no est\u00e1n disponibles. Por favor elige otras."}</div>
              )}
            </div>

            <div style={s.card}>
              <div style={s.cardTitle}>{"Hu\u00e9spedes y extras"}</div>
              <span style={s.lbl}>{"N\u00famero de personas (cap. "}{capacidad}{")"}</span>
              <select style={s.sel} value={guests} onChange={e => setGuests(Number(e.target.value))}>
                {Array.from({ length: capacidad + 2 }, (_, i) => i + 1).map(n => (
                  <option key={n} value={n}>
                    {n} {n === 1 ? "persona" : "personas"}{n > capacidad ? " (+" + fmt(5000) + "/noche)" : ""}
                  </option>
                ))}
              </select>
              <span style={s.lbl}>{"Tinaja de madera (+$30.000/d\u00eda)"}</span>
              <select style={s.sel} value={tinajaDias} onChange={e => setTinajaDias(Number(e.target.value))}>
                <option value={0}>Sin tinaja</option>
                {Array.from({ length: Math.max(1, noches) }, (_, i) => i + 1).map(n => (
                  <option key={n} value={n}>{n} {n === 1 ? "d\u00eda" : "d\u00edas"} {"\u2014"} {fmt(n * 30000)}</option>
                ))}
              </select>
            </div>

            <div style={s.card}>
              <div style={s.cardTitle}>Tus datos de contacto</div>
              <div style={s.info}>{"Revisa bien tu n\u00famero de WhatsApp y correo. Ah\u00ed recibir\u00e1s la confirmaci\u00f3n de tu reserva."}</div>
              <span style={s.lbl}>Nombre completo</span>
              <input style={{ ...s.inp, marginBottom: "14px" }} type="text" placeholder="Maria Gonzalez"
                value={nombre} onChange={e => setNombre(e.target.value)} />
              <span style={s.lbl}>WhatsApp</span>
              <input style={{ ...s.inp, marginBottom: "14px" }} type="tel" placeholder="+56 9 1234 5678"
                value={whatsapp} onChange={e => setWhatsapp(e.target.value)} />
              <span style={s.lbl}>{"Correo electr\u00f3nico"}</span>
              <input style={s.inp} type="email" placeholder="tu@correo.com"
                value={email} onChange={e => setEmail(e.target.value)} />
            </div>

            </div>
            <button style={form_ok ? s.btn : s.btnDisabled} disabled={!form_ok} onClick={() => setPaso(2)}>
              Reservar ahora con 20% de anticipo
            </button>
            <a href="/inicio" style={{ display: "block", width: "100%", boxSizing: "border-box" as const, background: "transparent", color: "#8a9e88", border: "1px solid #2a3e28", borderRadius: "12px", padding: "14px", fontSize: "14px", fontWeight: 500, textAlign: "center" as const, textDecoration: "none", fontFamily: "sans-serif", marginTop: "10px", cursor: "pointer" }}>{"\u2190 Volver"}</a>
          </>
        )}

        {paso === 2 && (
          <>
            <div style={s.eye}>Resumen de tu reserva</div>
            <div style={{ ...s.title, marginBottom: "14px" }}>{cabin_name}</div>

            {tinajaDias === 0 && (
              <div style={{ ...s.warn, padding: "12px", marginBottom: "12px" }}>
                <div style={s.warnTitle}>{"\u00bfOlvidaste la tinaja?"}</div>
                <div style={{ ...s.warnDesc, fontSize: "11px" }}>{"Tinaja de madera calentada a le\u00f1a. Solo $30.000/d\u00eda."}</div>
                <select style={{ width: "100%", padding: "8px 10px", background: "#0d1a12", border: "1px solid #2a3e28", borderRadius: "8px", fontSize: "12px", color: "#c8d8c0", fontFamily: "sans-serif", marginTop: "8px", outline: "none" }} value={tinajaDias} onChange={e => setTinajaDias(Number(e.target.value))}>
                  <option value={0}>Sin tinaja</option>
                  {Array.from({ length: Math.max(1, noches) }, (_, i) => i + 1).map(n => (
                    <option key={n} value={n}>{n} {n === 1 ? "d\u00eda" : "d\u00edas"} {"\u2014"} {fmt(n * 30000)}</option>
                  ))}
                </select>
              </div>
            )}

            <div className="paso2-row">
              <div style={s.cardCompact}>
                <div style={s.cardTitleCompact}>Detalle</div>
                {[
                  ["Hu\u00e9sped", nombre], ["WhatsApp", whatsapp], ["Correo", email || "\u2014"],
                  ["Check-in", checkIn], ["Check-out", checkOut],
                  ["Noches", String(noches)], ["Personas", String(guests)],
                  ["Tinaja", tinajaDias > 0 ? tinajaDias + (tinajaDias === 1 ? " d\u00eda" : " d\u00edas") : "No"],
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
                  {tinaja > 0 && <div style={s.priceRowCompact}><span style={s.priceKey}>Tinaja {tinajaDias} {tinajaDias === 1 ? "d\u00eda" : "d\u00edas"}</span><span style={s.priceVal}>{fmt(tinaja)}</span></div>}
                  <hr style={{ ...s.hr, margin: "6px 0" }} />
                  <div style={s.totalRowCompact}><span style={{ ...s.totalKey, fontSize: "11px" }}>{"Total estad\u00eda"}</span><span style={s.totalValCompact}>{fmt(total)}</span></div>
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
            <div style={s.eye}>{"Elige c\u00f3mo pagar"}</div>
            <div style={s.title}>Adelanto: {fmt(deposito)}</div>

            <div style={metodoPago === "tarjeta" ? s.payOptSel : s.payOpt} onClick={() => setMetodoPago("tarjeta")}>
              <div style={s.payHead}>
                <div style={metodoPago === "tarjeta" ? s.radioSel : s.radio}>{metodoPago === "tarjeta" && <div style={s.radioDot} />}</div>
                <div><div style={s.payTitle}>{"Tarjeta de cr\u00e9dito o d\u00e9bito"}</div><div style={s.paySub}>{"Pr\u00f3ximamente disponible"}</div></div>
              </div>
              <div style={s.payLogos}>
                <span style={{ ...s.payLogo, color: "#1a1f71", background: "#e8eaf6" }}>VISA</span>
                <span style={{ ...s.payLogo, color: "#333", background: "#fff3e0" }}>
                  <span style={{ display: "inline-flex", gap: "2px", alignItems: "center" }}>
                    <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#eb001b", display: "inline-block" }}></span>
                    <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#f79e1b", display: "inline-block", marginLeft: "-4px" }}></span>
                    <span style={{ marginLeft: "4px", fontSize: "10px", fontWeight: 700 }}>Mastercard</span>
                  </span>
                </span>
                <span style={{ ...s.payLogo, color: "#00529b", background: "#e3f2fd" }}>Redcompra</span>
                <span style={{ ...s.payLogo, color: "#1b3a6b", background: "#e8eaf6" }}>Transbank</span>
              </div>
              {metodoPago === "tarjeta" && (
                <div style={s.payBody}>
                  {"Tu reserva se "}<strong>{"confirma autom\u00e1ticamente"}</strong>{" al pagar. Recibir\u00e1s el comprobante en tu WhatsApp "}{whatsapp ? "(" + whatsapp + ")" : ""}{" y en el correo que indicaste"}{email ? " (" + email + ")" : " en el paso anterior"}.
                  <br /><br /><em style={{ color: "#e8a21a", fontSize: "11px" }}>{"Esta opci\u00f3n estar\u00e1 disponible muy pronto."}</em>
                </div>
              )}
            </div>

            <div style={metodoPago === "transferencia" ? s.payOptSel : s.payOpt} onClick={() => setMetodoPago("transferencia")}>
              <div style={s.payHead}>
                <div style={metodoPago === "transferencia" ? s.radioSel : s.radio}>{metodoPago === "transferencia" && <div style={s.radioDot} />}</div>
                <div><div style={s.payTitle}>Transferencia bancaria</div><div style={s.paySub}>{"BancoEstado \u00b7 Cuenta RUT"}</div></div>
              </div>
              {metodoPago === "transferencia" && (
                <div style={s.payBody}>
                  <div style={{ ...s.priceBox, marginTop: "10px" }}>
                    {[["Banco","BancoEstado"],["Tipo","Cuenta RUT"],["N\u00famero","15.665.466-3"],["Nombre","Rukatraro"],["Monto exacto",fmt(deposito)]].map(([k,v]) => (
                      <div key={k} style={s.priceRow}><span style={s.priceKey}>{k}</span><span style={s.priceVal}>{v}</span></div>
                    ))}
                  </div>
                  <div style={{ marginTop: "12px", fontSize: "12px", color: "#8a9e88", lineHeight: 1.6 }}>
                    {"Una vez que Rukatraro verifique tu transferencia, recibir\u00e1s la confirmaci\u00f3n de reserva en tu WhatsApp "}{whatsapp ? "(" + whatsapp + ")" : ""}{" y en el correo que indicaste"}{email ? " (" + email + ")" : " en el paso anterior"}.
                  </div>
                </div>
              )}
            </div>

            {submitError && <div style={s.err}>{submitError}</div>}

            <div style={{ fontSize: "12px", color: "#6a7e68", marginBottom: "16px", lineHeight: 1.6 }}>
              {"Al confirmar quedar\u00e1 registrada tu solicitud con un c\u00f3digo \u00fanico. \u00dasalo como glosa en tu transferencia."}
            </div>

            <button style={loading || metodoPago === "tarjeta" ? s.btnDisabled : s.btn}
              disabled={loading || metodoPago === "tarjeta"} onClick={confirmar}>
              {loading ? "Registrando..." : metodoPago === "tarjeta" ? "Pr\u00f3ximamente disponible" : "Reservar ahora con 20% de anticipo"}
            </button>
            <button style={s.btnBack} onClick={() => setPaso(2)}>Volver al resumen</button>
          </>
        )}

        {paso === 4 && (
          <div style={s.successWrap}>
            <div style={s.successIco}>&#127807;</div>
            <div style={s.successTitle}>Solicitud enviada</div>
            <div style={{ fontSize: "12px", color: "#5a7058", marginBottom: "8px", letterSpacing: "1px", textTransform: "uppercase" as const }}>{"Tu c\u00f3digo de reserva"}</div>
            <div style={s.successCode}>{codigo}</div>
            <div style={s.successDesc}>
              Hola <strong style={{ color: "#c8d8c0" }}>{nombre}</strong>, tu solicitud fue recibida.<br /><br />
              {"Una vez que Rukatraro verifique tu transferencia de "}<strong style={{ color: "#7ab87a" }}>{fmt(deposito)}</strong>,
              {" recibir\u00e1s la confirmaci\u00f3n en tu WhatsApp "}{whatsapp ? "(" + whatsapp + ")" : ""}
              {" y en el correo que indicaste"}{email ? " (" + email + ")" : ""}.
            </div>
            <div style={s.bank}>
              <div style={s.bankTitle}>Datos para la transferencia</div>
              {[["Banco","BancoEstado"],["Cuenta RUT","15.665.466-3"],["Titular","Rukatraro"],["Monto exacto",fmt(deposito)],["Glosa / Concepto",codigo]].map(([k,v],idx,arr) => (
                <div key={k} style={{ ...s.bankRow, borderBottom: idx === arr.length - 1 ? "none" : "1px solid #ffffff07" }}>
                  <span style={s.bankKey}>{k}</span><span style={s.bankVal}>{v}</span>
                </div>
              ))}
            </div>
            <div style={{ marginTop: "16px", fontSize: "12px", color: "#5a7058", lineHeight: 1.6 }}>
              {"Usa "}<strong style={{ color: "#7ab87a" }}>{codigo}</strong>{" como glosa para que Rukatraro identifique tu pago."}
            </div>
            
            <a href="/inicio"
              style={{ display: "block", marginTop: "24px", width: "100%", boxSizing: "border-box" as const, background: "#7ab87a", color: "#0d1a12", borderRadius: "12px", padding: "16px", fontSize: "15px", fontWeight: 700, textAlign: "center" as const, textDecoration: "none", fontFamily: "sans-serif" }}
            >
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
