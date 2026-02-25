-- Production Security and RLS Finalization
-- Ensures all tables are protected and admins have appropriate access.

-- 0. Admin Check Helper Function
CREATE OR REPLACE FUNCTION public.is_admin(user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = user_id AND is_admin = true
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 1. Profiles Table RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public profiles are readable by everyone" ON public.profiles;
CREATE POLICY "Profiles are readable by owner and admins" ON public.profiles
    FOR SELECT USING (auth.uid() = id OR is_admin(auth.uid()));

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile or admins can update all" ON public.profiles
    FOR UPDATE USING (auth.uid() = id OR is_admin(auth.uid()));

-- 2. Properties Table RLS Updates
ALTER TABLE public.properties ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view active properties" ON public.properties;
CREATE POLICY "Anyone can view active properties" ON public.properties
    FOR SELECT USING (
        (status = 'published' AND is_approved = true AND (expiry_date IS NULL OR expiry_date > NOW()))
        OR auth.uid() = user_id
        OR is_admin(auth.uid())
    );

DROP POLICY IF EXISTS "Users can manage own properties" ON public.properties;
CREATE POLICY "Users can manage own properties" ON public.properties
    FOR ALL USING (auth.uid() = user_id OR is_admin(auth.uid()));

-- 3. Inquiries Table RLS Updates
ALTER TABLE public.inquiries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can submit an inquiry" ON public.inquiries;
CREATE POLICY "Anyone can submit an inquiry" ON public.inquiries
    FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Owners can manage own inquiries" ON public.inquiries;
CREATE POLICY "Owners and admins can manage inquiries" ON public.inquiries
    FOR SELECT USING (auth.uid() = owner_id OR is_admin(auth.uid()));

DROP POLICY IF EXISTS "Owners can update their inquiries" ON public.inquiries;
CREATE POLICY "Owners and admins can update inquiries" ON public.inquiries
    FOR UPDATE USING (auth.uid() = owner_id OR is_admin(auth.uid()));

-- 4. Inquiry Replies Table RLS Updates
ALTER TABLE public.inquiry_replies ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Owners can view replies to their inquiries" ON public.inquiry_replies;
CREATE POLICY "Owners and admins can view replies" ON public.inquiry_replies
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.inquiries
            WHERE inquiries.id = inquiry_replies.inquiry_id
            AND (inquiries.owner_id = auth.uid() OR is_admin(auth.uid()))
        )
    );

DROP POLICY IF EXISTS "Owners can create replies to their inquiries" ON public.inquiry_replies;
CREATE POLICY "Owners and admins can create replies" ON public.inquiry_replies
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.inquiries
            WHERE inquiries.id = inquiry_id
            AND (inquiries.owner_id = auth.uid() OR is_admin(auth.uid()))
        )
        AND (sender_id = auth.uid())
    );

-- 5. Payments Table RLS
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can see their own payments" ON public.payments;
CREATE POLICY "Users can see their own payments and admins see all" ON public.payments
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.properties
            WHERE properties.id = payments.property_id
            AND (properties.user_id = auth.uid() OR is_admin(auth.uid()))
        )
    );

-- 6. Regions and Areas (already public read, but reinforcing)
ALTER TABLE public.regions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public read regions" ON public.regions;
CREATE POLICY "Public read regions" ON public.regions FOR SELECT USING (true);

ALTER TABLE public.areas ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public read areas" ON public.areas;
CREATE POLICY "Public read areas" ON public.areas FOR SELECT USING (true);

-- 7. Admin Only Table Management (Regions/Areas update)
CREATE POLICY "Admins can manage regions" ON public.regions FOR ALL USING (is_admin(auth.uid()));
CREATE POLICY "Admins can manage areas" ON public.areas FOR ALL USING (is_admin(auth.uid()));
