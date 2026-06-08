"use client"

import { useState } from "react"

const BANKS = [
  "BancoEstado", "Banco de Chile", "Santander", "BCI", "Scotiabank", "Itaú", "Falabella",
] as const

const ACCOUNT_TYPES = ["Cuenta RUT", "Cuenta Vista", "Cuenta Corriente"] as const

const COUNTRY_CURRENCY: Record<string, string> = {
  CL: "CLP", EC: "USD", CO: "COP", PE: "PEN", AR: "ARS", MX: "MXN",
}

export type TenantFormState = {
  business_name: string
  owner_name: string
  owner_whatsapp: string
  email_owner: string
  email_owner_2: string
  gender: "female" | "male"
  country: string
  currency: string
  deposit_percent: string
  min_nights: string
  has_tinaja: boolean
  tinaja_price: string
  whatsapp_enabled: boolean
  bank_name: string
  bank_account_type: string
  bank_account_number: string
  bank_account_holder: string
  bank_rut: string
  tagline: string
  template: string
  location_text: string
  location_maps_url: string
  instagram_url: string
  facebook_url: string
  latitude: string
  longitude: string
  activities: Array<{ icon: string; name: string }>
  extra_services: Array<{ name: string; price: number }>
  cancellation_policy: string
  page_rules: string[]
  checkin_time: string
  checkout_time: string
  mp_access_token: string
  mp_enabled: boolean
}

export function defaultTenantForm(): TenantFormState {
  return {
    business_name: "", owner_name: "", owner_whatsapp: "",
    email_owner: "", email_owner_2: "", gender: "female",
    country: "CL", currency: "CLP", deposit_percent: "20", min_nights: "2",
    has_tinaja: false, tinaja_price: "0", whatsapp_enabled: true,
    bank_name: "", bank_account_type: "", bank_account_number: "",
    bank_account_holder: "", bank_rut: "",
    tagline: "", template: "clasico",
    location_text: "", location_maps_url: "",
    instagram_url: "", facebook_url: "", latitude: "", longitude: "",
    activities: [], extra_services: [],
    cancellation_policy: "", page_rules: [],
    checkin_time: "", checkout_time: "",
    mp_access_token: "", mp_enabled: false,
  }
}

export function tenantFormFromData(d: Record<string, unknown>): TenantFormState {
  const rules = Array.isArray(d.page_rules) ? d.page_rules : []
  const cancellation_policy = rules.find(
    (r: unknown): r is { type: string; text: string } =>
      typeof r === "object" && r !== null && (r as Record<string, unknown>).type === "cancellation"
  )?.text ?? ""
  const page_rules = rules.filter((r: unknown) => typeof r === "string") as string[]
  const gb = (d.guidebook && typeof d.guidebook === "object" && !Array.isArray(d.guidebook))
    ? (d.guidebook as Record<string, unknown>)
    : {}
  return {
    business_name: String(d.business_name ?? ""),
    owner_name: String(d.owner_name ?? ""),
    owner_whatsapp: String(d.owner_whatsapp ?? ""),
    email_owner: String(d.email_owner ?? ""),
    email_owner_2: String(d.email_owner_2 ?? ""),
    gender: (d.gender === "male" ? "male" : "female") as "female" | "male",
    country: String(d.country ?? "CL"),
    currency: String(d.currency ?? "CLP"),
    deposit_percent: String(d.deposit_percent ?? "20"),
    min_nights: String(d.min_nights ?? "2"),
    has_tinaja: Boolean(d.has_tinaja),
    tinaja_price: String(d.tinaja_price ?? "0"),
    whatsapp_enabled: d.whatsapp_enabled !== false,
    bank_name: String(d.bank_name ?? ""),
    bank_account_type: String(d.bank_account_type ?? ""),
    bank_account_number: String(d.bank_account_number ?? ""),
    bank_account_holder: String(d.bank_account_holder ?? ""),
    bank_rut: String(d.bank_rut ?? ""),
    tagline: String(d.tagline ?? ""),
    template: String(d.template ?? "clasico"),
    location_text: String(d.location_text ?? ""),
    location_maps_url: String(d.location_maps_url ?? ""),
    instagram_url: String(d.instagram_url ?? ""),
    facebook_url: String(d.facebook_url ?? ""),
    latitude: d.latitude != null ? String(d.latitude) : "",
    longitude: d.longitude != null ? String(d.longitude) : "",
    activities: Array.isArray(d.activities) ? d.activities as Array<{ icon: string; name: string }> : [],
    extra_services: Array.isArray(d.extra_services) ? d.extra_services as Array<{ name: string; price: number }> : [],
    cancellation_policy,
    page_rules,
    checkin_time: String(gb.checkin_time ?? ""),
    checkout_time: String(gb.checkout_time ?? ""),
    mp_access_token: String(d.mp_access_token ?? ""),
    mp_enabled: Boolean(d.mp_enabled),
  }
}

export function tenantFormToPayload(f: TenantFormState): Record<string, unknown> {
  const page_rules: unknown[] = [
    ...(f.cancellation_policy.trim() ? [{ type: "cancellation", text: f.cancellation_policy.trim() }] : []),
    ...f.page_rules,
  ]
  return {
    business_name: f.business_name.trim(),
    owner_name: f.owner_name.trim(),
    owner_whatsapp: f.owner_whatsapp.trim() || null,
    email_owner: f.email_owner.trim(),
    email_owner_2: f.email_owner_2.trim() || null,
    gender: f.gender,
    country: f.country,
    currency: f.currency,
    deposit_percent: parseInt(f.deposit_percent, 10) || 20,
    min_nights: parseInt(f.min_nights, 10) || 2,
    has_tinaja: f.has_tinaja,
    tinaja_price: Number(f.tinaja_price) || 0,
    whatsapp_enabled: f.whatsapp_enabled,
    bank_name: f.bank_name.trim(),
    bank_account_type: f.bank_account_type.trim(),
    bank_account_number: f.bank_account_number.trim(),
    bank_account_holder: f.bank_account_holder.trim() || null,
    bank_rut: f.bank_rut.trim(),
    tagline: f.tagline.trim() || null,
    template: f.template || "clasico",
    location_text: f.location_text.trim() || null,
    location_maps_url: f.location_maps_url.trim() || null,
    instagram_url: f.instagram_url.trim() || null,
    facebook_url: f.facebook_url.trim() || null,
    latitude: f.latitude.trim() ? Number(f.latitude) : null,
    longitude: f.longitude.trim() ? Number(f.longitude) : null,
    activities: f.activities,
    extra_services: f.extra_services,
    page_rules,
    guidebook_patch: {
      checkin_time: f.checkin_time.trim() || null,
      checkout_time: f.checkout_time.trim() || null,
    },
  }
}

const CLS = {
  inp: "w-full rounded-lg border border-[#2a1e38] bg-[#080610] px-3 py-2.5 text-sm text-[#c8b8e0] outline-none focus:border-[#7a5a98]/60 focus:ring-2 focus:ring-[#7a5a98]/30",
  label: "mb-1.5 block text-[11px] font-medium uppercase tracking-wide text-[#5a4870]",
  section: "mb-4 text-[10px] font-semibold uppercase tracking-[0.2em] text-[#7a5a98]",
  listItem: "flex items-center gap-2 rounded-lg border border-[#2a1e38] bg-[#080610] px-3 py-2",
  addBtn: "rounded-lg bg-[#7a5a98] px-3 py-2 text-xs font-semibold text-white shrink-0",
}

function Lbl({ children, required }: { children: React.ReactNode; required?: boolean }) {
  return (
    <label className={CLS.label}>
      {children}
      {required && <span className="text-red-400/90"> *</span>}
    </label>
  )
}

function Tog({
  checked, onChange, label, id,
}: { checked: boolean; onChange: (v: boolean) => void; label: string; id: string }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-[#2a1e38] bg-[#080610] px-3 py-2.5">
      <label htmlFor={id} className="text-sm text-[#c8b8e0]">{label}</label>
      <button
        type="button" id={id} role="switch" aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={"relative h-7 w-12 shrink-0 rounded-full transition-colors " + (checked ? "bg-[#7a5a98]" : "bg-[#2a1e38]")}
      >
        <span className={"absolute top-1 left-1 h-5 w-5 rounded-full bg-white shadow transition-transform " + (checked ? "translate-x-5" : "translate-x-0")} />
      </button>
    </div>
  )
}

export default function TenantFormFields({
  value,
  onChange,
  showMpConfig = false,
  onSaveMp,
  saving = false,
}: {
  value: TenantFormState
  onChange: (updates: Partial<TenantFormState>) => void
  showMpConfig?: boolean
  onSaveMp?: () => void
  saving?: boolean
}) {
  const set = (k: keyof TenantFormState) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
      onChange({ [k]: e.target.value })

  const [newActIcon, setNewActIcon] = useState("")
  const [newActName, setNewActName] = useState("")
  const [newSvcName, setNewSvcName] = useState("")
  const [newSvcPrice, setNewSvcPrice] = useState("")
  const [newRule, setNewRule] = useState("")

  return (
    <div className="space-y-8">

      {/* ── Identidad ── */}
      <section>
        <h3 className={CLS.section}>Identidad del negocio</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Lbl required>Nombre del negocio</Lbl>
            <input value={value.business_name} onChange={set("business_name")} required className={CLS.inp} />
          </div>
          <div>
            <Lbl>Nombre del propietario/a</Lbl>
            <input value={value.owner_name} onChange={set("owner_name")} placeholder="Ej: María González" className={CLS.inp} />
          </div>
          <div>
            <Lbl required>Género del dueño/a</Lbl>
            <select value={value.gender} onChange={e => onChange({ gender: e.target.value as "female" | "male" })} className={CLS.inp}>
              <option value="female">Femenino (Estimada)</option>
              <option value="male">Masculino (Estimado)</option>
            </select>
          </div>
          <div className="sm:col-span-2">
            <Lbl>Frase del hero (tagline)</Lbl>
            <input value={value.tagline} onChange={set("tagline")} placeholder="Ej: Naturaleza, silencio y tú." className={CLS.inp} />
          </div>
          <div className="sm:col-span-2">
            <Lbl>Plantilla visual</Lbl>
            <select value={value.template} onChange={set("template")} className={CLS.inp}>
              <option value="clasico">Clásico (actual)</option>
              <option value="moderno">Moderno</option>
              <option value="rural">Rural / Naturaleza</option>
            </select>
          </div>
        </div>
      </section>

      {/* ── Contacto ── */}
      <section>
        <h3 className={CLS.section}>Contacto y notificaciones</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Lbl required>Email principal del dueño</Lbl>
            <input type="email" required value={value.email_owner} onChange={set("email_owner")} className={CLS.inp} />
          </div>
          <div className="sm:col-span-2">
            <Lbl>Email adicional para notificaciones</Lbl>
            <input type="email" value={value.email_owner_2} onChange={set("email_owner_2")} className={CLS.inp} />
            <p className="mt-1 text-[11px] text-[#5a4870]">Ambos emails recibirán notificaciones de nuevas reservas</p>
          </div>
          <div className="sm:col-span-2">
            <Lbl>Teléfono WhatsApp del dueño</Lbl>
            <input value={value.owner_whatsapp} onChange={set("owner_whatsapp")} placeholder="+56 9 ..." className={CLS.inp} />
          </div>
          <div className="sm:col-span-2">
            <Tog id="wa-enabled" checked={value.whatsapp_enabled} onChange={v => onChange({ whatsapp_enabled: v })} label="Notificaciones WhatsApp habilitadas" />
          </div>
          <div className="sm:col-span-2">
            <Lbl>Instagram URL</Lbl>
            <input value={value.instagram_url} onChange={set("instagram_url")} placeholder="https://instagram.com/..." className={CLS.inp} />
          </div>
          <div className="sm:col-span-2">
            <Lbl>Facebook URL</Lbl>
            <input value={value.facebook_url} onChange={set("facebook_url")} placeholder="https://facebook.com/..." className={CLS.inp} />
          </div>
        </div>
      </section>

      {/* ── País y moneda ── */}
      <section>
        <h3 className={CLS.section}>País y moneda</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Lbl>País</Lbl>
            <select value={value.country} onChange={e => {
              const c = e.target.value
              onChange({ country: c, currency: COUNTRY_CURRENCY[c] ?? "CLP" })
            }} className={CLS.inp}>
              <option value="CL">Chile — CLP ($)</option>
              <option value="EC">Ecuador — USD ($)</option>
              <option value="CO">Colombia — COP ($)</option>
              <option value="PE">Perú — PEN (S/)</option>
              <option value="AR">Argentina — ARS ($)</option>
              <option value="MX">México — MXN ($)</option>
            </select>
          </div>
          <div className="flex items-end">
            <div className="w-full rounded-lg border border-[#2a1e38] bg-[#080610] px-3 py-2.5 text-sm text-[#5a4870]">
              Moneda: <span className="font-semibold text-[#c8b878]">{value.currency}</span>
            </div>
          </div>
        </div>
      </section>

      {/* ── Configuración de reservas ── */}
      <section>
        <h3 className={CLS.section}>Configuración de reservas</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Lbl>Estadía mínima (noches)</Lbl>
            <input type="number" min={1} max={365} value={value.min_nights} onChange={set("min_nights")} className={CLS.inp} />
          </div>
          <div>
            <Lbl>Porcentaje de adelanto (%)</Lbl>
            <input type="number" min={0} max={100} value={value.deposit_percent} onChange={set("deposit_percent")} className={CLS.inp} />
          </div>
          <div>
            <Lbl>Hora de check-in</Lbl>
            <input value={value.checkin_time} onChange={set("checkin_time")} placeholder="ej: 15:00" className={CLS.inp} />
          </div>
          <div>
            <Lbl>Hora de check-out</Lbl>
            <input value={value.checkout_time} onChange={set("checkout_time")} placeholder="ej: 12:00" className={CLS.inp} />
          </div>
          <div className="sm:col-span-2">
            <Tog id="tf-tinaja" checked={value.has_tinaja} onChange={v => onChange({ has_tinaja: v })} label="¿El tenant tiene tinaja?" />
          </div>
          {value.has_tinaja && (
            <div className="sm:col-span-2">
              <Lbl>Precio tinaja por día (nivel tenant — $)</Lbl>
              <input type="number" min={0} step={1000} value={value.tinaja_price} onChange={set("tinaja_price")} className={CLS.inp} />
              <p className="mt-1 text-[11px] text-[#5a4870]">Precio por defecto del tenant; cada cabaña puede tener su propio precio</p>
            </div>
          )}
        </div>
      </section>

      {/* ── Datos bancarios ── */}
      <section>
        <h3 className={CLS.section}>Datos bancarios</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Lbl required>Banco</Lbl>
            <select required value={value.bank_name} onChange={set("bank_name")} className={CLS.inp}>
              <option value="">Selecciona…</option>
              {BANKS.map(b => <option key={b} value={b}>{b}</option>)}
            </select>
          </div>
          <div className="sm:col-span-2">
            <Lbl required>Tipo de cuenta</Lbl>
            <select required value={value.bank_account_type} onChange={set("bank_account_type")} className={CLS.inp}>
              <option value="">Selecciona…</option>
              {ACCOUNT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <Lbl required>Número de cuenta</Lbl>
            <input required value={value.bank_account_number} onChange={set("bank_account_number")} className={CLS.inp} />
          </div>
          <div>
            <Lbl required>RUT del titular</Lbl>
            <input required value={value.bank_rut} onChange={set("bank_rut")} className={CLS.inp} />
          </div>
          <div className="sm:col-span-2">
            <Lbl>Nombre del titular de la cuenta</Lbl>
            <input value={value.bank_account_holder} onChange={set("bank_account_holder")} placeholder="Ej: María González" className={CLS.inp} />
          </div>
        </div>
      </section>

      {/* ── Ubicación ── */}
      <section>
        <h3 className={CLS.section}>Ubicación</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Lbl>Dirección legible</Lbl>
            <input value={value.location_text} onChange={set("location_text")} placeholder="Ej: Cacagual, Pucón · Chile" className={CLS.inp} />
          </div>
          <div className="sm:col-span-2">
            <Lbl>Link Google Maps</Lbl>
            <input value={value.location_maps_url} onChange={set("location_maps_url")} placeholder="https://maps.google.com/..." className={CLS.inp} />
          </div>
          <div>
            <Lbl>Latitud</Lbl>
            <input type="number" step="any" value={value.latitude} onChange={set("latitude")} placeholder="-39.8142" className={CLS.inp} />
          </div>
          <div>
            <Lbl>Longitud</Lbl>
            <input type="number" step="any" value={value.longitude} onChange={set("longitude")} placeholder="-72.2306" className={CLS.inp} />
          </div>
          <p className="sm:col-span-2 text-[11px] text-[#5a4870]">Coordenadas: clic derecho en Google Maps → copiar lat/lng</p>
        </div>
      </section>

      {/* ── Actividades ── */}
      <section>
        <h3 className={CLS.section}>Atractivos cercanos (opcional)</h3>
        <div className="space-y-2">
          {value.activities.map((act, i) => (
            <div key={i} className={CLS.listItem}>
              <span className="text-base">{act.icon}</span>
              <span className="flex-1 text-sm text-[#c8b8e0]">{act.name}</span>
              <button type="button" onClick={() => onChange({ activities: value.activities.filter((_, j) => j !== i) })}
                className="text-red-400/90 hover:text-red-400 text-base leading-none px-1">×</button>
            </div>
          ))}
          <div className="flex gap-2">
            <input value={newActIcon} onChange={e => setNewActIcon(e.target.value)} placeholder="📍"
              className={CLS.inp + " !w-14 text-center"} />
            <input value={newActName} onChange={e => setNewActName(e.target.value)} placeholder="Ej: Lago Calafquén a 500m"
              className={CLS.inp + " flex-1"} onKeyDown={e => {
                if (e.key === "Enter") {
                  e.preventDefault()
                  if (!newActName.trim()) return
                  onChange({ activities: [...value.activities, { icon: newActIcon || "📍", name: newActName.trim() }] })
                  setNewActIcon(""); setNewActName("")
                }
              }} />
            <button type="button" className={CLS.addBtn} onClick={() => {
              if (!newActName.trim()) return
              onChange({ activities: [...value.activities, { icon: newActIcon || "📍", name: newActName.trim() }] })
              setNewActIcon(""); setNewActName("")
            }}>+ Agregar</button>
          </div>
        </div>
      </section>

      {/* ── Servicios extras ── */}
      <section>
        <h3 className={CLS.section}>Servicios extras (opcional)</h3>
        <div className="space-y-2">
          {value.extra_services.map((svc, i) => (
            <div key={i} className={CLS.listItem}>
              <span className="flex-1 text-sm text-[#c8b8e0]">{svc.name}</span>
              <span className="text-sm text-[#c8b878]">${Number(svc.price).toLocaleString("es-CL")}</span>
              <button type="button" onClick={() => onChange({ extra_services: value.extra_services.filter((_, j) => j !== i) })}
                className="text-red-400/90 hover:text-red-400 text-base leading-none px-1">×</button>
            </div>
          ))}
          <div className="flex gap-2">
            <input value={newSvcName} onChange={e => setNewSvcName(e.target.value)} placeholder="Nombre (ej: Leña)"
              className={CLS.inp + " flex-[2]"} />
            <input type="number" value={newSvcPrice} onChange={e => setNewSvcPrice(e.target.value)} placeholder="Precio"
              className={CLS.inp + " flex-1"} />
            <button type="button" className={CLS.addBtn} onClick={() => {
              if (!newSvcName.trim()) return
              onChange({ extra_services: [...value.extra_services, { name: newSvcName.trim(), price: Number(newSvcPrice) || 0 }] })
              setNewSvcName(""); setNewSvcPrice("")
            }}>+ Agregar</button>
          </div>
        </div>
      </section>

      {/* ── Políticas ── */}
      <section>
        <h3 className={CLS.section}>Políticas</h3>
        <div className="space-y-4">
          <div>
            <Lbl>Política de cancelación/devolución</Lbl>
            <textarea value={value.cancellation_policy} onChange={set("cancellation_policy")} rows={3}
              placeholder="Ej: Cancelaciones con más de 7 días: reembolso del 80%. Con menos de 48 hs: sin reembolso."
              className={CLS.inp + " resize-y"} />
          </div>
          <div>
            <Lbl>Normas del lugar</Lbl>
            <div className="space-y-1 mb-2">
              {value.page_rules.map((rule, i) => (
                <div key={i} className={CLS.listItem}>
                  <span className="flex-1 text-sm text-[#c8b8e0]">{rule}</span>
                  <button type="button" onClick={() => onChange({ page_rules: value.page_rules.filter((_, j) => j !== i) })}
                    className="text-red-400/90 hover:text-red-400 text-base leading-none px-1">×</button>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <input value={newRule} onChange={e => setNewRule(e.target.value)} placeholder="Ej: No fumar adentro"
                className={CLS.inp + " flex-1"} onKeyDown={e => {
                  if (e.key === "Enter") {
                    e.preventDefault()
                    if (!newRule.trim()) return
                    onChange({ page_rules: [...value.page_rules, newRule.trim()] })
                    setNewRule("")
                  }
                }} />
              <button type="button" className={CLS.addBtn} onClick={() => {
                if (!newRule.trim()) return
                onChange({ page_rules: [...value.page_rules, newRule.trim()] })
                setNewRule("")
              }}>+ Agregar</button>
            </div>
          </div>
        </div>
      </section>

      {/* ── MercadoPago (solo en edición) ── */}
      {showMpConfig && (
        <section className="border-t border-[#2a1e38] pt-6">
          <h3 className={CLS.section}>MercadoPago</h3>
          <div className="space-y-4">
            <div>
              <Lbl>Access Token</Lbl>
              <input value={value.mp_access_token} onChange={set("mp_access_token")} placeholder="APP_USR-..." className={CLS.inp} />
            </div>
            <div className="flex items-center gap-3">
              <input
                type="checkbox" id="tf-mp-enabled" checked={value.mp_enabled}
                disabled={!value.mp_access_token.trim()}
                onChange={e => onChange({ mp_enabled: e.target.checked })}
                className="h-4 w-4 cursor-pointer"
                style={{ opacity: value.mp_access_token.trim() ? 1 : 0.5 }}
              />
              <label htmlFor="tf-mp-enabled" className="text-sm text-[#c8b8e0]"
                style={{ opacity: value.mp_access_token.trim() ? 1 : 0.5 }}>
                Activar pago con MercadoPago
              </label>
            </div>
            {onSaveMp && (
              <button type="button" onClick={onSaveMp} disabled={saving}
                className="w-full rounded-xl py-2.5 text-sm font-bold text-white disabled:opacity-60"
                style={{ background: "#009ee3" }}>
                {saving ? "Guardando..." : "Guardar configuración MP"}
              </button>
            )}
          </div>
        </section>
      )}
    </div>
  )
}
