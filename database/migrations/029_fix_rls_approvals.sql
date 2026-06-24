-- 029_fix_rls_approvals.sql
-- Fix approval and management permissions for non-admin managers in RLS policies

-- 1. team_members (Allow all authenticated users to SELECT co-workers so project/task/comment UIs can resolve names and dropdowns)
DROP POLICY IF EXISTS "team_members_select_policy_v2" ON public.team_members;
DROP POLICY IF EXISTS "team_members_select_policy" ON public.team_members;
CREATE POLICY "team_members_select_policy_v2" ON public.team_members
  FOR SELECT TO authenticated USING (true);

-- 2. leave_requests (Allow managers with approve_leave_requests permission to view and approve/update requests)
DROP POLICY IF EXISTS "leave_requests_select_policy_v2" ON public.leave_requests;
DROP POLICY IF EXISTS "leave_requests_update_policy_v2" ON public.leave_requests;

CREATE POLICY "leave_requests_select_policy_v2" ON public.leave_requests
  FOR SELECT TO authenticated USING (
    team_member_id = public.get_current_team_member_id() 
    OR public.is_admin() 
    OR public.has_permission('approve_leave_requests')
  );

CREATE POLICY "leave_requests_update_policy_v2" ON public.leave_requests
  FOR UPDATE TO authenticated USING (
    team_member_id = public.get_current_team_member_id() 
    OR public.is_admin() 
    OR public.has_permission('approve_leave_requests')
  ) WITH CHECK (
    team_member_id = public.get_current_team_member_id() 
    OR public.is_admin() 
    OR public.has_permission('approve_leave_requests')
  );

-- 3. overtime_requests (Allow managers with approve_overtime permission to view and approve/update requests)
DROP POLICY IF EXISTS "overtime_requests_select_policy_v2" ON public.overtime_requests;
DROP POLICY IF EXISTS "overtime_requests_update_policy_v2" ON public.overtime_requests;

CREATE POLICY "overtime_requests_select_policy_v2" ON public.overtime_requests
  FOR SELECT TO authenticated USING (
    team_member_id = public.get_current_team_member_id() 
    OR public.is_admin() 
    OR public.has_permission('approve_overtime')
  );

CREATE POLICY "overtime_requests_update_policy_v2" ON public.overtime_requests
  FOR UPDATE TO authenticated USING (
    team_member_id = public.get_current_team_member_id() 
    OR public.is_admin() 
    OR public.has_permission('approve_overtime')
  ) WITH CHECK (
    team_member_id = public.get_current_team_member_id() 
    OR public.is_admin() 
    OR public.has_permission('approve_overtime')
  );

-- 4. expense_claims (Allow managers with approve_expense_claims or view_finances to view, and with approve_expense_claims to update)
DROP POLICY IF EXISTS "expense_claims_select_policy_v2" ON public.expense_claims;
DROP POLICY IF EXISTS "expense_claims_update_policy_v2" ON public.expense_claims;

CREATE POLICY "expense_claims_select_policy_v2" ON public.expense_claims
  FOR SELECT TO authenticated USING (
    team_member_id = public.get_current_team_member_id() 
    OR public.is_admin() 
    OR public.has_permission('approve_expense_claims')
    OR public.has_permission('view_finances')
  );

CREATE POLICY "expense_claims_update_policy_v2" ON public.expense_claims
  FOR UPDATE TO authenticated USING (
    team_member_id = public.get_current_team_member_id() 
    OR public.is_admin() 
    OR public.has_permission('approve_expense_claims')
  ) WITH CHECK (
    team_member_id = public.get_current_team_member_id() 
    OR public.is_admin() 
    OR public.has_permission('approve_expense_claims')
  );

-- 5. penalties (Allow managers with issue_penalties or approve_penalties to view/manage penalties)
DROP POLICY IF EXISTS "penalties_select_policy_v2" ON public.penalties;
DROP POLICY IF EXISTS "penalties_all_policy_v2" ON public.penalties;
DROP POLICY IF EXISTS "penalties_insert_policy_v2" ON public.penalties;
DROP POLICY IF EXISTS "penalties_update_policy_v2" ON public.penalties;
DROP POLICY IF EXISTS "penalties_delete_policy_v2" ON public.penalties;

CREATE POLICY "penalties_select_policy_v2" ON public.penalties
  FOR SELECT TO authenticated USING (
    team_member_id = public.get_current_team_member_id() 
    OR public.is_admin() 
    OR public.has_permission('issue_penalties')
    OR public.has_permission('approve_penalties')
  );

CREATE POLICY "penalties_insert_policy_v2" ON public.penalties
  FOR INSERT TO authenticated WITH CHECK (
    public.is_admin() 
    OR public.has_permission('issue_penalties')
  );

CREATE POLICY "penalties_update_policy_v2" ON public.penalties
  FOR UPDATE TO authenticated USING (
    public.is_admin() 
    OR public.has_permission('approve_penalties')
    OR public.has_permission('issue_penalties')
  ) WITH CHECK (
    public.is_admin() 
    OR public.has_permission('approve_penalties')
    OR public.has_permission('issue_penalties')
  );

CREATE POLICY "penalties_delete_policy_v2" ON public.penalties
  FOR DELETE TO authenticated USING (public.is_admin());

-- 6. work_contract_change_requests (Allow managers with approve_work_contract_changes or view_all_salaries to view, and with approve_work_contract_changes to update)
DROP POLICY IF EXISTS "work_contract_select_policy_v2" ON public.work_contract_change_requests;
DROP POLICY IF EXISTS "work_contract_update_policy_v2" ON public.work_contract_change_requests;
DROP POLICY IF EXISTS "work_contract_insert_policy_v2" ON public.work_contract_change_requests;
DROP POLICY IF EXISTS "work_contract_delete_policy_v2" ON public.work_contract_change_requests;

CREATE POLICY "work_contract_select_policy_v2" ON public.work_contract_change_requests
  FOR SELECT TO authenticated USING (
    team_member_id = public.get_current_team_member_id() 
    OR public.is_admin() 
    OR public.has_permission('approve_work_contract_changes')
    OR public.has_permission('view_all_salaries')
  );

CREATE POLICY "work_contract_insert_policy_v2" ON public.work_contract_change_requests
  FOR INSERT TO authenticated WITH CHECK (
    team_member_id = public.get_current_team_member_id() 
    OR public.is_admin()
  );

CREATE POLICY "work_contract_update_policy_v2" ON public.work_contract_change_requests
  FOR UPDATE TO authenticated USING (
    team_member_id = public.get_current_team_member_id() 
    OR public.is_admin() 
    OR public.has_permission('approve_work_contract_changes')
  ) WITH CHECK (
    team_member_id = public.get_current_team_member_id() 
    OR public.is_admin() 
    OR public.has_permission('approve_work_contract_changes')
  );

CREATE POLICY "work_contract_delete_policy_v2" ON public.work_contract_change_requests
  FOR DELETE TO authenticated USING (public.is_admin());

-- 7. Fix task_comments insert RLS policy (Allow project members and project creators to insert comments)
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

-- 8. Fix task_attachments insert RLS policy (Allow project members and project creators to upload attachments)
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

