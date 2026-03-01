-- Add building_name and project_name to properties table
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS building_name TEXT;
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS project_name TEXT;

-- Update the active_listings view to include new columns
-- The view already uses p.*, but it's good practice to refresh it if needed.
DROP VIEW IF EXISTS public.active_listings;
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

COMMENT ON COLUMN public.properties.building_name IS 'Name of the building or condo';
COMMENT ON COLUMN public.properties.project_name IS 'Name of the development project';
