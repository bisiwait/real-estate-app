-- 20260304_broadcast_system.sql
-- Migration for Property Broadcasting System (Email & LINE)

-- 1. Broadcast Logs Table
CREATE TABLE IF NOT EXISTS public.broadcast_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id),
    property_ids UUID[] NOT NULL,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    segment_type TEXT NOT NULL, -- 'all', 'area_favorites', 'saved_search_match'
    segment_value TEXT,         -- area name or ID if applicable
    target_count INTEGER DEFAULT 0,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
    error_message TEXT,
    metadata JSONB DEFAULT '{}'
);

-- 2. Broadcast Recipients Table (to track individual delivery)
CREATE TABLE IF NOT EXISTS public.broadcast_recipients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    broadcast_id UUID REFERENCES public.broadcast_logs(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    delivery_method TEXT NOT NULL, -- 'email', 'line'
    status TEXT DEFAULT 'sent' CHECK (status IN ('sent', 'failed')),
    error_message TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Row Level Security
ALTER TABLE public.broadcast_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.broadcast_recipients ENABLE ROW LEVEL SECURITY;

-- Only admins can see and manage broadcast logs
CREATE POLICY "Admins can manage broadcast logs" ON public.broadcast_logs
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid()
            AND (profiles.is_admin = true OR profiles.user_role = 'admin')
        )
    );

CREATE POLICY "Admins can manage broadcast recipients" ON public.broadcast_recipients
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid()
            AND (profiles.is_admin = true OR profiles.user_role = 'admin')
        )
    );

-- 4. Indices for performance
CREATE INDEX IF NOT EXISTS idx_broadcast_logs_created_at ON public.broadcast_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_broadcast_recipients_broadcast_id ON public.broadcast_recipients(broadcast_id);

COMMENT ON TABLE public.broadcast_logs IS 'History of property broadcast notifications';
COMMENT ON TABLE public.broadcast_recipients IS 'Individual delivery logs for broadcasts';
