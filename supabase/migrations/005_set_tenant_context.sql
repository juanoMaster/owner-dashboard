CREATE OR REPLACE FUNCTION set_tenant_context(p_tenant_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  PERFORM set_config('app.tenant_id', p_tenant_id::text, true);
END;
$$;
