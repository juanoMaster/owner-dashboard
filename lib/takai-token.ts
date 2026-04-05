/** Clave compartida: localStorage + cookie (la PWA en iOS a veces no ve el mismo localStorage que Safari). */
export const TAKAI_TOKEN_KEY = "takai_token"

const NINETY_DAYS_SEC = 60 * 60 * 24 * 90

function readCookie(name: string): string | null {
  if (typeof document === "undefined") return null
  const pref = name + "="
  const parts = document.cookie.split(";")
  for (let i = 0; i < parts.length; i++) {
    const c = parts[i].trim()
    if (c.startsWith(pref)) {
      const raw = c.slice(pref.length)
      try {
        return decodeURIComponent(raw)
      } catch {
        return raw
      }
    }
  }
  return null
}

function writeCookie(name: string, value: string, maxAgeSec: number) {
  if (typeof document === "undefined") return
  const secure = typeof location !== "undefined" && location.protocol === "https:"
  let line = `${name}=${encodeURIComponent(value)};path=/;max-age=${maxAgeSec};SameSite=Lax`
  if (secure) line += ";Secure"
  document.cookie = line
}

function eraseCookie(name: string) {
  if (typeof document === "undefined") return
  document.cookie = `${name}=;path=/;max-age=0;SameSite=Lax`
}

/** Token guardado en localStorage o, si falta, en cookie (útil al abrir la PWA desde el icono). */
export function getPersistedToken(): string | null {
  if (typeof window === "undefined") return null
  try {
    const ls = localStorage.getItem(TAKAI_TOKEN_KEY)
    if (ls) return ls
  } catch {
    /* modo privado, cuota, etc. */
  }
  return readCookie(TAKAI_TOKEN_KEY)
}

/** Guarda en ambos sitios para maximizar compatibilidad con Safari / PWA standalone. */
export function setPersistedToken(token: string) {
  if (typeof window === "undefined") return
  try {
    localStorage.setItem(TAKAI_TOKEN_KEY, token)
  } catch {
    /* ignore */
  }
  writeCookie(TAKAI_TOKEN_KEY, token, NINETY_DAYS_SEC)
}

export function clearPersistedToken() {
  if (typeof window === "undefined") return
  try {
    localStorage.removeItem(TAKAI_TOKEN_KEY)
  } catch {
    /* ignore */
  }
  eraseCookie(TAKAI_TOKEN_KEY)
}
