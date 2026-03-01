-- Drop the existing constraint
ALTER TABLE public.properties DROP CONSTRAINT IF EXISTS properties_status_check;

-- Add the new constraint with 'under_negotiation' and 'contracted'
ALTER TABLE public.properties ADD CONSTRAINT properties_status_check 
  CHECK (status IN ('draft', 'published', 'expired', 'pending', 'under_negotiation', 'contracted'));

-- Update the active_listings view to include the new statuses
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
    p.status IN ('published', 'under_negotiation', 'contracted') AND 
    (p.expiry_date IS NULL OR p.expiry_date > NOW());
