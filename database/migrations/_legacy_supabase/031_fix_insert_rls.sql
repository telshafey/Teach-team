-- 031_fix_insert_rls.sql
-- Fix INSERT/DELETE RLS policies for task_comments and task_attachments to work with user clients.

BEGIN;

-- 1. Fix task_comments INSERT policy
DROP POLICY IF EXISTS "task_comments_insert_policy_v2" ON public.task_comments;
DROP POLICY IF EXISTS "task_comments_insert_policy_v3" ON public.task_comments;

CREATE POLICY "task_comments_insert_policy_v3" ON public.task_comments
  FOR INSERT TO authenticated WITH CHECK (
    public.is_admin() OR 
    public.get_current_team_member_id() IN (
      SELECT p.creator_id FROM public.projects p WHERE p.id = (SELECT project_id FROM tasks WHERE id = task_comments.task_id)
      UNION
      SELECT (member->>'team_member_id')::int 
      FROM public.projects p, jsonb_array_elements(p.members) as member 
      WHERE p.id = (SELECT project_id FROM tasks WHERE id = task_comments.task_id)
    )
  );

-- 2. Fix task_attachments INSERT policy
DROP POLICY IF EXISTS "task_attachments_insert_policy_v2" ON public.task_attachments;
DROP POLICY IF EXISTS "task_attachments_insert_policy_v3" ON public.task_attachments;

CREATE POLICY "task_attachments_insert_policy_v3" ON public.task_attachments
  FOR INSERT TO authenticated WITH CHECK (
    public.is_admin() OR 
    public.get_current_team_member_id() IN (
      SELECT p.creator_id FROM public.projects p WHERE p.id = (SELECT project_id FROM tasks WHERE id = task_attachments.task_id)
      UNION
      SELECT (member->>'team_member_id')::int 
      FROM public.projects p, jsonb_array_elements(p.members) as member 
      WHERE p.id = (SELECT project_id FROM tasks WHERE id = task_attachments.task_id)
    )
  );

-- 3. Fix task_attachments DELETE policy
DROP POLICY IF EXISTS "task_attachments_delete_policy_v2" ON public.task_attachments;
DROP POLICY IF EXISTS "task_attachments_delete_policy_v3" ON public.task_attachments;

CREATE POLICY "task_attachments_delete_policy_v3" ON public.task_attachments
  FOR DELETE TO authenticated USING (
    public.is_admin() OR 
    uploader_id = public.get_current_team_member_id()
  );

COMMIT;
