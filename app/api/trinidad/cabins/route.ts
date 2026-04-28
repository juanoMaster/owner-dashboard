import { createClient } from "@supabase/supabase-js"
import { NextResponse } from "next/server"

export const revalidate = 60

// Legacy endpoint kept for backwards compatibility with the Trinidad website embed.
// Uses slug-based lookup so it stays data-driven — no UUIDs in code.
// Future: migrate callers to /api/tenant/[slug]/cabins which is fully equivalent.
const TRINIDAD_SLUG = "trinidad"

export async function GET() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { global: { fetch: (url, options = {}) => fetch(url, { ...options, cache: "no-store" }) } }
  )

  const { data: tenant } = await supabase
    .from("tenants")
    .select("id")
    .eq("slug", TRINIDAD_SLUG)
    .eq("active", true)
    .single()

  if (!tenant) {
    return NextResponse.json({ cabins: [] })
  }

  const { data: cabins } = await supabase
    .from("cabins")
    .select("id, name, capacity, base_price_night")
    .eq("tenant_id", tenant.id)
    .eq("active", true)
    .order("name")

  return NextResponse.json({ cabins: cabins || [] })
}
