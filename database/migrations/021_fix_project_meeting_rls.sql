-- 021_fix_project_meeting_rls.sql

-- Create a helper function to check generic permissions
CREATE OR REPLACE FUNCTION public.has_permission(check_permission text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    has_perm boolean;
BEGIN
    SELECT EXISTS (
        SELECT 1
        FROM public.team_members tm
        JOIN public.roles r ON tm.role_id = r.id
        WHERE tm.auth_user_id = auth.uid()
        AND check_permission = ANY(r.permissions)
    ) INTO has_perm;
    RETURN has_perm;
END;
$$;


-- Projects RLS
DO $$ 
DECLARE pol record;
BEGIN
    FOR pol IN SELECT policyname FROM pg_policies WHERE tablename = 'projects' AND schemaname = 'public' LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.projects', pol.policyname);
    END LOOP;
END $$;

CREATE POLICY "projects_insert" ON public.projects 
    FOR INSERT 
    WITH CHECK (public.has_permission('manage_projects') OR public.is_admin());

CREATE POLICY "projects_select" ON public.projects 
    FOR SELECT 
    USING (
        public.has_permission('manage_projects') OR 
        public.is_admin() OR 
        creator_id = public.get_current_team_member_id() OR
        id IN (
            SELECT pm.project_id 
            FROM public.project_members pm
            WHERE pm.team_member_id = public.get_current_team_member_id()
        )
    );

CREATE POLICY "projects_update" ON public.projects 
    FOR UPDATE 
    USING (
        public.has_permission('edit_projects') OR 
        public.is_admin() OR 
        creator_id = public.get_current_team_member_id()
    );

CREATE POLICY "projects_delete" ON public.projects 
    FOR DELETE 
    USING (public.has_permission('manage_projects') OR public.is_admin());

-- Meetings RLS
DO $$ 
DECLARE pol record;
BEGIN
    FOR pol IN SELECT policyname FROM pg_policies WHERE tablename = 'meetings' AND schemaname = 'public' LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.meetings', pol.policyname);
    END LOOP;
END $$;

CREATE POLICY "meetings_insert" ON public.meetings 
    FOR INSERT 
    WITH CHECK (public.has_permission('manage_meetings') OR public.is_admin());

CREATE POLICY "meetings_select" ON public.meetings 
    FOR SELECT 
    USING (
        public.has_permission('manage_meetings') OR 
        public.is_admin() OR 
        creator_id = public.get_current_team_member_id() OR
        -- Check if the current team member ID is in the jsonb members array
        members @> ('[' || public.get_current_team_member_id() || ']')::jsonb
    );

CREATE POLICY "meetings_update" ON public.meetings 
    FOR UPDATE 
    USING (
        public.has_permission('manage_meetings') OR 
        public.is_admin() OR 
        creator_id = public.get_current_team_member_id() OR
        -- Allow members so they can add themselves to attendees
        members @> ('[' || public.get_current_team_member_id() || ']')::jsonb
    );

CREATE POLICY "meetings_delete" ON public.meetings 
    FOR DELETE 
    USING (public.has_permission('manage_meetings') OR public.is_admin() OR creator_id = public.get_current_team_member_id());

