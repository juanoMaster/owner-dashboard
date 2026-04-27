"use client"
import { Suspense, useState, useEffect } from "react"
import { useSearchParams } from "next/navigation"
import type { CSSProperties } from "react"

function getPriceForGuests(
  tiers: Array<{ min_guests: number; max_guests: number; price_per_night: number }> | null | undefined,
  guests: number,
  basePriceNight: number
): number {
  if (!tiers || tiers.length === 0) return basePriceNight
  const tier = tiers.find(t => guests >= t.min_guests && guests <= t.max_guests)
  return tier ? tier.price_per_night : basePriceNight
}

function fmtCurrency(n: number, currency: string) {
  if (currency === "USD") return "$" + n.toFixed(2)
  if (currency === "COP") return "$" + Math.round(n).toLocaleString("es-CO")
  return "$" + Math.round(n).toLocaleString("es-CL")
}

function LogoNegocio({ businessName }: { businessName: string }) {
  const parts = businessName.split(" ")
  const first = parts[0] || "Takai"
  const rest = parts.slice(1).join(" ")
  const logoStyle: CSSProperties = { fontFamily: "Georgia,serif", fontSize: "20px", letterSpacing: "3px", color: "#f0ede8", textTransform: "uppercase" }
  const spanStyle: CSSProperties = { color: "rgba(201,168,76,0.7)" }
  return <div style={logoStyle}>{first}<span style={spanStyle}>{rest ? " " + rest : ""}</span></div>
}

function ReservarInner() {
  const params = useSearchParams()
  const cabin_id = params.get("cabin_id") || ""
  const cabin_name = params.get("cabin_name") || "Cabaña"
  const visitedParam = params.get("visited") || ""
  const visitedCabins = visitedParam ? visitedParam.split(",").filter(Boolean) : []

  const basePriceNight = Number(params.get("price")) || 30000
  const tiersParam = params.get("tiers")
  const capacidad = Number(params.get("capacity")) || 4
  const today = new Date().toISOString().split("T")[0]

  const [tenantId, setTenantId] = useState("")
  const [businessName, setBusinessName] = useState("Cabaña")
  const [ownerName, setOwnerName] = useState("")
  const [slug, setSlug] = useState("")
  const [hasTinaja, setHasTinaja] = useState(true)
  const [currency, setCurrency] = useState("CLP")
  const [extraPersonPrice, setExtraPersonPrice] = useState(0)
  const [bankName, setBankName] = useState("")
  const [bankAccountType, setBankAccountType] = useState("")
  const [bankAccountNumber, setBankAccountNumber] = useState("")
  const [bankAccountHolder, setBankAccountHolder] = useState("")
  const [bankRut, setBankRut] = useState("")

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
  const [bookingId, setBookingId] = useState("")
  const [mpEnabled, setMpEnabled] = useState<boolean | null>(null)
  const [tenantMpEnabled, setTenantMpEnabled] = useState(false)
  const [mpLoading, setMpLoading] = useState(false)
  const [pricingTiers, setPricingTiers] = useState<Array<{ min_guests: number; max_guests: number; price_per_night: number }>>(() => {
    if (!tiersParam) return []
    try { return JSON.parse(decodeURIComponent(tiersParam)) } catch { return [] }
  })

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
        if (data.bank_name) setBankName(data.bank_name)
        if (data.bank_account_type) setBankAccountType(data.bank_account_type)
        if (data.bank_account_number) setBankAccountNumber(data.bank_account_number)
        if (data.bank_account_holder) setBankAccountHolder(data.bank_account_holder)
        if (data.bank_rut) setBankRut(data.bank_rut)
        if (data.mp_enabled) setTenantMpEnabled(true)
        if (data.currency) setCurrency(data.currency)
        if (typeof data.extra_person_price === "number") setExtraPersonPrice(data.extra_person_price)
        if (Array.isArray(data.pricing_tiers) && data.pricing_tiers.length > 0) setPricingTiers(data.pricing_tiers)
      })
      .catch(() => {})
  }, [cabin_id])

  function fmt(n: number) { return fmtCurrency(n, currency) }

  const precio_noche = getPriceForGuests(pricingTiers, guests, basePriceNight)

  const noches = checkIn && checkOut
    ? Math.max(0, Math.round((new Date(checkOut).getTime() - new Date(checkIn).getTime()) / 86400000))
    : 0
  const extrasPersonas = Math.max(0, guests - capacidad) * extraPersonPrice * noches
  const subtotal = precio_noche * noches + extrasPersonas
  const tinaja = tinajaDias * 30000
  const total = subtotal + tinaja
  const deposito = Math.round(total * 0.2)
  const noches_ok = noches >= 2
  const fechas_ok = noches_ok && dispStatus === "ok"
  const form_ok = fechas_ok && nombre.trim().length > 0 && whatsapp.trim().length > 0

  const hasBankInfo = !!(bankName && bankAccountNumber && bankAccountHolder)
  const bankRows = hasBankInfo
    ? [
        ["Banco", bankName],
        ...(bankAccountType ? [["Tipo", bankAccountType]] : []),
        ["Número", bankAccountNumber],
        ["Titular", bankAccountHolder],
        ...(bankRut ? [["RUT", bankRut]] : []),
        ["Monto exacto", fmt(deposito)],
      ]
    : [["Monto exacto", fmt(deposito)]]

  const bankRowsFinal = hasBankInfo
    ? [
        ["Banco", bankName],
        ...(bankAccountType ? [["Tipo cuenta", bankAccountType]] : []),
        ["Número", bankAccountNumber],
        ["Titular", bankAccountHolder],
        ...(bankRut ? [["RUT titular", bankRut]] : []),
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
      setCodigo(data.booking_code)
      if (data.booking_id) {
        setBookingId(data.booking_id)
        try {
          const mpRes = await fetch("/api/mp/status?booking_id=" + data.booking_id)
          const mpData = await mpRes.json()
          console.log("[MP status]", mpRes.status, mpData)
          if (!mpRes.ok) {
            console.warn("[MP status] respuesta no OK:", mpData.error)
            setMpEnabled(false)
          } else {
            setMpEnabled(mpData.mp_enabled === true)
          }
        } catch (e) {
          console.error("[MP status] error de red:", e)
          setMpEnabled(false)
        }
      } else {
        setMpEnabled(false)
      }
      setPaso(4)
    } catch (e: any) { setSubmitError(e.message) }
    finally { setLoading(false) }
  }

  async function pagarConMp() {
    setMpLoading(true)
    setSubmitError("")
    try {
      const res = await fetch("/api/mp/create-preference", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ booking_id: bookingId }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Error al iniciar el pago")
      window.location.href = data.init_point
    } catch (e: any) {
      setSubmitError(e.message)
      setMpLoading(false)
    }
  }

  const newVisited = [...visitedCabins, cabin_id].join(",")
  const backHref = slug ? "/" + slug : "/"

  const s: Record<string, CSSProperties> = {
    page: { fontFamily: "sans-serif", color: "#f0ede8", background: "#060606", minHeight: "100vh" },
    nav: { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "18px 24px", borderBottom: "1px solid rgba(201,168,76,0.07)", background: "rgba(6,6,6,0.96)" },
    backBtn: { background: "transparent", border: "1px solid #1c1c1c", color: "#888", fontSize: "12px", padding: "7px 16px", borderRadius: "20px", cursor: "pointer" },
    steps: { display: "flex", background: "rgba(6,6,6,0.96)", borderBottom: "1px solid rgba(201,168,76,0.07)" },
    stepBase: { flex: 1, padding: "14px 6px", textAlign: "center" as const, fontSize: "10px", letterSpacing: "1.5px", textTransform: "uppercase" as const, color: "#333", borderBottom: "2px solid transparent" },
    stepActive: { flex: 1, padding: "14px 6px", textAlign: "center" as const, fontSize: "10px", letterSpacing: "1.5px", textTransform: "uppercase" as const, color: "#C9A84C", borderBottom: "2px solid #C9A84C" },
    stepDone: { flex: 1, padding: "14px 6px", textAlign: "center" as const, fontSize: "10px", letterSpacing: "1.5px", textTransform: "uppercase" as const, color: "rgba(201,168,76,0.5)", borderBottom: "2px solid rgba(201,168,76,0.3)" },
    body: { padding: "24px 20px", maxWidth: "480px", margin: "0 auto" },
    eye: { fontSize: "10px", letterSpacing: "2px", textTransform: "uppercase" as const, color: "rgba(201,168,76,0.7)", marginBottom: "6px" },
    title: { fontFamily: "Georgia,serif", fontSize: "28px", color: "#f0ede8", marginBottom: "20px" },
    card: { background: "#0d0d0d", border: "1px solid #1c1c1c", borderRadius: "16px", padding: "20px", marginBottom: "14px" },
    cardTitle: { fontFamily: "Georgia,serif", fontSize: "16px", color: "#f0ede8", marginBottom: "16px", paddingBottom: "12px", borderBottom: "1px solid rgba(255,255,255,0.05)" },
    g2: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px", marginBottom: "14px" },
    lbl: { display: "block", fontSize: "10px", fontWeight: 600, letterSpacing: "1.5px", textTransform: "uppercase" as const, color: "rgba(201,168,76,0.55)", marginBottom: "6px" },
    inp: { width: "100%", boxSizing: "border-box" as const, padding: "10px 8px", background: "#080808", border: "1px solid #1c1c1c", borderRadius: "10px", fontSize: "12px", color: "#f0ede8", fontFamily: "sans-serif", outline: "none" },
    sel: { width: "100%", padding: "12px 14px", background: "#080808", border: "1px solid #1c1c1c", borderRadius: "10px", fontSize: "14px", color: "#f0ede8", fontFamily: "sans-serif", outline: "none", marginBottom: "14px" },
    err: { background: "rgba(230,57,70,0.08)", border: "1px solid rgba(230,57,70,0.25)", borderRadius: "10px", padding: "14px", fontSize: "13px", color: "#e67a7a", marginBottom: "14px", lineHeight: 1.6 },
    ok: { background: "rgba(201,168,76,0.08)", border: "1px solid rgba(201,168,76,0.25)", borderRadius: "10px", padding: "10px 14px", marginBottom: "14px", fontSize: "12px", color: "rgba(201,168,76,0.9)" },
    info: { background: "rgba(201,168,76,0.08)", border: "1px solid rgba(201,168,76,0.25)", borderRadius: "10px", padding: "12px 14px", marginBottom: "14px", fontSize: "12px", color: "rgba(201,168,76,0.9)", lineHeight: 1.6 },
    warn: { background: "rgba(232,162,26,0.08)", border: "1px solid rgba(232,162,26,0.2)", borderRadius: "10px", padding: "14px", marginBottom: "14px" },
    warnTitle: { fontSize: "13px", fontWeight: 600, color: "#C9A84C", marginBottom: "4px" },
    warnDesc: { fontSize: "12px", color: "rgba(201,168,76,0.6)", lineHeight: 1.6 },
    priceBox: { background: "#080808", border: "1px solid #1c1c1c", borderRadius: "12px", padding: "16px" },
    priceRow: { display: "flex", justifyContent: "space-between", fontSize: "13px", padding: "5px 0" },
    priceKey: { color: "#555" },
    priceVal: { color: "#f0ede8", fontWeight: 500 },
    hr: { border: "none", borderTop: "1px solid rgba(255,255,255,0.05)", margin: "10px 0" },
    totalRow: { display: "flex", justifyContent: "space-between", alignItems: "baseline", padding: "8px 0 0" },
    totalKey: { fontSize: "12px", color: "#888" },
    totalVal: { fontFamily: "Georgia,serif", fontSize: "28px", color: "#f0ede8" },
    deposit: { display: "flex", justifyContent: "space-between", alignItems: "center", background: "rgba(201,168,76,0.07)", border: "1px solid rgba(201,168,76,0.18)", borderRadius: "10px", padding: "12px 14px", margin: "14px 0" },
    depKey: { fontSize: "12px", color: "rgba(201,168,76,0.7)" },
    depVal: { fontSize: "17px", fontWeight: 700, color: "#C9A84C" },
    btn: { width: "100%", background: "#C9A84C", color: "#0a0700", border: "none", borderRadius: "12px", padding: "16px", fontSize: "15px", fontWeight: 700, cursor: "pointer", fontFamily: "sans-serif" },
    btnDisabled: { width: "100%", background: "#1a1a1a", color: "#333", border: "none", borderRadius: "12px", padding: "16px", fontSize: "15px", fontWeight: 700, cursor: "not-allowed" as const, fontFamily: "sans-serif" },
    btnBack: { width: "100%", background: "transparent", color: "#888", border: "1px solid #1c1c1c", borderRadius: "12px", padding: "14px", fontSize: "14px", fontWeight: 500, cursor: "pointer", fontFamily: "sans-serif", marginTop: "10px" },
    payOpt: { border: "2px solid #1c1c1c", borderRadius: "14px", padding: "18px", marginBottom: "12px", cursor: "pointer", background: "#080808" },
    payOptSel: { border: "2px solid #C9A84C", borderRadius: "14px", padding: "18px", marginBottom: "12px", cursor: "pointer", background: "rgba(201,168,76,0.04)" },
    payHead: { display: "flex", alignItems: "center", gap: "12px", marginBottom: "6px" },
    radio: { width: "18px", height: "18px", borderRadius: "50%", border: "2px solid #333", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" },
    radioSel: { width: "18px", height: "18px", borderRadius: "50%", border: "2px solid #C9A84C", background: "#C9A84C", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" },
    radioDot: { width: "8px", height: "8px", borderRadius: "50%", background: "#060606" },
    payTitle: { fontSize: "14px", fontWeight: 600, color: "#f0ede8" },
    paySub: { fontSize: "11px", color: "#444" },
    payBody: { fontSize: "12px", color: "#666", lineHeight: 1.6, paddingLeft: "30px", marginTop: "8px" },
    payLogos: { display: "flex", gap: "8px", flexWrap: "wrap" as const, paddingLeft: "30px", marginTop: "10px", marginBottom: "6px" },
    payLogo: { display: "inline-flex", alignItems: "center", justifyContent: "center", padding: "4px 10px", borderRadius: "6px", fontSize: "10px", fontWeight: 700, letterSpacing: "0.5px", border: "1px solid #1c1c1c", background: "#080808" },
    successWrap: { textAlign: "center" as const, padding: "40px 20px" },
    successIco: { fontSize: "48px", marginBottom: "20px" },
    successTitle: { fontFamily: "Georgia,serif", fontSize: "28px", color: "#f0ede8", marginBottom: "10px" },
    successCode: { fontFamily: "Georgia,serif", fontSize: "22px", color: "#C9A84C", background: "rgba(201,168,76,0.07)", border: "1px solid rgba(201,168,76,0.2)", borderRadius: "12px", padding: "14px 20px", margin: "16px 0", letterSpacing: "2px" },
    successDesc: { fontSize: "13px", color: "#888", lineHeight: 1.75, marginBottom: "20px" },
    bank: { background: "#0d0d0d", border: "1px solid #1c1c1c", borderRadius: "14px", padding: "18px", textAlign: "left" as const },
    bankTitle: { fontSize: "11px", letterSpacing: "1.5px", textTransform: "uppercase" as const, color: "rgba(201,168,76,0.5)", marginBottom: "12px" },
    bankRow: { display: "flex", justifyContent: "space-between", fontSize: "13px", padding: "6px 0", borderBottom: "1px solid rgba(255,255,255,0.04)" },
    bankKey: { color: "#555" },
    bankVal: { color: "#f0ede8", fontWeight: 500 },
    cardCompact: { background: "#0d0d0d", border: "1px solid #1c1c1c", borderRadius: "14px", padding: "14px 16px", marginBottom: "12px" },
    cardTitleCompact: { fontFamily: "Georgia,serif", fontSize: "14px", color: "#f0ede8", marginBottom: "10px", paddingBottom: "8px", borderBottom: "1px solid rgba(255,255,255,0.05)" },
    resItemCompact: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "5px 0", borderBottom: "1px solid rgba(255,255,255,0.04)" },
    resKeyCompact: { fontSize: "12px", color: "#555" },
    resValCompact: { fontSize: "12px", color: "#f0ede8", fontWeight: 500 },
    priceBoxCompact: { background: "#080808", border: "1px solid #1c1c1c", borderRadius: "10px", padding: "12px" },
    priceRowCompact: { display: "flex", justifyContent: "space-between", fontSize: "12px", padding: "4px 0" },
    totalRowCompact: { display: "flex", justifyContent: "space-between", alignItems: "baseline", padding: "6px 0 0" },
    totalValCompact: { fontFamily: "Georgia,serif", fontSize: "24px", color: "#f0ede8" },
    depositCompact: { display: "flex", justifyContent: "space-between", alignItems: "center", background: "rgba(201,168,76,0.07)", border: "1px solid rgba(201,168,76,0.18)", borderRadius: "8px", padding: "10px 12px", marginTop: "10px" },
  }

  function stepStyle(i: number) {
    if (paso === i + 1) return s.stepActive
    if (paso > i + 1) return s.stepDone
    return s.stepBase
  }

  const showTinaja = hasTinaja

  return (
    <div style={s.page}>
      <style>{"@media (min-width: 768px) { .reservar-body { max-width: 820px !important; } .paso1-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; } .paso1-grid > div:nth-child(2) { grid-column: 1; grid-row: 2; } .paso1-grid > div:nth-child(3) { grid-column: 2; grid-row: 1 / 3; align-self: start; } .paso2-row { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; } }"}</style>

      <nav style={s.nav}>
        <LogoNegocio businessName={businessName} />
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
                  {Array.from({ length: pricingTiers.length > 0 ? capacidad : capacidad + 2 }, (_, i) => i + 1).map(n => (
                    <option key={n} value={n}>
                      {n}{n === 1 ? " persona" : " personas"}{pricingTiers.length > 0 ? " — " + fmt(getPriceForGuests(pricingTiers, n, basePriceNight)) + "/noche" : n > capacidad && extraPersonPrice > 0 ? " (+" + fmt(extraPersonPrice) + "/noche)" : ""}
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
                <div>
                  <div style={s.payTitle}>{tenantMpEnabled ? "Mercado Pago" : "Tarjeta de crédito o débito"}</div>
                  <div style={s.paySub}>{tenantMpEnabled ? "Tarjeta, Redcompra · Pago seguro" : "Próximamente disponible"}</div>
                </div>
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
                <span style={{ ...s.payLogo, color: "#009ee3", background: "#e3f6fd" }}>Mercado Pago</span>
              </div>
              {metodoPago === "tarjeta" && (
                <div style={s.payBody}>
                  {tenantMpEnabled ? (
                    <>{"Tu reserva se "}<strong>{"confirma automáticamente"}</strong>{" al pagar con Mercado Pago."}</>
                  ) : (
                    <em style={{ color: "#e8a21a", fontSize: "11px" }}>{"Esta opción estará disponible muy pronto."}</em>
                  )}
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
            <button
              style={loading || (metodoPago === "tarjeta" && !tenantMpEnabled) ? s.btnDisabled : s.btn}
              disabled={loading || (metodoPago === "tarjeta" && !tenantMpEnabled)}
              onClick={confirmar}>
              {loading ? "Registrando..."
                : metodoPago === "tarjeta" && !tenantMpEnabled ? "Próximamente disponible"
                : metodoPago === "tarjeta" ? "Reservar y pagar con Mercado Pago →"
                : "Reservar ahora con 20% de anticipo"}
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

            {mpEnabled === true ? (
              <>
                <div style={s.successDesc}>
                  Hola <strong style={{ color: "#c8d8c0" }}>{nombre}</strong>, tu solicitud fue recibida.<br /><br />
                  {"Para confirmar tu reserva, completa el pago del adelanto de "}
                  <strong style={{ color: "#7ab87a" }}>{fmt(deposito)}</strong>
                  {" con Mercado Pago."}
                </div>
                {submitError && <div style={s.err}>{submitError}</div>}
                <button
                  onClick={pagarConMp}
                  disabled={mpLoading}
                  style={{ width: "100%", background: "#009ee3", color: "#ffffff", border: "none", borderRadius: "10px", padding: "14px", fontSize: "15px", fontWeight: 700, cursor: mpLoading ? "not-allowed" as const : "pointer", fontFamily: "sans-serif", opacity: mpLoading ? 0.8 : 1 }}
                >
                  {mpLoading ? "Redirigiendo..." : "Pagar con Mercado Pago →"}
                </button>
                <a href={backHref} style={{ display: "block", marginTop: "12px", width: "100%", boxSizing: "border-box" as const, background: "transparent", color: "#8a9e88", border: "1px solid #2a3e28", borderRadius: "12px", padding: "14px", fontSize: "14px", fontWeight: 500, textAlign: "center" as const, textDecoration: "none", fontFamily: "sans-serif" }}>
                  Volver al inicio
                </a>
              </>
            ) : (
              <>
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
              </>
            )}
          </div>
        )}

      </div>
    </div>
  )
}

export default function ReservarPage() {
  return (
    <Suspense fallback={<div style={{ padding: "32px", background: "#060606", minHeight: "100vh" }} />}>
      <ReservarInner />
    </Suspense>
  )
}
