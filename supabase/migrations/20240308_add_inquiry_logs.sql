-- inquiry_logs テーブルの作成
CREATE TABLE IF NOT EXISTS public.inquiry_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
    agent_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    inquiry_type TEXT NOT NULL CHECK (inquiry_type IN ('line', 'phone', 'form')),
    status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'contacted', 'closed')),
    notes TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS（行レベルセキュリティ）の設定
ALTER TABLE public.inquiry_logs ENABLE ROW LEVEL SECURITY;

-- 1. 管理者はすべてのログを閲覧・管理できる
CREATE POLICY "Admins can do everything on inquiry_logs" ON public.inquiry_logs
    FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid()
            AND profiles.is_admin = true
        )
    );

-- 2. エージェントは自分が担当する物件のログのみ閲覧・管理できる
CREATE POLICY "Agents can see their own property leads" ON public.inquiry_logs
    FOR ALL
    TO authenticated
    USING (
        agent_id = auth.uid()
    );

-- 3. （オプション）ユーザーは自分が送った問い合わせ履歴を閲覧できる
CREATE POLICY "Users can see their own inquiry history" ON public.inquiry_logs
    FOR SELECT
    TO authenticated
    USING (
        user_id = auth.uid()
    );

-- 4. 誰でも問い合わせログを挿入できる（Webサイトからのアクション記録用）
CREATE POLICY "Anyone can insert inquiry logs" ON public.inquiry_logs
    FOR INSERT
    TO anon, authenticated
    WITH CHECK (true);

-- インデックスの作成
CREATE INDEX IF NOT EXISTS idx_inquiry_logs_agent_id ON public.inquiry_logs(agent_id);
CREATE INDEX IF NOT EXISTS idx_inquiry_logs_property_id ON public.inquiry_logs(property_id);
CREATE INDEX IF NOT EXISTS idx_inquiry_logs_created_at ON public.inquiry_logs(created_at);
