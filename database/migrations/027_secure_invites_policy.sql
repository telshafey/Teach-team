-- 027_secure_invites_policy.sql
-- Secure the public.invites system selection
-- Drop all previous overlapping policies
DROP POLICY IF EXISTS "Token owners or admins can read invites" ON public.invites;
DROP POLICY IF EXISTS "invites_select_policy" ON public.invites;
DROP POLICY IF EXISTS "invites_select_policy_v2" ON public.invites;

-- Ensure Row Level Security is active
ALTER TABLE public.invites ENABLE ROW LEVEL SECURITY;

-- Create secure policy restricted to administrators
CREATE POLICY "invites_select_policy_v3" ON public.invites
  FOR SELECT TO authenticated USING (public.is_admin());
