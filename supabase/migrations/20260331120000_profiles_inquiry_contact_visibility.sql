-- 物件ページ・比較などでエージェントの電話・LINE 問い合わせ導線を出すか（メールフォームは常に利用可能想定）
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS show_phone_in_inquiry BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS show_line_in_inquiry BOOLEAN NOT NULL DEFAULT true;

COMMENT ON COLUMN public.profiles.show_phone_in_inquiry IS '公開側で電話（tel）問い合わせを表示するか';
COMMENT ON COLUMN public.profiles.show_line_in_inquiry IS '公開側でLINE問い合わせボタンを表示するか';
