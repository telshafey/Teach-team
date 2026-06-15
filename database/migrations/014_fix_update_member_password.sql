-- update_member_password fix
CREATE OR REPLACE FUNCTION public.update_member_password(
    p_member_id integer,
    p_new_password text
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user_uuid uuid;
BEGIN
    IF NOT public.is_admin() THEN
        RAISE EXCEPTION 'ليس لديك صلاحية لتعديل كلمة المرور';
    END IF;

    SELECT auth_user_id INTO v_user_uuid
    FROM public.team_members
    WHERE id = p_member_id;

    IF v_user_uuid IS NULL THEN
        RAISE EXCEPTION 'المستخدم غير موجود';
    END IF;

    -- Update the auth.users table directly 
    -- Supabase stores it in encrypted_password
    UPDATE auth.users
    SET encrypted_password = crypt(p_new_password, gen_salt('bf'))
    WHERE id = v_user_uuid;
    
END;
$$;
