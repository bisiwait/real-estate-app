-- 一覧ソートを updated_at 基準にするため、NULL を埋めてインデックスを用意する
UPDATE public.properties
SET updated_at = COALESCE(updated_at, created_at, NOW())
WHERE updated_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_properties_updated_at_desc ON public.properties (updated_at DESC);
