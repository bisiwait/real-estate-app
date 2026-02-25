-- Update listing_type constraint to allow 'rent' and 'sell'
-- Existing schema had 'rent' and 'sale'

-- Find and drop the existing check constraint on listing_type
-- The name is usually properties_listing_type_check if not specified
ALTER TABLE public.properties DROP CONSTRAINT IF EXISTS properties_listing_type_check;

-- Update any existing 'sale' data to 'sell' for consistency
UPDATE public.properties SET listing_type = 'sell' WHERE listing_type = 'sale';

-- Add the new constraint
ALTER TABLE public.properties 
ADD CONSTRAINT properties_listing_type_check 
CHECK (listing_type IN ('rent', 'sell'));

-- Update the active_listings view if necessary (it already selects all from properties, so should be fine)
-- But ensuring types are consistent is good practice
COMMENT ON COLUMN public.properties.listing_type IS 'Type of listing: rent (賃貸) or sell (売買)';
