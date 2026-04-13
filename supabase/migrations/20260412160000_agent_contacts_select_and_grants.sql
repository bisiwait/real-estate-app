-- .insert().select() や PostgREST の RETURNING は行の SELECT 権限が必要。
-- INSERT のみ許可していると「挿入は通るが返却で RLS に阻まれる」状態になり失敗することがある。
GRANT INSERT, SELECT ON TABLE public.agent_contacts TO authenticated;

DROP POLICY IF EXISTS "agent_contacts_select_own_submitter" ON public.agent_contacts;

CREATE POLICY "agent_contacts_select_own_submitter"
    ON public.agent_contacts
    FOR SELECT
    TO authenticated
    USING (submitter_id = auth.uid());

COMMENT ON POLICY "agent_contacts_select_own_submitter" ON public.agent_contacts IS
    '送信者は自分が送った問い合わせ行のみ参照可（INSERT 後の RETURNING / 将来の履歴表示用）。';
