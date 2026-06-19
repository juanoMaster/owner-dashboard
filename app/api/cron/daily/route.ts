export const dynamic = "force-dynamic"

import { NextResponse } from "next/server"

const BASE = process.env.NEXT_PUBLIC_APP_URL ?? "https://panel.takai.cl"

async function callEndpoint(path: string, secret: string) {
  try {
    const res = await fetch(`${BASE}${path}`, {
      headers: { Authorization: `Bearer ${secret}` },
      cache: "no-store",
    })
    return { path, ok: res.ok, status: res.status }
  } catch (err: any) {
    console.error(`[cron/daily] Error calling ${path}:`, err?.message)
    return { path, ok: false, status: 0 }
  }
}

export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET ?? ""
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }

  const endpoints = [
    "/api/health",
    "/api/emails/recordatorio",
    "/api/emails/solicitar-review",
    "/api/cron/cancelar-pendientes",
    "/api/cron/recordatorio-transferencia",
    "/api/cron/billing-check",
    "/api/cron/retargeting",
  ]

  // Solo el 1° de cada mes
  if (new Date().getUTCDate() === 1) {
    endpoints.push("/api/cron/generate-commission-statements")
  }

  const results = await Promise.all(endpoints.map((p) => callEndpoint(p, secret)))
  return NextResponse.json({ results })
}
