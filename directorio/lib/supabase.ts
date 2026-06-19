import { createClient } from "@supabase/supabase-js"

// Cliente server-side de solo lectura. Service role server-side (igual patrón que
// el owner-dashboard). NUNCA exponer la service role al cliente.
let _client: ReturnType<typeof createClient> | null = null
export function getSupabase() {
  if (_client) return _client
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!
  _client = createClient(url, key, { auth: { persistSession: false } })
  return _client
}
