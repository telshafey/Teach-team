-- 024_approve_all_existing_tasks.sql
-- Approve any existing tasks that are pending

UPDATE public.tasks
SET approval_status = 'approved'
WHERE approval_status = 'pending';
