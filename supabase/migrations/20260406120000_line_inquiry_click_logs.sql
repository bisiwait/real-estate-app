-- 物件ページの「LINE問い合わせ」ボタン押下を記録（LINE 起動後の行動は追えないため、クリック時点で保存）
CREATE TABLE IF NOT EXISTS public.line_inquiry_click_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_id UUID NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
    property_id UUID NOT NULL REFERENCES public.properties (id) ON DELETE CASCADE,
    clicked_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    source TEXT NOT NULL DEFAULT 'sticky_bar'
        CHECK (source IN ('sticky_bar', 'inquiry_form'))
);

CREATE INDEX IF NOT EXISTS idx_line_inquiry_click_logs_agent_clicked
    ON public.line_inquiry_click_logs (agent_id, clicked_at DESC);

CREATE INDEX IF NOT EXISTS idx_line_inquiry_click_logs_property_clicked
    ON public.line_inquiry_click_logs (property_id, clicked_at DESC);

COMMENT ON TABLE public.line_inquiry_click_logs IS
    '物件ページで LINE 問い合わせボタンが押された記録。API は service role のみ挿入。';

ALTER TABLE public.line_inquiry_click_logs ENABLE ROW LEVEL SECURITY;

-- 匿名・ログインユーザーからは参照も更新も不可（集計は service role / 管理サーバー）
