-- 公式LINE（Messaging API）経由の問い合わせ紐づけ: Web で発行した nonce をユーザーがトークに送ると line_user_id と紐づく
CREATE TABLE IF NOT EXISTS public.line_official_inquiry_intents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    nonce TEXT NOT NULL,
    inquiry_log_id UUID REFERENCES public.inquiry_logs(id) ON DELETE SET NULL,
    property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
    viewer_user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    agent_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    line_user_id TEXT,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'bound', 'expired', 'cancelled')),
    expires_at TIMESTAMPTZ NOT NULL,
    metadata JSONB NOT NULL DEFAULT '{}'::JSONB,
    CONSTRAINT line_official_inquiry_intents_nonce_unique UNIQUE (nonce)
);

CREATE INDEX IF NOT EXISTS idx_loii_nonce_pending ON public.line_official_inquiry_intents (nonce)
    WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_loii_created ON public.line_official_inquiry_intents (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_loii_agent ON public.line_official_inquiry_intents (agent_id);

COMMENT ON TABLE public.line_official_inquiry_intents IS '公式LINE窓口と物件問い合わせを紐づける意図。nonce はユーザーがOAトークに送信する。';
COMMENT ON COLUMN public.line_official_inquiry_intents.line_user_id IS 'Messaging API の source.userId（Uで始まる）';

ALTER TABLE public.line_official_inquiry_intents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service and admin read line official intents"
    ON public.line_official_inquiry_intents FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid()
            AND (p.is_admin = true OR p.user_role = 'admin')
        )
    );

CREATE POLICY "Agents read own line official intents"
    ON public.line_official_inquiry_intents FOR SELECT TO authenticated
    USING (agent_id = auth.uid());
