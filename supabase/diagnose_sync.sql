-- 1. Check if columns exist and have data
SELECT id, email, full_name, available_credits, created_at FROM public.profiles LIMIT 5;


-- 2. Check auth.users to see where the name might be
SELECT id, email, raw_user_meta_data FROM auth.users LIMIT 5;

-- 3. Diagnostic: Try to sync again with a more flexible approach
-- and show how many rows are actually updated.
DO $$
DECLARE
    updated_count INTEGER;
BEGIN
    UPDATE public.profiles p
    SET 
        email = u.email,
        full_name = COALESCE(u.raw_user_meta_data->>'full_name', u.raw_user_meta_data->>'display_name', u.raw_user_meta_data->>'name', 'Anonymous Agent')
    FROM auth.users u
    WHERE p.id = u.id;
    
    GET DIAGNOSTICS updated_count = ROW_COUNT;
    RAISE NOTICE 'Updated % profiles', updated_count;
END $$;

-- 4. Ensure RLS allows admins to see everything
-- Re-check profiles RLS
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
CREATE POLICY "Admins can view all profiles" ON public.profiles
    FOR SELECT USING (
        (SELECT is_admin FROM public.profiles WHERE id = auth.uid()) = true
    );
