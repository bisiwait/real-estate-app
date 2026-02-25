-- inquiry_system_setup.sql

-- 1. Create inquiries table
CREATE TABLE IF NOT EXISTS public.inquiries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    property_id UUID REFERENCES public.properties(id) ON DELETE CASCADE,
    owner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    inquirer_name TEXT NOT NULL,
    inquirer_email TEXT NOT NULL,
    inquirer_phone TEXT,
    message TEXT NOT NULL,
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Enable RLS
ALTER TABLE public.inquiries ENABLE ROW LEVEL SECURITY;

-- 3. RLS Policies
-- Policy: Anyone can insert an inquiry
CREATE POLICY "Anyone can submit an inquiry" ON public.inquiries
    FOR INSERT WITH CHECK (true);

-- Policy: Owners can view and update their own inquiries
CREATE POLICY "Owners can manage own inquiries" ON public.inquiries
    FOR SELECT USING (auth.uid() = owner_id);

CREATE POLICY "Owners can update own inquiries" ON public.inquiries
    FOR UPDATE USING (auth.uid() = owner_id);

-- 4. Trigger to automatically set owner_id from property_id
CREATE OR REPLACE FUNCTION public.set_inquiry_owner()
RETURNS TRIGGER AS $$
BEGIN
    SELECT user_id INTO NEW.owner_id
    FROM public.properties
    WHERE id = NEW.property_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_inquiry_insert
    BEFORE INSERT ON public.inquiries
    FOR EACH ROW
    EXECUTE FUNCTION public.set_inquiry_owner();

-- 5. Updated at trigger
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_inquiry_update
    BEFORE UPDATE ON public.inquiries
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();
