-- Google Maps の Place ID（座標より優先してピン表示に使用）
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS google_place_id TEXT;

COMMENT ON COLUMN public.projects.google_place_id IS 'Google Maps Place ID. Map display prefers this over latitude/longitude when set and valid.';

NOTIFY pgrst, 'reload schema';
