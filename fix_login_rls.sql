-- الرجاء تشغيل هذا الكود في محرر SQL في Supabase لديك
-- هذا الكود يحل مشكلة RLS التي تمنع المستخدمين الجدد من ربط حساباتهم بأنفسهم

-- 1. إضافة سياسة تسمح للمستخدم بتحديث سجله الخاص إذا كان الإيميل متطابقاً 
-- (للسماح بعملية الربط التلقائي عند أول تسجيل دخول)
CREATE POLICY "Allow users to link their own account" 
ON team_members 
FOR UPDATE 
USING (
  auth_user_id = auth.uid() OR 
  (auth_user_id IS NULL AND email = auth.jwt() ->> 'email')
);

-- 2. تأكيد صلاحية إدخال سجل جديد عند التسجيل
CREATE POLICY "Allow users to insert their own account" 
ON team_members 
FOR INSERT 
WITH CHECK (
  auth_user_id = auth.uid() AND 
  email = auth.jwt() ->> 'email'
);
