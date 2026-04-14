import { NextRequest, NextResponse } from "next/server"

const SPECIAL_SUBDOMAINS = new Set(["www", "admin", "panel", "reservas", "api"])
const PASSTHROUGH_HOSTS = new Set(["panel.takai.cl", "reservas.takai.cl"])

function getHostname(req: NextRequest): string {
  const h = req.headers.get("host") || ""
  return h.split(":")[0].toLowerCase()
}

function extractClientSlugFromHost(hostname: string): string | null {
  if (!hostname.endsWith(".takai.cl")) return null
  const sub = hostname.slice(0, -".takai.cl".length)
  if (!sub) return null
  if (SPECIAL_SUBDOMAINS.has(sub)) return null
  // Subdominios con puntos (a.b.takai.cl) no se consideran clientes.
  if (sub.includes(".")) return null
  return sub
}

export function middleware(req: NextRequest) {
  const hostname = getHostname(req)

  if (PASSTHROUGH_HOSTS.has(hostname) || hostname === "localhost" || hostname.endsWith(".localhost")) {
    return NextResponse.next()
  }

  const slug = extractClientSlugFromHost(hostname)
  if (!slug) return NextResponse.next()

  const { pathname } = req.nextUrl

  // No interceptar rutas especiales / estáticas (defensa adicional al matcher).
  if (
    pathname.startsWith("/api/") ||
    pathname.startsWith("/_next/") ||
    pathname === "/favicon.ico" ||
    pathname === "/icon.svg"
  ) {
    return NextResponse.next()
  }

  // No interceptar rutas embed que ya traen slug: /embed/[slug]/...
  if (pathname.startsWith("/embed/")) {
    const parts = pathname.split("/").filter(Boolean) // ["embed", ...]
    if (parts.length >= 2 && parts[1] !== "calendario") {
      return NextResponse.next()
    }
  }

  const url = req.nextUrl.clone()

  if (pathname === "/") {
    url.pathname = `/${slug}`
    return NextResponse.rewrite(url)
  }

  if (pathname === "/embed/calendario" || pathname === "/calendario") {
    url.pathname = `/embed/${slug}/calendario`
    return NextResponse.rewrite(url)
  }

  // Cualquier otra ruta bajo el subdominio:
  // - Si ya incluye el slug como prefijo, no tocar.
  // - Si no, prefijar con /{slug}
  if (pathname === `/${slug}` || pathname.startsWith(`/${slug}/`)) {
    return NextResponse.next()
  }

  url.pathname = `/${slug}${pathname}`
  return NextResponse.rewrite(url)
}

export const config = {
  matcher: [
    // Evita interceptar assets estáticos comunes, rutas internas y API.
    "/((?!api/|_next/|favicon\\.ico|icon\\.svg|.*\\..*).*)",
  ],
}

