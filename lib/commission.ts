// lib/commission.ts — Modelo de comisión de Takai (decisión de Juan, 2026-06-19).
//
// REGLA VIGENTE:
// - Takai cobra 10% sobre TODA reserva generada por Takai:
//   booking_source IN ('directory', 'whatsapp_agent', 'affiliate').
// - Reservas directas (booking_source IN ('owner_direct', 'manual')) → 0%.
// - De ese 10%, hasta 5% puede cederse a un afiliado/influencer (el resto queda
//   para Takai). Por eso el commission_rate de un afiliado se topa en 5%.
// - Los 3 clientes fundadores (el-mirador, cabanas-majoaal-licanray,
//   glamping-cacagual) NO cambian: se mantienen en su modelo comisión heredado
//   hasta que venzan sus plazos (free_until). Su cron de estados de cuenta
//   (generate-commission-statements) NO se toca.

export const TAKAI_COMMISSION_RATE = 10 // % sobre reservas generadas por Takai
export const MAX_AFFILIATE_RATE = 5     // % máximo cedible a un afiliado (sale del 10%)

// Fuentes consideradas "generadas por Takai" (cobran 10%).
export const TAKAI_GENERATED_SOURCES = ["directory", "whatsapp_agent", "affiliate"] as const

export function isTakaiGenerated(source: string | null | undefined): boolean {
  return !!source && (TAKAI_GENERATED_SOURCES as readonly string[]).includes(source)
}

// Normaliza el rate de un afiliado al rango permitido [0, MAX_AFFILIATE_RATE].
export function clampAffiliateRate(rate: number): number {
  if (!Number.isFinite(rate) || rate < 0) return 0
  return Math.min(rate, MAX_AFFILIATE_RATE)
}
