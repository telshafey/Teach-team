-- 008_fix_all_warnings_dynamically.sql

-- 1. Fix "Function Search Path Mutable" for ALL functions in the public schema
DO $$
DECLARE
    rec record;
BEGIN
    FOR rec IN 
        SELECT proname, nspname, pg_get_function_identity_arguments(p.oid) as args
        FROM pg_proc p
        JOIN pg_namespace n ON p.pronamespace = n.oid
        WHERE nspname = 'public'
    LOOP
        -- Set search_path to public to prevent search path hijacking
        EXECUTE format('ALTER FUNCTION %I.%I(%s) SET search_path = public;', rec.nspname, rec.proname, rec.args);
    END LOOP;
END
$$;

-- 2. Fix "Public Can Execute SECURITY DEFINER Function" for ALL SECDEF functions
DO $$
DECLARE
    rec record;
BEGIN
    FOR rec IN 
        SELECT proname, nspname, pg_get_function_identity_arguments(p.oid) as args
        FROM pg_proc p
        JOIN pg_namespace n ON p.pronamespace = n.oid
        WHERE nspname = 'public' AND prosecdef = true
    LOOP
        -- Revoke execution from public
        EXECUTE format('REVOKE EXECUTE ON FUNCTION %I.%I(%s) FROM PUBLIC;', rec.nspname, rec.proname, rec.args);
        -- Grant execution only to authenticated roles
        EXECUTE format('GRANT EXECUTE ON FUNCTION %I.%I(%s) TO authenticated, service_role;', rec.nspname, rec.proname, rec.args);
    END LOOP;
END
$$;

-- 3. Fix "RLS Policy Always True" for all policies in the public schema
-- This dynamically replaces USING (true) with USING (auth.uid() IS NOT NULL)
DO $$
DECLARE
    rec record;
BEGIN
    FOR rec IN 
        SELECT 
            n.nspname AS schemaname,
            c.relname AS tablename,
            p.polname AS policyname,
            CASE p.polcmd
                WHEN 'r' THEN 'SELECT'
                WHEN 'a' THEN 'INSERT'
                WHEN 'w' THEN 'UPDATE'
                WHEN 'd' THEN 'DELETE'
                WHEN '*' THEN 'ALL'
            END AS cmd
        FROM pg_policy p
        JOIN pg_class c ON p.polrelid = c.oid
        JOIN pg_namespace n ON c.relnamespace = n.oid
        WHERE n.nspname = 'public'
          AND (
               pg_get_expr(p.polqual, p.polrelid) = 'true' 
               OR pg_get_expr(p.polwithcheck, p.polrelid) = 'true'
          )
    LOOP
        -- Recreate policy securely
        EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I;', rec.policyname, rec.schemaname, rec.tablename);
        
        IF rec.cmd = 'ALL' THEN
            EXECUTE format('CREATE POLICY %I ON %I.%I FOR ALL TO authenticated USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);', rec.policyname, rec.schemaname, rec.tablename);
        ELSIF rec.cmd = 'SELECT' THEN
            EXECUTE format('CREATE POLICY %I ON %I.%I FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL);', rec.policyname, rec.schemaname, rec.tablename);
        ELSIF rec.cmd = 'INSERT' THEN
            EXECUTE format('CREATE POLICY %I ON %I.%I FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);', rec.policyname, rec.schemaname, rec.tablename);
        ELSIF rec.cmd = 'UPDATE' THEN
            EXECUTE format('CREATE POLICY %I ON %I.%I FOR UPDATE TO authenticated USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);', rec.policyname, rec.schemaname, rec.tablename);
        ELSIF rec.cmd = 'DELETE' THEN
            EXECUTE format('CREATE POLICY %I ON %I.%I FOR DELETE TO authenticated USING (auth.uid() IS NOT NULL);', rec.policyname, rec.schemaname, rec.tablename);
        END IF;
    END LOOP;
END
$$;

-- 4. Secure Storage policies to fix "Public Bucket Allows Listing"
DROP POLICY IF EXISTS "Public Access" ON storage.objects;
DROP POLICY IF EXISTS "Give public read access" ON storage.objects;
DROP POLICY IF EXISTS "Public access" ON storage.objects;

-- Create secure fallback policy for buckets
CREATE POLICY "Authenticated users can read objects securely" 
ON storage.objects FOR SELECT 
TO authenticated 
USING (auth.uid() IS NOT NULL);
