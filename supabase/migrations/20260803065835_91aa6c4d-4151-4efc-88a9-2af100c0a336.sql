-- Storage policies for product-images (admins only)
CREATE POLICY "product images admin read" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'product-images' AND public.has_role(auth.uid(), 'admin'));
CREATE POLICY "product images admin insert" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'product-images' AND public.has_role(auth.uid(), 'admin'));
CREATE POLICY "product images admin update" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'product-images' AND public.has_role(auth.uid(), 'admin'))
  WITH CHECK (bucket_id = 'product-images' AND public.has_role(auth.uid(), 'admin'));
CREATE POLICY "product images admin delete" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'product-images' AND public.has_role(auth.uid(), 'admin'));

-- Hide seller phone from anonymous visitors via column-level grants
REVOKE SELECT ON public.sellers FROM anon;
GRANT SELECT (id, owner_id, slug, name, tagline, tagline_am, region, verified, rating, since, avatar, commission_pct, dot_class, created_at) ON public.sellers TO anon;
