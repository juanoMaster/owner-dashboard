// lib/unsubscribe.ts — tokens de desuscripción firmados (HMAC), sin tabla extra.
// El link de baja lleva ?e=<email>&t=<hmac>. Verificamos el HMAC server-side
// antes de insertar en email_opt_out. Secreto: UNSUBSCRIBE_SECRET o CRON_SECRET.
import crypto from "crypto"

function secret(): string {
  return process.env.UNSUBSCRIBE_SECRET || process.env.CRON_SECRET || "takai-fallback"
}

export function unsubToken(email: string): string {
  return crypto.createHmac("sha256", secret()).update(email.trim().toLowerCase()).digest("hex").slice(0, 32)
}

export function verifyUnsub(email: string, token: string): boolean {
  if (!email || !token) return false
  const expected = unsubToken(email)
  try {
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(token))
  } catch {
    return false
  }
}

export function unsubscribeUrl(base: string, email: string): string {
  const e = encodeURIComponent(email.trim().toLowerCase())
  return `${base}/api/email/unsubscribe?e=${e}&t=${unsubToken(email)}`
}
