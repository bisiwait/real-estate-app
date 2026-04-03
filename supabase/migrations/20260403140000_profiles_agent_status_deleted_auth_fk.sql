-- エージェントの利用状態・論理削除
-- auth.users 削除後も profiles / 物件履歴を残すため、profiles.id → auth.users の CASCADE を外す。
-- properties.user_id は profiles(id) を参照し、auth 削除後も物件行を維持できるようにする。

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'active';
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_status_check;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_status_check CHECK (status IN ('active', 'suspended'));

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

COMMENT ON COLUMN public.profiles.status IS 'エージェントアカウント状態: active / suspended';
COMMENT ON COLUMN public.profiles.deleted_at IS '管理者による論理削除日時。設定後はログイン不可。';

UPDATE public.profiles
SET status = 'suspended'
WHERE COALESCE(is_suspended, false) = true
  AND status = 'active';

-- profiles.id → auth.users の外部キー解除（deleteUser 後も profiles を残す）
DO $$
DECLARE
  con_name text;
BEGIN
  SELECT c.conname INTO con_name
  FROM pg_constraint c
  WHERE c.conrelid = 'public.profiles'::regclass
    AND c.contype = 'f'
    AND c.confrelid = 'auth.users'::regclass
  LIMIT 1;
  IF con_name IS NOT NULL THEN
    EXECUTE format('ALTER TABLE public.profiles DROP CONSTRAINT %I', con_name);
  END IF;
END $$;

-- properties.user_id の参照先を profiles に変更（auth ユーザー削除後も FK 整合性を維持）
DO $$
DECLARE
  con_name text;
BEGIN
  SELECT c.conname INTO con_name
  FROM pg_constraint c
  JOIN pg_attribute a ON a.attrelid = c.conrelid AND a.attnum = ANY (c.conkey)
  WHERE c.conrelid = 'public.properties'::regclass
    AND c.contype = 'f'
    AND a.attname = 'user_id'
  LIMIT 1;
  IF con_name IS NOT NULL THEN
    EXECUTE format('ALTER TABLE public.properties DROP CONSTRAINT %I', con_name);
  END IF;
END $$;

ALTER TABLE public.properties DROP CONSTRAINT IF EXISTS properties_user_id_fkey;

ALTER TABLE public.properties
  ADD CONSTRAINT properties_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE SET NULL;
