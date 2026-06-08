-- profiles の SELECT ポリシー内で profiles を再参照していたため無限再帰が発生し、
-- anon キー経由の properties 一覧・詳細がすべて失敗していた。
-- is_admin() を SECURITY DEFINER に統一し、公開 read ポリシーを復元する。

CREATE OR REPLACE FUNCTION public.is_admin(user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE((
    SELECT (p.user_role = 'admin' OR p.is_admin IS TRUE)
    FROM public.profiles p
    WHERE p.id = user_id
  ), false);
$$;

DROP POLICY IF EXISTS "Profiles are readable by owner and admins" ON public.profiles;
CREATE POLICY "Profiles are readable by owner and admins"
  ON public.profiles
  FOR SELECT
  USING (auth.uid() = id OR public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Users can update own profile or admins can update all" ON public.profiles;
CREATE POLICY "Users can update own profile or admins can update all"
  ON public.profiles
  FOR UPDATE
  USING (auth.uid() = id OR public.is_admin(auth.uid()))
  WITH CHECK (auth.uid() = id OR public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Allow public read access to profiles" ON public.profiles;
CREATE POLICY "Allow public read access to profiles"
  ON public.profiles
  FOR SELECT
  USING (true);
