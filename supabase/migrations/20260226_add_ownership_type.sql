-- Add ownership_type column to properties table
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS ownership_type TEXT;

-- Update the active_listings view to include the new column
-- (Though the view uses p.*, it's good practice to ensure it's refreshed)
CREATE OR REPLACE VIEW public.active_listings AS
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
