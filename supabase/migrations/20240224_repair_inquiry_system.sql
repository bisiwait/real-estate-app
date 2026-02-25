-- Inquiry System Repair Script
-- This script ensures all necessary columns and policies exist even if the table was partially created before.

-- 1. Ensure inquiries table has all columns
DO $$ 
BEGIN
    -- Add property_id if missing (should exist, but let's be sure)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'inquiries' AND column_name = 'property_id') THEN
        ALTER TABLE public.inquiries ADD COLUMN property_id UUID REFERENCES public.properties(id) ON DELETE CASCADE;
    END IF;

    -- Add owner_id if missing (CRITICAL for dashboard)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'inquiries' AND column_name = 'owner_id') THEN
        ALTER TABLE public.inquiries ADD COLUMN owner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
    END IF;

    -- Add is_read if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'inquiries' AND column_name = 'is_read') THEN
        ALTER TABLE public.inquiries ADD COLUMN is_read BOOLEAN DEFAULT false;
    END IF;

    -- Add updated_at if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'inquiries' AND column_name = 'updated_at') THEN
        ALTER TABLE public.inquiries ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW();
    END IF;
END $$;

-- 2. Update the trigger function to be more robust
CREATE OR REPLACE FUNCTION public.set_inquiry_owner()
RETURNS TRIGGER AS $$
DECLARE
    prop_owner UUID;
BEGIN
    -- Find the owner of the property
    SELECT user_id INTO prop_owner
    FROM public.properties
    WHERE id = NEW.property_id;

    -- Set the owner_id if found
    IF prop_owner IS NOT NULL THEN
        NEW.owner_id := prop_owner;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Re-create the trigger
DROP TRIGGER IF EXISTS on_inquiry_insert ON public.inquiries;
CREATE TRIGGER on_inquiry_insert
    BEFORE INSERT ON public.inquiries
    FOR EACH ROW
    EXECUTE FUNCTION public.set_inquiry_owner();

-- 4. Ensure RLS is enabled and policies are correct
ALTER TABLE public.inquiries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can submit an inquiry" ON public.inquiries;
CREATE POLICY "Anyone can submit an inquiry" ON public.inquiries
    FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Owners can manage own inquiries" ON public.inquiries;
CREATE POLICY "Owners can manage own inquiries" ON public.inquiries
    FOR SELECT USING (auth.uid() = owner_id);

-- 5. Ensure inquiry_replies table exists and is correct
CREATE TABLE IF NOT EXISTS public.inquiry_replies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    inquiry_id UUID REFERENCES public.inquiries(id) ON DELETE CASCADE,
    sender_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    message TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.inquiry_replies ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Owners can view replies to their inquiries" ON public.inquiry_replies;
CREATE POLICY "Owners can view replies to their inquiries" ON public.inquiry_replies
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.inquiries
            WHERE inquiries.id = inquiry_replies.inquiry_id
            AND inquiries.owner_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Owners can create replies to their inquiries" ON public.inquiry_replies;
CREATE POLICY "Owners can create replies to their inquiries" ON public.inquiry_replies
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.inquiries
            WHERE inquiries.id = inquiry_id
            AND inquiries.owner_id = auth.uid()
        )
        AND sender_id = auth.uid()
    );
