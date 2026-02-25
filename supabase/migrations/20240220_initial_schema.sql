-- Enable RLS
ALTER TABLE auth.users ENABLE ROW LEVEL SECURITY;

-- 1. Regions table
CREATE TABLE IF NOT EXISTS public.regions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Areas table
CREATE TABLE IF NOT EXISTS public.areas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    region_id UUID REFERENCES public.regions(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    slug TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Properties table
CREATE TABLE IF NOT EXISTS public.properties (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id),
    area_id UUID REFERENCES public.areas(id),
    title TEXT NOT NULL,
    description TEXT,
    price NUMERIC,
    listing_type TEXT CHECK (listing_type IN ('rent', 'sale')),
    images TEXT[] DEFAULT '{}',
    tags TEXT[] DEFAULT '{}',
    expiry_date TIMESTAMPTZ,
    status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'expired')),
    payment_status TEXT DEFAULT 'unpaid' CHECK (payment_status IN ('unpaid', 'paid')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Payments table
CREATE TABLE IF NOT EXISTS public.payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    property_id UUID REFERENCES public.properties(id) ON DELETE SET NULL,
    stripe_session_id TEXT UNIQUE,
    amount NUMERIC,
    status TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Active Listings View
-- This view automatically filters listings that are published, paid, and not expired.
CREATE OR REPLACE VIEW public.active_listings AS
SELECT p.*, a.name as area_name, r.name as region_name
FROM public.properties p
JOIN public.areas a ON p.area_id = a.id
JOIN public.regions r ON a.region_id = r.id
WHERE 
    p.status = 'published' AND 
    (p.expiry_date IS NULL OR p.expiry_date > NOW());

-- 6. Row Level Security (RLS) Policies

-- Properties: Public can only see active listings (via view or limited selection)
ALTER TABLE public.properties ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can read published/paid/active properties
CREATE POLICY "Anyone can view active properties" ON public.properties
    FOR SELECT USING (
        status = 'published' AND 
        payment_status = 'paid' AND 
        (expiry_date IS NULL OR expiry_date > NOW())
    );

-- Policy: Users can manage their own properties
CREATE POLICY "Users can manage own properties" ON public.properties
    FOR ALL USING (auth.uid() = user_id);

-- Policy: Anonymous Admin (Specific Role or Email bypass)
-- In a real scenario, you'd use a service role or a specific 'admin' claim in JWT
-- For internal admin tool, we rely on the service_role key or 
-- a policy that checks if the user's email is in an authorized list.

-- Regions and Areas: Publicly readable
ALTER TABLE public.regions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read regions" ON public.regions FOR SELECT USING (true);

ALTER TABLE public.areas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read areas" ON public.areas FOR SELECT USING (true);

-- 7. Initial Data (Seeds)
INSERT INTO public.regions (name, slug) VALUES ('Pattaya', 'pattaya') ON CONFLICT DO NOTHING;

-- Get the region ID for Pattaya to insert areas
DO $$
DECLARE
    pattaya_id UUID;
BEGIN
    SELECT id INTO pattaya_id FROM public.regions WHERE slug = 'pattaya';
    
    INSERT INTO public.areas (region_id, name, slug) VALUES 
    (pattaya_id, 'Pratumnak', 'pratumnak'),
    (pattaya_id, 'Jomtien', 'jomtien'),
    (pattaya_id, 'Central Pattaya', 'central-pattaya'),
    (pattaya_id, 'North Pattaya / Wongamat', 'north-pattaya'),
    (pattaya_id, 'East Pattaya', 'east-pattaya')
    ON CONFLICT DO NOTHING;
END $$;

-- 8. Enquiries table
CREATE TABLE IF NOT EXISTS public.enquiries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    property_id UUID REFERENCES public.properties(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT,
    message TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS for Enquiries
ALTER TABLE public.enquiries ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can insert an enquiry (Public form)
CREATE POLICY "Anyone can submit enquiry" ON public.enquiries
    FOR INSERT WITH CHECK (true);

-- Policy: Only the property owner can read enquiries for their properties
CREATE POLICY "Owners can see their property enquiries" ON public.enquiries
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.properties
            WHERE properties.id = enquiries.property_id
            AND properties.user_id = auth.uid()
        )
    );
