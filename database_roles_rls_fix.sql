-- إضافة سياسة تتيح للجميع قراءة الأدوار
CREATE POLICY "View roles" ON roles FOR SELECT USING (true);
-- إضافة سياسة تتيح الإدارة لمديري الأدوار
CREATE POLICY "Manage roles" ON roles FOR ALL USING (has_permission('manage_roles'));
