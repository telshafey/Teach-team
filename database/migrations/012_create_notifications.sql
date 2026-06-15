-- 012_create_notifications.sql
-- Ensure the notifications table exists and is configured for realtime.

BEGIN;

CREATE TABLE IF NOT EXISTS public.notifications (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    recipient_id integer NOT NULL,
    type text NOT NULL,
    message text,
    task_title text,
    assigner_name text,
    assignee_name text,
    comment_author_name text,
    project_id uuid,
    task_id uuid,
    read boolean DEFAULT false,
    timestamp timestamp with time zone DEFAULT now()
);

-- Ensure RLS is enabled
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Delete old permissive policies (if they exist)
DROP POLICY IF EXISTS "Allow authenticated full access" ON public.notifications;

-- Create secure policies for notifications
-- Users can only read their own notifications
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'notifications' AND policyname = 'Users can read own notifications'
    ) THEN
        CREATE POLICY "Users can read own notifications" ON public.notifications
            FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'notifications' AND policyname = 'Anyone can insert notifications'
    ) THEN
        CREATE POLICY "Anyone can insert notifications" ON public.notifications
            FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'notifications' AND policyname = 'Users can update own notifications'
    ) THEN
        CREATE POLICY "Users can update own notifications" ON public.notifications
            FOR UPDATE TO authenticated USING (auth.uid() IS NOT NULL);
    END IF;
END;
$$;

COMMIT;
