-- Función auxiliar para leer el tenant actual de la sesión
CREATE OR REPLACE FUNCTION current_tenant_id()
RETURNS uuid
LANGUAGE sql
STABLE
AS $$
  SELECT NULLIF(current_setting('app.tenant_id', true), '')::uuid
$$;

-- TENANTS: solo puede ver/editar su propio registro
DROP POLICY IF EXISTS "tenant_isolation" ON tenants;
CREATE POLICY "tenant_isolation" ON tenants
  USING (id = current_tenant_id());

-- CABINS
DROP POLICY IF EXISTS "tenant_isolation" ON cabins;
CREATE POLICY "tenant_isolation" ON cabins
  USING (tenant_id = current_tenant_id());

-- BOOKINGS
DROP POLICY IF EXISTS "tenant_isolation" ON bookings;
CREATE POLICY "tenant_isolation" ON bookings
  USING (tenant_id = current_tenant_id());

-- CALENDAR_BLOCKS
DROP POLICY IF EXISTS "tenant_isolation" ON calendar_blocks;
CREATE POLICY "tenant_isolation" ON calendar_blocks
  USING (tenant_id = current_tenant_id());

-- DASHBOARD_LINKS
DROP POLICY IF EXISTS "tenant_isolation" ON dashboard_links;
CREATE POLICY "tenant_isolation" ON dashboard_links
  USING (tenant_id = current_tenant_id());

-- AUDIT_LOG
DROP POLICY IF EXISTS "tenant_isolation" ON audit_log;
CREATE POLICY "tenant_isolation" ON audit_log
  USING (tenant_id = current_tenant_id());
