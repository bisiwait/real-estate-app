-- 1. Create Projects Table
CREATE TABLE IF NOT EXISTS public.projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    area_id UUID REFERENCES public.areas(id) ON DELETE SET NULL,
    address TEXT,
    facilities TEXT[] DEFAULT '{}',
    description TEXT,
    image_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Add project_id to Properties Table
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL;

-- 3. RLS for Projects
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read projects" ON public.projects
    FOR SELECT USING (true);

CREATE POLICY "Authenticated users can manage projects" ON public.projects
    FOR ALL USING (auth.role() = 'authenticated');

-- 4. Update Active Listings View to include project info
DROP VIEW IF EXISTS public.active_listings;
CREATE VIEW public.active_listings AS
SELECT 
    p.*, 
    a.name as area_name, 
    r.name as region_name,
    pj.name as project_name_from_table,
    pj.image_url as project_image_url,
    pj.facilities as project_facilities
FROM public.properties p
JOIN public.areas a ON p.area_id = a.id
JOIN public.regions r ON a.region_id = r.id
LEFT JOIN public.projects pj ON p.project_id = pj.id
WHERE 
    p.status = 'published' AND 
    (p.expiry_date IS NULL OR p.expiry_date > NOW());

-- 5. Trigger for updated_at
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER on_project_updated
    BEFORE UPDATE ON public.projects
    FOR EACH ROW
    EXECUTE PROCEDURE public.handle_updated_at();

COMMENT ON TABLE public.projects IS 'Master table for buildings and housing projects';
COMMENT ON COLUMN public.properties.project_id IS 'Reference to the project/building this property belongs to';
