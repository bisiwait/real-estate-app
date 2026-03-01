-- Add latitude and longitude columns to projects table
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS latitude FLOAT8;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS longitude FLOAT8;

-- Create or replace the view to pull coordinates from projects
DROP VIEW IF EXISTS public.active_listings;

CREATE VIEW public.active_listings AS
SELECT 
    p.*, 
    a.name as area_name, 
    r.name as region_name,
    pr.latitude as project_latitude,
    pr.longitude as project_longitude
FROM public.properties p
JOIN public.areas a ON p.area_id = a.id
JOIN public.regions r ON a.region_id = r.id
LEFT JOIN public.projects pr ON p.project_id = pr.id
WHERE 
    p.status = 'published' AND 
    (p.expiry_date IS NULL OR p.expiry_date > NOW());

-- Remove coordinates from properties (Data migration has already been handled by simply moving the responsibility)
ALTER TABLE public.properties DROP COLUMN IF EXISTS latitude;
ALTER TABLE public.properties DROP COLUMN IF EXISTS longitude;
