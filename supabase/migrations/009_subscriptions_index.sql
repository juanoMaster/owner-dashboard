-- Migración 009: índice en subscriptions.tenant_id
-- Ejecutar manualmente en el SQL Editor de Supabase.

-- Billing routes filtran subscriptions por tenant_id constantemente
CREATE INDEX IF NOT EXISTS idx_subscriptions_tenant
  ON subscriptions(tenant_id);

-- Billing check cron filtra por billing_mode y status
CREATE INDEX IF NOT EXISTS idx_subscriptions_mode_status
  ON subscriptions(billing_mode, status);

-- Commission statements: lookup rápido para idempotencia en generate-commission-statements
CREATE INDEX IF NOT EXISTS idx_commission_statements_period
  ON commission_statements(tenant_id, period_year, period_month, kind);
