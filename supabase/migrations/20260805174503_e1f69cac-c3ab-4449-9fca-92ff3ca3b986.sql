REVOKE SELECT ON public.sellers FROM anon;
GRANT SELECT (id, owner_id, slug, name, tagline, tagline_am, region, verified, rating, since, avatar, commission_pct, dot_class, created_at) ON public.sellers TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sellers TO authenticated;
GRANT ALL ON public.sellers TO service_role;