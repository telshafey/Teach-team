-- 015_clean_up_rls_policies.sql
DROP POLICY IF EXISTS "team_members_all_policy" ON public.team_members;
DROP POLICY IF EXISTS "team_members_update_policy" ON public.team_members;

CREATE POLICY "team_members_update_policy" ON public.team_members
    FOR UPDATE
    USING (
        CASE 
            WHEN auth_user_id = auth.uid() THEN true
            ELSE public.is_admin()
        END
    )
    WITH CHECK (
        CASE 
            WHEN auth_user_id = auth.uid() THEN true
            ELSE public.is_admin()
        END
    );

DROP POLICY IF EXISTS "team_members_delete_policy" ON public.team_members;
CREATE POLICY "team_members_delete_policy" ON public.team_members
    FOR DELETE
    USING (
        CASE 
            WHEN auth_user_id = auth.uid() THEN true
            ELSE public.is_admin()
        END
    );

DROP POLICY IF EXISTS "team_members_insert_policy" ON public.team_members;
CREATE POLICY "team_members_insert_policy" ON public.team_members
    FOR INSERT
    WITH CHECK ( public.is_admin() );
