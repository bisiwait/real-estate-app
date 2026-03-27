-- 共有リンク（maps.app.goo.gl 等）をそのまま保存し、表示・「開く」に優先利用
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS google_maps_share_url TEXT;

COMMENT ON COLUMN public.projects.google_maps_share_url IS 'Google Maps share URL (short or long). Used first for open/embed when set; no Place ID required.';

NOTIFY pgrst, 'reload schema';
