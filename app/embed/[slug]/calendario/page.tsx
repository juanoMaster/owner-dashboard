"use client"

import { useEffect, useMemo, useState } from "react"
import { useParams } from "next/navigation"

type CabinAvail = {
  id: string
  name: string
  capacity: number
  base_price_night: number
  occupied_dates: string[]
}

type AvailabilityPayload = {
  business_name: string
  slug: string
  window_start: string
  window_end: string
  cabins: CabinAvail[]
}

function pad2(n: number): string {
  return String(n).padStart(2, "0")
}

function ymdLocal(y: number, m: number, d: number): string {
  return `${y}-${pad2(m + 1)}-${pad2(d)}`
}

function todayYmd(): string {
  const t = new Date()
  return ymdLocal(t.getFullYear(), t.getMonth(), t.getDate())
}

function getMonthCells(year: number, month: number): ({ day: number } | null)[] {
  const first = new Date(year, month, 1)
  const leading = (first.getDay() + 6) % 7
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const cells: ({ day: number } | null)[] = []
  for (let i = 0; i < leading; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push({ day: d })
  while (cells.length % 7 !== 0) cells.push(null)
  return cells
}

const WEEKDAYS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"]

export default function EmbedCalendarioPage() {
  const params = useParams()
  const slug = (params?.slug as string) || ""

  const [data, setData] = useState<AvailabilityPayload | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const now = new Date()
  const [viewYear, setViewYear] = useState(now.getFullYear())
  const [viewMonth, setViewMonth] = useState(now.getMonth())
  const [cabinId, setCabinId] = useState<string>("")

  async function load() {
    if (!slug) return
    setLoading(true)
    setError(null)
    try {
      const res = await fetch("/api/embed/" + encodeURIComponent(slug) + "/availability", { cache: "no-store" })
      if (!res.ok) {
        const j = await res.json().catch(() => ({}))
        setError((j as { error?: string }).error || "No se pudo cargar")
        setData(null)
        return
      }
      const json = (await res.json()) as AvailabilityPayload
      setData(json)
      setCabinId((prev) => {
        if (prev && json.cabins.some((c) => c.id === prev)) return prev
        return json.cabins[0]?.id ?? ""
      })
    } catch {
      setError("Error de red")
      setData(null)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug])

  const selected = data?.cabins.find((c) => c.id === cabinId)
  const occupied = useMemo(() => new Set(selected?.occupied_dates ?? []), [selected])

  const cells = useMemo(() => getMonthCells(viewYear, viewMonth), [viewYear, viewMonth])
  const today = todayYmd()

  function cellState(dayNum: number): "past" | "occupied" | "free" {
    const ymd = ymdLocal(viewYear, viewMonth, dayNum)
    if (ymd < today) return "past"
    if (occupied.has(ymd)) return "occupied"
    return "free"
  }

  function prevMonth() {
    setViewMonth((m) => {
      if (m === 0) {
        setViewYear((y) => y - 1)
        return 11
      }
      return m - 1
    })
  }

  function nextMonth() {
    setViewMonth((m) => {
      if (m === 11) {
        setViewYear((y) => y + 1)
        return 0
      }
      return m + 1
    })
  }

  const monthLabel = new Date(viewYear, viewMonth, 1).toLocaleDateString("es-CL", {
    month: "long",
    year: "numeric",
  })

  const business = data?.business_name || "…"

  return (
    <div className="w-full max-w-md mx-auto bg-transparent p-3 sm:p-4">
      <div className="rounded-2xl bg-white p-6 shadow-lg sm:p-8">
        {loading && (
          <div className="py-14 text-center text-sm text-gray-500">Cargando calendario…</div>
        )}

        {error && !loading && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</div>
        )}

        {data && !loading && (
          <>
            <h1 className="mb-6 text-center text-2xl font-bold leading-tight tracking-tight text-gray-900">
              {business}
            </h1>

            {data.cabins.length > 1 && (
              <div className="mb-6">
                <label htmlFor="embed-cabin" className="mb-2 block text-sm font-medium text-gray-600">
                  Cabaña
                </label>
                <select
                  id="embed-cabin"
                  value={cabinId}
                  onChange={(e) => setCabinId(e.target.value)}
                  className="w-full cursor-pointer appearance-none rounded-xl border border-gray-300 bg-white py-3 pl-4 pr-10 text-sm text-gray-900 shadow-sm transition focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                  style={{
                    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%236b7280'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'/%3E%3C/svg%3E")`,
                    backgroundRepeat: "no-repeat",
                    backgroundPosition: "right 0.75rem center",
                    backgroundSize: "1.25rem",
                  }}
                >
                  {data.cabins.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="mb-4 flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={prevMonth}
                className="shrink-0 rounded-full bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-200"
              >
                ←
              </button>
              <span className="min-w-0 flex-1 text-center text-base font-bold capitalize text-gray-900">
                {monthLabel}
              </span>
              <button
                type="button"
                onClick={nextMonth}
                className="shrink-0 rounded-full bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-200"
              >
                →
              </button>
            </div>

            <div className="mb-2 grid grid-cols-7 gap-1.5 text-center text-[10px] font-semibold uppercase tracking-wide text-gray-500 sm:text-xs">
              {WEEKDAYS.map((d) => (
                <div key={d} className="py-2">
                  {d}
                </div>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
              {cells.map((cell, i) => {
                if (!cell) {
                  return <div key={`e-${i}`} className="aspect-square min-h-0" />
                }
                const st = cellState(cell.day)
                const ymd = ymdLocal(viewYear, viewMonth, cell.day)
                const isToday = ymd === today

                const baseCell =
                  "relative flex aspect-square min-h-[2.25rem] items-center justify-center rounded-lg text-sm font-medium transition sm:min-h-[2.5rem] sm:text-base"

                if (st === "past") {
                  return (
                    <div
                      key={ymd}
                      className={`${baseCell} cursor-default bg-gray-100 text-gray-400 ${isToday ? "ring-2 ring-blue-500 ring-offset-2 ring-offset-white" : ""}`}
                      title="Pasado"
                    >
                      {cell.day}
                    </div>
                  )
                }

                if (st === "occupied") {
                  return (
                    <div
                      key={ymd}
                      className={`${baseCell} cursor-default overflow-hidden border border-red-200 bg-red-50 text-red-400 ${isToday ? "ring-2 ring-blue-500 ring-offset-2 ring-offset-white" : ""}`}
                      title="Ocupado"
                    >
                      <span
                        aria-hidden
                        className="pointer-events-none absolute left-1/2 top-1/2 h-px w-[130%] -translate-x-1/2 -translate-y-1/2 rotate-45 bg-red-200"
                      />
                      <span className="relative z-10 line-through decoration-red-300">{cell.day}</span>
                    </div>
                  )
                }

                return (
                  <div
                    key={ymd}
                    className={`${baseCell} cursor-pointer border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 ${isToday ? "ring-2 ring-blue-500 ring-offset-2 ring-offset-white" : ""}`}
                    title="Disponible"
                  >
                    {cell.day}
                  </div>
                )
              })}
            </div>

            <div className="mt-6 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-gray-500">
              <span className="inline-flex items-center gap-2">
                <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-emerald-200 ring-1 ring-emerald-300" />
                Disponible
              </span>
              <span className="inline-flex items-center gap-2">
                <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-red-100 ring-1 ring-red-200" />
                Ocupado
              </span>
              <span className="inline-flex items-center gap-2">
                <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-gray-200" />
                Pasado
              </span>
            </div>

            <a
              href={`/${slug}`}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-6 flex w-full items-center justify-center rounded-xl bg-emerald-600 px-6 py-4 text-base font-semibold text-white shadow-sm transition-colors duration-200 hover:bg-emerald-700"
            >
              Reservar en {business}
            </a>

            <button
              type="button"
              onClick={() => load()}
              className="mt-3 w-full text-center text-xs text-gray-400 underline transition hover:text-gray-600"
            >
              Actualizar disponibilidad
            </button>
          </>
        )}
      </div>

      <p className="mt-4 text-center text-xs text-gray-400">
        <a
          href="https://www.takai.cl"
          target="_blank"
          rel="noopener noreferrer"
          className="transition hover:text-gray-600"
        >
          Powered by Takai.cl
        </a>
      </p>
    </div>
  )
}
