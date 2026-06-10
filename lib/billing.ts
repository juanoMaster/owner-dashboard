import { createClient } from "@supabase/supabase-js"

function admin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  )
}

export async function getBillingInfo(tenant_id: string): Promise<{
  billing_status: string
  manual_billing: boolean
}> {
  const { data } = await admin()
    .from("tenants")
    .select("billing_status, manual_billing")
    .eq("id", tenant_id)
    .single()
  return {
    billing_status: data?.billing_status ?? "trial",
    manual_billing: data?.manual_billing ?? false,
  }
}

// Devuelve true si el tenant está suspendido y debe bloquearse la escritura.
// Los tenants con manual_billing nunca se bloquean automáticamente.
export function isBillingBlocked(billing_status: string, manual_billing: boolean): boolean {
  if (manual_billing) return false
  return billing_status === "suspended"
}

// Sincroniza tenants.billing_status desde subscriptions.status.
export async function syncBillingStatus(tenant_id: string, new_status: string) {
  await admin()
    .from("tenants")
    .update({ billing_status: new_status })
    .eq("id", tenant_id)
}
