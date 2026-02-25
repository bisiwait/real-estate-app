-- storage_setup.sql
-- Run this in your Supabase SQL Editor

-- 1. Create a bucket for property images
INSERT INTO storage.buckets (id, name, public)
VALUES ('property-images', 'property-images', true)
ON CONFLICT (id) DO NOTHING;

-- 2. Allow public access to view images
CREATE POLICY "Public Access"
ON storage.objects FOR SELECT
USING ( bucket_id = 'property-images' );

-- 3. Allow authenticated users to upload images to their own property folders
-- We use the property_id/filename structure as planned.
-- Note: During initial upload, we might not have the property_id yet if it's a NEW property.
-- Better approach for security: Allow authenticated users to upload to property-images/
-- and enforce folder structure at the application level.

CREATE POLICY "Authenticated users can upload images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
    bucket_id = 'property-images'
);

-- 4. Allow owners to delete their own images
CREATE POLICY "Users can delete own images"
ON storage.objects FOR DELETE
TO authenticated
USING (
    bucket_id = 'property-images' AND
    (storage.foldername(name))[1] IN (
        SELECT id::text FROM public.properties WHERE user_id = auth.uid()
    )
);
