
-- Fix search_path on custom functions
ALTER FUNCTION public.set_updated_at() SET search_path = public;

-- Revoke EXECUTE on SECURITY DEFINER trigger functions from anon/authenticated
-- (these are only invoked by triggers, not by API callers)
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.notify_order_status() FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.notify_delivery_update() FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.products_tsv_update() FROM anon, authenticated, PUBLIC;

-- has_role is used in RLS policies; keep it callable but harden
-- (already SECURITY DEFINER with fixed search_path)

-- Notifications: explicit INSERT/DELETE deny for clients (only service role writes)
CREATE POLICY "notif no client insert" ON public.notifications
  FOR INSERT TO authenticated, anon WITH CHECK (false);
CREATE POLICY "notif no client delete" ON public.notifications
  FOR DELETE TO authenticated, anon USING (false);

-- Withdrawal requests: explicitly block sellers from updating/deleting their own requests
CREATE POLICY "withdraw no seller update" ON public.withdrawal_requests
  FOR UPDATE TO authenticated
  USING (
    NOT public.has_role(auth.uid(), 'admin'::app_role)
    AND EXISTS (SELECT 1 FROM public.sellers s WHERE s.id = withdrawal_requests.seller_id AND s.owner_id = auth.uid())
  )
  WITH CHECK (false);

CREATE POLICY "withdraw no seller delete" ON public.withdrawal_requests
  FOR DELETE TO authenticated
  USING (
    NOT public.has_role(auth.uid(), 'admin'::app_role)
    AND EXISTS (SELECT 1 FROM public.sellers s WHERE s.id = withdrawal_requests.seller_id AND s.owner_id = auth.uid())
    AND false
  );
