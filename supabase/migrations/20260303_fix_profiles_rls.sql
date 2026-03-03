-- Allow public read access to profiles for agent pages
CREATE POLICY "Allow public read access to profiles" 
ON public.profiles FOR SELECT 
USING (true);
