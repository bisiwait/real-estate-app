-- Migration to add SNS copy columns to properties table
ALTER TABLE public.properties
ADD COLUMN sns_copy_ja TEXT DEFAULT '',
ADD COLUMN sns_copy_en TEXT DEFAULT '',
ADD COLUMN sns_copy_th TEXT DEFAULT '';
