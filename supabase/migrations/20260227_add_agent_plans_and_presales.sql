-- Add plan to profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS plan TEXT DEFAULT 'free' CHECK (plan IN ('free', 'standard', 'premium'));

-- Add presale fields to properties
ALTER TABLE public.properties 
ADD COLUMN IF NOT EXISTS is_presale BOOLEAN DEFAULT false;

ALTER TABLE public.properties 
ADD COLUMN IF NOT EXISTS completion_date TEXT;

ALTER TABLE public.properties 
ADD COLUMN IF NOT EXISTS payment_plan TEXT;

ALTER TABLE public.properties 
ADD COLUMN IF NOT EXISTS construction_status TEXT CHECK (construction_status IN ('planning', 'under_construction', 'completed'));
