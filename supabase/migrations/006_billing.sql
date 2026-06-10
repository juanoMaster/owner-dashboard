-- 006_billing.sql
-- Sistema de suscripciones mensuales de Takai a sus tenants.
-- NO apliques esta migración manualmente — el comando está al final del documento.

-- ── 1. Nuevas columnas en tenants ──────────────────────────────────────────
ALTER TABLE tenants
  ADD COLUMN IF NOT EXISTS manual_billing  boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS billing_status  text    NOT NULL DEFAULT 'trial';

-- ── 2. Tabla subscriptions ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS subscriptions (
  id                      uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id               uuid        NOT NULL REFERENCES tenants(id),
  mp_preapproval_id       text        UNIQUE,
  plan                    text        NOT NULL DEFAULT 'fundador',
  amount                  integer     NOT NULL DEFAULT 19990,
  currency                text        NOT NULL DEFAULT 'CLP',
  status                  text        NOT NULL DEFAULT 'trial',
  -- status values: trial | pending | active | past_due | suspended | cancelled
  trial_ends_at           timestamptz,
  trial_warning_sent_at   timestamptz, -- evita re-enviar el email de aviso
  failed_payments         integer     NOT NULL DEFAULT 0,
  last_payment_at         timestamptz,
  next_billing_at         timestamptz,
  created_at              timestamptz DEFAULT now(),
  updated_at              timestamptz DEFAULT now(),
  UNIQUE(tenant_id)
);

-- ── 3. RLS en subscriptions ───────────────────────────────────────────────
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tenant_isolation" ON subscriptions;
CREATE POLICY "tenant_isolation" ON subscriptions
  USING (tenant_id = current_tenant_id());

-- ── 4. GlampingCacagual → manual_billing (Ecuador / USD) ─────────────────
UPDATE tenants
  SET manual_billing = true
WHERE slug = 'glamping-cacagual';

-- ── 5. Registros trial para todos los tenants existentes ─────────────────
INSERT INTO subscriptions (tenant_id, status, trial_ends_at)
SELECT
  id,
  'trial',
  now() + interval '30 days'
FROM tenants
WHERE NOT EXISTS (
  SELECT 1 FROM subscriptions s WHERE s.tenant_id = tenants.id
);

-- ── 6. Sincronizar tenants.billing_status con subscriptions.status ────────
UPDATE tenants t
  SET billing_status = s.status
FROM subscriptions s
WHERE s.tenant_id = t.id;
