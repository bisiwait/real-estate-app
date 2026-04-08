-- LINE 問い合わせの計測用（ボタン押下・PC QR 表示など）。API は service role のみ挿入。
CREATE TABLE IF NOT EXISTS public.line_inquiry_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    property_id UUID NOT NULL REFERENCES public.properties (id) ON DELETE CASCADE,
    agent_id UUID NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_line_inquiry_logs_agent_created
    ON public.line_inquiry_logs (agent_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_line_inquiry_logs_property_created
    ON public.line_inquiry_logs (property_id, created_at DESC);

COMMENT ON TABLE public.line_inquiry_logs IS
    '物件の LINE 問い合わせ導線でのイベント記録（モバイル起動・PC QR 表示など）。';

ALTER TABLE public.line_inquiry_logs ENABLE ROW LEVEL SECURITY;
