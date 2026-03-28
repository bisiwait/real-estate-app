-- inquiry_replies 挿入時の pg_net → Edge Function 呼び出しは、
-- トリガー内の Authorization がリクエストコンテキストに依存しており失敗しやすい。
-- 返信通知メールは Next.js の POST /api/inquiries/notify-reply（Resend・セッション認証）で送る。

DROP TRIGGER IF EXISTS on_reply_created ON public.inquiry_replies;

DROP FUNCTION IF EXISTS public.trigger_reply_notification();
