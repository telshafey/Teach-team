-- 023_fix_site_settings_rls.sql

-- Enable public select access on site_settings so the Auth Page can read the login title/subtitle and support email before login.

DO $$
DECLARE
    pol RECORD;
BEGIN
    FOR pol IN SELECT policyname FROM pg_policies WHERE tablename = 'site_settings' AND schemaname = 'public' LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.site_settings', pol.policyname);
    END LOOP;
END
$$;

-- Allow anyone to select site settings
CREATE POLICY "site_settings_select_policy" 
    ON public.site_settings 
    FOR SELECT 
    USING (true);

-- Allow admins to do everything
CREATE POLICY "site_settings_all_policy" 
    ON public.site_settings 
    FOR ALL 
    TO authenticated 
    USING (public.is_admin()) 
    WITH CHECK (public.is_admin());
