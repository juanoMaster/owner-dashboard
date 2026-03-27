import { createClient } from "@supabase/supabase-js"
import { NextResponse } from "next/server"

export const revalidate = 60

export async function GET() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // Busca el tenant por nombre — ajustar si el business_name en Supabase es diferente
  const { data: tenant } = await supabase
    .from("tenants")
    .select("id")
    .ilike("business_name", "%Trinidad%")
    .eq("active", true)
    .maybeSingle()

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
