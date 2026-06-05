-- Enable RLS and setup policies for all tables to ensure the app works efficiently
-- This will secure the database from anonymous access but allow authenticated users to perform actions
-- since the application's interface handles role-based authorization.

DO $$
DECLARE
    table_name_var text;
    tables_list text[] := ARRAY[
        'team_members',
        'roles',
        'projects',
        'project_members',
        'tasks',
        'task_attachments',
        'task_comments',
        'daily_logs',
        'meetings',
        'meeting_members',
        'leave_requests',
        'overtime_requests',
        'expense_claims',
        'work_contract_change_requests',
        'penalties',
        'support_tickets',
        'ticket_comments',
        'notifications',
        'user_preferences',
        'site_settings',
        'freelancer_contracts'
    ];
BEGIN
    FOREACH table_name_var IN ARRAY tables_list
    LOOP
        -- Check if table exists before applying RLS
        IF EXISTS (
            SELECT FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name = table_name_var
        ) THEN
            -- Enable RLS
            EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY;', table_name_var);
            
            -- Drop policy if exists to avoid errors on rerun
            EXECUTE format('DROP POLICY IF EXISTS "Allow authenticated full access" ON %I;', table_name_var);
            
            -- Create policy for authenticated users
            EXECUTE format('
                CREATE POLICY "Allow authenticated full access" 
                ON %I 
                FOR ALL 
                TO authenticated 
                USING (true) 
                WITH CHECK (true);
            ', table_name_var);
        END IF;
    END LOOP;
END
$$;
