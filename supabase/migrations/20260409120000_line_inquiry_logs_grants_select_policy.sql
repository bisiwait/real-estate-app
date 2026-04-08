-- PostgREST 経由（anon key + JWT）でエージェントが集計できるよう権限とポリシーを明示する
GRANT SELECT ON public.line_inquiry_logs TO authenticated;

DROP POLICY IF EXISTS "line_inquiry_logs_select_own_agent" ON public.line_inquiry_logs;

CREATE POLICY "line_inquiry_logs_select_own_agent"
    ON public.line_inquiry_logs
    FOR SELECT
    TO authenticated
    USING (agent_id = auth.uid());

COMMENT ON POLICY "line_inquiry_logs_select_own_agent" ON public.line_inquiry_logs IS
    '掲載者は agent_id = auth.uid() の行のみ参照可。ダッシュボードはサーバーで service role 集計も併用可。';
