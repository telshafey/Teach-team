-- 028_clean_up_and_secure_invites.sql
-- Drop all old/legacy/overlapping policies on public.invites to resolve security overlaps
DROP POLICY IF EXISTS "Token owners or admins can read invites" ON public.invites;
DROP POLICY IF EXISTS "Admins can insert invites" ON public.invites;
DROP POLICY IF EXISTS "Admins can update invites" ON public.invites;
DROP POLICY IF EXISTS "invites_select_policy" ON public.invites;
DROP POLICY IF EXISTS "invites_select_policy_v2" ON public.invites;
DROP POLICY IF EXISTS "invites_select_policy_v3" ON public.invites;
DROP POLICY IF EXISTS "invites_insert_policy" ON public.invites;
DROP POLICY IF EXISTS "invites_insert_policy_v2" ON public.invites;
DROP POLICY IF EXISTS "invites_update_policy" ON public.invites;
DROP POLICY IF EXISTS "invites_update_policy_v2" ON public.invites;

-- Ensure Row Level Security is active
ALTER TABLE public.invites ENABLE ROW LEVEL SECURITY;

-- Create highly secure policies restricted to public.is_admin() only
CREATE POLICY "invites_select_policy_final" ON public.invites
  FOR SELECT TO authenticated USING (public.is_admin());

CREATE POLICY "invites_insert_policy_final" ON public.invites
  FOR INSERT TO authenticated WITH CHECK (public.is_admin());

CREATE POLICY "invites_update_policy_final" ON public.invites
  FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY "invites_delete_policy_final" ON public.invites
  FOR DELETE TO authenticated USING (public.is_admin());
