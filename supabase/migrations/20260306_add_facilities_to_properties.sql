-- Add facilities column to properties table
ALTER TABLE properties ADD COLUMN IF NOT EXISTS project_facilities text[] DEFAULT '{}';

-- Update existing properties to copy facilities from their projects if available
UPDATE properties p
SET project_facilities = pr.facilities
FROM projects pr
WHERE p.project_id = pr.id
AND (p.project_facilities IS NULL OR p.project_facilities = '{}');
