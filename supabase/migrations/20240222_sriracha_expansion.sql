-- Add Sriracha Region and Areas
INSERT INTO public.regions (name, slug) VALUES ('Sriracha', 'sriracha') ON CONFLICT (slug) DO NOTHING;

DO $$
DECLARE
    sriracha_id UUID;
BEGIN
    SELECT id INTO sriracha_id FROM public.regions WHERE slug = 'sriracha';
    
    INSERT INTO public.areas (region_id, name, slug) VALUES 
    (sriracha_id, 'ロビンソン周辺', 'robinson-area'),
    (sriracha_id, 'スカパープ公園周辺', 'park-area'),
    (sriracha_id, 'アサンプション周辺', 'assumption-area'),
    (sriracha_id, 'J-Park周辺', 'j-park-area'),
    (sriracha_id, 'スラサック・山側', 'surasak-area')
    ON CONFLICT DO NOTHING;
END $$;
