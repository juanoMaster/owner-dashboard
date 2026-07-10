export const dynamic = "force-dynamic"

import { NextResponse } from "next/server"
import { getSupabaseAdmin } from "@/lib/supabase-server"
import { logAudit } from "@/lib/audit"

// Suspensión/activación MANUAL de billing (decisión de Juan 2026-07-10).
// La automática del cron billing-check queda apagada salvo BILLING_AUTO_SUSPEND=true.
// Actualiza subscriptions.status Y el espejo tenants.billing_status en conjunto.

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export async function POST(req: Request) {
  const adminToken = process.env.ADMIN_TOKEN
  const h = req.headers.get("x-admin-token")
  if (!adminToken || h !== adminToken) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 })
  }

  const action = body.action
  const tenant_id = String(body.tenant_id ?? "")
  if ((action !== "suspend" && action !== "activate") || !UUID_RE.test(tenant_id)) {
    return NextResponse.json({ error: "Parámetros inválidos" }, { status: 400 })
  }

  const supabase = getSupabaseAdmin()
  const newStatus = action === "suspend" ? "suspended" : "active"

  const { data: sub } = await supabase
    .from("subscriptions")
    .select("id, status, billing_mode")
    .eq("tenant_id", tenant_id)
    .maybeSingle()
  if (!sub) {
    return NextResponse.json({ error: "El tenant no tiene suscripción" }, { status: 404 })
  }

  const now = new Date().toISOString()
  const { error: subErr } = await supabase
    .from("subscriptions")
    .update({ status: newStatus, updated_at: now })
    .eq("id", sub.id)
    .eq("tenant_id", tenant_id)
  if (subErr) {
    return NextResponse.json({ error: subErr.message }, { status: 500 })
  }

  const { error: tenantErr } = await supabase
    .from("tenants")
    .update({ billing_status: newStatus })
    .eq("id", tenant_id)
  if (tenantErr) {
    return NextResponse.json({ error: tenantErr.message }, { status: 500 })
  }

  await logAudit({
    tenant_id,
    action: action === "suspend" ? "billing_manual_suspended" : "billing_manual_activated",
    entity_type: "subscription",
    entity_id: tenant_id,
    details: { previous_status: sub.status, new_status: newStatus, billing_mode: sub.billing_mode },
    performed_by: "admin_panel",
  })

  return NextResponse.json({ success: true, status: newStatus })
}
