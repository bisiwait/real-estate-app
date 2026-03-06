-- Add columns to projects table
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS developer TEXT;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS total_units INTEGER;

-- Reload schema cache
NOTIFY pgrst, 'reload schema';
