-- 無料トライアルは初回のみ: Checkout で trial を付与しない判定に使用
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS stripe_trial_consumed_at TIMESTAMPTZ;

COMMENT ON COLUMN public.profiles.stripe_trial_consumed_at IS 'Stripe サブスクでトライアルを開始した日時。設定後は再 Checkout 時に trial_period_days を付けない';
