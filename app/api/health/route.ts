export const dynamic = "force-dynamic"
import { NextResponse } from "next/server"
import { getSupabaseAdmin } from "@/lib/supabase-server"
import { sendAlertEmail } from "@/lib/alertEmail"

function isAuthorized(req: Request): boolean {
  const healthKey = req.headers.get("x-health-key")
  if (process.env.HEALTH_CHECK_KEY && healthKey === process.env.HEALTH_CHECK_KEY) {
    return true
  }
  const queryKey = new URL(req.url).searchParams.get("key")
  if (process.env.HEALTH_CHECK_KEY && queryKey === process.env.HEALTH_CHECK_KEY) {
    return true
  }
  const authHeader = req.headers.get("authorization")
  if (process.env.CRON_SECRET && authHeader === `Bearer ${process.env.CRON_SECRET}`) {
    return true
  }
  return false
}

export async function GET(req: Request) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }

  const timestamp = new Date().toISOString()
  const failures: string[] = []
  const checks: Record<string, unknown> = {}

  const supabase = getSupabaseAdmin()

  // 1. Verificar conexión a Supabase
  const { error: pingError } = await supabase
    .from("tenants")
    .select("id")
    .limit(1)

  if (pingError) {
    failures.push("DB connection failed: " + pingError.message)
    checks.db = { ok: false, error: pingError.message }
    // Si la DB está caída, no tiene sentido seguir
    await sendAlertEmail(
      "Health check fallido — DB inaccesible",
      failures.join("\n")
    )
    return NextResponse.json({ status: "error", failures, checks, timestamp }, { status: 500 })
  }

  checks.db = { ok: true }

  // 2. Verificar que cada tenant activo tiene al menos 1 cabaña activa
  const { data: tenants, error: tenantsError } = await supabase
    .from("tenants")
    .select("id, business_name")
    .eq("active", true)

  if (tenantsError) {
    failures.push("Error cargando tenants: " + tenantsError.message)
    checks.cabins = { ok: false, error: tenantsError.message }
    checks.dashboard_links = { ok: false, error: tenantsError.message }
  } else {
    const tenantIds = (tenants ?? []).map(t => t.id)

    const [cabinsResult, linksResult] = await Promise.all([
      supabase.from("cabins").select("tenant_id").in("tenant_id", tenantIds).eq("active", true),
      supabase.from("dashboard_links").select("tenant_id").in("tenant_id", tenantIds).eq("active", true),
    ])

    const tenantsWithCabins = new Set(cabinsResult.data?.map(c => c.tenant_id) ?? [])
    const tenantsWithLinks = new Set(linksResult.data?.map(l => l.tenant_id) ?? [])

    const tenantsWithoutCabins = (tenants ?? []).filter(t => !tenantsWithCabins.has(t.id)).map(t => t.business_name)
    const tenantsWithoutLinks = (tenants ?? []).filter(t => !tenantsWithLinks.has(t.id)).map(t => t.business_name)

    if (tenantsWithoutCabins.length > 0) {
      const msg = "Tenants sin cabañas activas: " + tenantsWithoutCabins.join(", ")
      failures.push(msg)
      checks.cabins = { ok: false, tenants: tenantsWithoutCabins }
    } else {
      checks.cabins = { ok: true, tenants_checked: (tenants ?? []).length }
    }

    if (tenantsWithoutLinks.length > 0) {
      const msg = "Tenants sin dashboard_links activos: " + tenantsWithoutLinks.join(", ")
      failures.push(msg)
      checks.dashboard_links = { ok: false, tenants: tenantsWithoutLinks }
    } else {
      checks.dashboard_links = { ok: true, tenants_checked: (tenants ?? []).length }
    }
  }

  if (failures.length > 0) {
    await sendAlertEmail(
      "Health check fallido (" + failures.length + " problema" + (failures.length > 1 ? "s" : "") + ")",
      failures.join("\n\n")
    )
    return NextResponse.json({ status: "error", failures, checks, timestamp }, { status: 500 })
  }

  return NextResponse.json({ status: "ok", checks, timestamp })
}