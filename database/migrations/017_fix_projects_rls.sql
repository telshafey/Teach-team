-- Drop existing policies on projects
DO $$ 
DECLARE
    pol record;
BEGIN
    FOR pol IN
        SELECT policyname
        FROM pg_policies
        WHERE tablename = 'projects' AND schemaname = 'public'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.projects', pol.policyname);
    END LOOP;
END $$;

-- Allow anyone authenticated to insert projects
CREATE POLICY "projects_insert" ON public.projects 
    FOR INSERT 
    WITH CHECK (auth.uid() IS NOT NULL);

-- Allow anyone authenticated to select projects
CREATE POLICY "projects_select" ON public.projects 
    FOR SELECT 
    USING (auth.uid() IS NOT NULL);

-- Allow anyone authenticated to update projects
CREATE POLICY "projects_update" ON public.projects 
    FOR UPDATE 
    USING (auth.uid() IS NOT NULL);

-- Allow anyone authenticated to delete projects
CREATE POLICY "projects_delete" ON public.projects 
    FOR DELETE 
    USING (auth.uid() IS NOT NULL);
