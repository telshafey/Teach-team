-- قم بتشغيل هذا الملف في محرر SQL في منصة Supabase
-- هذا سيقوم بربط أي مستخدم يسجل دخوله تلقائياً بجدول فريق العمل

CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS TRIGGER AS $$
BEGIN
  -- التحقق من وجود المستخدم بالإيميل أولاً
  IF EXISTS (SELECT 1 FROM public.team_members WHERE email = NEW.email) THEN
    -- تحديث الحساب الحالي وربطه
    UPDATE public.team_members SET auth_user_id = NEW.id WHERE email = NEW.email;
  ELSE
    -- إنشاء مستخدم جديد
    INSERT INTO public.team_members (auth_user_id, email, name, employment_type, avatar_url)
    VALUES (
      NEW.id, 
      NEW.email, 
      SPLIT_PART(NEW.email, '@', 1), 
      'full-time',
      'https://api.dicebear.com/8.x/initials/svg?seed=' || SPLIT_PART(NEW.email, '@', 1)
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- تفعيل المشغل على حدث الإنشاء في Supabase Auth
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- ==============================================================
-- 💡 خطوة إضافية للمستخدمين الحاليين (الذين سجلوا قبل تفعيل المشغل)
-- قم بتشغيل هذا الكود يدوياً مرة واحدة لربطهم:
-- ==============================================================
DO $$
DECLARE
  rec RECORD;
BEGIN
  FOR rec IN SELECT * FROM auth.users LOOP
    IF EXISTS (SELECT 1 FROM public.team_members WHERE email = rec.email) THEN
      UPDATE public.team_members SET auth_user_id = rec.id WHERE email = rec.email;
    ELSE
      INSERT INTO public.team_members (auth_user_id, email, name, employment_type, avatar_url)
      VALUES (
        rec.id, 
        rec.email, 
        SPLIT_PART(rec.email, '@', 1), 
        'full-time',
        'https://api.dicebear.com/8.x/initials/svg?seed=' || SPLIT_PART(rec.email, '@', 1)
      );
    END IF;
  END LOOP;
END;
$$;
