-- 物件別 LINE 問い合わせ導線のイベント（1 クリック 1 行）。API は service role のみ INSERT。
CREATE TABLE IF NOT EXISTS public.line_inquiry_counts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    property_id UUID NOT NULL REFERENCES public.properties (id) ON DELETE CASCADE,
    agent_id UUID NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_line_inquiry_counts_property_created
    ON public.line_inquiry_counts (property_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_line_inquiry_counts_agent_created
    ON public.line_inquiry_counts (agent_id, created_at DESC);

COMMENT ON TABLE public.line_inquiry_counts IS
    '物件ページの LINE 問い合わせ（モバイル起動・PC QR 表示等）の記録。物件別集計用。';

ALTER TABLE public.line_inquiry_counts ENABLE ROW LEVEL SECURITY;

-- 既存 line_inquiry_logs から移行（同一 id で重複回避）
INSERT INTO public.line_inquiry_counts (id, property_id, agent_id, created_at)
SELECT l.id, l.property_id, l.agent_id, l.created_at
FROM public.line_inquiry_logs AS l
ON CONFLICT (id) DO NOTHING;

GRANT SELECT ON public.line_inquiry_counts TO authenticated;

CREATE POLICY "line_inquiry_counts_select_own_agent"
    ON public.line_inquiry_counts
    FOR SELECT
    TO authenticated
    USING (agent_id = auth.uid());

COMMENT ON POLICY "line_inquiry_counts_select_own_agent" ON public.line_inquiry_counts IS
    '掲載者は自分の agent_id の行のみ参照可。';
