import { createClient } from "@supabase/supabase-js"
import { NextResponse } from "next/server"

export const revalidate = 60

const TRINIDAD_TENANT_ID = "db307f3e-fd56-49b3-b4c5-868c7607c31e"

export async function GET() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { global: { fetch: (url, options = {}) => fetch(url, { ...options, cache: "no-store" }) } }
  )

  const { data: cabins } = await supabase
    .from("cabins")
    .select("id, name, capacity, base_price_night")
    .eq("tenant_id", TRINIDAD_TENANT_ID)
    .eq("active", true)
    .order("name")

  return NextResponse.json({ cabins: cabins || [] })
}
