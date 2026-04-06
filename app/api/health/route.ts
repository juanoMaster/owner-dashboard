export const dynamic = "force-dynamic"
import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { sendAlertEmail } from "@/lib/alertEmail"

function isAuthorized(req: Request): boolean {
  const healthKey = req.headers.get("x-health-key")
  if (process.env.HEALTH_CHECK_KEY && healthKey === process.env.HEALTH_CHECK_KEY) {
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

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { global: { fetch: (url, options = {}) => fetch(url, { ...options, cache: "no-store" }) } }
  )

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
    const tenantsWithoutCabins: string[] = []
    const tenantsWithoutLinks: string[] = []

    for (const tenant of tenants ?? []) {
      const { data: cabins } = await supabase
        .from("cabins")
        .select("id")
        .eq("tenant_id", tenant.id)
        .eq("active", true)
        .limit(1)

      if (!cabins || cabins.length === 0) {
        tenantsWithoutCabins.push(tenant.business_name)
      }

      // 3. Verificar que cada tenant tiene dashboard_links activos
      const { data: links } = await supabase
        .from("dashboard_links")
        .select("id")
        .eq("tenant_id", tenant.id)
        .eq("active", true)
        .limit(1)

      if (!links || links.length === 0) {
        tenantsWithoutLinks.push(tenant.business_name)
      }
    }

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
