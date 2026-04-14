"use client"

import { useCallback, useState } from "react"

const PANEL_BASE = "https://owner-dashboard-navy.vercel.app"
const CLIENT_DOMAIN_SUFFIX = ".takai.cl"

const BANKS = [
  "BancoEstado",
  "Banco de Chile",
  "Santander",
  "BCI",
  "Scotiabank",
  "Itaú",
  "Falabella",
] as const

const ACCOUNT_TYPES = ["Cuenta RUT", "Cuenta Vista", "Cuenta Corriente"] as const

type CabinRow = { name: string; base_price_night: string; capacity: string }

type OnboardResult = {
  token: string
  slug: string
  business_name: string
  tenant: Record<string, unknown>
  cabins: unknown[]
  dashboard_link: Record<string, unknown>
}

type Props = {
  adminToken: string
  onClose: () => void
  onCreated: (data: OnboardResult) => void
}

function Toggle({
  checked,
  onChange,
  label,
  id,
}: {
  checked: boolean
  onChange: (v: boolean) => void
  label: string
  id: string
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-[#2a1e38] bg-[#080610] px-3 py-2.5">
      <label htmlFor={id} className="text-sm text-[#c8b8e0]">
        {label}
      </label>
      <button
        type="button"
        id={id}
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative h-7 w-12 shrink-0 rounded-full transition-colors ${checked ? "bg-[#7a5a98]" : "bg-[#2a1e38]"}`}
      >
        <span
          className={`absolute top-1 left-1 h-5 w-5 rounded-full bg-white shadow transition-transform ${checked ? "translate-x-5" : "translate-x-0"}`}
        />
      </button>
    </div>
  )
}

function FieldLabel({ children, required }: { children: React.ReactNode; required?: boolean }) {
  return (
    <label className="mb-1.5 block text-[11px] font-medium uppercase tracking-wide text-[#5a4870]">
      {children}
      {required ? <span className="text-red-400/90"> *</span> : null}
    </label>
  )
}

export default function NewClientOnboarding({ adminToken, onClose, onCreated }: Props) {
  const [phase, setPhase] = useState<"form" | "success">("form")
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<OnboardResult | null>(null)

  const [business_name, setBusinessName] = useState("")
  const [email_owner, setEmailOwner] = useState("")
  const [owner_whatsapp, setOwnerWhatsapp] = useState("")
  const [gender, setGender] = useState<"female" | "male">("female")
  const [has_tinaja, setHasTinaja] = useState(true)
  const [accepts_pets, setAcceptsPets] = useState(false)
  const [check_in_time, setCheckInTime] = useState("14:00")
  const [check_out_time, setCheckOutTime] = useState("12:00")
  const [min_nights, setMinNights] = useState("2")
  const [advance_percentage, setAdvancePercentage] = useState("20")
  const [bank_name, setBankName] = useState("")
  const [bank_account_type, setBankAccountType] = useState("")
  const [bank_account_number, setBankAccountNumber] = useState("")
  const [bank_rut, setBankRut] = useState("")
  const [instagram_url, setInstagramUrl] = useState("")
  const [facebook_url, setFacebookUrl] = useState("")
  const [cabins, setCabins] = useState<CabinRow[]>([{ name: "", base_price_night: "", capacity: "4" }])

  const [copiedPanel, setCopiedPanel] = useState(false)
  const [copiedPublic, setCopiedPublic] = useState(false)
  const [copiedEmbed, setCopiedEmbed] = useState(false)
  const [copiedIframe, setCopiedIframe] = useState(false)

  const copyFeedback = useCallback((setter: (v: boolean) => void) => {
    setter(true)
    window.setTimeout(() => setter(false), 2000)
  }, [])

  const addCabinRow = () => {
    setCabins((c) => [...c, { name: "", base_price_night: "", capacity: "4" }])
  }

  const removeCabinRow = (index: number) => {
    setCabins((c) => (c.length <= 1 ? c : c.filter((_, i) => i !== index)))
  }

  const updateCabin = (index: number, field: keyof CabinRow, value: string) => {
    setCabins((rows) => rows.map((row, i) => (i === index ? { ...row, [field]: value } : row)))
  }

  const validateClient = (): string | null => {
    if (business_name.trim().length < 2) return "Indica el nombre del negocio (mín. 2 caracteres)."
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email_owner.trim())) return "Email del dueño no válido."
    if (!bank_name) return "Selecciona un banco."
    if (!bank_account_type) return "Selecciona el tipo de cuenta."
    if (!bank_account_number.trim()) return "Indica el número de cuenta."
    if (!bank_rut.trim()) return "Indica el RUT del titular."
    for (const c of cabins) {
      if (!c.name.trim()) return "Todas las cabañas deben tener nombre."
      const p = Number(c.base_price_night)
      if (!Number.isFinite(p) || p < 0) return "Precio por noche inválido."
      const cap = parseInt(c.capacity, 10)
      if (!Number.isFinite(cap) || cap < 1) return "Capacidad inválida (mín. 1)."
    }
    return null
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    const v = validateClient()
    if (v) {
      setError(v)
      return
    }
    setSaving(true)
    try {
      const res = await fetch("/api/admin/onboard", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-admin-token": adminToken },
        body: JSON.stringify({
          business_name: business_name.trim(),
          email_owner: email_owner.trim(),
          owner_whatsapp: owner_whatsapp.trim() || null,
          gender,
          has_tinaja,
          accepts_pets,
          check_in_time,
          check_out_time,
          min_nights: parseInt(min_nights, 10) || 2,
          advance_percentage: parseInt(advance_percentage, 10) || 20,
          bank_name,
          bank_account_type,
          bank_account_number: bank_account_number.trim(),
          bank_rut: bank_rut.trim(),
          instagram_url: instagram_url.trim() || null,
          facebook_url: facebook_url.trim() || null,
          cabins: cabins.map((c) => ({
            name: c.name.trim(),
            base_price_night: Number(c.base_price_night),
            capacity: parseInt(c.capacity, 10),
          })),
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(typeof data.error === "string" ? data.error : "Error al crear el cliente.")
        setSaving(false)
        return
      }
      const payload = data as OnboardResult & { success?: boolean }
      setResult(payload)
      onCreated(payload)
      setPhase("success")
    } catch {
      setError("No se pudo conectar con el servidor.")
    }
    setSaving(false)
  }

  const resetForm = () => {
    setPhase("form")
    setResult(null)
    setBusinessName("")
    setEmailOwner("")
    setOwnerWhatsapp("")
    setGender("female")
    setHasTinaja(true)
    setAcceptsPets(false)
    setCheckInTime("14:00")
    setCheckOutTime("12:00")
    setMinNights("2")
    setAdvancePercentage("20")
    setBankName("")
    setBankAccountType("")
    setBankAccountNumber("")
    setBankRut("")
    setInstagramUrl("")
    setFacebookUrl("")
    setCabins([{ name: "", base_price_night: "", capacity: "4" }])
    setError(null)
  }

  const slug = result?.slug ?? ""
  const token = result?.token ?? ""
  const biz = result?.business_name ?? ""
  const panelUrl = `${PANEL_BASE}/?token=${encodeURIComponent(token)}`
  const publicUrl = slug ? `https://${slug}${CLIENT_DOMAIN_SUFFIX}` : ""
  const embedUrl = slug ? `https://${slug}${CLIENT_DOMAIN_SUFFIX}/embed/calendario` : ""
  const iframeCode = `<iframe src="${embedUrl}" width="100%" height="500" frameborder="0" title="Calendario ${slug}"></iframe>`

  const copy = async (text: string, feedback: (v: boolean) => void) => {
    try {
      await navigator.clipboard.writeText(text)
      copyFeedback(feedback)
    } catch {
      /* ignore */
    }
  }

  return (
    <div
      className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/60 p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div
        className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-[#2a1e38] bg-[#0d0918] shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-[#2a1e38] bg-[#0d0918]/95 px-5 py-4 backdrop-blur-sm">
          <h2 className="font-serif text-xl text-[#e8d5a3]">
            {phase === "form" ? "Nuevo cliente" : "Cliente creado"}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-[#5a4870] transition hover:bg-[#1a1428] hover:text-[#c8b8e0]"
            aria-label="Cerrar"
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        {phase === "success" && result ? (
          <div className="space-y-5 p-6">
            <div className="rounded-xl border border-emerald-900/50 bg-emerald-950/30 px-4 py-3 text-sm text-emerald-100/95">
              <p className="font-semibold text-emerald-200">¡Cliente registrado correctamente!</p>
              <p className="mt-1 text-emerald-100/80">
                Negocio: <span className="font-medium text-white">{biz}</span>
              </p>
            </div>

            <p className="rounded-lg border border-amber-900/40 bg-amber-950/40 px-4 py-3 text-sm text-amber-100/90">
              Guarda el link del panel ahora. El token solo se muestra una vez.
            </p>

            <div className="space-y-4">
              <div>
                <FieldLabel>Link del panel del dueño</FieldLabel>
                <div className="flex flex-col gap-2 sm:flex-row sm:items-stretch">
                  <div className="min-w-0 flex-1 break-all rounded-lg border border-[#2a1e38] bg-[#080610] px-3 py-2 font-mono text-[11px] text-[#c8b8e0]">
                    {panelUrl}
                  </div>
                  <button
                    type="button"
                    onClick={() => copy(panelUrl, setCopiedPanel)}
                    className="shrink-0 rounded-lg border border-[#7a5a98]/50 bg-[#1a1428] px-4 py-2 text-xs font-semibold text-[#c8b878] transition hover:bg-[#241a32]"
                  >
                    {copiedPanel ? "¡Copiado!" : "Copiar"}
                  </button>
                </div>
              </div>

              <div>
                <FieldLabel>Página pública</FieldLabel>
                <div className="flex flex-col gap-2 sm:flex-row sm:items-stretch">
                  <div className="min-w-0 flex-1 break-all rounded-lg border border-[#2a1e38] bg-[#080610] px-3 py-2 font-mono text-[11px] text-[#c8b8e0]">
                    {publicUrl}
                  </div>
                  <button
                    type="button"
                    onClick={() => copy(publicUrl, setCopiedPublic)}
                    className="shrink-0 rounded-lg border border-[#7a5a98]/50 bg-[#1a1428] px-4 py-2 text-xs font-semibold text-[#c8b878] transition hover:bg-[#241a32]"
                  >
                    {copiedPublic ? "¡Copiado!" : "Copiar"}
                  </button>
                </div>
              </div>

              <div>
                <FieldLabel>Calendario embebible (URL)</FieldLabel>
                <div className="flex flex-col gap-2 sm:flex-row sm:items-stretch">
                  <div className="min-w-0 flex-1 break-all rounded-lg border border-[#2a1e38] bg-[#080610] px-3 py-2 font-mono text-[11px] text-[#c8b8e0]">
                    {embedUrl}
                  </div>
                  <button
                    type="button"
                    onClick={() => copy(embedUrl, setCopiedEmbed)}
                    className="shrink-0 rounded-lg border border-[#7a5a98]/50 bg-[#1a1428] px-4 py-2 text-xs font-semibold text-[#c8b878] transition hover:bg-[#241a32]"
                  >
                    {copiedEmbed ? "¡Copiado!" : "Copiar"}
                  </button>
                </div>
              </div>

              <div>
                <FieldLabel>Código iframe</FieldLabel>
                <pre className="mb-2 max-h-32 overflow-auto rounded-lg border border-[#2a1e38] bg-[#080610] p-3 text-[11px] leading-relaxed text-[#a898c8]">
                  {iframeCode}
                </pre>
                <button
                  type="button"
                  onClick={() => copy(iframeCode, setCopiedIframe)}
                  className="rounded-lg border border-[#7a5a98]/50 bg-[#1a1428] px-4 py-2 text-xs font-semibold text-[#c8b878] transition hover:bg-[#241a32]"
                >
                  {copiedIframe ? "¡Copiado!" : "Copiar código"}
                </button>
              </div>
            </div>

            <div className="flex flex-wrap gap-3 pt-2">
              <button
                type="button"
                onClick={resetForm}
                className="rounded-xl bg-[#7a5a98] px-5 py-3 text-sm font-semibold text-white transition hover:opacity-90"
              >
                Crear otro cliente
              </button>
              <button
                type="button"
                onClick={onClose}
                className="rounded-xl border border-[#2a1e38] px-5 py-3 text-sm font-medium text-[#5a4870] transition hover:bg-[#1a1428] hover:text-[#c8b8e0]"
              >
                Cerrar
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-8 p-6 pb-8">
            {error ? (
              <div className="rounded-lg border border-red-900/50 bg-red-950/40 px-4 py-3 text-sm text-red-200">{error}</div>
            ) : null}

            <section>
              <h3 className="mb-4 text-[10px] font-semibold uppercase tracking-[0.2em] text-[#7a5a98]">Datos del negocio</h3>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <FieldLabel required>Nombre del negocio</FieldLabel>
                  <input
                    required
                    value={business_name}
                    onChange={(e) => setBusinessName(e.target.value)}
                    className="w-full rounded-lg border border-[#2a1e38] bg-[#080610] px-3 py-2.5 text-sm text-[#c8b8e0] outline-none ring-[#7a5a98]/0 transition focus:border-[#7a5a98]/60 focus:ring-2 focus:ring-[#7a5a98]/30"
                  />
                </div>
                <div className="sm:col-span-2">
                  <FieldLabel required>Email del dueño</FieldLabel>
                  <input
                    type="email"
                    required
                    value={email_owner}
                    onChange={(e) => setEmailOwner(e.target.value)}
                    className="w-full rounded-lg border border-[#2a1e38] bg-[#080610] px-3 py-2.5 text-sm text-[#c8b8e0] outline-none focus:border-[#7a5a98]/60 focus:ring-2 focus:ring-[#7a5a98]/30"
                  />
                </div>
                <div>
                  <FieldLabel>Teléfono WhatsApp</FieldLabel>
                  <input
                    value={owner_whatsapp}
                    onChange={(e) => setOwnerWhatsapp(e.target.value)}
                    placeholder="+56 9 ..."
                    className="w-full rounded-lg border border-[#2a1e38] bg-[#080610] px-3 py-2.5 text-sm text-[#c8b8e0] outline-none focus:border-[#7a5a98]/60 focus:ring-2 focus:ring-[#7a5a98]/30"
                  />
                </div>
                <div>
                  <FieldLabel required>Género del dueño</FieldLabel>
                  <select
                    value={gender}
                    onChange={(e) => setGender(e.target.value as "female" | "male")}
                    className="w-full rounded-lg border border-[#2a1e38] bg-[#080610] px-3 py-2.5 text-sm text-[#c8b8e0] outline-none focus:border-[#7a5a98]/60 focus:ring-2 focus:ring-[#7a5a98]/30"
                  >
                    <option value="female">Femenino (Estimada)</option>
                    <option value="male">Masculino (Estimado)</option>
                  </select>
                </div>
              </div>
            </section>

            <section>
              <h3 className="mb-4 text-[10px] font-semibold uppercase tracking-[0.2em] text-[#7a5a98]">Configuración de reservas</h3>
              <div className="grid gap-3 sm:grid-cols-2">
                <Toggle id="tinaja" checked={has_tinaja} onChange={setHasTinaja} label="¿Tiene tinaja?" />
                <Toggle id="mascotas" checked={accepts_pets} onChange={setAcceptsPets} label="¿Acepta mascotas?" />
                <div>
                  <FieldLabel>Check-in (hora)</FieldLabel>
                  <input
                    type="time"
                    value={check_in_time}
                    onChange={(e) => setCheckInTime(e.target.value)}
                    className="w-full rounded-lg border border-[#2a1e38] bg-[#080610] px-3 py-2.5 text-sm text-[#c8b8e0] outline-none focus:border-[#7a5a98]/60 focus:ring-2 focus:ring-[#7a5a98]/30"
                  />
                </div>
                <div>
                  <FieldLabel>Check-out (hora)</FieldLabel>
                  <input
                    type="time"
                    value={check_out_time}
                    onChange={(e) => setCheckOutTime(e.target.value)}
                    className="w-full rounded-lg border border-[#2a1e38] bg-[#080610] px-3 py-2.5 text-sm text-[#c8b8e0] outline-none focus:border-[#7a5a98]/60 focus:ring-2 focus:ring-[#7a5a98]/30"
                  />
                </div>
                <div>
                  <FieldLabel>Estadía mínima (noches)</FieldLabel>
                  <input
                    type="number"
                    min={1}
                    max={365}
                    value={min_nights}
                    onChange={(e) => setMinNights(e.target.value)}
                    className="w-full rounded-lg border border-[#2a1e38] bg-[#080610] px-3 py-2.5 text-sm text-[#c8b8e0] outline-none focus:border-[#7a5a98]/60 focus:ring-2 focus:ring-[#7a5a98]/30"
                  />
                </div>
                <div>
                  <FieldLabel>Porcentaje de adelanto (%)</FieldLabel>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={advance_percentage}
                    onChange={(e) => setAdvancePercentage(e.target.value)}
                    className="w-full rounded-lg border border-[#2a1e38] bg-[#080610] px-3 py-2.5 text-sm text-[#c8b8e0] outline-none focus:border-[#7a5a98]/60 focus:ring-2 focus:ring-[#7a5a98]/30"
                  />
                </div>
              </div>
            </section>

            <section>
              <h3 className="mb-4 text-[10px] font-semibold uppercase tracking-[0.2em] text-[#7a5a98]">Datos bancarios</h3>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <FieldLabel required>Banco</FieldLabel>
                  <select
                    required
                    value={bank_name}
                    onChange={(e) => setBankName(e.target.value)}
                    className="w-full rounded-lg border border-[#2a1e38] bg-[#080610] px-3 py-2.5 text-sm text-[#c8b8e0] outline-none focus:border-[#7a5a98]/60 focus:ring-2 focus:ring-[#7a5a98]/30"
                  >
                    <option value="">Selecciona…</option>
                    {BANKS.map((b) => (
                      <option key={b} value={b}>
                        {b}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="sm:col-span-2">
                  <FieldLabel required>Tipo de cuenta</FieldLabel>
                  <select
                    required
                    value={bank_account_type}
                    onChange={(e) => setBankAccountType(e.target.value)}
                    className="w-full rounded-lg border border-[#2a1e38] bg-[#080610] px-3 py-2.5 text-sm text-[#c8b8e0] outline-none focus:border-[#7a5a98]/60 focus:ring-2 focus:ring-[#7a5a98]/30"
                  >
                    <option value="">Selecciona…</option>
                    {ACCOUNT_TYPES.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <FieldLabel required>Número de cuenta</FieldLabel>
                  <input
                    required
                    value={bank_account_number}
                    onChange={(e) => setBankAccountNumber(e.target.value)}
                    className="w-full rounded-lg border border-[#2a1e38] bg-[#080610] px-3 py-2.5 text-sm text-[#c8b8e0] outline-none focus:border-[#7a5a98]/60 focus:ring-2 focus:ring-[#7a5a98]/30"
                  />
                </div>
                <div>
                  <FieldLabel required>RUT del titular</FieldLabel>
                  <input
                    required
                    value={bank_rut}
                    onChange={(e) => setBankRut(e.target.value)}
                    className="w-full rounded-lg border border-[#2a1e38] bg-[#080610] px-3 py-2.5 text-sm text-[#c8b8e0] outline-none focus:border-[#7a5a98]/60 focus:ring-2 focus:ring-[#7a5a98]/30"
                  />
                </div>
              </div>
            </section>

            <section>
              <h3 className="mb-4 text-[10px] font-semibold uppercase tracking-[0.2em] text-[#7a5a98]">Redes sociales (opcional)</h3>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <FieldLabel>Instagram URL</FieldLabel>
                  <input
                    value={instagram_url}
                    onChange={(e) => setInstagramUrl(e.target.value)}
                    placeholder="https://instagram.com/..."
                    className="w-full rounded-lg border border-[#2a1e38] bg-[#080610] px-3 py-2.5 text-sm text-[#c8b8e0] outline-none focus:border-[#7a5a98]/60 focus:ring-2 focus:ring-[#7a5a98]/30"
                  />
                </div>
                <div className="sm:col-span-2">
                  <FieldLabel>Facebook URL</FieldLabel>
                  <input
                    value={facebook_url}
                    onChange={(e) => setFacebookUrl(e.target.value)}
                    placeholder="https://facebook.com/..."
                    className="w-full rounded-lg border border-[#2a1e38] bg-[#080610] px-3 py-2.5 text-sm text-[#c8b8e0] outline-none focus:border-[#7a5a98]/60 focus:ring-2 focus:ring-[#7a5a98]/30"
                  />
                </div>
              </div>
            </section>

            <section>
              <h3 className="mb-4 text-[10px] font-semibold uppercase tracking-[0.2em] text-[#7a5a98]">Cabañas (mínimo 1)</h3>
              <div className="space-y-4">
                {cabins.map((row, index) => (
                  <div
                    key={index}
                    className="rounded-xl border border-[#2a1e38] bg-[#080610]/50 p-4"
                  >
                    <div className="mb-3 flex items-center justify-between">
                      <span className="text-xs font-medium text-[#9a78c8]">Cabaña {index + 1}</span>
                      {cabins.length > 1 ? (
                        <button
                          type="button"
                          onClick={() => removeCabinRow(index)}
                          className="text-xs text-red-400/90 hover:underline"
                        >
                          Quitar
                        </button>
                      ) : null}
                    </div>
                    <div className="grid gap-3 sm:grid-cols-3">
                      <div className="sm:col-span-1">
                        <FieldLabel required>Nombre</FieldLabel>
                        <input
                          required
                          value={row.name}
                          onChange={(e) => updateCabin(index, "name", e.target.value)}
                          className="w-full rounded-lg border border-[#2a1e38] bg-[#080610] px-3 py-2 text-sm text-[#c8b8e0] outline-none focus:border-[#7a5a98]/60 focus:ring-2 focus:ring-[#7a5a98]/30"
                        />
                      </div>
                      <div>
                        <FieldLabel required>Precio por noche ($)</FieldLabel>
                        <input
                          type="number"
                          required
                          min={0}
                          step={1}
                          value={row.base_price_night}
                          onChange={(e) => updateCabin(index, "base_price_night", e.target.value)}
                          className="w-full rounded-lg border border-[#2a1e38] bg-[#080610] px-3 py-2 text-sm text-[#c8b8e0] outline-none focus:border-[#7a5a98]/60 focus:ring-2 focus:ring-[#7a5a98]/30"
                        />
                      </div>
                      <div>
                        <FieldLabel required>Capacidad (personas)</FieldLabel>
                        <input
                          type="number"
                          required
                          min={1}
                          value={row.capacity}
                          onChange={(e) => updateCabin(index, "capacity", e.target.value)}
                          className="w-full rounded-lg border border-[#2a1e38] bg-[#080610] px-3 py-2 text-sm text-[#c8b8e0] outline-none focus:border-[#7a5a98]/60 focus:ring-2 focus:ring-[#7a5a98]/30"
                        />
                      </div>
                    </div>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={addCabinRow}
                  className="w-full rounded-lg border border-dashed border-[#7a5a98]/40 py-3 text-sm font-medium text-[#9a78c8] transition hover:border-[#7a5a98]/70 hover:bg-[#1a1428]/50"
                >
                  + Agregar otra cabaña
                </button>
              </div>
            </section>

            <div className="flex flex-wrap gap-3 border-t border-[#2a1e38] pt-6">
              <button
                type="submit"
                disabled={saving}
                className="rounded-xl bg-[#7a5a98] px-6 py-3 text-sm font-bold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {saving ? "Creando…" : "Crear cliente"}
              </button>
              <button
                type="button"
                onClick={onClose}
                className="rounded-xl border border-[#2a1e38] px-6 py-3 text-sm font-medium text-[#5a4870] transition hover:bg-[#1a1428] hover:text-[#c8b8e0]"
              >
                Cancelar
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
