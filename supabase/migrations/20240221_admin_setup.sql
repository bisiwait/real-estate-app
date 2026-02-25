-- Add is_approved flag to properties (default to false for new listings)
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS is_approved BOOLEAN DEFAULT FALSE;

-- Add is_admin flag to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT FALSE;

-- Mass-approve existing properties so they don't disappear from the site
UPDATE public.properties SET is_approved = TRUE;

-- Update the active_listings view to include approval check
-- We drop and recreate it because view logic changed
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

-- Set a default admin for testing (optional, usually done via Supabase dashboard)
-- UPDATE public.profiles SET is_admin = TRUE WHERE email = 'admin@example.com';
