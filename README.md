# أداة إدارة الفريق - Bokra Team

منصة ويب متكاملة ومتقدمة مصممة لتمكين فرق العمل التقنية من إدارة المشاريع، تتبع الوقت، وتنظيم سير العمل بكفاءة. تم بناء التطبيق باستخدام أحدث التقنيات مثل React، TypeScript، و Supabase، ويوفر واجهة مستخدم قوية وبديهية للمديرين وأعضاء الفريق على حد سواء.

## ✨ الميزات الرئيسية

- **لوحات تحكم مخصصة للأدوار**: واجهات مخصصة للمدير العام، مديري المشاريع، والأعضاء الأفراد، تعرض المعلومات الأكثر أهمية لكل دور.
- **إدارة المشاريع**: إنشاء وإدارة المشاريع، تحديد الميزانيات (بالساعات والقيمة المالية)، وتتبع التقدم المحرز.
- **إدارة المهام (Kanban)**: لوحة Kanban لكل مشروع لتنظيم المهام وتتبعها عبر مراحلها المختلفة (قائمة المهام، قيد التنفيذ، مكتملة).
- **تسجيل الدخول اليومي**: يمكن لأعضاء الفريق تسجيل ساعات عملهم وأنشطتهم اليومية، وربطها بمشاريع ومهام محددة.
- **هيكل الفريق التنظيمي**: عرض شجري واضح لهيكل الفريق يوضح التسلسل الإداري والعلاقات بين الأعضاء.
- **رؤى الأداء الذكية (AI)**: ملخصات أداء مدعومة بالذكاء الاصطناعي لأعضاء الفريق، بناءً على مهامهم وسجلاتهم اليومية باستخدام Google Gemini API.
- **اقتراح خطط العمل (AI)**: عند إنشاء مشروع جديد، يمكن للذكاء الاصطناعي اقتراح قائمة بالمهام الرئيسية بناءً على وصف المشروع.
- **التتبع المالي**: إدارة الرواتب، طلبات صرف المصروفات للموظفين، ومراجعة واعتماد عقود المستقلين (Freelancers).
- **اجتماعات عبر الإنترنت**: دمج كامل مع خدمة الاجتماعات المرئية Jitsi لعقد اجتماعات الفريق بسلاسة.
- **أدوار وصلاحيات قابلة للتخصيص**: تحكم دقيق ومفصل في الصلاحيات لتحديد ما يمكن لكل مستخدم رؤيته أو القيام به.
- **التقارير والتحليلات**: تصور البيانات عبر رسوم بيانية لفهم تكاليف المشاريع، إنتاجية الفريق، وتوزيع ساعات العمل، مع إمكانية تصدير التقارير كملفات CSV.
- **الوضع الليلي (Dark Mode)**: تصميم أنيق ومريح للعين للعمل في بيئات الإضاءة المنخفضة.

## 🛠️ التقنيات المستخدمة

- **الواجهة الأمامية (Frontend)**: React, TypeScript, Tailwind CSS
- **الخلفية وقاعدة البيانات (Backend & Database)**: Supabase (PostgreSQL, Auth, Realtime)
- **التكامل مع الذكاء الاصطناعي (AI)**: Google Gemini API
- **الاجتماعات المرئية (Video Conferencing)**: Jitsi Meet

## 🚀 بدء التشغيل

1.  **إعداد متغيرات البيئة**: تأكد من وجود ملف `.env` يحتوي على `API_KEY` الخاص بـ Google Gemini API. بدون هذا المفتاح، سيتم تعطيل الميزات المعتمدة على الذكاء الاصطناعي.
2.  **إعداد قاعدة البيانات**: التطبيق مهيأ للاتصال بـ Supabase. يمكن تعديل تفاصيل الاتصال من داخل إعدادات التطبيق (صفحة إعدادات قاعدة البيانات) بواسطة مسؤول النظام.
3.  **المصادقة (Authentication)**: يستخدم التطبيق Supabase Auth. يمكن للمستخدمين تسجيل الدخول للوصول إلى لوحات التحكم المخصصة لهم.

## ✅ Production Deployment Checklist

قبل نشر التطبيق في بيئة الإنتاج، تأكد من إكمال الخطوات التالية لضمان الأمان والأداء:

1.  **إعداد متغيرات البيئة (Environment Variables)**:
    -   **API\_KEY**: يجب تعيين متغير `API_KEY` الخاص بـ Google Gemini API في بيئة الإنتاج الخاصة بك. التطبيق لن يعمل بشكل صحيح بدونه.

2.  **أمان قاعدة البيانات (Database Security)**:
    -   **تفعيل RLS (الأهم)**: هذا هو أهم إجراء أمني. تأكد من أنك قمت بتطبيق سياسات أمان مستوى الصف (RLS) على جميع الجداول الحساسة كما هو موضح في قسم "أمان قاعدة البيانات (هام)" أدناه. **التطبيق غير آمن للإنتاج بدون تفعيل RLS.**
    -   **إعداد Supabase Storage**: تأكد من إنشاء "bucket" التخزين المطلوب وتطبيق سياسات الأمان (RLS) الخاصة به.


3.  **إعدادات Supabase**:
    -   **استخدام مشروع إنتاجي**: يوصى بشدة باستخدام مشروع Supabase منفصل للإنتاج وآخر للتطوير.
    -   **النسخ الاحتياطي (Backups)**: قم بتفعيل النسخ الاحتياطي التلقائي في لوحة تحكم Supabase لمشروع الإنتاج الخاص بك.

4.  **عملية البناء (Build Process)**:
    -   لا توجد خطوات يدوية مطلوبة. إطار العمل المستخدم يقوم تلقائيًا بتجميع وتصغير ملفات JavaScript و CSS لضمان أفضل أداء.

## 🔒 أمان قاعدة البيانات (هام)

لضمان أمان البيانات الحساسة، يجب تفعيل Row Level Security (RLS) على جداول معينة.

### دوال SQL المساعدة (Helper Functions)
قبل تطبيق سياسات الجداول، قم بإنشاء الدوال المساعدة التالية في محرر SQL الخاص بـ Supabase. هذه الدوال ضرورية لعمل السياسات بشكل صحيح.

```sql
-- دالة للحصول على `id` الخاص بالموظف الحالي من جدول team_members
CREATE OR REPLACE FUNCTION get_my_team_member_id()
RETURNS INT LANGUAGE sql STABLE AS $$
  SELECT id FROM public.team_members WHERE auth_user_id = auth.uid()
$$;

-- دالة للحصول على `role_id` الخاص بالموظف الحالي
CREATE OR REPLACE FUNCTION get_my_role()
RETURNS TEXT LANGUAGE sql STABLE AS $$
  SELECT role_id FROM public.team_members WHERE auth_user_id = auth.uid()
$$;
```

### جدول `contract_change_requests`
هذا الجدول يحتوي على معلومات الرواتب الحساسة. قم بتنفيذ الاستعلامات التالية في محرر SQL الخاص بـ Supabase لتأمين الجدول:

```sql
-- الخطوة 1: تفعيل أمان مستوى الصف للجدول
ALTER TABLE public.contract_change_requests ENABLE ROW LEVEL SECURITY;

-- الخطوة 2: حذف السياسات القديمة لجعل النص البرمجي قابلاً لإعادة التشغيل
DROP POLICY IF EXISTS "Allow users to view their own requests" ON public.contract_change_requests;
DROP POLICY IF EXISTS "Allow users to create their own requests" ON public.contract_change_requests;
DROP POLICY IF EXISTS "Allow managers to view their team's requests" ON public.contract_change_requests;
DROP POLICY IF EXISTS "Allow managers to update their team's requests" ON public.contract_change_requests;
DROP POLICY IF EXISTS "Allow GM full access" ON public.contract_change_requests;

-- الخطوة 3: إنشاء سياسات الأمان الصحيحة
CREATE POLICY "Allow users to view their own requests"
ON public.contract_change_requests FOR SELECT
USING (auth.uid() = (SELECT auth_user_id FROM public.team_members WHERE id = team_member_id));

CREATE POLICY "Allow users to create their own requests"
ON public.contract_change_requests FOR INSERT
WITH CHECK (auth.uid() = (SELECT auth_user_id FROM public.team_members WHERE id = team_member_id));

CREATE POLICY "Allow managers to view their team's requests"
ON public.contract_change_requests FOR SELECT
USING ((SELECT reports_to FROM public.team_members WHERE id = team_member_id) = get_my_team_member_id());
    
CREATE POLICY "Allow managers to update their team's requests"
ON public.contract_change_requests FOR UPDATE
USING ((SELECT reports_to FROM public.team_members WHERE id = team_member_id) = get_my_team_member_id());

CREATE POLICY "Allow GM full access"
ON public.contract_change_requests FOR ALL
USING (get_my_role() = 'gm');
```

### جدول `penalties` (الجزاءات)
هذا الجدول لتسجيل الجزاءات والخصومات. قم بتنفيذ الاستعلامات التالية لتأمين الجدول:

```sql
-- الخطوة 1: إنشاء الجدول لتخزين الجزاءات (إذا لم يكن موجودًا)
CREATE TABLE IF NOT EXISTS public.penalties (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_member_id INT NOT NULL REFERENCES public.team_members(id) ON DELETE CASCADE,
  issuer_id INT NOT NULL REFERENCES public.team_members(id),
  reason TEXT NOT NULL,
  amount NUMERIC NOT NULL CHECK (amount > 0),
  date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending', -- pending, approved, appealed, rejected
  appeal_reason TEXT,
  manager_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- الخطوة 2: تفعيل أمان مستوى الصف
ALTER TABLE public.penalties ENABLE ROW LEVEL SECURITY;

-- الخطوة 3: حذف السياسات القديمة لجعل النص البرمجي قابلاً لإعادة التشغيل
DROP POLICY IF EXISTS "Allow users to view their own penalties" ON public.penalties;
DROP POLICY IF EXISTS "Allow managers to manage their team's penalties" ON public.penalties;
DROP POLICY IF EXISTS "Allow GM full access to penalties" ON public.penalties;
DROP POLICY IF EXISTS "Allow users to appeal their penalties" ON public.penalties;

-- الخطوة 4: إنشاء سياسات الأمان الصحيحة
CREATE POLICY "Allow users to view their own penalties"
ON public.penalties FOR SELECT
USING (auth.uid() = (SELECT auth_user_id FROM public.team_members WHERE id = team_member_id));

CREATE POLICY "Allow managers to manage their team's penalties"
ON public.penalties FOR ALL
USING ((SELECT reports_to FROM public.team_members WHERE id = team_member_id) = get_my_team_member_id())
WITH CHECK ((SELECT reports_to FROM public.team_members WHERE id = team_member_id) = get_my_team_member_id());

CREATE POLICY "Allow GM full access to penalties"
ON public.penalties FOR ALL
USING (get_my_role() = 'gm');

CREATE POLICY "Allow users to appeal their penalties"
ON public.penalties FOR UPDATE
USING (auth.uid() = (SELECT auth_user_id FROM public.team_members WHERE id = team_member_id))
WITH CHECK (status = 'appealed');
```

### إعداد Supabase Storage (هام)
التطبيق يستخدم Supabase Storage لتخزين مرفقات المهام. يجب عليك إعداد bucket التخزين يدويًا.

1.  اذهب إلى لوحة تحكم Supabase لمشروعك.
2.  اذهب إلى قسم **Storage** من القائمة الجانبية.
3.  اضغط على **New bucket**.
4.  أدخل اسم الـ bucket: `task_attachments`.
5.  فعل خيار **Public bucket**.
6.  اضغط **Create bucket**.
7.  بعد إنشاء الـ bucket، اذهب إلى قسم **Policies** الخاص به وقم بإنشاء السياسات التالية (أو قم بتشغيل الأكواد التالية في محرر SQL):

```sql
-- حذف السياسات القديمة لجعل النص البرمجي قابلاً لإعادة التشغيل
DROP POLICY IF EXISTS "Allow authenticated users to upload" ON storage.objects;
DROP POLICY IF EXISTS "Allow public read access" ON storage.objects;
DROP POLICY IF EXISTS "Allow users to delete their own files" ON storage.objects;

-- إنشاء سياسات الأمان الصحيحة
CREATE POLICY "Allow authenticated users to upload"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'task_attachments');

CREATE POLICY "Allow public read access"
ON storage.objects FOR SELECT
USING (bucket_id = 'task_attachments');

-- The file path is structured as "{team_member_id}/{task_id}/{filename}"
-- This policy checks that the user's team_member ID matches the first folder in the file path.
CREATE POLICY "Allow users to delete their own files"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'task_attachments' AND (storage.foldername(name))[1] = (get_my_team_member_id())::text);
```


## 📁 هيكل المشروع

- `components/`: يحتوي على جميع مكونات React، منظمة حسب الميزات (لوحة التحكم، المشاريع، الفريق، إلخ) والعناصر العامة لواجهة المستخدم.
- `contexts/`: يوفر React Context لإدارة الحالة العامة للتطبيق (المصادقة، البيانات، المشاريع، إلخ).
- `services/`: وحدات للتفاعل مع واجهات برمجة التطبيقات الخارجية (Supabase, Gemini).
- `types.ts`: ملف مركزي لتعريفات TypeScript المستخدمة في جميع أنحاء التطبيق.
- `utils/`: دوال مساعدة لمهام مختلفة مثل تنسيق التواريخ، حساب التكاليف، وغيرها.