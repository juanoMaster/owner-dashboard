-- 007_billing_v2.sql
-- Extiende el sistema de billing con modos de facturación, estados de cuenta
-- de comisiones, y corrección de tenants actuales.
-- NO aplicar manualmente — ver comando al final del CLAUDE.md.

-- ── 1. Extender subscriptions con billing_mode ───────────────────────────
ALTER TABLE subscriptions
  ADD COLUMN IF NOT EXISTS billing_mode   text    NOT NULL DEFAULT 'subscription',
  ADD COLUMN IF NOT EXISTS commission_rate numeric NOT NULL DEFAULT 10,
  ADD COLUMN IF NOT EXISTS free_until     date;
  -- billing_mode values: subscription | commission | manual

-- ── 2. Corregir tenants activos (de trial a acuerdo real) ────────────────

-- El Mirador: comisión 10%, sin mensualidad hasta 30 nov 2026
UPDATE subscriptions
  SET billing_mode    = 'commission',
      commission_rate = 10,
      free_until      = '2026-11-30',
      status          = 'active',
      updated_at      = now()
  WHERE tenant_id = (SELECT id FROM tenants WHERE slug = 'el-mirador');
UPDATE tenants SET billing_status = 'active' WHERE slug = 'el-mirador';

-- Cabañas Majoaal: comisión 10%, sin mensualidad hasta 28 feb 2027
UPDATE subscriptions
  SET billing_mode    = 'commission',
      commission_rate = 10,
      free_until      = '2027-02-28',
      status          = 'active',
      updated_at      = now()
  WHERE tenant_id = (SELECT id FROM tenants WHERE slug = 'cabanas-majoaal-licanray');
UPDATE tenants SET billing_status = 'active' WHERE slug = 'cabanas-majoaal-licanray';

-- GlampingCacagual: comisión 10%, sin mensualidad indefinida, manual_billing=true
UPDATE subscriptions
  SET billing_mode    = 'commission',
      commission_rate = 10,
      free_until      = NULL,
      status          = 'active',
      updated_at      = now()
  WHERE tenant_id = (SELECT id FROM tenants WHERE slug = 'glamping-cacagual');
UPDATE tenants SET billing_status = 'active', manual_billing = true
  WHERE slug = 'glamping-cacagual';

-- ── 3. Tabla commission_statements ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS commission_statements (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id        uuid        NOT NULL REFERENCES tenants(id),
  period_year      int         NOT NULL,
  period_month     int         NOT NULL,
  kind             text        NOT NULL DEFAULT 'commission',
  -- kind values: commission | subscription
  bookings_count   int         NOT NULL DEFAULT 0,
  bookings_total   numeric     NOT NULL DEFAULT 0,
  currency         text        NOT NULL DEFAULT 'CLP',
  commission_amount numeric    NOT NULL DEFAULT 0,
  commission_rate  numeric     NOT NULL DEFAULT 10,
  status           text        NOT NULL DEFAULT 'pending',
  -- status: pending | sent | transfer_reported | paid | waived
  payment_method   text,
  -- payment_method: card | transfer | manual
  paid_at          timestamptz,
  ack_token        text        UNIQUE,
  mp_preference_id text,
  created_at       timestamptz DEFAULT now(),
  updated_at       timestamptz DEFAULT now(),
  UNIQUE(tenant_id, period_year, period_month, kind)
);

ALTER TABLE commission_statements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tenant_isolation" ON commission_statements;
CREATE POLICY "tenant_isolation" ON commission_statements
  USING (tenant_id = current_tenant_id());

-- ── 4. Agregar bank_email a tenants (campo opcional) ─────────────────────
ALTER TABLE tenants
  ADD COLUMN IF NOT EXISTS bank_email text;

-- ── FIN — ver CLAUDE.md para el comando de aplicación ────────────────────
