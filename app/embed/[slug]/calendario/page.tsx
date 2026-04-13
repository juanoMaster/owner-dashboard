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
    <div className="min-h-[480px] w-full max-w-lg mx-auto bg-transparent p-3 sm:p-4 text-neutral-800">
      {loading && (
        <div className="text-center text-sm text-neutral-500 py-12">Cargando calendario…</div>
      )}
      {error && !loading && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">{error}</div>
      )}
      {data && !loading && (
        <>
          <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <h1 className="text-lg font-semibold text-neutral-900">{business}</h1>
            {data.cabins.length > 1 && (
              <label className="flex items-center gap-2 text-sm">
                <span className="text-neutral-600">Cabaña</span>
                <select
                  value={cabinId}
                  onChange={(e) => setCabinId(e.target.value)}
                  className="rounded-md border border-neutral-300 bg-white px-2 py-1.5 text-sm shadow-sm"
                >
                  {data.cabins.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </label>
            )}
          </div>

          <div className="mb-2 flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={prevMonth}
              className="rounded-md border border-neutral-300 bg-white px-3 py-1.5 text-sm font-medium shadow-sm hover:bg-neutral-50"
            >
              ← Mes anterior
            </button>
            <span className="text-center text-sm font-medium capitalize text-neutral-800">{monthLabel}</span>
            <button
              type="button"
              onClick={nextMonth}
              className="rounded-md border border-neutral-300 bg-white px-3 py-1.5 text-sm font-medium shadow-sm hover:bg-neutral-50"
            >
              Mes siguiente →
            </button>
          </div>

          <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-semibold uppercase tracking-wide text-neutral-500 sm:text-xs">
            {WEEKDAYS.map((d) => (
              <div key={d} className="py-1">
                {d}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1">
            {cells.map((cell, i) => {
              if (!cell) {
                return <div key={`e-${i}`} className="aspect-square" />
              }
              const st = cellState(cell.day)
              const ymd = ymdLocal(viewYear, viewMonth, cell.day)
              const isToday = ymd === today
              const cls =
                st === "past"
                  ? "bg-neutral-200 text-neutral-500"
                  : st === "occupied"
                    ? "bg-red-500 text-white"
                    : "bg-emerald-500 text-white"
              return (
                <div
                  key={ymd}
                  className={`flex aspect-square items-center justify-center rounded-md text-xs font-semibold sm:text-sm ${cls} ${isToday ? "ring-2 ring-amber-400 ring-offset-1" : ""}`}
                  title={st === "occupied" ? "Ocupado" : st === "past" ? "Pasado" : "Disponible"}
                >
                  {cell.day}
                </div>
              )
            })}
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-3 text-[11px] text-neutral-600">
            <span className="inline-flex items-center gap-1.5">
              <span className="h-3 w-3 rounded bg-emerald-500" /> Disponible
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="h-3 w-3 rounded bg-red-500" /> Ocupado
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="h-3 w-3 rounded bg-neutral-200" /> Pasado
            </span>
          </div>

          <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <a
              href={`/${slug}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow hover:bg-emerald-700"
            >
              Reservar en {business}
            </a>
            <button
              type="button"
              onClick={() => load()}
              className="text-xs text-neutral-500 underline hover:text-neutral-700"
            >
              Actualizar disponibilidad
            </button>
          </div>
        </>
      )}

      <p className="mt-6 text-center text-[10px] text-neutral-400">
        <a href="https://takai.cl" target="_blank" rel="noopener noreferrer" className="hover:text-neutral-600">
          Powered by Takai.cl
        </a>
      </p>
    </div>
  )
}
