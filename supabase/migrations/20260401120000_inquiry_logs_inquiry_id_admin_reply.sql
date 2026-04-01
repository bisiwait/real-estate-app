-- 管理画面からの返信ログ用: inquiries との紐付けと inquiry_type 拡張
BEGIN;

ALTER TABLE public.inquiry_logs DROP CONSTRAINT IF EXISTS inquiry_logs_inquiry_type_check;

ALTER TABLE public.inquiry_logs ADD CONSTRAINT inquiry_logs_inquiry_type_check
  CHECK (inquiry_type IN ('line', 'phone', 'form', 'admin_reply'));

ALTER TABLE public.inquiry_logs ADD COLUMN IF NOT EXISTS inquiry_id UUID REFERENCES public.inquiries(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_inquiry_logs_inquiry_id ON public.inquiry_logs(inquiry_id);

COMMENT ON COLUMN public.inquiry_logs.inquiry_id IS '関連する inquiries.id（管理画面からの返信ログ等）';

COMMIT;
