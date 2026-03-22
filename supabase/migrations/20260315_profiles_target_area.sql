-- エージェントの主担当エリア（任意）
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS target_area TEXT;
