// lib/agent.ts — Agente IA de WhatsApp (Fase 6).
// Provider-agnóstico: usa un endpoint OpenAI-compatible (/chat/completions) vía
// LLM_API_URL + LLM_API_KEY + LLM_MODEL. El plan sugiere un modelo barato
// (Claude Haiku, Gemini Flash, etc.). Si las env vars faltan → agentConfigured()
// = false y el webhook hace handoff al dueño (no rompe nada).
//
// ANTI-ALUCINACIÓN: el modelo NUNCA afirma disponibilidad ni precio sin llamar
// a las herramientas check_availability / get_price, que consultan datos REALES.

import { getSupabaseAdmin } from "@/lib/supabase-server"
import { getPriceForDates } from "@/lib/pricing"

export interface AgentCabin {
  id: string
  name: string
  capacity: number | null
  base_price_night: number | null
  season_prices?: any
  pricing_tiers?: any
  description?: string | null
  amenities?: unknown
}
export interface AgentTenant {
  id: string
  business_name: string
  slug: string | null
  currency: string | null
  min_nights: number | null
  agent_system_prompt?: string | null
}
export interface AgentMsg { role: "user" | "assistant" | "system" | "tool"; content: string; tool_call_id?: string; name?: string; tool_calls?: any[] }

export function agentConfigured(): boolean {
  return !!(process.env.LLM_API_KEY && process.env.LLM_API_URL && process.env.LLM_MODEL)
}

const MAX_OUTPUT_TOKENS = 320
const MAX_TOOL_ROUNDS = 4

const TOOLS = [
  {
    type: "function",
    function: {
      name: "check_availability",
      description: "Verifica si la cabaña está disponible en un rango de fechas. SIEMPRE úsala antes de afirmar disponibilidad.",
      parameters: {
        type: "object",
        properties: {
          check_in: { type: "string", description: "Fecha de entrada YYYY-MM-DD" },
          check_out: { type: "string", description: "Fecha de salida YYYY-MM-DD" },
          guests: { type: "integer", description: "Número de personas" },
        },
        required: ["check_in", "check_out"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_price",
      description: "Calcula el precio real total para un rango de fechas y huéspedes. SIEMPRE úsala antes de dar un monto.",
      parameters: {
        type: "object",
        properties: {
          check_in: { type: "string", description: "Fecha de entrada YYYY-MM-DD" },
          check_out: { type: "string", description: "Fecha de salida YYYY-MM-DD" },
          guests: { type: "integer", description: "Número de personas" },
        },
        required: ["check_in", "check_out", "guests"],
      },
    },
  },
]

function isoDate(s: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(s)
}

// ── Tool executor: disponibilidad real (bookings + calendar_blocks) ──────────
async function toolCheckAvailability(cabin: AgentCabin, args: any): Promise<string> {
  const { check_in, check_out } = args
  if (!isoDate(check_in) || !isoDate(check_out) || check_in >= check_out) {
    return JSON.stringify({ available: false, error: "fechas inválidas" })
  }
  const supabase = getSupabaseAdmin()
  // Solapamiento: existe reserva activa o bloqueo que cruza el rango
  const { data: bookings } = await supabase
    .from("bookings")
    .select("id")
    .eq("cabin_id", cabin.id)
    .is("deleted_at", null)
    .in("status", ["draft", "confirmed"])
    .lt("check_in", check_out)
    .gt("check_out", check_in)
    .limit(1)
  const { data: blocks } = await supabase
    .from("calendar_blocks")
    .select("id")
    .eq("cabin_id", cabin.id)
    .lt("start_date", check_out)
    .gt("end_date", check_in)
    .limit(1)
  const available = (bookings?.length ?? 0) === 0 && (blocks?.length ?? 0) === 0
  return JSON.stringify({ available, check_in, check_out })
}

// ── Tool executor: precio real (season-aware) ───────────────────────────────
async function toolGetPrice(cabin: AgentCabin, tenant: AgentTenant, args: any): Promise<string> {
  const { check_in, check_out, guests } = args
  if (!isoDate(check_in) || !isoDate(check_out) || check_in >= check_out) {
    return JSON.stringify({ error: "fechas inválidas" })
  }
  const g = parseInt(guests) || cabin.capacity || 2
  try {
    const res = getPriceForDates({
      cabin: {
        base_price_night: Number(cabin.base_price_night) || 0,
        season_prices: cabin.season_prices,
        pricing_tiers: cabin.pricing_tiers,
      },
      checkIn: check_in,
      checkOut: check_out,
      guests: g,
      tenantMinNights: Number(tenant.min_nights) || 1,
    })
    const nights = Math.round(
      (new Date(check_out + "T12:00:00").getTime() - new Date(check_in + "T12:00:00").getTime()) / 86400000
    )
    return JSON.stringify({
      total: res.total,
      nights,
      currency: tenant.currency || "CLP",
      min_nights_required: res.min_nights_required,
      guests: g,
    })
  } catch (e: any) {
    return JSON.stringify({ error: "no se pudo calcular el precio" })
  }
}

function defaultPersona(tenant: AgentTenant, cabin: AgentCabin, bookingLink: string): string {
  const amenities = Array.isArray(cabin.amenities)
    ? cabin.amenities.map((a: any) => (typeof a === "string" ? a : a?.name)).filter(Boolean).join(", ")
    : ""
  return [
    `Eres el asistente de reservas de "${tenant.business_name}" en Chile. Atiendes por WhatsApp a turistas interesados en la cabaña "${cabin.name}".`,
    cabin.description ? `Descripción: ${cabin.description}` : "",
    cabin.capacity ? `Capacidad máxima: ${cabin.capacity} personas.` : "",
    amenities ? `Comodidades: ${amenities}.` : "",
    `Hablas español chileno, cálido y breve. Tu objetivo es ayudar a cerrar la reserva.`,
    `REGLAS DURAS: NUNCA inventes disponibilidad ni precios. SIEMPRE llama a check_availability antes de afirmar que hay cupo, y a get_price antes de dar un monto. Si no puedes confirmar con las herramientas, dilo con honestidad.`,
    `Cuando haya disponibilidad y el turista quiera avanzar, comparte este link de reserva: ${bookingLink}`,
    `Si el turista pide hablar con una persona o necesita algo que no puedes resolver, dile que un encargado lo contactará.`,
  ].filter(Boolean).join("\n")
}

async function llmCall(messages: any[]): Promise<any> {
  const ctrl = new AbortController()
  const timeout = setTimeout(() => ctrl.abort(), 20000)
  try {
    const res = await fetch(process.env.LLM_API_URL!, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.LLM_API_KEY}`,
      },
      body: JSON.stringify({
        model: process.env.LLM_MODEL,
        messages,
        tools: TOOLS,
        max_tokens: MAX_OUTPUT_TOKENS,
        temperature: 0.4,
      }),
      signal: ctrl.signal,
    })
    if (!res.ok) return null
    return await res.json()
  } catch {
    return null
  } finally {
    clearTimeout(timeout)
  }
}

// Devuelve { reply, handoff }. handoff=true → el webhook avisa al dueño.
export async function runAgent(opts: {
  tenant: AgentTenant
  cabin: AgentCabin
  history: AgentMsg[]
  userMessage: string
  appBase: string
}): Promise<{ reply: string; handoff: boolean } | null> {
  if (!agentConfigured()) return null

  const bookingLink = `${opts.appBase}/${opts.tenant.slug || ""}?source=whatsapp_agent`
  const system = opts.tenant.agent_system_prompt
    ? `${opts.tenant.agent_system_prompt}\nLink de reserva: ${bookingLink}\nNUNCA inventes disponibilidad ni precios: usa las herramientas.`
    : defaultPersona(opts.tenant, opts.cabin, bookingLink)

  const messages: any[] = [
    { role: "system", content: system },
    ...opts.history.slice(-10).map((m) => ({ role: m.role, content: m.content })),
    { role: "user", content: opts.userMessage },
  ]

  for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
    const data = await llmCall(messages)
    if (!data?.choices?.[0]) return null // fallo del LLM → handoff arriba

    const msg = data.choices[0].message
    const toolCalls = msg.tool_calls

    if (toolCalls && toolCalls.length > 0) {
      messages.push({ role: "assistant", content: msg.content ?? "", tool_calls: toolCalls })
      for (const tc of toolCalls) {
        let args: any = {}
        try { args = JSON.parse(tc.function.arguments || "{}") } catch { args = {} }
        let result = "{}"
        if (tc.function.name === "check_availability") result = await toolCheckAvailability(opts.cabin, args)
        else if (tc.function.name === "get_price") result = await toolGetPrice(opts.cabin, opts.tenant, args)
        messages.push({ role: "tool", tool_call_id: tc.id, name: tc.function.name, content: result })
      }
      continue // dejar que el modelo redacte la respuesta con los datos reales
    }

    const reply = (msg.content || "").trim()
    if (!reply) return null
    const handoff = /\b(humano|persona|encargado|llamar|hablar con)\b/i.test(opts.userMessage)
    return { reply, handoff }
  }

  // Demasiadas rondas de tools → handoff
  return null
}
