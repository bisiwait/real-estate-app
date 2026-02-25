-- Add latitude and longitude columns to properties table
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS latitude FLOAT8;
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS longitude FLOAT8;

-- Drop the view first to avoid column name/order conflicts
DROP VIEW IF EXISTS public.active_listings;

-- Update the active_listings view to include the new columns
CREATE VIEW public.active_listings AS
SELECT 
    p.*, 
    a.name as area_name, 
    r.name as region_name
FROM public.properties p
JOIN public.areas a ON p.area_id = a.id
JOIN public.regions r ON a.region_id = r.id
WHERE 
    p.status = 'published' AND 
    (p.expiry_date IS NULL OR p.expiry_date > NOW());
