-- 1. pg_net 拡張機能を有効化（HTTPリクエスト送信に必要）
CREATE EXTENSION IF NOT EXISTS pg_net;

-- 2. 通知を飛ばすための関数を作成
CREATE OR REPLACE FUNCTION public.trigger_reply_notification()
RETURNS TRIGGER AS $$
BEGIN
  -- 実際のプロジェトURLを動的に取得、または手動で設定します
  -- nenyflhwwifoiqmxjinz は提供されたプロジェクトIDです
  PERFORM
    net.http_post(
      url := 'https://nenyflhwwifoiqmxjinz.supabase.co/functions/v1/notify-inquirer',
      headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || current_setting('request.headers', true)::jsonb->>'authorization'
      ),
      body := jsonb_build_object('record', row_to_json(NEW))
    );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. トリガーを有効化（前回コメントアウトしていた部分を解除）
DROP TRIGGER IF EXISTS on_reply_created ON public.inquiry_replies;
CREATE TRIGGER on_reply_created
  AFTER INSERT ON public.inquiry_replies
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_reply_notification();

-- 確認メッセージ
COMMENT ON FUNCTION public.trigger_reply_notification() IS 'Repliesテーブルに挿入があった際、Edge Functionを呼び出します';
