"use client"

import { useEffect, useState } from "react"

export default function EmbedIframeSnippet({ slug }: { slug: string | null | undefined }) {
  const [origin, setOrigin] = useState("")
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    setOrigin(typeof window !== "undefined" ? window.location.origin : "")
  }, [])

  const iframeCode =
    origin && slug
      ? `<iframe src="${origin}/embed/${slug}/calendario" width="100%" height="500" frameborder="0" title="Calendario ${slug}"></iframe>`
      : ""

  async function copy() {
    if (!iframeCode) return
    try {
      await navigator.clipboard.writeText(iframeCode)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      /* ignore */
    }
  }

  if (!slug) {
    return (
      <div className="rounded-xl border border-amber-900/40 bg-amber-950/30 p-4 text-sm text-amber-200/90">
        Configura el <strong>slug</strong> del negocio en el administrador Takai para generar el código del calendario embebible.
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-[#2a3e28] bg-[#111a11] p-4">
      <div className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-[#7ab87a]">Calendario en tu web</div>
      <p className="mb-3 text-xs text-[#5a7058]">
        Pega este iframe en tu sitio para mostrar disponibilidad en tiempo real. Los visitantes verán tu página pública al reservar.
      </p>
      <pre className="mb-3 max-h-28 overflow-x-auto overflow-y-auto rounded-lg border border-[#1a2e1a] bg-[#0a1510] p-3 text-[11px] leading-relaxed text-[#c8d8c0]">
        {iframeCode || "…"}
      </pre>
      <button
        type="button"
        onClick={copy}
        disabled={!iframeCode}
        className="rounded-lg bg-[#7ab87a] px-4 py-2 text-sm font-semibold text-[#0d1a12] transition hover:opacity-90 disabled:opacity-40"
      >
        {copied ? "¡Copiado!" : "Copiar código"}
      </button>
    </div>
  )
}
