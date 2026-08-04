// lib/cron-auth.ts — Autenticación única de los endpoints de cron.
//
// Existen DOS secretos válidos y equivalentes:
//   CRON_SECRET   — el de siempre; lo usa el cron de Vercel y el orquestador
//                   /api/cron/daily. Está marcado Sensitive en Vercel, así que
//                   no se puede leer para embeberlo en otra parte.
//   PGCRON_SECRET — el de los jobs pg_cron de Supabase (cadencia horaria).
//                   Existe justamente porque el anterior es ilegible.
//
// Cualquiera de los dos autoriza. La comparación es timing-safe para no filtrar
// el secreto byte a byte ante un atacante que mida tiempos de respuesta.

import crypto from "crypto"

function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a, "utf8")
  const bufB = Buffer.from(b, "utf8")
  // timingSafeEqual exige el mismo largo; comparar los largos primero no filtra
  // nada útil (el largo del secreto no es el secreto).
  if (bufA.length !== bufB.length) return false
  return crypto.timingSafeEqual(bufA, bufB)
}

export function isCronAuthorized(req: Request): boolean {
  const header = req.headers.get("authorization") ?? ""
  const secrets = [process.env.CRON_SECRET, process.env.PGCRON_SECRET].filter(
    (s): s is string => !!s
  )
  if (secrets.length === 0) return false
  return secrets.some((s) => safeEqual(header, `Bearer ${s}`))
}
