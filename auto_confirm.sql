-- ==============================================================================
-- 💡 مشكلة تسجيل الدخول: المستخدمون الجدد بحاجة لتأكيد البريد الإلكتروني
-- ==============================================================================
-- قم بنسخ هذا الكود ولصقه في Supabase SQL Editor وتشغيله
-- هذا سيفعل تأكيد البريد الإلكتروني تلقائياً للمستخدمين الجدد والموجودين
-- ==============================================================================

-- 1. تحديث كافة المستخدمين الحاليين ليصبح بريدهم مؤكداً
UPDATE auth.users 
SET email_confirmed_at = now() 
WHERE email_confirmed_at IS NULL;

-- 2. دالة لتعيين البريد كمؤكد تلقائياً عند التسجيل
CREATE OR REPLACE FUNCTION public.auto_confirm_email() 
RETURNS TRIGGER AS $$
BEGIN
  NEW.email_confirmed_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. تفعيل المشغل (Trigger) للاشتغال قبل إنشاء أي مستخدم جديد
DROP TRIGGER IF EXISTS on_auth_user_created_confirm ON auth.users;
CREATE TRIGGER on_auth_user_created_confirm
  BEFORE INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.auto_confirm_email();
