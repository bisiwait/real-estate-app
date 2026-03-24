-- メール問い合わせはログインユーザーのみ INSERT 可能にする（ゲストからの匿名投稿を禁止）
DROP POLICY IF EXISTS "Anyone can submit an inquiry" ON public.inquiries;

CREATE POLICY "Authenticated users can submit inquiries" ON public.inquiries
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);
