-- Expansion for Japanese-specific property details

-- Water features
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS has_bathtub BOOLEAN DEFAULT FALSE;
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS has_washlet BOOLEAN DEFAULT FALSE;
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS water_heater_type TEXT;

-- Utility costs
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS electricity_bill_type TEXT CHECK (electricity_bill_type IN ('Direct', 'Condo Rate'));
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS water_bill_desc TEXT;
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS internet_desc TEXT;

-- Environment
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS distance_to_supermarket TEXT;
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS noise_level INTEGER CHECK (noise_level >= 1 AND noise_level <= 5);
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS transportation_desc TEXT;

-- Special tags (as boolean columns for easier filtering)
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS allows_pets BOOLEAN DEFAULT FALSE;
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS has_japanese_tv BOOLEAN DEFAULT FALSE;
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS has_ev_charger BOOLEAN DEFAULT FALSE;

-- Admin Memo
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS admin_memo TEXT;

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
