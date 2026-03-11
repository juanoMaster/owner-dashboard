import { createClient } from "@supabase/supabase-js"
import crypto from "crypto"

export default async function Home({
  searchParams,
}: {
  searchParams: { token?: string }
}) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const token = searchParams.token
  if (!token) return <div>Missing token</div>

  const tokenHash = crypto.createHash("sha256").update(token, "utf8").digest("hex")

  const { data: link, error } = await supabase
    .from("dashboard_links")
    .select("tenant_id")
    .eq("token_hash", tokenHash)
    .eq("active", true)
    .maybeSingle()

  if (error) return <div>Error: {error.message}</div>
  if (!link) return <div>Token inválido — hash: {tokenHash}</div>

  const { data: cabins } = await supabase
    .from("cabins")
    .select("*")
    .eq("tenant_id", link.tenant_id)

  return (
    <main style={{ padding: "40px", fontFamily: "sans-serif" }}>
      <h1>Panel del Propietario</h1>
      {cabins?.map((cabin: any) => (
        <div key={cabin.id} style={{ marginTop: "30px" }}>
          <h2>{cabin.name}</h2>
          <p>Capacidad: {cabin.capacity}</p>
          <button>Ver Calendario</button>
        </div>
      ))}
    </main>
  )
}