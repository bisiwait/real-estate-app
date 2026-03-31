-- preferred_reply_channel を email | line に統一し、問い合わせ者メールのバックアップ列 email を追加

ALTER TABLE public.inquiries ADD COLUMN IF NOT EXISTS email TEXT;

UPDATE public.inquiries SET email = inquirer_email WHERE email IS NULL AND inquirer_email IS NOT NULL;

COMMENT ON COLUMN public.inquiries.email IS '問い合わせ者メール（バックアップ。inquirer_email と同値をアプリから保存）';

ALTER TABLE public.inquiries DROP CONSTRAINT IF EXISTS inquiries_preferred_reply_channel_check;

UPDATE public.inquiries SET preferred_reply_channel = 'email' WHERE preferred_reply_channel = 'email_only';
UPDATE public.inquiries SET preferred_reply_channel = 'line' WHERE preferred_reply_channel = 'email_and_line';

UPDATE public.inquiries
SET preferred_reply_channel = 'email'
WHERE preferred_reply_channel IS NULL OR preferred_reply_channel NOT IN ('email', 'line');

ALTER TABLE public.inquiries ALTER COLUMN preferred_reply_channel SET DEFAULT 'email';

ALTER TABLE public.inquiries
  ADD CONSTRAINT inquiries_preferred_reply_channel_check
  CHECK (preferred_reply_channel IN ('email', 'line'));

COMMENT ON COLUMN public.inquiries.preferred_reply_channel IS 'email: メールで返信を受け取る希望 | line: LINEで返信を受け取る希望';
COMMENT ON COLUMN public.inquiries.line_user_id IS 'LIFF で取得した Messaging API のユーザーID（Uで始まる）。preferred_reply_channel=line のとき';
