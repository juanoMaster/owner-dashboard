import { createClient } from "@supabase/supabase-js"
import crypto from "crypto"
import DashboardClient from "../../components/DashboardClient"

export const revalidate = 0

export default async function Dashboard({ params }: { params: { token: string } }) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const tokenHash = crypto.createHash("sha256").update(params.token, "utf8").digest("hex")

  const { data: link } = await supabase
    .from("dashboard_links")
    .select("tenant_id")
    .eq("token_hash", tokenHash)
    .eq("active", true)
    .maybeSingle()

  if (!link) return <div style={{ padding: "40px", fontFamily: "sans-serif" }}>Token inv{"\u00e1"}lido.</div>

  const { data: cabins } = await supabase
    .from("cabins")
    .select("id, name, capacity, base_price_night")
    .eq("tenant_id", link.tenant_id)
    .eq("active", true)

  return <DashboardClient cabins={cabins || []} tenantId={link.tenant_id} />
}