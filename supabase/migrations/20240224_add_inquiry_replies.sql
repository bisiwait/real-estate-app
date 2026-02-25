-- Create inquiry_replies table
CREATE TABLE IF NOT EXISTS public.inquiry_replies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    inquiry_id UUID REFERENCES public.inquiries(id) ON DELETE CASCADE,
    sender_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    message TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.inquiry_replies ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Owners/Agents can view replies to their own property's inquiries
CREATE POLICY "Owners can view replies to their inquiries" ON public.inquiry_replies
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.inquiries
            WHERE inquiries.id = inquiry_replies.inquiry_id
            AND inquiries.owner_id = auth.uid()
        )
    );

-- Owners/Agents can create replies to their own property's inquiries
CREATE POLICY "Owners can create replies to their inquiries" ON public.inquiry_replies
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.inquiries
            WHERE inquiries.id = inquiry_id
            AND inquiries.owner_id = auth.uid()
        )
        AND sender_id = auth.uid()
    );

-- Trigger for updated_at (using existing function if available)
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'handle_updated_at') THEN
        CREATE TRIGGER on_reply_update
            BEFORE UPDATE ON public.inquiry_replies
            FOR EACH ROW
            EXECUTE FUNCTION public.handle_updated_at();
    END IF;
END $$;
