-- Add 'pending' to the status check constraint in properties table
ALTER TABLE public.properties DROP CONSTRAINT IF EXISTS properties_status_check;
ALTER TABLE public.properties ADD CONSTRAINT properties_status_check CHECK (status IN ('draft', 'published', 'expired', 'pending'));

-- Update default value for future-proofing (optional)
-- ALTER TABLE public.properties ALTER COLUMN status SET DEFAULT 'pending';
