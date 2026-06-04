-- ==============================================================================
-- 💡 تحديث هيكل الصلاحيات: ربط المهام والمشاريع بهيكلية المؤسسة والمديرين
-- ==============================================================================
-- الرجاء نسخ هذا الكود بالكامل ولصقه في Supabase SQL Editor ثم الضغط على RUN
-- ==============================================================================

-- 1. دالة لجلب الموظف الحالي (تتجاوز RLS لأنها SECURITY DEFINER)
CREATE OR REPLACE FUNCTION public.get_current_member_id()
RETURNS INTEGER AS $$
  SELECT id FROM public.team_members WHERE auth_user_id = auth.uid() LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER;

-- 2. دالة لجلب جميع الموظفين الذين تحت إدارة الموظف الحالي (شجرة متسلسلة)
CREATE OR REPLACE FUNCTION public.get_my_hierarchy()
RETURNS SETOF INTEGER AS $$
DECLARE
  v_me INTEGER;
BEGIN
  SELECT public.get_current_member_id() INTO v_me;
  
  IF v_me IS NULL THEN
    RETURN;
  END IF;

  RETURN QUERY SELECT v_me;
  
  RETURN QUERY
  WITH RECURSIVE subs AS (
    SELECT id, ARRAY[id] as visited FROM public.team_members WHERE reports_to = v_me
    UNION ALL
    SELECT tm.id, s.visited || tm.id 
    FROM public.team_members tm
    INNER JOIN subs s ON tm.reports_to = s.id
    WHERE tm.id <> ALL(s.visited)
  )
  SELECT id FROM subs;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. دالة مساعدة لمعرفة المشاريع التي أمتلك وصولاً لها أو التي لدى فريقي وصول لها
CREATE OR REPLACE FUNCTION public.get_my_accessible_projects()
RETURNS SETOF UUID AS $$
BEGIN
  RETURN QUERY 
  SELECT project_id FROM public.project_members WHERE team_member_id IN (SELECT public.get_my_hierarchy());
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ==========================================
-- سياسات أعضاء الفريق (Team Members)
-- ==========================================
DROP POLICY IF EXISTS "View team members" ON public.team_members;
CREATE POLICY "View team members" ON public.team_members FOR SELECT USING (
  public.has_permission('manage_team')
  OR public.has_permission('manage_projects')
  OR public.has_permission('create_tasks')
  OR id IN (SELECT public.get_my_hierarchy())
  OR id = (SELECT reports_to FROM public.team_members WHERE id = public.get_current_member_id())
  OR EXISTS (
      SELECT 1 FROM public.project_members pm1
      JOIN public.project_members pm2 ON pm1.project_id = pm2.project_id
      WHERE pm1.team_member_id = public.get_current_member_id()
      AND pm2.team_member_id = team_members.id
  )
);

-- ==========================================
-- سياسات المشاريع (Projects)
-- ==========================================
DROP POLICY IF EXISTS "View projects" ON public.projects;
CREATE POLICY "View projects" ON public.projects FOR SELECT USING (
  public.has_permission('manage_projects')
  OR id IN (SELECT public.get_my_accessible_projects())
);

-- ==========================================
-- سياسات المهام (Tasks)
-- ==========================================
DROP POLICY IF EXISTS "View tasks" ON public.tasks;
CREATE POLICY "View tasks" ON public.tasks FOR SELECT USING (
  public.has_permission('manage_projects')
  OR assigned_to IN (SELECT public.get_my_hierarchy())
  OR creator_id IN (SELECT public.get_my_hierarchy())
  OR project_id IN (SELECT public.get_my_accessible_projects())
);

DROP POLICY IF EXISTS "Update tasks" ON public.tasks;
CREATE POLICY "Update tasks" ON public.tasks FOR UPDATE USING (
  public.has_permission('manage_projects')
  OR assigned_to = public.get_current_member_id()
  OR creator_id = public.get_current_member_id()
  OR assigned_to IN (SELECT public.get_my_hierarchy())
);

-- ==========================================
-- سياسات سجلات العمل اليومية (Daily Logs)
-- ==========================================
DROP POLICY IF EXISTS "View daily logs" ON public.daily_logs;
CREATE POLICY "View daily logs" ON public.daily_logs FOR SELECT USING (
  public.has_permission('view_reports')
  OR public.has_permission('manage_team')
  OR team_member_id IN (SELECT public.get_my_hierarchy())
);

-- ==========================================
-- سياسات طلبات الإجازة (Leave Requests)
-- ==========================================
DROP POLICY IF EXISTS "View leave requests" ON public.leave_requests;
CREATE POLICY "View leave requests" ON public.leave_requests FOR SELECT USING (
  public.has_permission('approve_leave_requests')
  OR public.has_permission('manage_team')
  OR team_member_id IN (SELECT public.get_my_hierarchy())
);

-- ==========================================
-- سياسات العمل الإضافي (Overtime Requests)
-- ==========================================
DROP POLICY IF EXISTS "View overtime requests" ON public.overtime_requests;
CREATE POLICY "View overtime requests" ON public.overtime_requests FOR SELECT USING (
  public.has_permission('approve_overtime')
  OR public.has_permission('manage_team')
  OR team_member_id IN (SELECT public.get_my_hierarchy())
);

-- ==========================================
-- سياسات النفقات والمصروفات (Expense Claims)
-- ==========================================
DROP POLICY IF EXISTS "View expense claims" ON public.expense_claims;
CREATE POLICY "View expense claims" ON public.expense_claims FOR SELECT USING (
  public.has_permission('approve_expense_claims')
  OR public.has_permission('view_finances')
  OR team_member_id IN (SELECT public.get_my_hierarchy())
);

-- ==========================================
-- سياسات الجزاءات (Penalties)
-- ==========================================
DROP POLICY IF EXISTS "View penalties" ON public.penalties;
CREATE POLICY "View penalties" ON public.penalties FOR SELECT USING (
  public.has_permission('approve_penalties')
  OR public.has_permission('manage_team')
  OR team_member_id IN (SELECT public.get_my_hierarchy())
);
