-- Add multilingual description columns to properties table
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS description_en TEXT;
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS description_th TEXT;

-- Update the active_listings view to include new columns
DROP VIEW IF EXISTS active_listings;
CREATE OR REPLACE VIEW active_listings AS
SELECT 
    p.*,
    a.name as area_name,
    a.slug as area_slug,
    r.name as region_name,
    r.slug as region_slug
FROM properties p
LEFT JOIN areas a ON p.area_id = a.id
LEFT JOIN regions r ON a.region_id = r.id
WHERE p.status = 'published' 
  AND p.expiry_date > CURRENT_TIMESTAMP
  AND p.is_approved = TRUE;
