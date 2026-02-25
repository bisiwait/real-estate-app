-- Comprehensive migration to support dual listing types and all necessary property fields

-- 1. Add Listing Type and Price columns
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS is_for_rent BOOLEAN DEFAULT FALSE;
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS is_for_sale BOOLEAN DEFAULT FALSE;
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS rent_price NUMERIC;
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS sale_price NUMERIC;

-- 2. Add Japanese-specific and core property fields (Ensure they exist)
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS has_bathtub BOOLEAN DEFAULT FALSE;
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS has_washlet BOOLEAN DEFAULT FALSE;
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS water_heater_type TEXT;
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS electricity_bill_type TEXT;
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS water_bill_desc TEXT;
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS internet_desc TEXT;
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS distance_to_supermarket TEXT;
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS noise_level INTEGER;
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS transportation_desc TEXT;
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS allows_pets BOOLEAN DEFAULT FALSE;
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS has_japanese_tv BOOLEAN DEFAULT FALSE;
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS has_ev_charger BOOLEAN DEFAULT FALSE;
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS admin_memo TEXT;
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS property_type TEXT; -- Condo, Apartment, etc.
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS sqm NUMERIC;
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS floor TEXT;
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS bedrooms INTEGER DEFAULT 0;
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS bathrooms INTEGER DEFAULT 0;
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS year_built TEXT;
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS total_floors INTEGER;

-- 3. Migrate existing data from legacy columns
UPDATE public.properties 
SET 
  is_for_rent = CASE WHEN listing_type = 'rent' THEN TRUE ELSE is_for_rent END,
  is_for_sale = CASE WHEN listing_type IN ('sell', 'sale') THEN TRUE ELSE is_for_sale END,
  rent_price = CASE WHEN listing_type = 'rent' THEN price ELSE rent_price END,
  sale_price = CASE WHEN listing_type IN ('sell', 'sale') THEN price ELSE sale_price END
WHERE listing_type IS NOT NULL;

-- 4. Update the View
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

-- 5. Add a constraint to ensure at least one type is selected (Optional: execute only if not exists)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'properties_must_have_type') THEN
        ALTER TABLE public.properties ADD CONSTRAINT properties_must_have_type CHECK (is_for_rent = TRUE OR is_for_sale = TRUE);
    END IF;
END $$;

-- Comments
COMMENT ON COLUMN public.properties.is_for_rent IS 'Whether the property is available for rent';
COMMENT ON COLUMN public.properties.is_for_sale IS 'Whether the property is available for sale';
COMMENT ON COLUMN public.properties.rent_price IS 'Monthly rent price in THB';
COMMENT ON COLUMN public.properties.sale_price IS 'Total sale price in THB';
