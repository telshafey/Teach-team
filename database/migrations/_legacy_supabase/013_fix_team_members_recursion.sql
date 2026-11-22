-- 013_fix_team_members_recursion.sql
DROP POLICY IF EXISTS "team_members_select_policy" ON public.team_members;
CREATE POLICY "team_members_select_policy" ON public.team_members
    FOR SELECT
    USING (
        CASE 
            WHEN auth_user_id = auth.uid() THEN true
            ELSE public.is_admin()
        END
    );
