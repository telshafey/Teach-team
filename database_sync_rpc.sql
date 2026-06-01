-- قم بتشغيل هذا الملف في Supabase SQL Editor
CREATE OR REPLACE FUNCTION sync_auth_user()
RETURNS jsonb AS $$
DECLARE
  v_user_id uuid;
  v_email text;
  v_member_record record;
BEGIN
  v_user_id := auth.uid();
  v_email := auth.jwt() ->> 'email';

  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  -- 1. Check if auth_user_id is already linked
  SELECT * INTO v_member_record FROM public.team_members WHERE auth_user_id = v_user_id LIMIT 1;
  IF FOUND THEN
    RETURN jsonb_build_object('success', true, 'data', row_to_json(v_member_record));
  END IF;

  -- 2. Check if email exists to link
  SELECT * INTO v_member_record FROM public.team_members WHERE email = v_email LIMIT 1;
  IF FOUND THEN
    UPDATE public.team_members SET auth_user_id = v_user_id WHERE id = v_member_record.id;
    SELECT * INTO v_member_record FROM public.team_members WHERE id = v_member_record.id;
    RETURN jsonb_build_object('success', true, 'data', row_to_json(v_member_record));
  END IF;

  -- 3. Auto-create new team_member
  INSERT INTO public.team_members (auth_user_id, email, name, employment_type, avatar_url)
  VALUES (
    v_user_id, 
    v_email, 
    SPLIT_PART(v_email, '@', 1), 
    'full-time',
    'https://api.dicebear.com/8.x/initials/svg?seed=' || SPLIT_PART(v_email, '@', 1)
  )
  RETURNING * INTO v_member_record;

  RETURN jsonb_build_object('success', true, 'data', row_to_json(v_member_record));
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
