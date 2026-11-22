-- =====================================================================
-- 000_auth_compat.sql
-- طبقة توافق تخلي الـ schema القديم (المكتوب لـ Supabase) يشتغل على
-- أي Postgres عادي (Neon) من غير ما نعدّل الـ 118 سياسة RLS.
--
-- الفكرة: السيرفر (server.ts) بعد ما يتحقق من التوكن، بيفتح transaction
-- ويعمل:
--     SET LOCAL ROLE authenticated;
--     SELECT set_config('request.jwt.claims', '{"sub":"<uuid>","email":"...","role":"authenticated"}', true);
-- وبعدها أي استعلام بيتطبق عليه RLS بالظبط زي ما كان في Supabase.
-- =====================================================================

-- 1) الإضافات (Neon بيدعم الاتنين). بنحطهم في schema اسمها extensions
--    عشان الـ defaults القديمة بتنادي extensions.uuid_generate_v4() و extensions.crypt()
CREATE SCHEMA IF NOT EXISTS extensions;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

-- 2) الأدوار اللي السياسات مكتوبة عليها
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    CREATE ROLE anon NOLOGIN NOINHERIT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    CREATE ROLE authenticated NOLOGIN NOINHERIT;
  END IF;
END
$$;

-- يوزر الاتصال (owner) لازم يقدر يعمل SET ROLE للأدوار دي
GRANT anon TO CURRENT_USER;
GRANT authenticated TO CURRENT_USER;

-- 3) schema auth + جدول مستخدمين بسيط بدل auth.users بتاع Supabase
CREATE SCHEMA IF NOT EXISTS auth;

CREATE TABLE IF NOT EXISTS auth.users (
    id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    email              text UNIQUE NOT NULL,
    encrypted_password text,                       -- bcrypt (متوافق مع هاشات Supabase القديمة)
    email_confirmed_at timestamptz,
    last_sign_in_at    timestamptz,
    raw_user_meta_data jsonb NOT NULL DEFAULT '{}'::jsonb,
    created_at         timestamptz NOT NULL DEFAULT now(),
    updated_at         timestamptz NOT NULL DEFAULT now()
);

-- 4) نفس الدوال اللي Supabase بيوفرها، بتقرا من request.jwt.claims
CREATE OR REPLACE FUNCTION auth.jwt() RETURNS jsonb
    LANGUAGE sql STABLE
    AS $$
  SELECT coalesce(nullif(current_setting('request.jwt.claims', true), ''), '{}')::jsonb
$$;

CREATE OR REPLACE FUNCTION auth.uid() RETURNS uuid
    LANGUAGE sql STABLE
    AS $$
  SELECT nullif(auth.jwt() ->> 'sub', '')::uuid
$$;

CREATE OR REPLACE FUNCTION auth.role() RETURNS text
    LANGUAGE sql STABLE
    AS $$
  SELECT coalesce(auth.jwt() ->> 'role', 'anon')
$$;

CREATE OR REPLACE FUNCTION auth.email() RETURNS text
    LANGUAGE sql STABLE
    AS $$
  SELECT auth.jwt() ->> 'email'
$$;

GRANT USAGE ON SCHEMA auth, extensions TO anon, authenticated;
GRANT EXECUTE ON FUNCTION auth.jwt(), auth.uid(), auth.role(), auth.email() TO anon, authenticated;
-- جدول المستخدمين نفسه (فيه الباسوردات) مش متاح غير للسيرفر
REVOKE ALL ON auth.users FROM anon, authenticated;
