-- add extra fields for presale properties
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS land_area TEXT;
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS total_units INTEGER;
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS total_buildings INTEGER;
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS developer TEXT;
