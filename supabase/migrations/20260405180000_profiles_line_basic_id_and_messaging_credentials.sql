-- エージェントごとの LINE 公式（友だち追加 Basic ID は公開可、Messaging トークン類は anon から隠すため別テーブル）
-- profiles は「Allow public read access」があり channel_access_token を同テーブルに置くと漏洩するため、
-- 秘密は profile_line_messaging_credentials に分離する。

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS line_basic_id TEXT;

COMMENT ON COLUMN public.profiles.line_basic_id IS 'LINE公式アカウントの Basic ID（例: @abc1234）。物件ページの友だち追加 URL に使用。';

CREATE TABLE IF NOT EXISTS public.profile_line_messaging_credentials (
  user_id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  line_channel_access_token TEXT,
  line_channel_secret TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.profile_line_messaging_credentials IS 'LINE Messaging API 用。本人のみ RLS で参照・更新。サービスロールは API から担当エージェント分を読む。';
COMMENT ON COLUMN public.profile_line_messaging_credentials.line_channel_access_token IS 'Messaging API のチャネルアクセストークン（長期）';
COMMENT ON COLUMN public.profile_line_messaging_credentials.line_channel_secret IS 'チャネルシークレット（Webhook 署名検証等で利用可能。Push には不要）';

ALTER TABLE public.profile_line_messaging_credentials ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own LINE Messaging credentials" ON public.profile_line_messaging_credentials;
CREATE POLICY "Users manage own LINE Messaging credentials"
  ON public.profile_line_messaging_credentials
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

REVOKE ALL ON public.profile_line_messaging_credentials FROM anon;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.profile_line_messaging_credentials TO authenticated;
GRANT ALL ON public.profile_line_messaging_credentials TO service_role;
