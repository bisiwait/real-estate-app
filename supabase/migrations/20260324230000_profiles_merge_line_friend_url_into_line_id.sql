-- LINE 友だち追加 URL を line_id が空の行へ移し、カラムを廃止（LINE連絡先は line_id に一本化）
-- line_friend_url が無い環境（マイグレーション未適用の DB 等）でも失敗しないようにする
DO $migration$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'profiles'
      AND column_name = 'line_friend_url'
  ) THEN
    UPDATE public.profiles
    SET line_id = NULLIF(btrim(line_friend_url::text), '')
    WHERE (line_id IS NULL OR btrim(line_id) = '')
      AND line_friend_url IS NOT NULL
      AND btrim(line_friend_url::text) <> '';

    ALTER TABLE public.profiles DROP COLUMN line_friend_url;
  END IF;
END $migration$;
