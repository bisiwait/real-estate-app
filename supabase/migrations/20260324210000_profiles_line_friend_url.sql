-- 友だち追加用 URL（ID 検索オフでもエージェントが連絡できるように）
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS line_friend_url TEXT;

COMMENT ON COLUMN public.profiles.line_friend_url IS 'LINE 友だち追加 URL（line.me の共有リンク等）';
