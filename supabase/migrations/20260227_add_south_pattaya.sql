-- Add South Pattaya to the areas table under Pattya region
DO $$
DECLARE
    pattaya_id UUID;
BEGIN
    SELECT id INTO pattaya_id FROM public.regions WHERE slug = 'pattaya';
    
    IF pattaya_id IS NOT NULL THEN
        INSERT INTO public.areas (region_id, name, slug) 
        VALUES (pattaya_id, 'South Pattaya', 'south-pattaya')
        ON CONFLICT DO NOTHING;
    END IF;
END $$;
