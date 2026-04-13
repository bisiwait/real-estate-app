-- プロフィール問い合わせへの返信履歴（ダッシュボードの問い合わせタブと同様の運用）
-- + エージェント既読（一覧の New / バッジ用）

ALTER TABLE public.agent_contacts
    ADD COLUMN IF NOT EXISTS read_by_agent_at TIMESTAMPTZ;

COMMENT ON COLUMN public.agent_contacts.read_by_agent_at IS 'エージェントがダッシュボードで詳細を開いた日時（未開封バッジ用）';

GRANT UPDATE (read_by_agent_at) ON TABLE public.agent_contacts TO authenticated;

CREATE TABLE IF NOT EXISTS public.agent_contact_replies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_contact_id UUID NOT NULL REFERENCES public.agent_contacts (id) ON DELETE CASCADE,
    sender_id UUID NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
    message TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT agent_contact_replies_message_len CHECK (
        char_length(message) > 0 AND char_length(message) <= 8000
    )
);

CREATE INDEX IF NOT EXISTS agent_contact_replies_contact_id_idx
    ON public.agent_contact_replies (agent_contact_id);

CREATE INDEX IF NOT EXISTS agent_contact_replies_created_at_idx
    ON public.agent_contact_replies (created_at DESC);

ALTER TABLE public.agent_contact_replies ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT ON TABLE public.agent_contact_replies TO authenticated;

DROP POLICY IF EXISTS "agent_contact_replies_select_parties" ON public.agent_contact_replies;

CREATE POLICY "agent_contact_replies_select_parties"
    ON public.agent_contact_replies
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1
            FROM public.agent_contacts c
            WHERE c.id = agent_contact_id
              AND (c.agent_id = auth.uid() OR c.submitter_id = auth.uid())
        )
    );

DROP POLICY IF EXISTS "agent_contact_replies_insert_by_recipient_agent" ON public.agent_contact_replies;

CREATE POLICY "agent_contact_replies_insert_by_recipient_agent"
    ON public.agent_contact_replies
    FOR INSERT
    TO authenticated
    WITH CHECK (
        sender_id = auth.uid()
        AND EXISTS (
            SELECT 1
            FROM public.agent_contacts c
            WHERE c.id = agent_contact_id
              AND c.agent_id = auth.uid()
        )
    );

COMMENT ON TABLE public.agent_contact_replies IS 'エージェントプロフィール問い合わせへの返信（履歴・メール通知と連携）';
