-- ログインユーザー紐付け + RLS（認証済みかつ submitter_id = auth.uid() の INSERT のみ許可）
ALTER TABLE public.agent_contacts
    ADD COLUMN IF NOT EXISTS submitter_id UUID REFERENCES auth.users (id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS agent_contacts_submitter_id_idx ON public.agent_contacts (submitter_id);

COMMENT ON COLUMN public.agent_contacts.submitter_id IS 'お問い合わせを送信したログインユーザー（auth.users.id）';

-- 認証ユーザーが自分の UID で1行だけ INSERT 可能（API はユーザーセッションの Supabase クライアントで挿入）
CREATE POLICY "agent_contacts_insert_own_submitter"
    ON public.agent_contacts
    FOR INSERT
    TO authenticated
    WITH CHECK (submitter_id = auth.uid());
