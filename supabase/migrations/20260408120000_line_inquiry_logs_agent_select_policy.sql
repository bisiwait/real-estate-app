-- エージェントが自分宛の LINE 問い合わせログ件数のみ参照できるようにする（ダッシュボード集計用）
CREATE POLICY "line_inquiry_logs_select_own_agent"
    ON public.line_inquiry_logs
    FOR SELECT
    TO authenticated
    USING (agent_id = (SELECT auth.uid()));

COMMENT ON POLICY "line_inquiry_logs_select_own_agent" ON public.line_inquiry_logs IS
    '掲載者は自分の物件に紐づくログのみ SELECT 可。INSERT は引き続き service role のみ。';
