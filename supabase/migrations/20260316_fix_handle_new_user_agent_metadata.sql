-- 新規ユーザー作成時に raw_user_meta_data のエージェント情報を profiles に反映
-- ※ target_area カラムは 20260315_profiles_target_area.sql で追加済み想定
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  v_role text;
BEGIN
  v_role := COALESCE(NULLIF(trim(NEW.raw_user_meta_data->>'user_role'), ''), 'general');
  IF v_role NOT IN ('general', 'agent', 'admin') THEN
    v_role := 'general';
  END IF;

  INSERT INTO public.profiles (id, full_name, avatar_url, email, user_role, company_name, line_id, phone, target_area)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', ''),
    NEW.raw_user_meta_data->>'avatar_url',
    NEW.email,
    v_role,
    NULLIF(trim(NEW.raw_user_meta_data->>'company_name'), ''),
    NULLIF(trim(NEW.raw_user_meta_data->>'line_id'), ''),
    NULLIF(trim(COALESCE(NEW.raw_user_meta_data->>'phone', NEW.raw_user_meta_data->>'phone_number')), ''),
    NULLIF(trim(NEW.raw_user_meta_data->>'target_area'), '')
  )
  ON CONFLICT (id) DO UPDATE
  SET
    full_name = COALESCE(NULLIF(EXCLUDED.full_name, ''), profiles.full_name),
    avatar_url = COALESCE(EXCLUDED.avatar_url, profiles.avatar_url),
    email = COALESCE(EXCLUDED.email, profiles.email),
    user_role = CASE
      WHEN profiles.user_role = 'admin' THEN 'admin'
      WHEN EXCLUDED.user_role = 'agent' THEN 'agent'
      ELSE COALESCE(profiles.user_role, EXCLUDED.user_role, 'general')
    END,
    company_name = COALESCE(NULLIF(EXCLUDED.company_name, ''), profiles.company_name),
    line_id = COALESCE(NULLIF(EXCLUDED.line_id, ''), profiles.line_id),
    phone = COALESCE(NULLIF(EXCLUDED.phone, ''), profiles.phone),
    target_area = COALESCE(NULLIF(EXCLUDED.target_area, ''), profiles.target_area);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
