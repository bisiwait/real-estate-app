-- エージェントが「自分のプロフィールページ」に届いた問い合わせをダッシュボードで参照・対応済み更新できるようにする

CREATE POLICY "agent_contacts_select_as_agent_recipient"
    ON public.agent_contacts
    FOR SELECT
    TO authenticated
    USING (agent_id = auth.uid());

-- 他カラムの改ざんを防ぐため is_handled のみ UPDATE 許可
GRANT UPDATE (is_handled) ON TABLE public.agent_contacts TO authenticated;

DROP POLICY IF EXISTS "agent_contacts_agent_update_handled" ON public.agent_contacts;

CREATE POLICY "agent_contacts_agent_update_handled"
    ON public.agent_contacts
    FOR UPDATE
    TO authenticated
    USING (agent_id = auth.uid())
    WITH CHECK (agent_id = auth.uid());

COMMENT ON POLICY "agent_contacts_select_as_agent_recipient" ON public.agent_contacts IS
    '掲載エージェントは agent_id = auth.uid() の問い合わせ行のみ参照可。';

COMMENT ON POLICY "agent_contacts_agent_update_handled" ON public.agent_contacts IS
    '掲載エージェントは自分宛て行の is_handled のみ更新可。';
