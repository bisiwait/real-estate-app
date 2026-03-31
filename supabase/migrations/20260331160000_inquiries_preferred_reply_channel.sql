-- フォーム問い合わせ: 返信チャネル希望と LINE Messaging API 用ユーザーID（Uで始まる）
ALTER TABLE public.inquiries
  ADD COLUMN IF NOT EXISTS preferred_reply_channel TEXT NOT NULL DEFAULT 'email_only';

ALTER TABLE public.inquiries
  ADD COLUMN IF NOT EXISTS line_user_id TEXT;

COMMENT ON COLUMN public.inquiries.preferred_reply_channel IS 'email_only | email_and_line（メールのみ / メール＋公式LINE通知）';
COMMENT ON COLUMN public.inquiries.line_user_id IS 'LIFF/LINEログインで取得した Messaging API のユーザーID。preferred_reply_channel=email_and_line 時に利用';

ALTER TABLE public.inquiries
  DROP CONSTRAINT IF EXISTS inquiries_preferred_reply_channel_check;

ALTER TABLE public.inquiries
  ADD CONSTRAINT inquiries_preferred_reply_channel_check
  CHECK (preferred_reply_channel IN ('email_only', 'email_and_line'));

CREATE INDEX IF NOT EXISTS idx_inquiries_preferred_reply_channel
  ON public.inquiries (preferred_reply_channel);
