"use client"
import { Suspense, useState, useEffect } from "react"
import { useSearchParams } from "next/navigation"

const PRECIOS: Record<string, number> = {
  "f935a02e-2572-4272-9a08-af40b29f0912": 30000,
  "100598b1-5232-46a0-adf5-6dc969ce2f9f": 40000,
}
const CAPACIDAD: Record<string, number> = {
  "f935a02e-2572-4272-9a08-af40b29f0912": 4,
  "100598b1-5232-46a0-adf5-6dc969ce2f9f": 5,
}

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;700&family=Inter:wght@300;400;500;600&display=swap');
*{box-sizing:border-box;margin:0;padding:0;}
html,body{background:#0d1a12;min-height:100vh;}
.rk{font-family:'Inter',sans-serif;color:#f0ede8;background:#0d1a12;min-height:100vh;}
.rk-nav{display:flex;align-items:center;justify-content:space-between;padding:18px 24px;border-bottom:1px solid #ffffff0f;background:#0a1510;}
.rk-logo{font-family:'Playfair Display',serif;font-size:20px;letter-spacing:3px;color:#e8d5a3;text-transform:uppercase;}
.rk-logo em{color:#7ab87a;font-style:normal;}
.rk-back{background:transparent;border:1px solid #2a3e28;color:#8a9e88;font-size:12px;padding:7px 16px;border-radius:20px;cursor:pointer;font-family:'Inter',sans-serif;}
.rk-steps{display:flex;background:#0a1510;border-bottom:1px solid #ffffff08;}
.rk-step{flex:1;padding:14px 6px;text-align:center;font-size:10px;letter-spacing:1.5px;text-transform:uppercase;color:#2a3e28;border-bottom:2px solid transparent;transition:all .3s;}
.rk-step.active{color:#7ab87a;border-bottom-color:#7ab87a;}
.rk-step.done{color:#4a6e48;border-bottom-color:#4a6e48;}
.rk-body{padding:24px 20px;max-width:480px;margin:0 auto;}
.rk-cabin-header{margin-bottom:20px;}
.rk-cabin-eye{font-size:10px;letter-spacing:2px;text-transform:uppercase;color:#7ab87a;margin-bottom:6px;}
.rk-cabin-title{font-family:'Playfair Display',serif;font-size:28px;color:#e8d5a3;}
.rk-card{background:#162618;border:1px solid #2a3e28;border-radius:16px;padding:20px;margin-bottom:14px;}
.rk-card-title{font-family:'Playfair Display',serif;font-size:16px;color:#e8d5a3;margin-bottom:16px;padding-bottom:12px;border-bottom:1px solid #ffffff0a;}
.rk-g2{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:14px;}
.rk-lbl{display:block;font-size:10px;font-weight:600;letter-spacing:1.5px;text-transform:uppercase;color:#5a7058;margin-bottom:6px;}
.rk-inp{width:100%;padding:12px 14px;background:#0d1a12;border:1px solid #2a3e28;border-radius:10px;font-size:14px;color:#c8d8c0;font-family:'Inter',sans-serif;outline:none;}
.rk-inp:focus{border-color:#7ab87a55;}
.rk-sel{width:100%;padding:12px 14px;background:#0d1a12;border:1px solid #2a3e28;border-radius:10px;font-size:14px;color:#c8d8c0;font-family:'Inter',sans-serif;outline:none;margin-bottom:14px;}
.rk-price-box{background:#0d1a12;border:1px solid #2a3e28;border-radius:12px;padding:16px;}
.rk-price-row{display:flex;justify-content:space-between;font-size:13px;padding:5px 0;}
.rk-price-key{color:#6a7e68;}
.rk-price-val{color:#c8d8c0;font-weight:500;}
.rk-divider{border:none;border-top:1px solid #ffffff0a;margin:10px 0;}
.rk-total-row{display:flex;justify-content:space-between;align-items:baseline;padding:8px 0 0;}
.rk-total-key{font-size:12px;color:#8a9e88;}
.rk-total-val{font-family:'Playfair Display',serif;font-size:28px;color:#e8d5a3;}
.rk-deposit{display:flex;justify-content:space-between;align-items:center;background:#7ab87a14;border:1px solid #7ab87a2a;border-radius:10px;padding:12px 14px;margin:14px 0;}
.rk-dep-key{font-size:12px;color:#7ab87a;}
.rk-dep-val{font-size:17px;font-weight:700;color:#7ab87a;}
.rk-btn{width:100%;background:#7ab87a;color:#0d1a12;border:none;border-radius:12px;padding:16px;font-size:15px;font-weight:700;cursor:pointer;font-family:'Inter',sans-serif;transition:background .2s;}
.rk-btn:hover{background:#8ecb8e;}
.rk-btn:disabled{background:#2a3e28;color:#4a6e48;cursor:not-allowed;}
.rk-btn-back{width:100%;background:transparent;color:#8a9e88;border:1px solid #2a3e28;border-radius:12px;padding:14px;font-size:14px;font-weight:500;cursor:pointer;font-family:'Inter',sans-serif;margin-top:10px;}
.rk-error{background:#e6394615;border:1px solid #e6394633;border-radius:10px;padding:14px;font-size:13px;color:#e67a7a;margin-bottom:14px;line-height:1.6;}
.rk-warn{background:#e8a21a18;border:1px solid #e8a21a33;border-radius:10px;padding:14px;margin-bottom:14px;}
.rk-warn-title{font-size:13px;font-weight:600;color:#e8b84a;margin-bottom:4px;}
.rk-warn-desc{font-size:12px;color:#c8a060;line-height:1.6;}
.rk-ok{background:#7ab87a18;border:1px solid #7ab87a33;border-radius:10px;padding:10px 14px;margin-bottom:14px;font-size:12px;color:#7ab87a;}
.rk-info{background:#7ab87a10;border:1px solid #7ab87a22;border-radius:10px;padding:12px 14px;margin-bottom:14px;font-size:12px;color:#7ab87a;line-height:1.6;}
.rk-checking{font-size:12px;color:#6a7e68;padding:8px 0;margin-bottom:8px;}
.rk-resumen-item{display:flex;justify-content:space-between;align-items:center;padding:10px 0;border-bottom:1px solid #ffffff07;}
.rk-resumen-item:last-child{border-bottom:none;}
.rk-resumen-key{font-size:13px;color:#6a7e68;}
.rk-resumen-val{font-size:13px;color:#c8d8c0;font-weight:500;}
.pay-opt{border:2px solid #2a3e28;border-radius:14px;padding:18px;margin-bottom:12px;cursor:pointer;transition:border-color .2s,background .2s;background:#0d1a12;}
.pay-opt:hover{border-color:#7ab87a44;background:#162618;}
.pay-opt.sel{border-color:#7ab87a;background:#7ab87a0a;}
.pay-opt-head{display:flex;align-items:center;gap:12px;margin-bottom:6px;}
.pay-radio{width:18px;height:18px;border-radius:50%;border:2px solid #4a6e48;flex-shrink:0;display:flex;align-items:center;justify-content:center;}
.pay-opt.sel .pay-radio{border-color:#7ab87a;background:#7ab87a;}
.pay-radio-dot{width:8px;height:8px;border-radius:50%;background:#0d1a12;}
.pay-opt-title{font-size:14px;font-weight:600;color:#e8d5a3;}
.pay-opt-sub{font-size:11px;color:#5a7058;}
.pay-opt-body{font-size:12px;color:#8a9e88;line-height:1.6;padding-left:30px;margin-top:8px;}
.pay-opt.sel .pay-opt-body{color:#a8c8a0;}
.rk-success{text-align:center;padding:40px 20px;}
.rk-success-ico{font-size:48px;margin-bottom:20px;}
.rk-success-title{font-family:'Playfair Display',serif;font-size:28px;color:#e8d5a3;margin-bottom:10px;}
.rk-success-code{font-family:'Playfair Display',serif;font-size:22px;color:#7ab87a;background:#7ab87a14;border:1px solid #7ab87a2a;border-radius:12px;padding:14px 20px;margin:16px 0;letter-spacing:2px;}
.rk-success-desc{font-size:13px;color:#8a9e88;line-height:1.75;margin-bottom:20px;}
.rk-bank{background:#162618;border:1px solid #2a3e28;border-radius:14px;padding:18px;text-align:left;}
.rk-bank-title{font-size:11px;letter-spacing:1.5px;text-transform:uppercase;color:#5a7058;margin-bottom:12px;}
.rk-bank-row{display:flex;justify-content:space-between;font-size:13px;padding:6px 0;border-bottom:1px solid #ffffff07;}
.rk-bank-row:last-child{border-bottom:none;}
.rk-bank-key{color:#6a7e68;}
.rk-bank-val{color:#c8d8c0;font-weight:500;}
`

function fmt(n: number) {
  return "$" + n.toLocaleString("es-CL")
}

function ReservarInner() {
  const params = useSearchParams()
  const cabin_id = params.get("cabin_id") || ""
  const cabin_name = params.get("cabin_name") || "Cabana"
  const visitedParam = params.get("visited") || ""
  const visitedCabins = visitedParam ? visitedParam.split(",").filter(Boolean) : []

  const precio_noche = PRECIOS[cabin_id] || 30000
  const capacidad = CAPACIDAD[cabin_id] || 4
  const today = new Date().toISOString().split("T")[0]

  const [paso, setPaso] = useState(1)
  const [checkIn, setCheckIn] = useState("")
  const [checkOut, setCheckOut] = useState("")
  const [guests, setGuests] = useState(2)
  const [tinajaDias, setTinajaDias] = useState(0)
  const [nombre, setNombre] = useState("")
  const [whatsapp, setWhatsapp] = useState("")
  const [email, setEmail] = useState("")
  const [metodoPago, setMetodoPago] = useState<"transferencia" | "tarjeta">("transferencia")
  const [loading, setLoading] = useState(false)
  const [submitError, setSubmitError] = useState("")
  const [codigo, setCodigo] = useState("")

  // Disponibilidad
  const [dispStatus, setDispStatus] = useState<"idle" | "checking" | "ok" | "occupied">("idle")
  const [autoAssignId, setAutoAssignId] = useState("")
  const [suggest, setSuggest] = useState<{ cabin_id: string; cabin_name: string; capacity: number; price: number } | null>(null)
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
        const vParam = [...visitedCabins, ...(autoAssignId ? [] : [])].join(",")
        const res = await fetch(
          `/api/availability?cabin_id=${cabin_id}&check_in=${checkIn}&check_out=${checkOut}&visited=${encodeURIComponent(vParam)}`
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
      } catch {
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
      if (!res.ok) throw new Error(data.error || "Error al confirmar")
      setCodigo(data.codigo)
      setPaso(4)
    } catch (e: any) {
      setSubmitError(e.message)
    } finally {
      setLoading(false)
    }
  }

  const newVisited = [...visitedCabins, cabin_id].join(",")

  return (
    <div className="rk">
      <style>{CSS}</style>

      <nav className="rk-nav">
        <div className="rk-logo">Ruka<em>traro</em></div>
        {paso > 1 && paso < 4 && (
          <button className="rk-back" onClick={() => { setSubmitError(""); setPaso(p => p - 1) }}>
            Volver
          </button>
        )}
      </nav>

      {paso < 4 && (
        <div className="rk-steps">
          {["Datos", "Resumen", "Pago"].map((s, i) => (
            <div key={s} className={`rk-step ${paso === i + 1 ? "active" : paso > i + 1 ? "done" : ""}`}>
              {paso > i + 1 ? "V " : ""}{s}
            </div>
          ))}
        </div>
      )}

      <div className="rk-body">

        {/* PASO 1 */}
        {paso === 1 && (
          <>
            <div className="rk-cabin-header">
              <div className="rk-cabin-eye">Reserva directa</div>
              <div className="rk-cabin-title">{cabin_name}</div>
            </div>

            <div className="rk-card">
              <div className="rk-card-title">Fechas de estadía</div>
              <div className="rk-g2">
                <div>
                  <span className="rk-lbl">Check-in</span>
                  <input className="rk-inp" type="date" min={today} value={checkIn}
                    onChange={e => { setCheckIn(e.target.value); setCheckOut(""); setDispStatus("idle") }} />
                </div>
                <div>
                  <span className="rk-lbl">Check-out</span>
                  <input className="rk-inp" type="date" min={checkIn || today} value={checkOut}
                    onChange={e => setCheckOut(e.target.value)} />
                </div>
              </div>

              {checkIn && checkOut && !noches_ok && (
                <div className="rk-error">La estadía mínima es de 2 noches.</div>
              )}

              {dispStatus === "checking" && (
                <div className="rk-checking">Verificando disponibilidad...</div>
              )}

              {dispStatus === "ok" && (
                <div className="rk-ok">Fechas disponibles. Puedes continuar.</div>
              )}

              {dispStatus === "occupied" && suggest && (
                <div className="rk-error">
                  <strong>{cabin_name} no tiene disponibilidad para esas fechas.</strong>
                  <br /><br />
                  Puedes intentar con otra cabana de Rukatraro:
                  <br /><br />
                  
                    href={`/reservar?cabin_id=${suggest.cabin_id}&cabin_name=${encodeURIComponent(suggest.cabin_name)}&visited=${encodeURIComponent(newVisited)}`}
                    style={{ color: "#e8b84a", textDecoration: "underline", fontWeight: 600 }}
                  >
                    {suggest.cabin_name} — hasta {suggest.capacity} personas — {fmt(suggest.price)}/noche
                  </a>
                  <br /><br />
                  O elige otras fechas para {cabin_name}.
                </div>
              )}

              {dispStatus === "occupied" && redTakai && (
                <div className="rk-error">
                  <strong>Todas las cabanas de Rukatraro estan ocupadas para esas fechas.</strong>
                  <br /><br />
                  Te recomendamos elegir otras fechas o contactar directamente a Johanna.
                  Pronto podras ver otros centros disponibles en la red Takai.cl.
                </div>
              )}

              {dispStatus === "occupied" && !suggest && !redTakai && (
                <div className="rk-error">
                  Estas fechas no estan disponibles. Por favor elige otras fechas.
                </div>
              )}
            </div>

            <div className="rk-card">
              <div className="rk-card-title">Huespedes y extras</div>
              <span className="rk-lbl">Numero de personas (cap. {capacidad})</span>
              <select className="rk-sel" value={guests} onChange={e => setGuests(Number(e.target.value))}>
                {Array.from({ length: capacidad + 2 }, (_, i) => i + 1).map(n => (
                  <option key={n} value={n}>
                    {n} {n === 1 ? "persona" : "personas"}{n > capacidad ? ` (+${fmt(5000)}/noche)` : ""}
                  </option>
                ))}
              </select>
              <span className="rk-lbl">Tinaja de madera (+$30.000/dia)</span>
              <select className="rk-sel" value={tinajaDias} onChange={e => setTinajaDias(Number(e.target.value))}>
                <option value={0}>Sin tinaja</option>
                {Array.from({ length: Math.max(1, noches) }, (_, i) => i + 1).map(n => (
                  <option key={n} value={n}>{n} {n === 1 ? "dia" : "dias"} — {fmt(n * 30000)}</option>
                ))}
              </select>
            </div>

            <div className="rk-card">
              <div className="rk-card-title">Tus datos de contacto</div>
              <div className="rk-info">
                Revisa bien tu numero de WhatsApp y correo. Ahi recibiras la confirmacion de tu reserva.
              </div>
              <span className="rk-lbl">Nombre completo</span>
              <input className="rk-inp" type="text" placeholder="Maria Gonzalez"
                value={nombre} onChange={e => setNombre(e.target.value)}
                style={{ marginBottom: "14px" }} />
              <span className="rk-lbl">WhatsApp</span>
              <input className="rk-inp" type="tel" placeholder="+56 9 1234 5678"
                value={whatsapp} onChange={e => setWhatsapp(e.target.value)}
                style={{ marginBottom: "14px" }} />
              <span className="rk-lbl">Correo electronico</span>
              <input className="rk-inp" type="email" placeholder="tu@correo.com"
                value={email} onChange={e => setEmail(e.target.value)} />
            </div>

            <button className="rk-btn" disabled={!form_ok} onClick={() => setPaso(2)}>
              Ver resumen con 20% de anticipo
            </button>
          </>
        )}

        {/* PASO 2 */}
        {paso === 2 && (
          <>
            <div className="rk-cabin-header">
              <div className="rk-cabin-eye">Resumen de tu reserva</div>
              <div className="rk-cabin-title">{cabin_name}</div>
            </div>

            {tinajaDias === 0 && (
              <div className="rk-warn">
                <div className="rk-warn-title">Olvidaste la tinaja?</div>
                <div className="rk-warn-desc">
                  Rukatraro tiene una tinaja de madera calentada a lena, ideal para las noches del sur.
                  Si quieres agregarla, usa el boton Volver — cuesta solo $30.000/dia.
                </div>
              </div>
            )}

            <div className="rk-card">
              <div className="rk-card-title">Detalle</div>
              {([
                ["Huesped", nombre],
                ["WhatsApp", whatsapp],
                ["Correo", email || "—"],
                ["Check-in", checkIn],
                ["Check-out", checkOut],
                ["Noches", String(noches)],
                ["Personas", String(guests)],
                ["Tinaja", tinajaDias > 0 ? `${tinajaDias} dias` : "Sin tinaja"],
              ] as [string, string][]).map(([k, v]) => (
                <div className="rk-resumen-item" key={k}>
                  <span className="rk-resumen-key">{k}</span>
                  <span className="rk-resumen-val">{v}</span>
                </div>
              ))}
            </div>

            <div className="rk-card">
              <div className="rk-card-title">Precio</div>
              <div className="rk-price-box">
                <div className="rk-price-row">
                  <span className="rk-price-key">{fmt(precio_noche)} x {noches} noches</span>
                  <span className="rk-price-val">{fmt(precio_noche * noches)}</span>
                </div>
                {extrasPersonas > 0 && (
                  <div className="rk-price-row">
                    <span className="rk-price-key">Personas extra</span>
                    <span className="rk-price-val">{fmt(extrasPersonas)}</span>
                  </div>
                )}
                {tinaja > 0 && (
                  <div className="rk-price-row">
                    <span className="rk-price-key">Tinaja {tinajaDias} dias</span>
                    <span className="rk-price-val">{fmt(tinaja)}</span>
                  </div>
                )}
                <hr className="rk-divider" />
                <div className="rk-total-row">
                  <span className="rk-total-key">Total estadía</span>
                  <span className="rk-total-val">{fmt(total)}</span>
                </div>
              </div>
              <div className="rk-deposit">
                <span className="rk-dep-key">Adelanto para confirmar (20%)</span>
                <span className="rk-dep-val">{fmt(deposito)}</span>
              </div>
            </div>

            <button className="rk-btn" onClick={() => setPaso(3)}>Continuar al pago</button>
            <button className="rk-btn-back" onClick={() => setPaso(1)}>Volver y modificar</button>
          </>
        )}

        {/* PASO 3 */}
        {paso === 3 && (
          <>
            <div className="rk-cabin-header">
              <div className="rk-cabin-eye">Elige como pagar</div>
              <div className="rk-cabin-title">Adelanto: {fmt(deposito)}</div>
            </div>

            <div className={`pay-opt${metodoPago === "tarjeta" ? " sel" : ""}`}
              onClick={() => setMetodoPago("tarjeta")}>
              <div className="pay-opt-head">
                <div className="pay-radio">
                  {metodoPago === "tarjeta" && <div className="pay-radio-dot" />}
                </div>
                <div>
                  <div className="pay-opt-title">Tarjeta de credito o debito</div>
                  <div className="pay-opt-sub">Proximamente disponible</div>
                </div>
              </div>
              {metodoPago === "tarjeta" && (
                <div className="pay-opt-body">
                  Tu reserva se <strong>confirma automaticamente</strong> al completar el pago.
                  El sistema bloquea las fechas de inmediato y recibiras el comprobante
                  en tu WhatsApp {whatsapp ? `(${whatsapp})` : ""} {email ? `y correo (${email})` : ""}.
                  <br /><br />
                  <em style={{ color: "#e8a21a", fontSize: "11px" }}>Esta opcion estara disponible muy pronto.</em>
                </div>
              )}
            </div>

            <div className={`pay-opt${metodoPago === "transferencia" ? " sel" : ""}`}
              onClick={() => setMetodoPago("transferencia")}>
              <div className="pay-opt-head">
                <div className="pay-radio">
                  {metodoPago === "transferencia" && <div className="pay-radio-dot" />}
                </div>
                <div>
                  <div className="pay-opt-title">Transferencia bancaria</div>
                  <div className="pay-opt-sub">BancoEstado · Cuenta RUT · Inmediato</div>
                </div>
              </div>
              {metodoPago === "transferencia" && (
                <div className="pay-opt-body">
                  <div className="rk-price-box" style={{ marginTop: "10px" }}>
                    {([
                      ["Banco", "BancoEstado"],
                      ["Tipo", "Cuenta RUT"],
                      ["Numero", "15.665.466-3"],
                      ["Nombre", "Johanna Medina"],
                      ["Monto exacto", fmt(deposito)],
                    ] as [string, string][]).map(([k, v]) => (
                      <div className="rk-price-row" key={k}>
                        <span className="rk-price-key">{k}</span>
                        <span className="rk-price-val">{v}</span>
                      </div>
                    ))}
                  </div>
                  <div style={{ marginTop: "12px", fontSize: "12px", color: "#8a9e88", lineHeight: "1.6" }}>
                    Una vez que Johanna verifique tu transferencia, recibiras la confirmacion
                    de reserva junto con sus datos de contacto en tu WhatsApp
                    {whatsapp ? ` (${whatsapp})` : ""}{email ? ` y correo (${email})` : ""}.
                  </div>
                </div>
              )}
            </div>

            {submitError && <div className="rk-error">{submitError}</div>}

            <div style={{ fontSize: "12px", color: "#6a7e68", marginBottom: "16px", lineHeight: "1.6" }}>
              Al confirmar quedara registrada tu solicitud con un codigo unico.
              Usalo como glosa en tu transferencia para que Johanna identifique tu pago.
            </div>

            <button
              className="rk-btn"
              disabled={loading || metodoPago === "tarjeta"}
              onClick={confirmar}
            >
              {loading
                ? "Registrando..."
                : metodoPago === "tarjeta"
                  ? "Proximamente disponible"
                  : "Reservar ahora con 20% de anticipo"}
            </button>
            <button className="rk-btn-back" onClick={() => setPaso(2)}>Volver al resumen</button>
          </>
        )}

        {/* PASO 4 */}
        {paso === 4 && (
          <div className="rk-success">
            <div className="rk-success-ico">🌿</div>
            <div className="rk-success-title">Solicitud enviada</div>
            <div style={{ fontSize: "12px", color: "#5a7058", marginBottom: "8px", letterSpacing: "1px", textTransform: "uppercase" as const }}>
              Tu codigo de reserva
            </div>
            <div className="rk-success-code">{codigo}</div>
            <div className="rk-success-desc">
              Hola <strong style={{ color: "#c8d8c0" }}>{nombre}</strong>, tu solicitud fue recibida.<br /><br />
              Una vez que Johanna verifique tu transferencia de{" "}
              <strong style={{ color: "#7ab87a" }}>{fmt(deposito)}</strong>, recibiras la confirmacion
              de tu reserva con sus datos de contacto en tu WhatsApp
              {whatsapp ? ` (${whatsapp})` : ""}
              {email ? ` y correo (${email})` : ""}.
            </div>
            <div className="rk-bank">
              <div className="rk-bank-title">Datos para la transferencia</div>
              {([
                ["Banco", "BancoEstado"],
                ["Cuenta RUT", "15.665.466-3"],
                ["Titular", "Johanna Medina"],
                ["Monto exacto", fmt(deposito)],
                ["Glosa / Concepto", codigo],
              ] as [string, string][]).map(([k, v]) => (
                <div className="rk-bank-row" key={k}>
                  <span className="rk-bank-key">{k}</span>
                  <span className="rk-bank-val">{v}</span>
                </div>
              ))}
            </div>
            <div style={{ marginTop: "16px", fontSize: "12px", color: "#5a7058", lineHeight: "1.6" }}>
              Usa <strong style={{ color: "#7ab87a" }}>{codigo}</strong> como glosa para que
              Johanna identifique tu pago de inmediato.
            </div>
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