-- Create missing tables and their RLS policies

-- 1. work_contract_change_requests
CREATE TABLE IF NOT EXISTS public.work_contract_change_requests (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  team_member_id integer NOT NULL REFERENCES public.team_members(id) ON DELETE CASCADE,
  reason text NOT NULL,
  current_weekly_hours numeric,
  current_salary numeric,
  requested_weekly_hours numeric NOT NULL,
  requested_salary numeric NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  manager_notes text,
  approved_weekly_hours numeric,
  approved_salary numeric,
  created_at timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE public.work_contract_change_requests ENABLE ROW LEVEL SECURITY;

-- Drop previous policies if they existed
DROP POLICY IF EXISTS "work_contract_select_policy_v2" ON public.work_contract_change_requests;
DROP POLICY IF EXISTS "work_contract_all_policy_v2" ON public.work_contract_change_requests;

CREATE POLICY "work_contract_select_policy_v2" ON public.work_contract_change_requests
  FOR SELECT TO authenticated USING (team_member_id = public.get_current_team_member_id() OR public.is_admin());
CREATE POLICY "work_contract_insert_policy_v2" ON public.work_contract_change_requests
  FOR INSERT TO authenticated WITH CHECK (team_member_id = public.get_current_team_member_id() OR public.is_admin());
CREATE POLICY "work_contract_update_policy_v2" ON public.work_contract_change_requests
  FOR UPDATE TO authenticated USING (team_member_id = public.get_current_team_member_id() OR public.is_admin()) WITH CHECK (team_member_id = public.get_current_team_member_id() OR public.is_admin());
CREATE POLICY "work_contract_delete_policy_v2" ON public.work_contract_change_requests
  FOR DELETE TO authenticated USING (public.is_admin());

-- 2. user_preferences
CREATE TABLE IF NOT EXISTS public.user_preferences (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id integer NOT NULL REFERENCES public.team_members(id) ON DELETE CASCADE,
  theme text DEFAULT 'system',
  language text DEFAULT 'ar',
  notifications_enabled boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "user_preferences_select_policy_v2" ON public.user_preferences;
DROP POLICY IF EXISTS "user_preferences_insert_policy_v2" ON public.user_preferences;
DROP POLICY IF EXISTS "user_preferences_update_policy_v2" ON public.user_preferences;
DROP POLICY IF EXISTS "user_preferences_delete_policy_v2" ON public.user_preferences;

CREATE POLICY "user_preferences_select_policy_v2" ON public.user_preferences
  FOR SELECT TO authenticated USING (user_id = public.get_current_team_member_id() OR public.is_admin());
CREATE POLICY "user_preferences_insert_policy_v2" ON public.user_preferences
  FOR INSERT TO authenticated WITH CHECK (user_id = public.get_current_team_member_id() OR public.is_admin());
CREATE POLICY "user_preferences_update_policy_v2" ON public.user_preferences
  FOR UPDATE TO authenticated USING (user_id = public.get_current_team_member_id() OR public.is_admin()) WITH CHECK (user_id = public.get_current_team_member_id() OR public.is_admin());
CREATE POLICY "user_preferences_delete_policy_v2" ON public.user_preferences
  FOR DELETE TO authenticated USING (user_id = public.get_current_team_member_id() OR public.is_admin());
