-- 20260305_agent_management_suite.sql
-- エージェント管理と分析のためのスキーマ拡張

-- 1. profilesテーブルの拡張
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT FALSE;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_suspended BOOLEAN DEFAULT FALSE;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS max_listings INTEGER DEFAULT 10;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS admin_notes TEXT;

-- 2. propertiesテーブルの拡張 (閲覧数トラッキング用)
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS total_views INTEGER DEFAULT 0;

-- 3. property_statsテーブルの作成 (時系列分析用)
CREATE TABLE IF NOT EXISTS public.property_stats (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    property_id UUID REFERENCES public.properties(id) ON DELETE CASCADE,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    views INTEGER DEFAULT 0,
    inquiries INTEGER DEFAULT 0,
    favorites INTEGER DEFAULT 0,
    UNIQUE(property_id, date)
);

-- 4. インデックスの追加
CREATE INDEX IF NOT EXISTS idx_property_stats_property_id ON public.property_stats(property_id);
CREATE INDEX IF NOT EXISTS idx_property_stats_date ON public.property_stats(date);

-- 5. RLSの設定
ALTER TABLE public.property_stats ENABLE ROW LEVEL SECURITY;

-- 管理者はすべて操作可能
DROP POLICY IF EXISTS "Admins can manage all stats" ON public.property_stats;
CREATE POLICY "Admins can manage all stats" ON public.property_stats
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid()
            AND profiles.user_role = 'admin'
        )
    );

-- エージェントは自分の物件の統計のみ閲覧可能
DROP POLICY IF EXISTS "Agents can view own property stats" ON public.property_stats;
CREATE POLICY "Agents can view own property stats" ON public.property_stats
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.properties
            WHERE properties.id = property_stats.property_id
            AND properties.user_id = auth.uid()
        )
    );

COMMENT ON TABLE public.property_stats IS 'Daily statistics for property performance';
