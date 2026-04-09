-- 物件ページの電話・LINE 表示制御（既に 20260331120000 で追加済みの環境では no-op）
-- カラム名は show_phone_inquiry ではなく show_phone_in_inquiry（_in_ あり）
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS show_phone_in_inquiry BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS show_line_in_inquiry BOOLEAN NOT NULL DEFAULT true;

COMMENT ON COLUMN public.profiles.show_phone_in_inquiry IS '公開側で電話（tel）問い合わせを表示するか';
COMMENT ON COLUMN public.profiles.show_line_in_inquiry IS '公開側でLINE問い合わせ導線を表示するか';
