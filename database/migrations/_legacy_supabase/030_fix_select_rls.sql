-- 030_fix_select_rls.sql
-- Fix SELECT RLS policies to use the projects JSONB members list and creator_id instead of the legacy project_members table.

BEGIN;

-- 1. Fix task_comments SELECT policy
DROP POLICY IF EXISTS "task_comments_select_policy_v2" ON public.task_comments;
DROP POLICY IF EXISTS "task_comments_select_policy_v3" ON public.task_comments;
CREATE POLICY "task_comments_select_policy_v3" ON public.task_comments
  FOR SELECT TO authenticated USING (
    public.is_admin() OR 
    public.get_current_team_member_id() IN (
      SELECT p.creator_id FROM public.projects p WHERE p.id = (SELECT project_id FROM tasks WHERE id = task_comments.task_id)
      UNION
      SELECT (member->>'team_member_id')::int 
      FROM public.projects p, jsonb_array_elements(p.members) as member 
      WHERE p.id = (SELECT project_id FROM tasks WHERE id = task_comments.task_id)
    )
  );

-- 2. Fix task_attachments SELECT policy
DROP POLICY IF EXISTS "task_attachments_select_policy_v2" ON public.task_attachments;
DROP POLICY IF EXISTS "task_attachments_select_policy_v3" ON public.task_attachments;
CREATE POLICY "task_attachments_select_policy_v3" ON public.task_attachments
  FOR SELECT TO authenticated USING (
    public.is_admin() OR 
    public.get_current_team_member_id() IN (
      SELECT p.creator_id FROM public.projects p WHERE p.id = (SELECT project_id FROM tasks WHERE id = task_attachments.task_id)
      UNION
      SELECT (member->>'team_member_id')::int 
      FROM public.projects p, jsonb_array_elements(p.members) as member 
      WHERE p.id = (SELECT project_id FROM tasks WHERE id = task_attachments.task_id)
    )
  );

-- 3. Fix tasks SELECT policy
DROP POLICY IF EXISTS "tasks_select_policy_v2" ON public.tasks;
DROP POLICY IF EXISTS "tasks_select_policy_v3" ON public.tasks;
CREATE POLICY "tasks_select_policy_v3" ON public.tasks
  FOR SELECT TO authenticated USING (
    public.is_admin() OR 
    creator_id = public.get_current_team_member_id() OR 
    assigned_to = public.get_current_team_member_id() OR 
    public.get_current_team_member_id() IN (
      SELECT p.creator_id FROM public.projects p WHERE p.id = tasks.project_id
      UNION
      SELECT (member->>'team_member_id')::int 
      FROM public.projects p, jsonb_array_elements(p.members) as member 
      WHERE p.id = tasks.project_id
    )
  );

COMMIT;
