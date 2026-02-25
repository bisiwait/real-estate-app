-- Expand properties table to support concurrent Rent and Sale listings

-- 1. Add new columns
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS is_for_rent BOOLEAN DEFAULT FALSE;
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS is_for_sale BOOLEAN DEFAULT FALSE;
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS rent_price NUMERIC;
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS sale_price NUMERIC;

-- 2. Migrate existing data from listing_type and price
-- Existing types: 'rent', 'sell', 'sale'
UPDATE public.properties 
SET 
  is_for_rent = CASE WHEN listing_type = 'rent' THEN TRUE ELSE FALSE END,
  is_for_sale = CASE WHEN listing_type IN ('sell', 'sale') THEN TRUE ELSE FALSE END,
  rent_price = CASE WHEN listing_type = 'rent' THEN price ELSE NULL END,
  sale_price = CASE WHEN listing_type IN ('sell', 'sale') THEN price ELSE NULL END;

-- 3. Cleanup old columns (Optional, but recommended for clean schema)
-- We wait until confirming everything works before dropping, 
-- but for this migration we will just leave them or comment out.
-- ALTER TABLE public.properties DROP COLUMN listing_type;
-- ALTER TABLE public.properties DROP COLUMN price;

-- 4. Update the View to include new columns
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

-- 5. Add a constraint to ensure at least one type is selected
ALTER TABLE public.properties 
ADD CONSTRAINT properties_must_have_type 
CHECK (is_for_rent = TRUE OR is_for_sale = TRUE);

COMMENT ON COLUMN public.properties.is_for_rent IS 'Whether the property is available for rent';
COMMENT ON COLUMN public.properties.is_for_sale IS 'Whether the property is available for sale';
COMMENT ON COLUMN public.properties.rent_price IS 'Monthly rent price in THB';
COMMENT ON COLUMN public.properties.sale_price IS 'Total sale price in THB';
