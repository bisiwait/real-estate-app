-- 公式 LINE からの初回 Push 返信が済んだか（以降は公式チャットでの継続を推奨）
ALTER TABLE public.inquiries
  ADD COLUMN IF NOT EXISTS first_reply_sent BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN public.inquiries.first_reply_sent IS
  'Messaging API の Push で初回返信を送り済み。2通目以降は無料枠節約のため LINE Official Account Manager のチャットを推奨。';

-- 既存データ: inquiry_logs の成功した LINE 送信から復元
UPDATE public.inquiries i
SET first_reply_sent = true
WHERE EXISTS (
  SELECT 1
  FROM public.inquiry_logs il
  WHERE il.inquiry_id = i.id
    AND il.inquiry_type IN ('agent_reply', 'admin_reply')
    AND (il.metadata ->> 'sent_via') = 'line'
);
