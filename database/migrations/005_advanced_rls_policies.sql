-- 005_advanced_rls_policies.sql

-- Helper function to check if current user is admin (GM / has 'manage_team' permission)
-- Uses SECURITY DEFINER to bypass RLS and prevent infinite recursion on team_members
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    is_admin boolean;
BEGIN
    SELECT EXISTS (
        SELECT 1
        FROM public.team_members tm
        JOIN public.roles r ON tm.role_id = r.id
        WHERE tm.auth_user_id = auth.uid()
        AND 'manage_team' = ANY(r.permissions)
    ) INTO is_admin;
    RETURN is_admin;
END;
$$;

-- Helper function to get current user's team_member id
CREATE OR REPLACE FUNCTION public.get_current_team_member_id()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    tm_id integer;
BEGIN
    SELECT id INTO tm_id FROM public.team_members WHERE auth_user_id = auth.uid() LIMIT 1;
    RETURN tm_id;
END;
$$;

-- Enable RLS on tables
ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.penalties ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expense_claims ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leave_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.overtime_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- 1. team_members policies
DROP POLICY IF EXISTS "team_members_select_policy" ON public.team_members;
CREATE POLICY "team_members_select_policy" ON public.team_members
    FOR SELECT
    USING (auth_user_id = auth.uid() OR public.is_admin());

DROP POLICY IF EXISTS "team_members_all_policy" ON public.team_members;
CREATE POLICY "team_members_all_policy" ON public.team_members
    FOR ALL
    USING (public.is_admin());

-- 2. penalties policies
DROP POLICY IF EXISTS "penalties_select_policy" ON public.penalties;
CREATE POLICY "penalties_select_policy" ON public.penalties
    FOR SELECT
    USING (team_member_id = public.get_current_team_member_id() OR public.is_admin());

DROP POLICY IF EXISTS "penalties_all_policy" ON public.penalties;
CREATE POLICY "penalties_all_policy" ON public.penalties
    FOR ALL
    USING (public.is_admin());

-- 2. expense_claims policies
DROP POLICY IF EXISTS "expense_claims_select_policy" ON public.expense_claims;
CREATE POLICY "expense_claims_select_policy" ON public.expense_claims
    FOR SELECT
    USING (team_member_id = public.get_current_team_member_id() OR public.is_admin());

DROP POLICY IF EXISTS "expense_claims_all_policy" ON public.expense_claims;
CREATE POLICY "expense_claims_all_policy" ON public.expense_claims
    FOR ALL
    USING (team_member_id = public.get_current_team_member_id() OR public.is_admin());

-- 2. leave_requests policies
DROP POLICY IF EXISTS "leave_requests_select_policy" ON public.leave_requests;
CREATE POLICY "leave_requests_select_policy" ON public.leave_requests
    FOR SELECT
    USING (team_member_id = public.get_current_team_member_id() OR public.is_admin());

DROP POLICY IF EXISTS "leave_requests_all_policy" ON public.leave_requests;
CREATE POLICY "leave_requests_all_policy" ON public.leave_requests
    FOR ALL
    USING (team_member_id = public.get_current_team_member_id() OR public.is_admin());

-- 2. overtime_requests policies
DROP POLICY IF EXISTS "overtime_requests_select_policy" ON public.overtime_requests;
CREATE POLICY "overtime_requests_select_policy" ON public.overtime_requests
    FOR SELECT
    USING (team_member_id = public.get_current_team_member_id() OR public.is_admin());

DROP POLICY IF EXISTS "overtime_requests_all_policy" ON public.overtime_requests;
CREATE POLICY "overtime_requests_all_policy" ON public.overtime_requests
    FOR ALL
    USING (team_member_id = public.get_current_team_member_id() OR public.is_admin());

-- 3. daily_logs policies
DROP POLICY IF EXISTS "daily_logs_select_policy" ON public.daily_logs;
CREATE POLICY "daily_logs_select_policy" ON public.daily_logs
    FOR SELECT
    USING (team_member_id = public.get_current_team_member_id() OR public.is_admin());

DROP POLICY IF EXISTS "daily_logs_all_policy" ON public.daily_logs;
CREATE POLICY "daily_logs_all_policy" ON public.daily_logs
    FOR ALL
    USING (team_member_id = public.get_current_team_member_id() OR public.is_admin());

-- 4. notifications policies
DROP POLICY IF EXISTS "notifications_select_policy" ON public.notifications;
CREATE POLICY "notifications_select_policy" ON public.notifications
    FOR SELECT
    USING (recipient_id = public.get_current_team_member_id() OR public.is_admin());

DROP POLICY IF EXISTS "notifications_all_policy" ON public.notifications;
CREATE POLICY "notifications_all_policy" ON public.notifications
    FOR ALL
    USING (recipient_id = public.get_current_team_member_id() OR public.is_admin());
