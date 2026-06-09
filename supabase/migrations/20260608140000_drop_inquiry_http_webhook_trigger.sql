-- 問い合わせ通知は Next.js /api/inquiries/submit および /api/webhooks/inquiry で送信する。
-- プレースホルダ URL の pg http トリガー（on_inquiry_created_webhook）のみ削除する。
-- ※ on_inquiry_insert（set_inquiry_owner）は owner_id 設定のため残す。

DROP TRIGGER IF EXISTS on_inquiry_created_webhook ON public.inquiries;
DROP FUNCTION IF EXISTS public.send_inquiry_notification();
