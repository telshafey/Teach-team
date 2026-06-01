-- =====================================
-- Production RLS Policies (Row Level Security)
-- =====================================
-- قم بتشغيل هذا الملف في Supabase SQL Editor عند الانتقال للإنتاج

-- 1. دوال مساعدة للتحقق من هوية المستخدم وصلاحياته
CREATE OR REPLACE FUNCTION get_current_member_id()
RETURNS INTEGER AS $$
  SELECT id FROM team_members WHERE auth_user_id = auth.uid() LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION get_current_member_permissions()
RETURNS TEXT[] AS $$
  SELECT roles.permissions 
  FROM team_members 
  JOIN roles ON team_members.role_id = roles.id 
  WHERE team_members.auth_user_id = auth.uid() LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION has_permission(req_permission TEXT)
RETURNS BOOLEAN AS $$
  SELECT req_permission = ANY(get_current_member_permissions());
$$ LANGUAGE sql SECURITY DEFINER;


-- 2. تفعيل RLS على الجداول الأساسية
ALTER TABLE roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_logs ENABLE ROW LEVEL SECURITY;

-- 3. سياسات فريق العمل (team_members)
-- الجميع يمكنه رؤية أعضاء الفريق
CREATE POLICY "View team members" ON team_members FOR SELECT USING (true);
-- فقط من لديه صلاحية إدارة الفريق يمكنه التعديل
CREATE POLICY "Manage team members" ON team_members FOR ALL USING (has_permission('manage_team'));

-- 4. سياسات المشاريع (projects)
-- الجميع يمكنه رؤية المشاريع
CREATE POLICY "View projects" ON projects FOR SELECT USING (true);
-- من لديه صلاحية فقط يمكنه الإضافة والتعديل والحذف
CREATE POLICY "Manage projects" ON projects FOR ALL USING (has_permission('manage_projects'));

-- 5. سياسات المهام (tasks)
-- رؤية المهام: يرى الموظف المهام المسندة إليه، أو التي أنشأها، أو إذا كان مديراً للمشاريع
CREATE POLICY "View tasks" ON tasks FOR SELECT USING (
  assigned_to = get_current_member_id() 
  OR creator_id = get_current_member_id() 
  OR has_permission('manage_projects')
);
-- إضافة المهام
CREATE POLICY "Insert tasks" ON tasks FOR INSERT WITH CHECK (
  creator_id = get_current_member_id()
  OR has_permission('create_tasks')
);
-- تعديل المهام: يمكن تسليم المهمة من قبل الموظف، أو التعديل الشامل من قبل المدير
CREATE POLICY "Update tasks" ON tasks FOR UPDATE USING (
  assigned_to = get_current_member_id() 
  OR creator_id = get_current_member_id() 
  OR has_permission('manage_projects')
);
-- حذف المهام
CREATE POLICY "Delete tasks" ON tasks FOR DELETE USING (
  creator_id = get_current_member_id() 
  OR has_permission('manage_projects')
);

-- 6. سياسات سجلات العمل اليومية (daily_logs)
CREATE POLICY "View daily logs" ON daily_logs FOR SELECT USING (
  team_member_id = get_current_member_id() 
  OR has_permission('view_reports')
);
CREATE POLICY "Insert daily logs" ON daily_logs FOR INSERT WITH CHECK (
  team_member_id = get_current_member_id()
);
CREATE POLICY "Update daily logs" ON daily_logs FOR UPDATE USING (
  team_member_id = get_current_member_id()
);
CREATE POLICY "Delete daily logs" ON daily_logs FOR DELETE USING (
  team_member_id = get_current_member_id()
);
