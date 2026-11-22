# قاعدة بيانات Bokra على Neon

الملفات دي بتبني قاعدة البيانات كاملة من الصفر على أي Postgres (Neon أو محلي).
اتأخدت من نسخة Supabase بتاريخ **2026-07-26** واتظبطت عشان تشتغل من غير Supabase.

| الملف | بيعمل إيه |
| --- | --- |
| `000_auth_compat.sql` | الإضافات (`uuid-ossp`, `pgcrypto`)، الأدوار `anon` و `authenticated`، جدول `auth.users` بسيط، والدوال `auth.uid()` / `auth.jwt()` / `auth.role()` |
| `001_base_schema.sql` | الـ schema الكامل لـ `public`: 27 جدول، 118 سياسة RLS، 10 دوال |
| `002_grants_and_auth_triggers.sql` | صلاحيات الدور `authenticated` + الـ triggers اللي بتربط أي مستخدم جديد بـ `team_members` |

## التطبيق

```bash
export DATABASE_URL="postgresql://neondb_owner:...@ep-xxx.neon.tech/neondb?sslmode=require"
for f in database/neon/0*.sql; do
  psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f "$f" || break
done
```

## إزاي الـ RLS بيشتغل من غير Supabase

السياسات القديمة كلها مكتوبة على `auth.uid()` والدور `authenticated`، وفضلت زي ما هي.
السيرفر بعد ما يتحقق من توكن المستخدم يفتح transaction ويعمل:

```sql
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims',
  '{"sub":"<auth.users.id>","email":"<email>","role":"authenticated"}', true);
-- ... الاستعلامات هنا، وRLS بيتطبق عليها
```

استعلامات الأدمن اللي كانت بتستخدم `service_role` بتشتغل بيوزر الاتصال نفسه (owner) من غير `SET ROLE`.

اتجرب على Postgres نظيف بيوزر مش superuser (زي `neondb_owner` في Neon) وبالداتا الحقيقية:
المدير العام بيشوف 34 مهمة، والموظف بيشوف 4 بس، وحد مش موجود بيشوف 0،
و`anon` ممنوع من الجداول، و`auth.users` مش ظاهر لأي حد غير السيرفر.

## الداتا القديمة

الداتا (والمستخدمين بهاشات الباسوردات) **مش موجودة في الريبو ومينفعش تترفع عليه**.
هاشات الباسوردات bcrypt ومتوافقة مع `extensions.crypt()`، فالمستخدمين القدام يقدروا يدخلوا بنفس الباسورد.

## الملفات القديمة

`database/migrations/_legacy_supabase/` فيها migrations التعديلات القديمة بتاعة Supabase.
كلها متضمنة بالفعل في `001_base_schema.sql`، ومحفوظة للمرجع بس.
