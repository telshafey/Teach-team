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

## 🔒 أمان قاعدة البيانات (هام)

لضمان أمان البيانات الحساسة، يجب تفعيل Row Level Security (RLS) على جداول معينة. تم تحديد ثغرة أمنية حيث أن جدول `contract_change_requests` لا يحتوي على RLS مفعل.

### جدول `contract_change_requests`

هذا الجدول يحتوي على معلومات الرواتب الحساسة. قم بتنفيذ الاستعلامات التالية في محرر SQL الخاص بـ Supabase لتأمين الجدول:

```sql
-- الخطوة 1: تفعيل أمان مستوى الصف للجدول
ALTER TABLE public.contract_change_requests ENABLE ROW LEVEL SECURITY;

-- الخطوة 2: إنشاء دوال مساعدة للحصول على معلومات المستخدم الحالي
-- (قد تكون هذه الدوال موجودة بالفعل، ولكن يتم تضمينها هنا للاكتمال)
CREATE OR REPLACE FUNCTION get_my_team_member_id()
RETURNS INT LANGUAGE sql STABLE AS $$
  SELECT id FROM public.team_members WHERE auth_user_id = auth.uid()
$$;

CREATE OR REPLACE FUNCTION get_my_role()
RETURNS TEXT LANGUAGE sql STABLE AS $$
  SELECT role_id FROM public.team_members WHERE auth_user_id = auth.uid()
$$;

-- الخطوة 3: إنشاء سياسات الأمان
-- السياسة 3.1: السماح للمستخدمين بعرض طلباتهم الخاصة
CREATE POLICY "Allow users to view their own requests"
ON public.contract_change_requests FOR SELECT
USING (auth.uid() = (SELECT auth_user_id FROM public.team_members WHERE id = team_member_id));

-- السياسة 3.2: السماح للمستخدمين بإنشاء طلبات لأنفسهم
CREATE POLICY "Allow users to create their own requests"
ON public.contract_change_requests FOR INSERT
WITH CHECK (auth.uid() = (SELECT auth_user_id FROM public.team_members WHERE id = team_member_id));

-- السياسة 3.3: السماح للمديرين بعرض وتحديث طلبات فرقهم
CREATE POLICY "Allow managers to manage their team's requests"
ON public.contract_change_requests FOR SELECT, UPDATE
USING ((SELECT reports_to FROM public.team_members WHERE id = team_member_id) = get_my_team_member_id());

-- السياسة 3.4: منح المدير العام صلاحية الوصول الكامل
CREATE POLICY "Allow GM full access"
ON public.contract_change_requests FOR ALL
USING (get_my_role() = 'gm');
```

### جدول `penalties` (الجزاءات)

هذا الجدول لتسجيل الجزاءات والخصومات. قم بتنفيذ الاستعلامات التالية لتأمين الجدول:

```sql
-- الخطوة 1: إنشاء دوال مساعدة (إذا لم تكن موجودة بالفعل)
-- هذه الدوال ضرورية لسياسات الأمان أدناه
CREATE OR REPLACE FUNCTION get_my_team_member_id()
RETURNS INT LANGUAGE sql STABLE AS $$
  SELECT id FROM public.team_members WHERE auth_user_id = auth.uid()
$$;

CREATE OR REPLACE FUNCTION get_my_role()
RETURNS TEXT LANGUAGE sql STABLE AS $$
  SELECT role_id FROM public.team_members WHERE auth_user_id = auth.uid()
$$;

-- الخطوة 2: إنشاء الجدول لتخزين الجزاءات
CREATE TABLE public.penalties (
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

-- الخطوة 3: تفعيل أمان مستوى الصف
ALTER TABLE public.penalties ENABLE ROW LEVEL SECURITY;

-- الخطوة 4: إنشاء سياسات الأمان
-- السياسة 4.1: السماح للمستخدمين بعرض جزاءاتهم الخاصة فقط
CREATE POLICY "Allow users to view their own penalties"
ON public.penalties FOR SELECT
USING (auth.uid() = (SELECT auth_user_id FROM public.team_members WHERE id = team_member_id));

-- السياسة 4.2: السماح للمديرين بإنشاء وعرض جزاءات فرقهم
CREATE POLICY "Allow managers to manage their team's penalties"
ON public.penalties FOR ALL
USING ((SELECT reports_to FROM public.team_members WHERE id = team_member_id) = get_my_team_member_id())
WITH CHECK ((SELECT reports_to FROM public.team_members WHERE id = team_member_id) = get_my_team_member_id());

-- السياسة 4.3: منح المدير العام صلاحية الوصول الكامل
CREATE POLICY "Allow GM full access to penalties"
ON public.penalties FOR ALL
USING (get_my_role() = 'gm');

-- السياسة 4.4: السماح للمستخدمين بتقديم استئناف (إذا تم تفعيل الميزة)
CREATE POLICY "Allow users to appeal their penalties"
ON public.penalties FOR UPDATE
USING (auth.uid() = (SELECT auth_user_id FROM public.team_members WHERE id = team_member_id))
WITH CHECK (status = 'appealed');
```


## 📁 هيكل المشروع

- `components/`: يحتوي على جميع مكونات React، منظمة حسب الميزات (لوحة التحكم، المشاريع، الفريق، إلخ) والعناصر العامة لواجهة المستخدم.
- `contexts/`: يوفر React Context لإدارة الحالة العامة للتطبيق (المصادقة، البيانات، المشاريع، إلخ).
- `services/`: وحدات للتفاعل مع واجهات برمجة التطبيقات الخارجية (Supabase, Gemini).
- `types.ts`: ملف مركزي لتعريفات TypeScript المستخدمة في جميع أنحاء التطبيق.
- `utils/`: دوال مساعدة لمهام مختلفة مثل تنسيق التواريخ، حساب التكاليف، وغيرها.