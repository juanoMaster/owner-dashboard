export const dynamic = "force-dynamic"

import { NextResponse } from "next/server"
import { getSupabaseAdmin } from "@/lib/supabase-server"
import crypto from "crypto"

function authed(req: Request): boolean {
  return !!process.env.ADMIN_TOKEN && req.headers.get("x-admin-token") === process.env.ADMIN_TOKEN
}

// GET — lista afiliados (sin token plano; solo metadata).
export async function GET(req: Request) {
  if (!authed(req)) return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  const supabase = getSupabaseAdmin()
  const { data, error } = await supabase
    .from("affiliates")
    .select("id, code, name, contact, commission_rate, active, created_at")
    .order("created_at", { ascending: false })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ affiliates: data || [] })
}

// POST — crea afiliado. Devuelve el token EN CLARO una sola vez (se guarda hash).
export async function POST(req: Request) {
  if (!authed(req)) return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  const body = await req.json()
  const name = String(body.name || "").trim().slice(0, 120)
  const contact = String(body.contact || "").trim().slice(0, 160) || null
  const code = String(body.code || "").trim().toLowerCase().replace(/[^a-z0-9_-]/g, "").slice(0, 32)
  const rate = Number(body.commission_rate)
  if (!name || !code) return NextResponse.json({ error: "name y code son obligatorios" }, { status: 400 })
  if (!Number.isFinite(rate) || rate < 0 || rate > 100) return NextResponse.json({ error: "commission_rate inválido" }, { status: 400 })

  const token = crypto.randomBytes(24).toString("hex")
  const tokenHash = crypto.createHash("sha256").update(token, "utf8").digest("hex")

  const supabase = getSupabaseAdmin()
  const { data, error } = await supabase
    .from("affiliates")
    .insert([{ code, name, contact, commission_rate: rate, token_hash: tokenHash, active: true }])
    .select("id, code")
    .single()
  if (error) {
    if (error.code === "23505") return NextResponse.json({ error: "Ese code ya existe" }, { status: 409 })
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  const base = process.env.NEXT_PUBLIC_APP_URL ?? "https://panel.takai.cl"
  return NextResponse.json({
    success: true,
    affiliate: data,
    token, // mostrar UNA vez
    dashboard_url: `${base}/dashboard/afiliado?token=${token}`,
    ref_example: `?ref=${data.code}`,
  })
}

// PATCH — activar/desactivar.
export async function PATCH(req: Request) {
  if (!authed(req)) return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  const body = await req.json()
  const id = String(body.id || "")
  if (!/^[0-9a-f-]{36}$/i.test(id)) return NextResponse.json({ error: "id inválido" }, { status: 400 })
  const supabase = getSupabaseAdmin()
  const { error } = await supabase.from("affiliates").update({ active: !!body.active }).eq("id", id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
