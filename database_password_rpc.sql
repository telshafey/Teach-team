-- ==============================================================================
-- 💡 مشكلة كلمات المرور للأعضاء: السماح للمدير بتحديث كلمات مرور الأعضاء الآخرين
-- ==============================================================================
-- الرجاء نسخ هذا الكود بالكامل ولصقه في Supabase SQL Editor ثم الضغط على RUN
-- ==============================================================================

-- 1. التأكد من وجود إضافة التشفير المطلوبة لـ Supabase Auth
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

-- 2. إنشاء وظيفة قادرة على تحديث كلمات مرور المستخدمين (تعمل بصلاحيات مخفية)
CREATE OR REPLACE FUNCTION public.update_member_password(p_member_id INT, p_new_password TEXT)
RETURNS BOOLEAN AS $$
DECLARE
  v_auth_id UUID;
  v_has_permission BOOLEAN;
BEGIN
  -- التحقق من أن المستخدم الحالي لديه صلاحية إدارة الفريق 'manage_team'
  SELECT 'manage_team' = ANY(roles.permissions) INTO v_has_permission
  FROM public.team_members 
  JOIN public.roles ON team_members.role_id = roles.id 
  WHERE team_members.auth_user_id = auth.uid() LIMIT 1;
  
  IF v_has_permission IS NOT TRUE THEN
    RAISE EXCEPTION 'ليس لديك صلاحية لتعديل بيانات الأعضاء (مطلوب صلاحية manage_team)';
  END IF;

  -- العثور على المعرف الخاص بالمستخدم في جدول auth.users
  SELECT auth_user_id INTO v_auth_id FROM public.team_members WHERE id = p_member_id;

  IF v_auth_id IS NULL THEN
    RAISE EXCEPTION 'هذا الموظف غير مرتبط بحساب دخول على النظام بعد.';
  END IF;

  -- تحديث كلمة المرور في جدول auth.users مباشرة باستخدام طريقة التشفير المعتمدة
  UPDATE auth.users 
  SET encrypted_password = extensions.crypt(p_new_password, extensions.gen_salt('bf'))
  WHERE id = v_auth_id;

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
