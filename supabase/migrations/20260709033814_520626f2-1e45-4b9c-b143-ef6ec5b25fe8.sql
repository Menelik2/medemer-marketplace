
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM anon, PUBLIC;
-- keep authenticated EXECUTE so app can call rpc('has_role') if needed
