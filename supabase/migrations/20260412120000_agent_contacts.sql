-- エージェント詳細ページからのお問い合わせ（管理画面で一覧・対応済管理）
CREATE TABLE IF NOT EXISTS public.agent_contacts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_id UUID NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
    customer_name TEXT NOT NULL,
    customer_email TEXT NOT NULL,
    customer_phone TEXT NOT NULL,
    message TEXT NOT NULL,
    is_handled BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS agent_contacts_created_at_idx ON public.agent_contacts (created_at DESC);
CREATE INDEX IF NOT EXISTS agent_contacts_agent_id_idx ON public.agent_contacts (agent_id);

ALTER TABLE public.agent_contacts ENABLE ROW LEVEL SECURITY;

-- 匿名・ログインユーザーともアプリは service role の API 経由のみ書き込み（直接 INSERT 不可）

COMMENT ON TABLE public.agent_contacts IS 'エージェントプロフィールページのお問い合わせフォーム送信';
