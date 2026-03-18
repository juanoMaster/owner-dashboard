import { createClient } from "@supabase/supabase-js"

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

interface AuditParams {
  tenant_id: string
  cabin_id?: string
  action: string
  entity_type: string
  entity_id: string
  details?: Record<string, unknown>
  performed_by?: string
}

export async function logAudit(params: AuditParams) {
  const { error } = await supabase.from("audit_log").insert([
    {
      tenant_id: params.tenant_id,
      cabin_id: params.cabin_id ?? null,
      action: params.action,
      entity_type: params.entity_type,
      entity_id: params.entity_id,
      details: params.details ?? {},
      performed_by: params.performed_by ?? "system"
    }
  ])
  if (error) {
    console.error("[audit_log] Error:", error.message)
  }
}