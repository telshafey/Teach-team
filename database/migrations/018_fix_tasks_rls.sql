-- Drop existing policies on tasks
DO $$ 
DECLARE
    pol record;
BEGIN
    FOR pol IN
        SELECT policyname
        FROM pg_policies
        WHERE tablename = 'tasks' AND schemaname = 'public'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.tasks', pol.policyname);
    END LOOP;
END $$;

-- Policies for tasks table

-- 1. SELECT policy
CREATE POLICY "tasks_select" ON public.tasks 
    FOR SELECT 
    USING (
        CASE 
            WHEN public.is_admin() THEN true
            WHEN creator_id IN (SELECT id FROM public.team_members WHERE auth_user_id = auth.uid()) THEN true
            WHEN assigned_to IN (SELECT id FROM public.team_members WHERE auth_user_id = auth.uid()) THEN true
            WHEN project_id IN (
                SELECT project_id 
                FROM public.project_members pm
                JOIN public.team_members tm ON pm.team_member_id = tm.id
                WHERE tm.auth_user_id = auth.uid()
            ) THEN true
            ELSE false
        END
    );

-- 2. INSERT policy
CREATE POLICY "tasks_insert" ON public.tasks 
    FOR INSERT 
    WITH CHECK (auth.uid() IS NOT NULL);

-- 3. UPDATE policy
CREATE POLICY "tasks_update" ON public.tasks 
    FOR UPDATE 
    USING (
        CASE 
            WHEN public.is_admin() THEN true
            WHEN creator_id IN (SELECT id FROM public.team_members WHERE auth_user_id = auth.uid()) THEN true
            WHEN assigned_to IN (SELECT id FROM public.team_members WHERE auth_user_id = auth.uid()) THEN true
            WHEN project_id IN (
                SELECT project_id 
                FROM public.project_members pm
                JOIN public.team_members tm ON pm.team_member_id = tm.id
                WHERE tm.auth_user_id = auth.uid()
            ) THEN true
            ELSE false
        END
    );

-- 4. DELETE policy
CREATE POLICY "tasks_delete" ON public.tasks 
    FOR DELETE 
    USING (
        CASE 
            WHEN public.is_admin() THEN true
            WHEN creator_id IN (SELECT id FROM public.team_members WHERE auth_user_id = auth.uid()) THEN true
            ELSE false
        END
    );
