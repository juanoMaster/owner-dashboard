import { createClient } from '@supabase/supabase-js'

export function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: { persistSession: false },
      global: { fetch: (url: RequestInfo | URL, options: RequestInit = {}) => fetch(url, { ...options, cache: 'no-store' }) },
    }
  )
}

export async function getSupabaseForTenant(tenantId: string) {
  const supabase = getSupabaseAdmin()
  await supabase.rpc('set_tenant_context', { p_tenant_id: tenantId })
  return supabase
}
