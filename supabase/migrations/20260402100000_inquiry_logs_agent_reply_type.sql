-- エージェントダッシュボードからの返信ログ用 inquiry_type
BEGIN;

ALTER TABLE public.inquiry_logs DROP CONSTRAINT IF EXISTS inquiry_logs_inquiry_type_check;

ALTER TABLE public.inquiry_logs ADD CONSTRAINT inquiry_logs_inquiry_type_check
  CHECK (inquiry_type IN ('line', 'phone', 'form', 'admin_reply', 'agent_reply'));

COMMENT ON CONSTRAINT inquiry_logs_inquiry_type_check ON public.inquiry_logs IS
  'admin_reply: 管理画面からの返信 | agent_reply: エージェントダッシュボードからの返信（/api/inquiries/notify-reply）';

COMMIT;
