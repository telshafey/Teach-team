-- 011_enable_realtime.sql
-- Enable realtime for all tables required by the frontend application

BEGIN;

-- Drop just in case it doesn't exist, ignore if it errors or just safely add
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_publication
        WHERE pubname = 'supabase_realtime'
    ) THEN
        CREATE PUBLICATION supabase_realtime;
    END IF;
END;
$$;

-- Add all required tables to the publication
-- We use DO block to suppress "already in publication" errors

DO $$
DECLARE
    table_name_var text;
    tables_list text[] := ARRAY[
        'notifications',
        'support_tickets',
        'ticket_comments',
        'site_settings',
        'meetings',
        'daily_logs',
        'team_members',
        'roles',
        'task_attachments',
        'task_comments',
        'tasks',
        'freelancer_contracts',
        'work_contract_change_requests',
        'overtime_requests',
        'expense_claims',
        'leave_requests',
        'projects',
        'project_members',
        'punch_clocks',
        'salary_adjustments',
        'salary_penalties'
    ];
BEGIN
    FOREACH table_name_var IN ARRAY tables_list
    LOOP
        IF EXISTS (
            SELECT FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name = table_name_var
        ) THEN
            BEGIN
                EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I;', table_name_var);
            EXCEPTION WHEN OTHERS THEN
                -- Table already in publication or other error, safely ignore
            END;
        END IF;
    END LOOP;
END;
$$;

COMMIT;
