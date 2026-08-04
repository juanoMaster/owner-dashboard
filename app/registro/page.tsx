"use client"

import { useState } from "react"

const BG = "#0d1a12"
const CARD = "#162618"
const BORDER = "#2a3e28"
const GOLD = "#e8d5a3"
const GREEN = "#7ab87a"
const BODY = "#8a9e88"
const MUTED = "#5a7058"
const RED = "#e63946"

const SETUP_FEE_LABEL = "$160.000"

type CabinRow = { name: string; capacity: string; base_price_night: string; description: string }

const TEMPLATES = [
  { id: "clasico", name: "Clásico", desc: "Oscuro y elegante, con detalles dorados." },
  { id: "moderno", name: "Moderno", desc: "Claro y limpio, con acentos verdes." },
  { id: "rural", name: "Rural", desc: "Cálido y campestre, tonos tierra." },
  { id: "premium", name: "Premium", desc: "Fotografía a pantalla completa, cinematográfico." },
  { id: "boutique", name: "Boutique", desc: "Minimalista, mucho aire y tipografía fina." },
]

const inputStyle = {
  width: "100%",
  boxSizing: "border-box" as const,
  background: BG,
  border: "1px solid " + BORDER,
  borderRadius: "8px",
  padding: "12px 14px",
  color: "#f0ede8",
  fontSize: "14px",
  fontFamily: "sans-serif",
  marginTop: "6px",
}

const labelStyle = {
  display: "block",
  fontSize: "12px",
  color: BODY,
  marginBottom: "2px",
  marginTop: "16px",
}

function Field({
  label, value, onChange, placeholder, type = "text", hint,
}: {
  label: string; value: string; onChange: (v: string) => void
  placeholder?: string; type?: string; hint?: string
}) {
  return (
    <label style={labelStyle}>
      {label}
      <input
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        style={inputStyle}
      />
      {hint && <span style={{ display: "block", fontSize: "11px", color: MUTED, marginTop: "5px" }}>{hint}</span>}
    </label>
  )
}

function StepDots({ step }: { step: number }) {
  const labels = ["Tu negocio", "Tus cabañas", "Tus pagos", "Confirmar"]
  return (
    <div style={{ display: "flex", gap: "8px", marginBottom: "28px", flexWrap: "wrap" as const }}>
      {labels.map((l, i) => (
        <div key={l} style={{ display: "flex", alignItems: "center", gap: "7px" }}>
          <div style={{
            width: "22px", height: "22px", borderRadius: "50%", flexShrink: 0,
            background: i < step ? GREEN : i === step ? "transparent" : "transparent",
            border: "1px solid " + (i <= step ? GREEN : BORDER),
            color: i < step ? BG : i === step ? GREEN : MUTED,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: "11px", fontWeight: 700,
          }}>
            {i < step ? "✓" : i + 1}
          </div>
          <span style={{ fontSize: "11.5px", color: i <= step ? BODY : MUTED, marginRight: "6px" }}>{l}</span>
        </div>
      ))}
    </div>
  )
}

export default function RegistroPage() {
  const [step, setStep] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [sending, setSending] = useState(false)
  const [done, setDone] = useState<{ slug: string; pay_method: string } | null>(null)

  // Paso 1
  const [businessName, setBusinessName] = useState("")
  const [ownerName, setOwnerName] = useState("")
  const [email, setEmail] = useState("")
  const [whatsapp, setWhatsapp] = useState("")
  const [locationText, setLocationText] = useState("")
  const [latitude, setLatitude] = useState("")
  const [longitude, setLongitude] = useState("")
  const [tagline, setTagline] = useState("")
  const [template, setTemplate] = useState("clasico")

  // Paso 2
  const [cabins, setCabins] = useState<CabinRow[]>([
    { name: "", capacity: "", base_price_night: "", description: "" },
  ])

  // Paso 3
  const [bankName, setBankName] = useState("")
  const [bankType, setBankType] = useState("Cuenta corriente")
  const [bankNumber, setBankNumber] = useState("")
  const [bankHolder, setBankHolder] = useState("")
  const [bankRut, setBankRut] = useState("")

  // Paso 4
  const [payMethod, setPayMethod] = useState<"card" | "transfer">("card")

  function updateCabin(i: number, patch: Partial<CabinRow>) {
    setCabins((prev) => prev.map((c, k) => (k === i ? { ...c, ...patch } : c)))
  }

  function validateStep(): string | null {
    if (step === 0) {
      if (businessName.trim().length < 2) return "Escribe el nombre de tu negocio."
      if (ownerName.trim().length < 2) return "Escribe tu nombre."
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) return "Revisa tu correo: no parece válido."
      if (whatsapp.replace(/\D/g, "").length < 8) return "Escribe tu WhatsApp con código de país."
      if (locationText.trim().length < 3) return "Indica dónde están tus cabañas."
    }
    if (step === 1) {
      if (cabins.length === 0) return "Agrega al menos una cabaña."
      for (const c of cabins) {
        if (c.name.trim().length < 1) return "Cada cabaña necesita un nombre."
        if (!(parseInt(c.capacity, 10) >= 1)) return "Cada cabaña necesita su capacidad (mínimo 1 persona)."
        if (!(Number(c.base_price_night) > 0)) return "Cada cabaña necesita un precio por noche."
      }
    }
    if (step === 2) {
      if (!bankName.trim() || !bankNumber.trim() || !bankRut.trim()) {
        return "Completa banco, número de cuenta y RUT: sin eso el turista no puede pagarte."
      }
    }
    return null
  }

  function next() {
    const err = validateStep()
    if (err) { setError(err); return }
    setError(null)
    setStep((s) => s + 1)
  }

  async function submit() {
    setSending(true)
    setError(null)
    try {
      const res = await fetch("/api/registro", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          business_name: businessName,
          owner_name: ownerName,
          email_owner: email,
          owner_whatsapp: whatsapp,
          location_text: locationText,
          latitude: latitude || null,
          longitude: longitude || null,
          tagline,
          template,
          bank_name: bankName,
          bank_account_type: bankType,
          bank_account_number: bankNumber,
          bank_account_holder: bankHolder,
          bank_rut: bankRut,
          pay_method: payMethod,
          cabins: cabins.map((c) => ({
            name: c.name,
            capacity: parseInt(c.capacity, 10),
            base_price_night: Number(c.base_price_night),
            description: c.description,
          })),
        }),
      })
      const d = await res.json()
      if (!res.ok || d.error) {
        setError(d.error || "No pudimos completar tu registro.")
        setSending(false)
        return
      }
      if (d.init_point) { window.location.href = d.init_point; return }
      setDone({ slug: d.slug, pay_method: d.pay_method })
      setSending(false)
    } catch {
      setError("Error de conexión. Intenta nuevamente.")
      setSending(false)
    }
  }

  if (done) {
    return (
      <div style={{ background: BG, minHeight: "100vh", fontFamily: "sans-serif", color: "#f0ede8", padding: "48px 20px" }}>
        <div style={{ maxWidth: "520px", margin: "0 auto", textAlign: "center" as const }}>
          <div style={{ fontSize: "48px", marginBottom: "16px" }}>🌲</div>
          <h1 style={{ fontFamily: "Georgia,serif", fontSize: "26px", fontWeight: 400, color: GOLD, marginBottom: "14px" }}>
            Recibimos tu registro
          </h1>
          <p style={{ fontSize: "14.5px", color: BODY, lineHeight: 1.8, marginBottom: "24px" }}>
            Estamos revisando los datos de <strong style={{ color: "#f0ede8" }}>{businessName}</strong>. En cuanto
            esté todo conforme activamos tu sistema y te enviamos por correo el acceso a tu panel y el enlace de tu
            página pública.
          </p>
          {done.pay_method === "transfer" && (
            <div style={{ background: CARD, border: "1px solid " + BORDER, borderRadius: "12px", padding: "18px", textAlign: "left" as const, marginBottom: "22px" }}>
              <div style={{ fontSize: "11px", letterSpacing: "1.5px", color: MUTED, marginBottom: "10px" }}>PRÓXIMO PASO</div>
              <p style={{ fontSize: "13.5px", color: BODY, lineHeight: 1.7, margin: 0 }}>
                Te escribiremos por WhatsApp para coordinar la transferencia de la cuota de incorporación
                ({SETUP_FEE_LABEL}). Tu registro ya quedó guardado.
              </p>
            </div>
          )}
          <p style={{ fontSize: "12.5px", color: MUTED, lineHeight: 1.7 }}>
            Si necesitas corregir algo, respóndenos el correo de confirmación y lo ajustamos antes de publicar.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div style={{ background: BG, minHeight: "100vh", fontFamily: "sans-serif", color: "#f0ede8", padding: "40px 20px 64px" }}>
      <div style={{ maxWidth: "620px", margin: "0 auto" }}>

        <div style={{ textAlign: "center" as const, marginBottom: "32px" }}>
          <div style={{ fontFamily: "Georgia,serif", fontSize: "15px", letterSpacing: "5px", color: GOLD, textTransform: "uppercase" as const, marginBottom: "16px" }}>
            Takai
          </div>
          <h1 style={{ fontFamily: "Georgia,serif", fontSize: "28px", fontWeight: 400, color: "#f0ede8", margin: "0 0 10px", lineHeight: 1.25 }}>
            Registra tus cabañas
          </h1>
          <p style={{ fontSize: "14px", color: BODY, lineHeight: 1.7, margin: 0 }}>
            Cuota de incorporación de {SETUP_FEE_LABEL}, una sola vez. Sin mensualidad: después solo el 10% de las
            reservas que Takai te genere. Las que consigas por tu cuenta son 100% tuyas.
          </p>
        </div>

        <StepDots step={step} />

        <div style={{ background: CARD, border: "1px solid " + BORDER, borderRadius: "14px", padding: "24px" }}>

          {step === 0 && (
            <>
              <h2 style={{ fontFamily: "Georgia,serif", fontSize: "19px", fontWeight: 400, color: GOLD, margin: "0 0 4px" }}>Tu negocio</h2>
              <p style={{ fontSize: "12.5px", color: MUTED, margin: "0 0 4px" }}>Así te verán los turistas.</p>
              <Field label="Nombre del negocio" value={businessName} onChange={setBusinessName} placeholder="Cabañas Los Coigües" />
              <Field label="Tu nombre" value={ownerName} onChange={setOwnerName} placeholder="María González" />
              <Field label="Correo" value={email} onChange={setEmail} type="email" placeholder="maria@correo.cl"
                hint="Aquí te llegan las reservas y el acceso a tu panel." />
              <Field label="Tu WhatsApp" value={whatsapp} onChange={setWhatsapp} placeholder="+56912345678"
                hint="Con código de país. Es para avisarte de cada reserva — el turista no lo ve." />
              <Field label="Dónde están tus cabañas" value={locationText} onChange={setLocationText} placeholder="Melipeuco, La Araucanía" />
              <Field label="Frase de presentación (opcional)" value={tagline} onChange={setTagline} placeholder="Descanso entre araucarias, a pasos del Conguillío" />

              <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" as const }}>
                <div style={{ flex: "1 1 160px" }}>
                  <Field label="Latitud (opcional)" value={latitude} onChange={setLatitude} placeholder="-38.85123" />
                </div>
                <div style={{ flex: "1 1 160px" }}>
                  <Field label="Longitud (opcional)" value={longitude} onChange={setLongitude} placeholder="-71.70456" />
                </div>
              </div>
              <p style={{ fontSize: "11px", color: MUTED, marginTop: "6px", lineHeight: 1.6 }}>
                Si las agregas, tu página muestra el mapa y el botón &quot;Cómo llegar&quot;. En Google Maps: mantén
                presionado sobre tu ubicación y copia los dos números que aparecen.
              </p>

              <div style={labelStyle}>Estilo de tu página</div>
              <div style={{ display: "flex", flexDirection: "column" as const, gap: "8px", marginTop: "8px" }}>
                {TEMPLATES.map((t) => (
                  <div
                    key={t.id}
                    onClick={() => setTemplate(t.id)}
                    style={{
                      border: "1px solid " + (template === t.id ? GREEN : BORDER),
                      background: template === t.id ? "rgba(122,184,122,0.08)" : BG,
                      borderRadius: "10px", padding: "12px 14px", cursor: "pointer",
                    }}
                  >
                    <div style={{ fontSize: "13.5px", color: template === t.id ? GREEN : "#f0ede8", fontWeight: 600 }}>{t.name}</div>
                    <div style={{ fontSize: "12px", color: MUTED, marginTop: "3px" }}>{t.desc}</div>
                  </div>
                ))}
              </div>
              <p style={{ fontSize: "11px", color: MUTED, marginTop: "8px" }}>
                Puedes cambiarlo cuando quieras, también después de publicar.
              </p>
            </>
          )}

          {step === 1 && (
            <>
              <h2 style={{ fontFamily: "Georgia,serif", fontSize: "19px", fontWeight: 400, color: GOLD, margin: "0 0 4px" }}>Tus cabañas</h2>
              <p style={{ fontSize: "12.5px", color: MUTED, margin: "0 0 8px" }}>
                Las fotos las subes después desde tu panel, con calma.
              </p>

              {cabins.map((c, i) => (
                <div key={i} style={{ border: "1px solid " + BORDER, borderRadius: "10px", padding: "14px", marginTop: "16px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontSize: "11px", letterSpacing: "1.5px", color: MUTED }}>CABAÑA {i + 1}</span>
                    {cabins.length > 1 && (
                      <button
                        onClick={() => setCabins((prev) => prev.filter((_, k) => k !== i))}
                        style={{ background: "transparent", border: "none", color: RED, fontSize: "12px", cursor: "pointer" }}
                      >
                        Quitar
                      </button>
                    )}
                  </div>
                  <Field label="Nombre" value={c.name} onChange={(v) => updateCabin(i, { name: v })} placeholder="Cabaña El Roble" />
                  <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" as const }}>
                    <div style={{ flex: "1 1 130px" }}>
                      <Field label="Capacidad" value={c.capacity} onChange={(v) => updateCabin(i, { capacity: v })} type="number" placeholder="4" />
                    </div>
                    <div style={{ flex: "1 1 160px" }}>
                      <Field label="Precio por noche" value={c.base_price_night} onChange={(v) => updateCabin(i, { base_price_night: v })} type="number" placeholder="85000" />
                    </div>
                  </div>
                  <Field label="Descripción (opcional)" value={c.description} onChange={(v) => updateCabin(i, { description: v })} placeholder="Dos dormitorios, tinaja y vista al volcán." />
                </div>
              ))}

              <button
                onClick={() => setCabins((prev) => [...prev, { name: "", capacity: "", base_price_night: "", description: "" }])}
                style={{ marginTop: "16px", width: "100%", background: "transparent", border: "1px dashed " + BORDER, color: BODY, borderRadius: "10px", padding: "12px", fontSize: "13px", cursor: "pointer", fontFamily: "sans-serif" }}
              >
                + Agregar otra cabaña
              </button>
            </>
          )}

          {step === 2 && (
            <>
              <h2 style={{ fontFamily: "Georgia,serif", fontSize: "19px", fontWeight: 400, color: GOLD, margin: "0 0 4px" }}>Dónde recibes tu dinero</h2>
              <p style={{ fontSize: "12.5px", color: MUTED, margin: "0 0 4px", lineHeight: 1.7 }}>
                El turista te transfiere directo a esta cuenta. Takai nunca toca tu dinero — revisa bien cada dato.
              </p>
              <Field label="Banco" value={bankName} onChange={setBankName} placeholder="Banco Estado" />
              <div style={labelStyle}>
                Tipo de cuenta
                <select value={bankType} onChange={(e) => setBankType(e.target.value)} style={inputStyle}>
                  <option>Cuenta corriente</option>
                  <option>Cuenta vista</option>
                  <option>Cuenta de ahorro</option>
                  <option>Cuenta RUT</option>
                </select>
              </div>
              <Field label="Número de cuenta" value={bankNumber} onChange={setBankNumber} placeholder="00012345678" />
              <Field label="Titular de la cuenta" value={bankHolder} onChange={setBankHolder} placeholder="María González" hint="Si lo dejas vacío usamos tu nombre." />
              <Field label="RUT del titular" value={bankRut} onChange={setBankRut} placeholder="12.345.678-9" />
            </>
          )}

          {step === 3 && (
            <>
              <h2 style={{ fontFamily: "Georgia,serif", fontSize: "19px", fontWeight: 400, color: GOLD, margin: "0 0 12px" }}>Revisa y confirma</h2>

              <div style={{ background: BG, border: "1px solid " + BORDER, borderRadius: "10px", padding: "16px", marginBottom: "18px" }}>
                {[
                  ["Negocio", businessName],
                  ["Responsable", ownerName],
                  ["Correo", email],
                  ["WhatsApp", whatsapp],
                  ["Ubicación", locationText],
                  ["Cabañas", String(cabins.length)],
                  ["Estilo", TEMPLATES.find((t) => t.id === template)?.name ?? template],
                  ["Cuenta", bankName + " · " + bankNumber],
                ].map(([k, v]) => (
                  <div key={k} style={{ display: "flex", justifyContent: "space-between", gap: "14px", padding: "6px 0", borderBottom: "1px solid rgba(42,62,40,0.5)" }}>
                    <span style={{ fontSize: "12px", color: MUTED, flexShrink: 0 }}>{k}</span>
                    <span style={{ fontSize: "13px", color: "#f0ede8", textAlign: "right" as const, wordBreak: "break-word" as const }}>{v}</span>
                  </div>
                ))}
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
                <span style={{ fontSize: "13px", color: BODY }}>Cuota de incorporación</span>
                <span style={{ fontFamily: "Georgia,serif", fontSize: "24px", color: GOLD }}>{SETUP_FEE_LABEL}</span>
              </div>
              <p style={{ fontSize: "12px", color: MUTED, lineHeight: 1.7, marginTop: 0, marginBottom: "18px" }}>
                Pago único. Sin mensualidad. Después solo el 10% de las reservas que Takai te genere.
              </p>

              <div style={{ display: "flex", flexDirection: "column" as const, gap: "8px", marginBottom: "6px" }}>
                {[
                  { id: "card" as const, label: "Pagar ahora con tarjeta", desc: "Te llevamos a MercadoPago." },
                  { id: "transfer" as const, label: "Prefiero transferir", desc: "Te contactamos por WhatsApp para coordinar." },
                ].map((opt) => (
                  <div
                    key={opt.id}
                    onClick={() => setPayMethod(opt.id)}
                    style={{
                      border: "1px solid " + (payMethod === opt.id ? GREEN : BORDER),
                      background: payMethod === opt.id ? "rgba(122,184,122,0.08)" : BG,
                      borderRadius: "10px", padding: "12px 14px", cursor: "pointer",
                    }}
                  >
                    <div style={{ fontSize: "13.5px", color: payMethod === opt.id ? GREEN : "#f0ede8", fontWeight: 600 }}>{opt.label}</div>
                    <div style={{ fontSize: "12px", color: MUTED, marginTop: "3px" }}>{opt.desc}</div>
                  </div>
                ))}
              </div>

              <p style={{ fontSize: "11.5px", color: MUTED, lineHeight: 1.7, marginTop: "16px" }}>
                Revisamos tu información antes de publicar tu página. Al registrarte declaras que el alojamiento es
                tuyo o que tienes autorización para gestionarlo.
              </p>
            </>
          )}

          {error && (
            <div style={{ background: "rgba(230,57,70,0.1)", border: "1px solid " + RED, borderRadius: "8px", padding: "12px 14px", marginTop: "18px", color: "#ff8f96", fontSize: "13px", lineHeight: 1.6 }}>
              {error}
            </div>
          )}

          <div style={{ display: "flex", gap: "10px", marginTop: "22px" }}>
            {step > 0 && (
              <button
                onClick={() => { setError(null); setStep((s) => s - 1) }}
                disabled={sending}
                style={{ flex: "0 0 auto", background: "transparent", border: "1px solid " + BORDER, color: BODY, borderRadius: "10px", padding: "14px 20px", fontSize: "13.5px", cursor: sending ? "default" : "pointer", fontFamily: "sans-serif" }}
              >
                Atrás
              </button>
            )}
            <button
              onClick={step === 3 ? submit : next}
              disabled={sending}
              style={{ flex: 1, background: sending ? BORDER : GREEN, color: sending ? MUTED : BG, border: "none", borderRadius: "10px", padding: "14px", fontSize: "14px", fontWeight: 700, cursor: sending ? "default" : "pointer", fontFamily: "sans-serif" }}
            >
              {sending ? "Enviando…" : step === 3 ? (payMethod === "card" ? "Ir a pagar →" : "Enviar registro →") : "Continuar →"}
            </button>
          </div>
        </div>

        <p style={{ textAlign: "center" as const, fontSize: "11.5px", color: MUTED, marginTop: "22px", lineHeight: 1.7 }}>
          ¿Dudas antes de registrarte? Escríbenos y te acompañamos en el proceso.
        </p>
      </div>
    </div>
  )
}
