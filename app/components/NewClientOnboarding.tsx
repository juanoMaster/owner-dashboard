"use client"

import { useCallback, useState } from "react"
import TenantFormFields, {
  defaultTenantForm,
  tenantFormToPayload,
  type TenantFormState,
} from "./TenantFormFields"

const PANEL_BASE = process.env.NEXT_PUBLIC_APP_URL ?? "https://owner-dashboard-navy.vercel.app"
const RESERVAS_BASE = "https://reservas.takai.cl"

type Extra = { name: string; price: string }
type PricingTier = { min_guests: string; max_guests: string; price_per_night: string }
type SeasonPrice = { name: string; start_date: string; end_date: string; price_per_night: string }

type CabinRow = {
  name: string
  base_price_night: string
  capacity: string
  has_tinaja: boolean
  tinaja_price: string
  extra_person_price: string
  cleaning_fee: string
  description: string
  amenities: string
  extras: Extra[]
  pricing_tiers: PricingTier[]
  season_prices: SeasonPrice[]
}

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

function defaultCabin(): CabinRow {
  return {
    name: "", base_price_night: "", capacity: "4",
    has_tinaja: false, tinaja_price: "30000", extra_person_price: "0",
    cleaning_fee: "0", description: "", amenities: "",
    extras: [], pricing_tiers: [], season_prices: [],
  }
}

function FieldLabel({ children, required }: { children: React.ReactNode; required?: boolean }) {
  return (
    <label className="mb-1.5 block text-[11px] font-medium uppercase tracking-wide text-[#5a4870]">
      {children}
      {required ? <span className="text-red-400/90"> *</span> : null}
    </label>
  )
}

const INP = "w-full rounded-lg border border-[#2a1e38] bg-[#080610] px-3 py-2 text-sm text-[#c8b8e0] outline-none focus:border-[#7a5a98]/60 focus:ring-2 focus:ring-[#7a5a98]/30"

function CabinRowForm({
  index,
  cabin,
  canRemove,
  onChange,
  onRemove,
}: {
  index: number
  cabin: CabinRow
  canRemove: boolean
  onChange: (updates: Partial<CabinRow>) => void
  onRemove: () => void
}) {
  const [newExtraName, setNewExtraName] = useState("")
  const [newExtraPrice, setNewExtraPrice] = useState("")
  const [newTierMin, setNewTierMin] = useState("")
  const [newTierMax, setNewTierMax] = useState("")
  const [newTierPrice, setNewTierPrice] = useState("")
  const [newSeasonName, setNewSeasonName] = useState("")
  const [newSeasonStart, setNewSeasonStart] = useState("")
  const [newSeasonEnd, setNewSeasonEnd] = useState("")
  const [newSeasonPrice, setNewSeasonPrice] = useState("")

  return (
    <div className="rounded-xl border border-[#2a1e38] bg-[#080610]/50 p-4 space-y-4">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-[#9a78c8]">Cabaña {index + 1}</span>
        {canRemove && (
          <button type="button" onClick={onRemove} className="text-xs text-red-400/90 hover:underline">Quitar</button>
        )}
      </div>

      {/* Básicos */}
      <div className="grid gap-3 sm:grid-cols-3">
        <div>
          <FieldLabel required>Nombre</FieldLabel>
          <input required value={cabin.name} onChange={e => onChange({ name: e.target.value })} className={INP} />
        </div>
        <div>
          <FieldLabel required>Precio por noche ($)</FieldLabel>
          <input type="number" required min={0} value={cabin.base_price_night}
            onChange={e => onChange({ base_price_night: e.target.value })} className={INP} />
        </div>
        <div>
          <FieldLabel required>Capacidad (personas)</FieldLabel>
          <input type="number" required min={1} value={cabin.capacity}
            onChange={e => onChange({ capacity: e.target.value })} className={INP} />
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <FieldLabel>Tarifa de limpieza ($)</FieldLabel>
          <input type="number" min={0} value={cabin.cleaning_fee}
            onChange={e => onChange({ cleaning_fee: e.target.value })} className={INP} />
        </div>
        <div>
          <FieldLabel>Precio por persona extra ($)</FieldLabel>
          <input type="number" min={0} value={cabin.extra_person_price}
            onChange={e => onChange({ extra_person_price: e.target.value })} className={INP} />
          <p className="mt-1 text-[11px] text-[#5a4870]">Cobro adicional por persona sobre la capacidad</p>
        </div>
      </div>

      {/* Tinaja */}
      <div className="flex flex-wrap items-end gap-3">
        <div className="flex items-center justify-between gap-3 rounded-lg border border-[#2a1e38] bg-[#080610] px-3 py-2.5 flex-1 min-w-[200px]">
          <label className="text-sm text-[#c8b8e0]">¿Tiene tinaja?</label>
          <button type="button" role="switch" aria-checked={cabin.has_tinaja}
            onClick={() => onChange({ has_tinaja: !cabin.has_tinaja })}
            className={`relative h-7 w-12 shrink-0 rounded-full transition-colors ${cabin.has_tinaja ? "bg-[#7a5a98]" : "bg-[#2a1e38]"}`}>
            <span className={`absolute top-1 left-1 h-5 w-5 rounded-full bg-white shadow transition-transform ${cabin.has_tinaja ? "translate-x-5" : "translate-x-0"}`} />
          </button>
        </div>
        {cabin.has_tinaja && (
          <div className="flex-1 min-w-[140px]">
            <FieldLabel>Precio tinaja/día ($)</FieldLabel>
            <input type="number" min={0} step={1000} value={cabin.tinaja_price}
              onChange={e => onChange({ tinaja_price: e.target.value })} className={INP} />
          </div>
        )}
      </div>

      {/* Descripción */}
      <div>
        <FieldLabel>Descripción</FieldLabel>
        <textarea value={cabin.description} onChange={e => onChange({ description: e.target.value })}
          rows={2} placeholder="Describe la cabaña, sus características, vistas, etc."
          className={INP + " resize-y"} />
      </div>

      {/* Amenidades */}
      <div>
        <FieldLabel>Amenidades (una por línea)</FieldLabel>
        <textarea value={cabin.amenities} onChange={e => onChange({ amenities: e.target.value })}
          rows={3} placeholder={"Agua caliente\nVista al lago\nCama king"}
          className={INP + " resize-y"} />
      </div>

      {/* Extras con precio */}
      <div>
        <FieldLabel>Extras con precio (opcional)</FieldLabel>
        <div className="space-y-1 mb-2">
          {cabin.extras.map((ex, i) => (
            <div key={i} className="flex items-center gap-2 rounded-lg border border-[#2a1e38] bg-[#080610] px-3 py-1.5">
              <span className="flex-1 text-sm text-[#c8b8e0]">{ex.name}</span>
              <span className="text-sm text-[#c8b878]">${Number(ex.price).toLocaleString("es-CL")}</span>
              <button type="button" onClick={() => onChange({ extras: cabin.extras.filter((_, j) => j !== i) })}
                className="text-red-400/90 text-base leading-none px-1">×</button>
            </div>
          ))}
        </div>
        <div className="flex gap-2">
          <input value={newExtraName} onChange={e => setNewExtraName(e.target.value)} placeholder="Nombre" className={INP + " flex-[2]"} />
          <input type="number" value={newExtraPrice} onChange={e => setNewExtraPrice(e.target.value)} placeholder="Precio" className={INP + " flex-1"} />
          <button type="button"
            className="rounded-lg bg-[#7a5a98] px-3 py-2 text-xs font-semibold text-white shrink-0"
            onClick={() => {
              if (!newExtraName.trim()) return
              onChange({ extras: [...cabin.extras, { name: newExtraName.trim(), price: newExtraPrice }] })
              setNewExtraName(""); setNewExtraPrice("")
            }}>+ Agregar</button>
        </div>
      </div>

      {/* Pricing tiers */}
      <div>
        <FieldLabel>Precios por ocupación (opcional)</FieldLabel>
        <p className="mb-2 text-[11px] text-[#5a4870]">Si el precio varía según cuántas personas van, configúralo aquí.</p>
        <div className="space-y-1 mb-2">
          {cabin.pricing_tiers.map((tier, i) => (
            <div key={i} className="flex items-center gap-2 rounded-lg border border-[#2a1e38] bg-[#080610] px-3 py-1.5 text-sm text-[#c8b8e0]">
              <span className="flex-1">{tier.min_guests}–{tier.max_guests} pax → ${Number(tier.price_per_night).toLocaleString("es-CL")}/noche</span>
              <button type="button" onClick={() => onChange({ pricing_tiers: cabin.pricing_tiers.filter((_, j) => j !== i) })}
                className="text-red-400/90 text-base leading-none px-1">×</button>
            </div>
          ))}
        </div>
        <div className="flex gap-2">
          <div className="flex-1">
            <div className="text-[10px] text-[#5a4870] mb-1">Desde</div>
            <input type="number" value={newTierMin} onChange={e => setNewTierMin(e.target.value)} placeholder="1" className={INP} />
          </div>
          <div className="flex-1">
            <div className="text-[10px] text-[#5a4870] mb-1">Hasta</div>
            <input type="number" value={newTierMax} onChange={e => setNewTierMax(e.target.value)} placeholder="4" className={INP} />
          </div>
          <div className="flex-[2]">
            <div className="text-[10px] text-[#5a4870] mb-1">$/noche</div>
            <input type="number" value={newTierPrice} onChange={e => setNewTierPrice(e.target.value)} placeholder="0" className={INP} />
          </div>
          <div className="flex items-end">
            <button type="button"
              className="rounded-lg bg-[#7a5a98] px-3 py-2 text-xs font-semibold text-white"
              onClick={() => {
                if (!newTierMin || !newTierMax || !newTierPrice) return
                onChange({ pricing_tiers: [...cabin.pricing_tiers, { min_guests: newTierMin, max_guests: newTierMax, price_per_night: newTierPrice }] })
                setNewTierMin(""); setNewTierMax(""); setNewTierPrice("")
              }}>+</button>
          </div>
        </div>
      </div>

      {/* Season prices */}
      <div>
        <FieldLabel>Precios por temporada (opcional)</FieldLabel>
        <p className="mb-2 text-[11px] text-[#5a4870]">Define precios específicos para temporadas. Tienen prioridad sobre el precio base.</p>
        <div className="space-y-1 mb-2">
          {cabin.season_prices.map((sp, i) => (
            <div key={i} className="flex items-center gap-2 rounded-lg border border-[#2a1e38] bg-[#080610] px-3 py-1.5 text-sm text-[#c8b8e0]">
              <span className="flex-1">{sp.name} ({sp.start_date} → {sp.end_date}) → ${Number(sp.price_per_night).toLocaleString("es-CL")}/noche</span>
              <button type="button" onClick={() => onChange({ season_prices: cabin.season_prices.filter((_, j) => j !== i) })}
                className="text-red-400/90 text-base leading-none px-1">×</button>
            </div>
          ))}
        </div>
        <div className="grid gap-2 sm:grid-cols-2">
          <div>
            <div className="text-[10px] text-[#5a4870] mb-1">Nombre de la temporada</div>
            <input value={newSeasonName} onChange={e => setNewSeasonName(e.target.value)} placeholder="Ej: Temporada alta" className={INP} />
          </div>
          <div>
            <div className="text-[10px] text-[#5a4870] mb-1">Precio/noche ($)</div>
            <input type="number" value={newSeasonPrice} onChange={e => setNewSeasonPrice(e.target.value)} placeholder="0" className={INP} />
          </div>
          <div>
            <div className="text-[10px] text-[#5a4870] mb-1">Fecha inicio</div>
            <input type="date" value={newSeasonStart} onChange={e => setNewSeasonStart(e.target.value)} className={INP} />
          </div>
          <div className="flex gap-2 items-end">
            <div className="flex-1">
              <div className="text-[10px] text-[#5a4870] mb-1">Fecha fin</div>
              <input type="date" value={newSeasonEnd} onChange={e => setNewSeasonEnd(e.target.value)} className={INP} />
            </div>
            <button type="button"
              className="rounded-lg bg-[#7a5a98] px-3 py-2 text-xs font-semibold text-white shrink-0"
              onClick={() => {
                if (!newSeasonName.trim() || !newSeasonStart || !newSeasonEnd || !newSeasonPrice) return
                onChange({ season_prices: [...cabin.season_prices, { name: newSeasonName.trim(), start_date: newSeasonStart, end_date: newSeasonEnd, price_per_night: newSeasonPrice }] })
                setNewSeasonName(""); setNewSeasonStart(""); setNewSeasonEnd(""); setNewSeasonPrice("")
              }}>+ Agregar</button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function NewClientOnboarding({ adminToken, onClose, onCreated }: Props) {
  const [phase, setPhase] = useState<"form" | "success">("form")
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<OnboardResult | null>(null)
  const [copiedPanel, setCopiedPanel] = useState(false)
  const [copiedPublic, setCopiedPublic] = useState(false)
  const [copiedEmbed, setCopiedEmbed] = useState(false)
  const [copiedIframe, setCopiedIframe] = useState(false)

  const [tenant, setTenant] = useState<TenantFormState>(defaultTenantForm)
  const [cabins, setCabins] = useState<CabinRow[]>([defaultCabin()])

  const patchTenant = useCallback((updates: Partial<TenantFormState>) => {
    setTenant(prev => ({ ...prev, ...updates }))
  }, [])

  const copyFeedback = useCallback((setter: (v: boolean) => void) => {
    setter(true)
    window.setTimeout(() => setter(false), 2000)
  }, [])

  const updateCabin = (index: number, updates: Partial<CabinRow>) => {
    setCabins(rows => rows.map((row, i) => i === index ? { ...row, ...updates } : row))
  }

  const validate = (): string | null => {
    if (tenant.business_name.trim().length < 2) return "Indica el nombre del negocio (mín. 2 caracteres)."
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(tenant.email_owner.trim())) return "Email del dueño no válido."
    if (!tenant.bank_name) return "Selecciona un banco."
    if (!tenant.bank_account_type) return "Selecciona el tipo de cuenta."
    if (!tenant.bank_account_number.trim()) return "Indica el número de cuenta."
    if (!tenant.bank_rut.trim()) return "Indica el RUT del titular."
    for (const c of cabins) {
      if (!c.name.trim()) return "Todas las cabañas deben tener nombre."
      if (!Number.isFinite(Number(c.base_price_night)) || Number(c.base_price_night) < 0) return "Precio por noche inválido."
      if (!Number.isFinite(parseInt(c.capacity, 10)) || parseInt(c.capacity, 10) < 1) return "Capacidad inválida (mín. 1)."
    }
    return null
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    const v = validate()
    if (v) { setError(v); return }
    setSaving(true)
    try {
      const payload = tenantFormToPayload(tenant)
      const res = await fetch("/api/admin/onboard", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-admin-token": adminToken },
        body: JSON.stringify({
          ...payload,
          cabins: cabins.map(c => ({
            name: c.name.trim(),
            base_price_night: Number(c.base_price_night),
            capacity: parseInt(c.capacity, 10),
            has_tinaja: c.has_tinaja,
            tinaja_price: Number(c.tinaja_price) || 0,
            extra_person_price: Number(c.extra_person_price) || 0,
            cleaning_fee: Number(c.cleaning_fee) || 0,
            description: c.description.trim() || null,
            amenities: c.amenities.trim() || null,
            extras: c.extras.map(ex => ({ name: ex.name, price: Number(ex.price) || 0 })),
            pricing_tiers: c.pricing_tiers.map(t => ({
              min_guests: Number(t.min_guests),
              max_guests: Number(t.max_guests),
              price_per_night: Number(t.price_per_night),
            })),
            season_prices: c.season_prices.map(sp => ({
              name: sp.name,
              start_md: sp.start_date.slice(5),
              end_md: sp.end_date.slice(5),
              price_per_night: Number(sp.price_per_night),
            })),
          })),
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(typeof data.error === "string" ? data.error : "Error al crear el cliente.")
        setSaving(false)
        return
      }
      setResult(data as OnboardResult)
      onCreated(data as OnboardResult)
      setPhase("success")
    } catch {
      setError("No se pudo conectar con el servidor.")
    }
    setSaving(false)
  }

  const resetForm = () => {
    setPhase("form")
    setResult(null)
    setTenant(defaultTenantForm())
    setCabins([defaultCabin()])
    setError(null)
  }

  const slug = result?.slug ?? ""
  const token = result?.token ?? ""
  const biz = result?.business_name ?? ""
  const panelUrl = `${PANEL_BASE}/?token=${encodeURIComponent(token)}`
  const publicUrl = slug ? `${RESERVAS_BASE}/${slug}` : ""
  const embedUrl = slug ? `${RESERVAS_BASE}/embed/${slug}/calendario` : ""
  const iframeCode = `<iframe src="${embedUrl}" width="100%" height="500" frameborder="0" title="Calendario ${slug}"></iframe>`

  const copy = async (text: string, feedback: (v: boolean) => void) => {
    try { await navigator.clipboard.writeText(text); copyFeedback(feedback) } catch { /* ignore */ }
  }

  return (
    <div
      className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/60 p-4"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-[#2a1e38] bg-[#0d0918] shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-[#2a1e38] bg-[#0d0918]/95 px-5 py-4 backdrop-blur-sm">
          <h2 className="font-serif text-xl text-[#e8d5a3]">
            {phase === "form" ? "Nuevo cliente" : "Cliente creado"}
          </h2>
          <button type="button" onClick={onClose}
            className="rounded-lg p-2 text-[#5a4870] transition hover:bg-[#1a1428] hover:text-[#c8b8e0]" aria-label="Cerrar">
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        {phase === "success" && result ? (
          <div className="space-y-5 p-6">
            <div className="rounded-xl border border-emerald-900/50 bg-emerald-950/30 px-4 py-3 text-sm text-emerald-100/95">
              <p className="font-semibold text-emerald-200">¡Cliente registrado correctamente!</p>
              <p className="mt-1 text-emerald-100/80">Negocio: <span className="font-medium text-white">{biz}</span></p>
            </div>
            <p className="rounded-lg border border-amber-900/40 bg-amber-950/40 px-4 py-3 text-sm text-amber-100/90">
              Guarda el link del panel ahora. El token solo se muestra una vez.
            </p>
            <div className="space-y-4">
              {[
                { label: "Link del panel del dueño", url: panelUrl, copied: copiedPanel, setter: setCopiedPanel },
                { label: "Página pública", url: publicUrl, copied: copiedPublic, setter: setCopiedPublic },
                { label: "Calendario embebible (URL)", url: embedUrl, copied: copiedEmbed, setter: setCopiedEmbed },
              ].map(({ label, url, copied, setter }) => (
                <div key={label}>
                  <FieldLabel>{label}</FieldLabel>
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-stretch">
                    <div className="min-w-0 flex-1 break-all rounded-lg border border-[#2a1e38] bg-[#080610] px-3 py-2 font-mono text-[11px] text-[#c8b8e0]">{url}</div>
                    <button type="button" onClick={() => copy(url, setter)}
                      className="shrink-0 rounded-lg border border-[#7a5a98]/50 bg-[#1a1428] px-4 py-2 text-xs font-semibold text-[#c8b878] transition hover:bg-[#241a32]">
                      {copied ? "¡Copiado!" : "Copiar"}
                    </button>
                  </div>
                </div>
              ))}
              <div>
                <FieldLabel>Código iframe</FieldLabel>
                <pre className="mb-2 max-h-32 overflow-auto rounded-lg border border-[#2a1e38] bg-[#080610] p-3 text-[11px] leading-relaxed text-[#a898c8]">{iframeCode}</pre>
                <button type="button" onClick={() => copy(iframeCode, setCopiedIframe)}
                  className="rounded-lg border border-[#7a5a98]/50 bg-[#1a1428] px-4 py-2 text-xs font-semibold text-[#c8b878] transition hover:bg-[#241a32]">
                  {copiedIframe ? "¡Copiado!" : "Copiar código"}
                </button>
              </div>
            </div>
            <div className="flex flex-wrap gap-3 pt-2">
              <button type="button" onClick={resetForm}
                className="rounded-xl bg-[#7a5a98] px-5 py-3 text-sm font-semibold text-white transition hover:opacity-90">
                Crear otro cliente
              </button>
              <button type="button" onClick={onClose}
                className="rounded-xl border border-[#2a1e38] px-5 py-3 text-sm font-medium text-[#5a4870] transition hover:bg-[#1a1428] hover:text-[#c8b8e0]">
                Cerrar
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-8 p-6 pb-8">
            {error && (
              <div className="rounded-lg border border-red-900/50 bg-red-950/40 px-4 py-3 text-sm text-red-200">{error}</div>
            )}

            {/* ── Datos del tenant ── */}
            <TenantFormFields value={tenant} onChange={patchTenant} showMpConfig={false} />

            {/* ── Cabañas ── */}
            <section>
              <h3 className="mb-4 text-[10px] font-semibold uppercase tracking-[0.2em] text-[#7a5a98]">
                Cabañas (mínimo 1)
              </h3>
              <div className="space-y-4">
                {cabins.map((cabin, index) => (
                  <CabinRowForm
                    key={index}
                    index={index}
                    cabin={cabin}
                    canRemove={cabins.length > 1}
                    onChange={updates => updateCabin(index, updates)}
                    onRemove={() => setCabins(c => c.filter((_, i) => i !== index))}
                  />
                ))}
                <button type="button"
                  onClick={() => setCabins(c => [...c, defaultCabin()])}
                  className="w-full rounded-lg border border-dashed border-[#7a5a98]/40 py-3 text-sm font-medium text-[#9a78c8] transition hover:border-[#7a5a98]/70 hover:bg-[#1a1428]/50">
                  + Agregar otra cabaña
                </button>
              </div>
            </section>

            <div className="flex flex-wrap gap-3 border-t border-[#2a1e38] pt-6">
              <button type="submit" disabled={saving}
                className="rounded-xl bg-[#7a5a98] px-6 py-3 text-sm font-bold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50">
                {saving ? "Creando…" : "Crear cliente"}
              </button>
              <button type="button" onClick={onClose}
                className="rounded-xl border border-[#2a1e38] px-6 py-3 text-sm font-medium text-[#5a4870] transition hover:bg-[#1a1428] hover:text-[#c8b8e0]">
                Cancelar
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
