-- profilesテーブルにユーザーロールを追加
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'user_role') THEN
        ALTER TABLE public.profiles ADD COLUMN user_role TEXT DEFAULT 'general' CHECK (user_role IN ('general', 'agent', 'admin'));
    END IF;
END $$;

-- 既存の管理者をロールに反映
UPDATE public.profiles SET user_role = 'admin' WHERE is_admin = TRUE;

-- 既存のクレジットを持っているユーザーや物件を投稿しているユーザーをエージェント（掲載主）にする
UPDATE public.profiles 
SET user_role = 'agent' 
WHERE user_role = 'general' 
AND (available_credits > 0 OR id IN (SELECT user_id FROM public.properties));
