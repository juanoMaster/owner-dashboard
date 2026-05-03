"use client"

import { useCallback, useEffect, useState } from "react"

function LinkShareIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="M10 13a5 5 0 0 1 0-7l1-1a5 5 0 0 1 7 7l-1 1" />
      <path d="M14 11a5 5 0 0 1 0 7l-1 1a5 5 0 0 1-7-7l1-1" />
    </svg>
  )
}

export default function EmbedIframeSnippet({ slug }: { slug: string | null | undefined }) {
  const [origin, setOrigin] = useState("")
  const [modalOpen, setModalOpen] = useState(false)
  const [calendarOpen, setCalendarOpen] = useState(true)
  const [copiedLink, setCopiedLink] = useState(false)
  const [copiedCode, setCopiedCode] = useState(false)

  useEffect(() => {
    setOrigin(typeof window !== "undefined" ? window.location.origin : "")
  }, [])

  const calendarUrl = slug ? `https://reservas.takai.cl/embed/${slug}/calendario` : ""
  const legacyCalendarUrl = origin && slug ? `${origin}/embed/${slug}/calendario` : ""
  const iframeCode =
    calendarUrl ? `<iframe src="${calendarUrl}" width="100%" height="500" frameborder="0" title="Calendario ${slug}"></iframe>` : ""

  const copyLink = useCallback(async () => {
    if (!calendarUrl) return
    try {
      await navigator.clipboard.writeText(calendarUrl)
      setCopiedLink(true)
      window.setTimeout(() => setCopiedLink(false), 2000)
    } catch {
      /* ignore */
    }
  }, [calendarUrl])

  const copyCode = useCallback(async () => {
    if (!iframeCode) return
    try {
      await navigator.clipboard.writeText(iframeCode)
      setCopiedCode(true)
      window.setTimeout(() => setCopiedCode(false), 2000)
    } catch {
      /* ignore */
    }
  }, [iframeCode])

  useEffect(() => {
    if (!modalOpen) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setModalOpen(false)
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [modalOpen])

  useEffect(() => {
    if (!modalOpen) return
    const prev = document.body.style.overflow
    document.body.style.overflow = "hidden"
    return () => {
      document.body.style.overflow = prev
    }
  }, [modalOpen])

  return (
    <>
      <button
        type="button"
        onClick={() => setModalOpen(true)}
        className="inline-flex items-center gap-1.5 rounded-lg border border-[#2a3e28] bg-[#111a11]/80 px-2.5 py-1.5 text-[11px] font-medium tracking-wide text-[#7ab87a] transition hover:border-[#3d523c] hover:bg-[#162618] focus:outline-none focus:ring-2 focus:ring-[#7ab87a]/40"
      >
        <LinkShareIcon className="h-3.5 w-3.5 shrink-0 opacity-90" />
        Herramientas
      </button>

      {modalOpen ? (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/55 p-4"
          role="presentation"
          onClick={() => setModalOpen(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="tools-modal-title"
            className="relative max-h-[min(90vh,640px)] w-full max-w-lg overflow-y-auto rounded-2xl border border-[#2a3e28] bg-[#111a11] shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setModalOpen(false)}
              className="absolute right-3 top-3 rounded-lg p-1.5 text-[#5a7058] transition hover:bg-[#1a2e1a] hover:text-[#c8d8c0] focus:outline-none focus:ring-2 focus:ring-[#7ab87a]/40"
              aria-label="Cerrar"
            >
              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>

            <div className="border-b border-[#2a3e28] px-5 pb-4 pt-5 pr-12">
              <h2 id="tools-modal-title" className="font-serif text-xl font-normal tracking-tight text-[#e8d5a3]">
                Herramientas
              </h2>
              <p className="mt-1 text-xs text-[#5a7058]">Comparte y conecta tu negocio con tus clientes.</p>
            </div>

            <div className="p-3">
              <div className="rounded-xl border border-[#1a2e1a] bg-[#0a1510]/80">
                <button
                  type="button"
                  onClick={() => setCalendarOpen((v) => !v)}
                  className="flex w-full items-center justify-between gap-2 px-4 py-3 text-left text-sm font-semibold text-[#c8d8c0] transition hover:bg-[#162618]/80"
                  aria-expanded={calendarOpen}
                >
                  <span>Compartir calendario</span>
                  <svg
                    className={`h-4 w-4 shrink-0 text-[#7ab87a] transition-transform ${calendarOpen ? "rotate-180" : ""}`}
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    aria-hidden
                  >
                    <path d="M6 9l6 6 6-6" />
                  </svg>
                </button>

                {calendarOpen ? (
                  <div className="border-t border-[#1a2e1a] px-4 pb-4 pt-2">
                    {!slug ? (
                      <p className="text-sm text-amber-200/90">
                        Configura el <strong className="font-semibold">slug</strong> del negocio en el administrador Takai para
                        generar el enlace y el código del calendario embebible.
                      </p>
                    ) : (
                      <>
                        <h3 className="font-serif text-base font-normal text-[#e8d5a3]">Comparte tu calendario</h3>
                        <p className="mt-2 text-xs leading-relaxed text-[#5a7058]">
                          Comparte este link en tu Instagram, Facebook o página web para que tus clientes vean la disponibilidad de
                          tus cabañas en tiempo real.
                        </p>

                        <div className="mt-4 space-y-3">
                          <div>
                            <div className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-[#7ab87a]">
                              Link directo
                            </div>
                            <div className="flex flex-col gap-2 sm:flex-row sm:items-stretch">
                              <div className="min-w-0 flex-1 rounded-lg border border-[#1a2e1a] bg-[#0a1510] px-3 py-2 text-[11px] leading-snug text-[#c8d8c0] break-all">
                                {calendarUrl || "…"}
                              </div>
                              <button
                                type="button"
                                onClick={copyLink}
                                disabled={!calendarUrl}
                                className="shrink-0 rounded-lg border border-[#3d523c] bg-[#162618] px-3 py-2 text-xs font-semibold text-[#7ab87a] transition hover:bg-[#1a2e1a] disabled:opacity-40"
                              >
                                {copiedLink ? "¡Copiado!" : "Copiar link"}
                              </button>
                            </div>
                          </div>

                          <div>
                            <div className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-[#7ab87a]">
                              Código iframe
                            </div>
                            <pre className="mb-2 max-h-28 overflow-x-auto overflow-y-auto rounded-lg border border-[#1a2e1a] bg-[#0a1510] p-3 text-[11px] leading-relaxed text-[#c8d8c0]">
                              {iframeCode || "…"}
                            </pre>
                            <button
                              type="button"
                              onClick={copyCode}
                              disabled={!iframeCode}
                              className="rounded-lg border border-[#3d523c] bg-[#162618] px-3 py-2 text-xs font-semibold text-[#7ab87a] transition hover:bg-[#1a2e1a] disabled:opacity-40"
                            >
                              {copiedCode ? "¡Copiado!" : "Copiar código"}
                            </button>

                            {legacyCalendarUrl ? (
                              <div className="mt-3 rounded-lg border border-[#1a2e1a] bg-[#0a1510]/60 px-3 py-2 text-[11px] text-[#5a7058]">
                                Fallback (URL antigua):{" "}
                                <span className="font-mono text-[#c8d8c0]">{legacyCalendarUrl}</span>
                              </div>
                            ) : null}
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </>
  )
}
