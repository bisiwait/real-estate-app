-- Add building age and total floors fields
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS year_built TEXT; -- 築年数
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS total_floors INTEGER; -- 何階建てか

-- Update the active_listings view to include new columns
-- Since the view uses p.*, it should automatically picking up these new columns.
