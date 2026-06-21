-- 022_fix_tasks_and_projects.sql

-- Create a helper function to check generic permissions
CREATE OR REPLACE FUNCTION public.has_permission(req_permission text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
    has_perm boolean;
BEGIN
    SELECT EXISTS (
        SELECT 1
        FROM public.team_members tm
        JOIN public.roles r ON tm.role_id = r.id
        WHERE tm.auth_user_id = auth.uid()
        AND req_permission = ANY(r.permissions)
    ) INTO has_perm;
    RETURN has_perm;
END;
$function$;

-- ==========================================
-- Projects RLS
-- ==========================================
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
        members @> ('[{"team_member_id": ' || public.get_current_team_member_id() || '}]')::jsonb OR
        members @> ('[{"teamMemberId": ' || public.get_current_team_member_id() || '}]')::jsonb
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


-- ==========================================
-- Meetings RLS
-- ==========================================
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

-- Allow viewing if they manage meetings, created it, OR are in the members array
CREATE POLICY "meetings_select" ON public.meetings 
    FOR SELECT 
    USING (
        public.has_permission('manage_meetings') OR 
        public.is_admin() OR 
        creator_id = public.get_current_team_member_id() OR
        members @> ('[' || public.get_current_team_member_id() || ']')::jsonb
    );

CREATE POLICY "meetings_update" ON public.meetings 
    FOR UPDATE 
    USING (
        public.has_permission('manage_meetings') OR 
        public.is_admin() OR 
        creator_id = public.get_current_team_member_id() OR
        -- Important: Allow them to update ONLY the attendees column if they are a member (so they can join)
        members @> ('[' || public.get_current_team_member_id() || ']')::jsonb
    );

CREATE POLICY "meetings_delete" ON public.meetings 
    FOR DELETE 
    USING (public.has_permission('manage_meetings') OR public.is_admin() OR creator_id = public.get_current_team_member_id());


-- ==========================================
-- Tasks RLS
-- ==========================================
DO $$ 
DECLARE pol record;
BEGIN
    FOR pol IN SELECT policyname FROM pg_policies WHERE tablename = 'tasks' AND schemaname = 'public' LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.tasks', pol.policyname);
    END LOOP;
END $$;

-- 1. SELECT: Everyone in the project can view all tasks in that project
CREATE POLICY "tasks_select" ON public.tasks 
    FOR SELECT 
    USING (
        public.is_admin() OR 
        creator_id = public.get_current_team_member_id() OR
        assigned_to = public.get_current_team_member_id() OR
        project_id IN (
            SELECT p.id 
            FROM public.projects p
            WHERE p.members @> ('[{"team_member_id": ' || public.get_current_team_member_id() || '}]')::jsonb OR
                  p.members @> ('[{"teamMemberId": ' || public.get_current_team_member_id() || '}]')::jsonb
        )
    );

-- 2. INSERT: Anyone with create_tasks can insert, OR the user is a member of the project
CREATE POLICY "tasks_insert" ON public.tasks 
    FOR INSERT 
    WITH CHECK (
        public.has_permission('create_tasks') OR 
        public.is_admin() OR
        project_id IN (
            SELECT p.id 
            FROM public.projects p
            WHERE p.members @> ('[{"team_member_id": ' || public.get_current_team_member_id() || '}]')::jsonb OR
                  p.members @> ('[{"teamMemberId": ' || public.get_current_team_member_id() || '}]')::jsonb
        )
    );

-- 3. UPDATE: Managers can update anything. Others can only update if assigned or created or part of project.
CREATE POLICY "tasks_update" ON public.tasks 
    FOR UPDATE 
    USING (
        public.is_admin() OR 
        public.has_permission('manage_projects') OR
        creator_id = public.get_current_team_member_id() OR
        (public.has_permission('edit_tasks') AND assigned_to = public.get_current_team_member_id()) OR
        project_id IN (
            SELECT p.id 
            FROM public.projects p
            WHERE p.members @> ('[{"team_member_id": ' || public.get_current_team_member_id() || '}]')::jsonb OR
                  p.members @> ('[{"teamMemberId": ' || public.get_current_team_member_id() || '}]')::jsonb
        )
    );

-- 4. DELETE: Only admins, those with delete_tasks, or creators
CREATE POLICY "tasks_delete" ON public.tasks 
    FOR DELETE 
    USING (
        public.has_permission('delete_tasks') OR
        public.is_admin() OR 
        creator_id = public.get_current_team_member_id()
    );
