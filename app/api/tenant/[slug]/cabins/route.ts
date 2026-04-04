import { createClient } from "@supabase/supabase-js"
import { NextResponse } from "next/server"

export const revalidate = 60

export async function GET(_req: Request, { params }: { params: { slug: string } }) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { data: tenant } = await supabase
    .from("tenants")
    .select("id, business_name, owner_name, owner_whatsapp, facebook_url, instagram_url")
    .eq("slug", params.slug)
    .eq("active", true)
    .maybeSingle()

  if (!tenant) {
    return NextResponse.json({ error: "Tenant no encontrado" }, { status: 404 })
  }

  const { data: cabins } = await supabase
    .from("cabins")
    .select("id, name, capacity, base_price_night")
    .eq("tenant_id", tenant.id)
    .eq("active", true)
    .order("name")

  return NextResponse.json({
    tenant: {
      id: tenant.id,
      business_name: tenant.business_name,
      owner_name: tenant.owner_name,
      owner_whatsapp: tenant.owner_whatsapp,
      facebook_url: tenant.facebook_url || null,
      instagram_url: tenant.instagram_url || null,
    },
    cabins: cabins || [],
  })
}
