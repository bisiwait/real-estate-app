-- 1. Create Developers Table
CREATE TABLE IF NOT EXISTS public.developers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    logo_url TEXT,
    description TEXT,
    website_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Add developer_id to Projects and Properties
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS developer_id UUID REFERENCES public.developers(id) ON DELETE SET NULL;
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS developer_id UUID REFERENCES public.developers(id) ON DELETE SET NULL;

-- 3. RLS for Developers
ALTER TABLE public.developers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read developers" ON public.developers;
CREATE POLICY "Public read developers" ON public.developers
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Authenticated users can manage developers" ON public.developers;
CREATE POLICY "Authenticated users can manage developers" ON public.developers
    FOR ALL USING (auth.role() = 'authenticated');

-- 4. Trigger for updated_at
CREATE TRIGGER on_developer_updated
    BEFORE UPDATE ON public.developers
    FOR EACH ROW
    EXECUTE PROCEDURE public.handle_updated_at();

-- 5. Reload Schema Cache
NOTIFY pgrst, 'reload schema';
