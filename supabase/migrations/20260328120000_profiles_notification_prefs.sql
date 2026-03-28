-- マイページ「通知設定」用（送信ロジックは別途）。LINE Messaging 用 ID は OAuth / 連携処理で後から入る想定。
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS line_user_id TEXT;

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS notify_new_matching BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS notify_price_drop BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS notify_via_line BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS notify_via_email BOOLEAN NOT NULL DEFAULT true;

COMMENT ON COLUMN public.profiles.line_user_id IS 'LINE Messaging API のユーザーID（通知送信用）。OAuth の sub 等と別の場合あり。';
COMMENT ON COLUMN public.profiles.notify_new_matching IS '保存検索に合致する新着物件の通知を希望するか';
COMMENT ON COLUMN public.profiles.notify_price_drop IS 'お気に入り物件の価格下落通知を希望するか';
COMMENT ON COLUMN public.profiles.notify_via_line IS 'LINE で通知を受け取る';
COMMENT ON COLUMN public.profiles.notify_via_email IS 'メールで通知を受け取る';
