// lib/referral.ts — Comisión por traer un ALOJAMIENTO a Takai.
// (Decisión de Juan 2026-08-04. La comisión por traer TURISTAS es otra cosa:
// 5% por reserva, vive en lib/commission.ts y en affiliates.commission_rate.)
//
// REGLA DE NEGOCIO — leer antes de tocar:
// Traer un alojamiento se paga UNA SOLA VEZ, cuando el alojamiento queda
// activo. Ahí termina la relación del partner con ese centro: si después ese
// centro recibe reservas por el directorio o el agente, el 10% es íntegro de
// Takai. El partner solo vuelve a ganar si ÉL trae al turista por su link.
// Por eso la atribución de reservas mira `?ref=` y NUNCA
// `tenants.referred_by_affiliate_id`.

export type TramoReferido = {
  min: number
  max: number | null // null = sin tope
  amount: number | null // null = a convenir (lo escribe Juan a mano)
  label: string
}

// Tramos por cantidad de cabañas/unidades del centro.
export const TRAMOS_REFERIDO: TramoReferido[] = [
  { min: 1, max: 5, amount: 30000, label: "1 a 5 alojamientos" },
  { min: 6, max: 10, amount: 50000, label: "6 a 10 alojamientos" },
  { min: 11, max: null, amount: null, label: "Más de 10 alojamientos" },
]

/** Monto mínimo publicable ("desde $X") — se deriva de los tramos, no se repite a mano. */
export const REFERIDO_DESDE = Math.min(
  ...TRAMOS_REFERIDO.map((t) => t.amount).filter((a): a is number => a !== null)
)

export type CalculoReferido = {
  amount: number | null // null → a convenir
  label: string
  aConvenir: boolean
}

/**
 * Calcula lo que le corresponde al partner por un centro, según cuántas
 * cabañas tenga. Un centro de más de 10 devuelve `aConvenir: true` y monto
 * null: el sistema no inventa la cifra, la escribe Juan en el panel.
 */
export function calcularComisionReferido(cabinsCount: number): CalculoReferido {
  const n = Number.isFinite(cabinsCount) ? Math.max(0, Math.floor(cabinsCount)) : 0
  const tramo = TRAMOS_REFERIDO.find((t) => n >= t.min && (t.max === null || n <= t.max))
  if (!tramo) {
    // Centro sin cabañas cargadas todavía: no se puede calcular aún.
    return { amount: null, label: "Sin cabañas cargadas", aConvenir: true }
  }
  return { amount: tramo.amount, label: tramo.label, aConvenir: tramo.amount === null }
}
