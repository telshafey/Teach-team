-- ==============================================================================
-- 💡 مشكلة الصلاحيات: ترقية الحساب إلى المدير العام (GM)
-- ==============================================================================
-- قم بنسخ هذا الكود ولصقه في Supabase SQL Editor وتشغيله
-- هذا سيعطي حسابك (تامر الشافعي) صلاحيات المدير العام لتتمكن من رؤية 
-- كل الفريق وإضافة/تعديل/حذف الأعضاء.
-- ==============================================================================

-- 1. ترقية الحساب لـ GM
UPDATE public.team_members 
SET role_id = (SELECT id FROM public.roles WHERE name LIKE '%(GM)%' LIMIT 1)
WHERE email = 'techbokra@gmail.com';

-- 2. (اختياري) إضافة صلاحية إدارة الفريق لـ المديرين أيضاً
UPDATE public.roles
SET permissions = array_append(permissions, 'manage_team')
WHERE name LIKE '%(Manager)%' AND NOT ('manage_team' = ANY(permissions));
