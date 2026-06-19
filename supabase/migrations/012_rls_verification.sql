-- 012_rls_verification.sql
-- FASE 2 — Auditoría y verificación de RLS en TODAS las tablas.
--
-- Resultado de la auditoría (read-only, contra producción reservas_engine_v1,
-- 2026-06-18): las 15 tablas de `public` YA tienen RLS habilitado. No falta
-- ninguna. Esta migración NO cambia políticas existentes (no rompe accesos);
-- solo: (1) re-asegura ENABLE RLS de forma idempotente, y (2) instala un guard
-- que falla ruidosamente si alguna tabla futura queda sin RLS.
--
-- Coexisten dos patrones de política (esperado; reservas_engine_v1 precede al
-- owner-dashboard):
--   * current_tenant_id()  -> lee app.tenant_id de la sesión (getSupabaseForTenant)
--   * is_tenant_member()   -> basado en auth.uid() + tenant_users
-- Ambos filtran por tenant. El service role bypassa RLS (server-side, por diseño).
--
-- Caso especial: `leads` tiene RLS ON y 0 políticas (default-deny). No tiene
-- columna tenant_id, así que NO se le agrega tenant_isolation: queda cerrada a
-- anon (correcto). El service role sigue accediendo server-side.

-- ── 1. Re-asegurar RLS (idempotente, no-op si ya estaba) ───────────────────
DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT c.relname
    FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relkind = 'r'
  LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', r.relname);
  END LOOP;
END $$;

-- ── 2. Guard: fallar si alguna tabla quedó sin RLS ─────────────────────────
DO $$
DECLARE missing text;
BEGIN
  SELECT string_agg(c.relname, ', ') INTO missing
  FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public' AND c.relkind = 'r' AND c.relrowsecurity = false;

  IF missing IS NOT NULL THEN
    RAISE EXCEPTION 'Tablas sin RLS habilitado: %', missing;
  END IF;
END $$;
