-- ==============================================================================
-- 💡 حل مشكلة Infinite Recursion في صلاحيات team_members
-- ==============================================================================
-- المشكلة كانت تحدث بسبب الاستعلام المباشر من جدول team_members بداخل سياق (Policy) الجدول نفسه
-- لتصحيح ذلك، ننقل كل عمليات القراءة من team_members المطلوبة داخل Policies إلى دوال SECURITY DEFINER

-- 1. الدالة الأولى: جلب ID الخاص بالموظف الحالي
CREATE OR REPLACE FUNCTION public.get_current_member_id()
RETURNS INTEGER AS $$
BEGIN
  RETURN (SELECT id FROM public.team_members WHERE auth_user_id = auth.uid() LIMIT 1);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 2. الدالة الثانية: جلب الصلاحيات الخاصة بالموظف الحالي
CREATE OR REPLACE FUNCTION public.get_current_member_permissions()
RETURNS TEXT[] AS $$
DECLARE
  v_perms TEXT[];
BEGIN
  SELECT roles.permissions INTO v_perms
  FROM public.team_members 
  JOIN public.roles ON team_members.role_id = roles.id 
  WHERE team_members.auth_user_id = auth.uid() LIMIT 1;
  
  RETURN COALESCE(v_perms, '{}'::TEXT[]);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 3. الدالة الثالثة: التأكد من امتلاك الموظف الحالي لصلاحية محددة
CREATE OR REPLACE FUNCTION public.has_permission(req_permission TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN req_permission = ANY(public.get_current_member_permissions());
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 4. الدالة الرابعة: جلب معرف المدير المباشر لمعرفة إنشائه
CREATE OR REPLACE FUNCTION public.get_my_manager_id()
RETURNS INTEGER AS $$
DECLARE
  v_manager_id INTEGER;
BEGIN
  SELECT reports_to INTO v_manager_id FROM public.team_members WHERE auth_user_id = auth.uid() LIMIT 1;
  RETURN v_manager_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 5. الدالة الخامسة: الفريق الذي تحت إدارتي (هيكلية شجرية)
CREATE OR REPLACE FUNCTION public.get_my_hierarchy()
RETURNS SETOF INTEGER AS $$
DECLARE
  v_me INTEGER;
BEGIN
  v_me := public.get_current_member_id();
  
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
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 6. الدالة السادسة: المشاريع التي يملكها فريقي أو أمتلكها
CREATE OR REPLACE FUNCTION public.get_my_accessible_projects()
RETURNS SETOF UUID AS $$
BEGIN
  RETURN QUERY 
  SELECT project_id FROM public.project_members WHERE team_member_id IN (SELECT public.get_my_hierarchy());
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;


-- =========================================================================================
-- الآن: تطبيق سياسات (Policies) خالية من الاستعلامات المباشرة التي تسبب (Infinite Recursion)
-- =========================================================================================

-- سياسات أعضاء الفريق (Team Members)
DROP POLICY IF EXISTS "View team members" ON public.team_members;
CREATE POLICY "View team members" ON public.team_members FOR SELECT USING (
  auth_user_id = auth.uid() -- الشرط الأول دائمًا ينجح ويخرج فوراً للمستخدم نفسه لمشاهدة بياناته
  OR public.has_permission('manage_team')
  OR public.has_permission('manage_projects')
  OR public.has_permission('create_tasks')
  OR id IN (SELECT public.get_my_hierarchy())
  OR id = public.get_my_manager_id()
  -- السماح برؤية الأعضاء المشتركين في نفس المشروع
  OR EXISTS (
      SELECT 1 FROM public.project_members pm1
      JOIN public.project_members pm2 ON pm1.project_id = pm2.project_id
      WHERE pm1.team_member_id = public.get_current_member_id()
      AND pm2.team_member_id = team_members.id
  )
);

-- لا نلغي الصلاحيات المدخلة مسبقاً، بل نضمن أن الموظف يمكنه الوصول
