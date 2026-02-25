-- Consolidated Inquiry System Fix (V2)
-- This script ensures the 'inquiries' table exists and is used for all contact forms.

-- 1. Create inquiries table if not exists with correct schema
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
-- Note: Using DO block to avoid errors if policies already exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'inquiries' AND policyname = 'Anyone can submit an inquiry') THEN
        CREATE POLICY "Anyone can submit an inquiry" ON public.inquiries FOR INSERT WITH CHECK (true);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'inquiries' AND policyname = 'Owners can manage own inquiries') THEN
        CREATE POLICY "Owners can manage own inquiries" ON public.inquiries FOR SELECT USING (auth.uid() = owner_id);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'inquiries' AND policyname = 'Owners can update own inquiries') THEN
        CREATE POLICY "Owners can update own inquiries" ON public.inquiries FOR UPDATE USING (auth.uid() = owner_id);
    END IF;
END $$;

-- 4. Trigger to automatically set owner_id from property_id (for specific property inquiries)
CREATE OR REPLACE FUNCTION public.set_inquiry_owner()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.property_id IS NOT NULL THEN
        SELECT user_id INTO NEW.owner_id
        FROM public.properties
        WHERE id = NEW.property_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_inquiry_insert ON public.inquiries;
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

DROP TRIGGER IF EXISTS on_inquiry_update ON public.inquiries;
CREATE TRIGGER on_inquiry_update
    BEFORE UPDATE ON public.inquiries
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

-- 6. Cleanup redundant table if exists
-- DROP TABLE IF EXISTS public.enquiries;
-- DROP TABLE IF EXISTS public.contacts;
