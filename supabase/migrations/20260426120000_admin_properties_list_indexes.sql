-- 管理者物件一覧のサーバーサイドフィルタ・ソート向けインデックス
-- list_sort_price は 20260325120000_properties_list_sort_price.sql で作成済み

CREATE INDEX IF NOT EXISTS idx_properties_area_id ON public.properties (area_id);

CREATE INDEX IF NOT EXISTS idx_properties_developer_id ON public.properties (developer_id);

CREATE INDEX IF NOT EXISTS idx_properties_property_type ON public.properties (property_type);

-- 承認タブ（status / is_approved）＋ created_at 降順の一覧に寄与
CREATE INDEX IF NOT EXISTS idx_properties_status_approved_created_at
    ON public.properties (status, is_approved, created_at DESC);

-- エージェント名検索用（profiles の ilike 前段）。必要に応じ pg_trgm で拡張可能（下コメント参照）。
CREATE INDEX IF NOT EXISTS idx_profiles_user_role_deleted_at
    ON public.profiles (user_role, deleted_at);

-- オプション（大量データでエージェント名検索を高速化する場合）:
-- CREATE EXTENSION IF NOT EXISTS pg_trgm;
-- CREATE INDEX IF NOT EXISTS idx_profiles_full_name_trgm ON public.profiles USING gin (full_name gin_trgm_ops);
-- CREATE INDEX IF NOT EXISTS idx_profiles_email_trgm ON public.profiles USING gin (email gin_trgm_ops);
