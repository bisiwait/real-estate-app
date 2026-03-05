-- Add last_confirmed_at column to properties table
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'properties' AND COLUMN_NAME = 'last_confirmed_at') THEN
        ALTER TABLE public.properties ADD COLUMN last_confirmed_at TIMESTAMPTZ DEFAULT NOW();
    END IF;
END $$;

-- Update existing rows to have last_confirmed_at equal to created_at
UPDATE public.properties SET last_confirmed_at = created_at WHERE last_confirmed_at IS NULL;

-- Create index for performance on freshness queries
CREATE INDEX IF NOT EXISTS idx_properties_last_confirmed_at ON public.properties(last_confirmed_at);
