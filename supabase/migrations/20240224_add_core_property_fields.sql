-- Add core property information fields
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS property_type TEXT; -- Condo, Apartment, House, etc.
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS sqm NUMERIC; -- Square meters
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS floor TEXT; -- Floor level
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS bedrooms INTEGER DEFAULT 0; -- Number of bedrooms
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS bathrooms INTEGER DEFAULT 0; -- Number of bathrooms

-- Update the active_listings view to include new columns (if not already covered by p.*)
-- The existing view uses p.* so it should automatically pick up these new columns.
