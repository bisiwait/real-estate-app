-- 1. Create Developers Table
CREATE TABLE IF NOT EXISTS public.developers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    logo_url TEXT,
    description TEXT,
    track_record JSONB DEFAULT '[]',
    website_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Add developer_id to Projects Table
ALTER TABLE public.projects 
ADD COLUMN IF NOT EXISTS developer_id UUID REFERENCES public.developers(id) ON DELETE SET NULL;

-- 3. Create Favorites Table
CREATE TABLE IF NOT EXISTS public.favorites (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, property_id)
);

-- 4. Create Saved Searches Table
CREATE TABLE IF NOT EXISTS public.saved_searches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    filters JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Row Level Security (RLS)
ALTER TABLE public.developers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.favorites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saved_searches ENABLE ROW LEVEL SECURITY;

-- Developers: Public can read
CREATE POLICY "Public read developers" ON public.developers FOR SELECT USING (true);

-- Favorites: Users can manage their own
CREATE POLICY "Users can manage own favorites" ON public.favorites
    FOR ALL USING (auth.uid() = user_id);

-- Saved Searches: Users can manage their own
CREATE POLICY "Users can manage own saved searches" ON public.saved_searches
    FOR ALL USING (auth.uid() = user_id);

-- 6. Helper triggers for updated_at
CREATE TRIGGER on_developer_updated
    BEFORE UPDATE ON public.developers
    FOR EACH ROW
    EXECUTE PROCEDURE public.handle_updated_at();

COMMENT ON TABLE public.developers IS 'Real estate development companies';
COMMENT ON TABLE public.favorites IS 'User favorite properties';
COMMENT ON TABLE public.saved_searches IS 'User saved search criteria';
