-- CSV インポート後など: 物件名（title）が完全一致で複数行あるものを一覧する（SQL Editor 用）
-- 実行前にプロジェクトのスキーマ名が public であることを確認してください。

SELECT
    title,
    count(*) AS row_count,
    array_agg(id ORDER BY created_at DESC) AS property_ids
FROM public.properties
GROUP BY title
HAVING count(*) > 1
ORDER BY row_count DESC, title;
