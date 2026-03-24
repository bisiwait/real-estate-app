-- リード（inquiry_logs）のステータスをエージェント向けワークフロー用に拡張
BEGIN;

ALTER TABLE public.inquiry_logs DROP CONSTRAINT IF EXISTS inquiry_logs_status_check;

UPDATE public.inquiry_logs
SET status = CASE status
    WHEN 'new' THEN 'pending'
    WHEN 'contacted' THEN 'replied'
    WHEN 'closed' THEN 'won'
    ELSE status
END;

UPDATE public.inquiry_logs
SET status = 'pending'
WHERE status IS NULL
   OR status NOT IN ('pending', 'replied', 'viewing', 'won', 'lost');

ALTER TABLE public.inquiry_logs
    ADD CONSTRAINT inquiry_logs_status_check
    CHECK (status IN ('pending', 'replied', 'viewing', 'won', 'lost'));

ALTER TABLE public.inquiry_logs
    ALTER COLUMN status SET DEFAULT 'pending';

COMMIT;
