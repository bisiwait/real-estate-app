-- 1. Add common attributes to projects table
ALTER TABLE public.projects 
ADD COLUMN IF NOT EXISTS property_type TEXT DEFAULT 'Condo',
ADD COLUMN IF NOT EXISTS year_built TEXT,
ADD COLUMN IF NOT EXISTS total_floors INTEGER;

-- 2. Update existing projects if any (optional, context dependent)
-- For this demo, we assume the user will re-register or update.

-- 3. Update the active_listings view to fallback to project attributes
-- If property.sqm or property.bedrooms is NULL, it usually means it's unit-specific.
-- But things like property_type, year_built, total_floors can be inherited.

DROP VIEW IF EXISTS public.active_listings;
CREATE VIEW public.active_listings AS
SELECT 
    p.*, 
    a.name as area_name, 
    r.name as region_name,
    pj.name as project_name_from_table,
    pj.image_url as project_image_url,
    pj.facilities as project_facilities,
    -- Inheritance logic: Use project attributes if property attributes are NULL
    COALESCE(p.property_type, pj.property_type) as effective_property_type,
    COALESCE(p.year_built, pj.year_built) as effective_year_built,
    COALESCE(p.total_floors, pj.total_floors) as effective_total_floors,
    COALESCE(p.area_id, pj.area_id) as effective_area_id
FROM public.properties p
LEFT JOIN public.projects pj ON p.project_id = pj.id
JOIN public.areas a ON COALESCE(p.area_id, pj.area_id) = a.id
JOIN public.regions r ON a.region_id = r.id
WHERE 
    p.status = 'published' AND 
    (p.expiry_date IS NULL OR p.expiry_date > NOW());

-- 4. Reload Schema Cache
NOTIFY pgrst, 'reload schema';
