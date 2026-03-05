
-- profilesテーブルのRLSポリシーを更新して、新しいuser_roleカラムを使用するようにする
-- これにより、Adminが正常に他のユーザーのプロファイルを更新できるようになります。

DROP POLICY IF EXISTS "Profiles are readable by owner and admins" ON public.profiles;
CREATE POLICY "Profiles are readable by owner and admins" ON public.profiles
    FOR SELECT USING (auth.uid() = id OR EXISTS (
        SELECT 1 FROM public.profiles WHERE id = auth.uid() AND user_role = 'admin'
    ));

DROP POLICY IF EXISTS "Users can update own profile or admins can update all" ON public.profiles;
CREATE POLICY "Users can update own profile or admins can update all" ON public.profiles
    FOR UPDATE USING (auth.uid() = id OR EXISTS (
        SELECT 1 FROM public.profiles WHERE id = auth.uid() AND user_role = 'admin'
    ));

-- ついでにis_admin関数も現在のroleシステムに合わせて更新しておくと安全
CREATE OR REPLACE FUNCTION public.is_admin(user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = user_id AND (user_role = 'admin' OR is_admin = true)
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
