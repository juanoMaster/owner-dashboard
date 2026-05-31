-- Migración 002: habilitar RLS en todas las tablas
-- Con RLS habilitado y sin políticas explícitas, PostgreSQL aplica
-- default-deny: el ANON_KEY (NEXT_PUBLIC_SUPABASE_ANON_KEY) recibe 0
-- filas en SELECT y error en escrituras. SERVICE_ROLE_KEY bypassa RLS
-- por diseño — ninguna ruta API existente se ve afectada.

ALTER TABLE tenants          ENABLE ROW LEVEL SECURITY;
ALTER TABLE cabins           ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings         ENABLE ROW LEVEL SECURITY;
ALTER TABLE calendar_blocks  ENABLE ROW LEVEL SECURITY;
ALTER TABLE dashboard_links  ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log        ENABLE ROW LEVEL SECURITY;
