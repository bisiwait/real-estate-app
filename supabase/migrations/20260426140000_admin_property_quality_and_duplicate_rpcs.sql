-- 管理者向け品質集計・タイトル重複検出、および登録時のタイトル重複チェック用 RPC
-- 一覧の重複ラベルは admin_duplicate_title_in_titles（管理者のみ）
-- 保存時の重複は property_title_is_duplicate（認証ユーザー・SECURITY DEFINER）

CREATE INDEX IF NOT EXISTS idx_properties_title_trim ON public.properties ((trim(title)));

-- 登録・更新時: 他行とタイトル（前後空白無視）が一致するか
CREATE OR REPLACE FUNCTION public.property_title_is_duplicate(p_title text, p_exclude uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.properties p
    WHERE trim(p.title) = trim(COALESCE(p_title, ''))
      AND trim(COALESCE(p_title, '')) <> ''
      AND (p_exclude IS NULL OR p.id <> p_exclude)
  );
$$;

-- 説明の先頭 N 文字が他物件と一致（簡易・完全一致）。短い説明は対象外。
CREATE OR REPLACE FUNCTION public.property_description_prefix_duplicate(
    p_desc text,
    p_exclude uuid,
    p_len int DEFAULT 100
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    length(trim(COALESCE(p_desc, ''))) >= 30
    AND EXISTS (
      SELECT 1
      FROM public.properties p
      WHERE (p_exclude IS NULL OR p.id <> p_exclude)
        AND left(trim(regexp_replace(COALESCE(p.description, ''), '\s+', ' ', 'g')), GREATEST(1, LEAST(p_len, 500)))
            = left(trim(regexp_replace(COALESCE(p_desc, ''), '\s+', ' ', 'g')), GREATEST(1, LEAST(p_len, 500)))
        AND length(trim(regexp_replace(COALESCE(p_desc, ''), '\s+', ' ', 'g'))) >= 30
        AND length(trim(regexp_replace(COALESCE(p.description, ''), '\s+', ' ', 'g'))) >= 30
    );
$$;

-- 管理者: 全物件の品質カウント（一覧サマリー用）
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
        WHERE p.price IS NULL OR p.price = 0
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
        WHERE p.price IS NULL OR p.price = 0
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

-- 管理者: 渡したタイトルのうち、DB上で2件以上存在するものだけ返す
CREATE OR REPLACE FUNCTION public.admin_duplicate_title_in_titles(p_titles text[])
RETURNS SETOF text
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT p.title
  FROM public.properties p
  WHERE p.title = ANY(p_titles)
  GROUP BY p.title
  HAVING count(*) > 1;
END;
$$;

REVOKE ALL ON FUNCTION public.property_title_is_duplicate(text, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.property_title_is_duplicate(text, uuid) TO authenticated;

REVOKE ALL ON FUNCTION public.property_description_prefix_duplicate(text, uuid, int) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.property_description_prefix_duplicate(text, uuid, int) TO authenticated;

REVOKE ALL ON FUNCTION public.admin_property_quality_stats() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_property_quality_stats() TO authenticated;

REVOKE ALL ON FUNCTION public.admin_duplicate_title_in_titles(text[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_duplicate_title_in_titles(text[]) TO authenticated;

COMMENT ON FUNCTION public.admin_property_quality_stats IS '管理者のみ。物件品質サマリー用の件数集計。';
COMMENT ON FUNCTION public.admin_duplicate_title_in_titles IS '管理者のみ。一覧ページ用のタイトル重複検出。';
COMMENT ON FUNCTION public.property_title_is_duplicate IS '認証ユーザー向け。保存前のタイトル重複チェック。';
