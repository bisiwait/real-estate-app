-- inquiry_logs の外部キー参照を profiles に変更して、PostgREST が JOIN しやすくする
BEGIN;

-- 既存の外部キーを一旦削除（名前が自動生成の場合は特定が必要だが、一般的なパターンで試行）
ALTER TABLE public.inquiry_logs DROP CONSTRAINT IF EXISTS inquiry_logs_user_id_fkey;
ALTER TABLE public.inquiry_logs DROP CONSTRAINT IF EXISTS inquiry_logs_agent_id_fkey;

-- profiles テーブルを参照するように再定義
-- ※ profiles.id は auth.users.id と同じなので、データ自体に変更は不要
ALTER TABLE public.inquiry_logs 
    ADD CONSTRAINT inquiry_logs_user_id_fkey 
    FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE SET NULL;

ALTER TABLE public.inquiry_logs 
    ADD CONSTRAINT inquiry_logs_agent_id_fkey 
    FOREIGN KEY (agent_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

COMMIT;
