-- 管理者品質サマリーの「価格なし」判定を price 列ではなく list_sort_price 基準へ統一
-- 既存関数の定義を上書き

CREATE OR REPLACE FUNCTION public.admin_property_quality_stats()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r jsonb;
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN
    RETURN '{}'::jsonb;
  END IF;

  SELECT jsonb_build_object(
    'missing_price',
      COUNT(*) FILTER (
        WHERE COALESCE(p.list_sort_price, 0) <= 0
      ),
    'missing_image',
      COUNT(*) FILTER (
        WHERE p.images IS NULL
          OR COALESCE(array_length(p.images, 1), 0) < 1
          OR trim(COALESCE(p.images[1], '')) = ''
      ),
    'no_developer',
      COUNT(*) FILTER (WHERE p.developer_id IS NULL),
    'short_description',
      COUNT(*) FILTER (
        WHERE GREATEST(
          length(trim(COALESCE(p.description, ''))),
          length(trim(COALESCE(p.description_en, ''))),
          length(trim(COALESCE(p.description_th, '')))
        ) <= 100
      ),
    'any_issue',
      COUNT(*) FILTER (
        WHERE COALESCE(p.list_sort_price, 0) <= 0
          OR p.images IS NULL
          OR COALESCE(array_length(p.images, 1), 0) < 1
          OR trim(COALESCE(p.images[1], '')) = ''
          OR p.developer_id IS NULL
          OR GREATEST(
            length(trim(COALESCE(p.description, ''))),
            length(trim(COALESCE(p.description_en, ''))),
            length(trim(COALESCE(p.description_th, '')))
          ) <= 100
      )
  )
  INTO r
  FROM public.properties p;

  RETURN COALESCE(r, '{}'::jsonb);
END;
$$;

