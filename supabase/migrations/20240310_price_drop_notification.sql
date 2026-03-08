-- 1. Profiles テーブルに line_user_id を追加 (LINE 送信用)
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS line_user_id TEXT;
COMMENT ON COLUMN public.profiles.line_user_id IS 'LINE Messaging API ユーザーID';

-- 2. 値下げ検知用 Webhook 関数
-- この関数は properties.price が更新された際に発火し、価格が下がっている場合のみ Edge Function を呼び出します。
CREATE OR REPLACE FUNCTION public.on_price_updated_webhook()
RETURNS TRIGGER AS $$
DECLARE
  edge_function_url TEXT;
  service_role_key TEXT;
  payload JSONB;
BEGIN
  -- 開発環境・本番環境に応じて URL を調整する必要がありますが、
  -- ここではプロジェクト内部の呼び出しとして設定します。
  -- Supabase の管理画面で Edge Function の URL を確認して設定してください。
  edge_function_url := 'https://' || (SELECT setting FROM pg_settings WHERE name = 'request.host') || '/functions/v1/notify-price-drop';
  
  -- 価格が下がった場合のみ実行
  IF (NEW.price < OLD.price) THEN
    payload := jsonb_build_object(
      'type', 'PRICE_DROP',
      'property_id', NEW.id,
      'old_price', OLD.price,
      'new_price', NEW.price,
      'title', NEW.title,
      'old_record', row_to_json(OLD),
      'new_record', row_to_json(NEW)
    );

    -- Edge Function への HTTP POST (Net Extension を使用)
    -- 注意: Supabase SQL Editor で "http" エクステンションが有効である必要があります。
    PERFORM extensions.http_post(
      url := edge_function_url,
      body := payload::text,
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || current_setting('request.jwt.claims', true)::jsonb->>'api_key' -- または直接サービスキーを設定
      )
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. トリガーの作成
DROP TRIGGER IF EXISTS tr_on_price_updated ON public.properties;
CREATE TRIGGER tr_on_price_updated
  AFTER UPDATE OF price ON public.properties
  FOR EACH ROW
  EXECUTE FUNCTION public.on_price_updated_webhook();

COMMENT ON FUNCTION public.on_price_updated_webhook() IS '物件価格が値下げされた際にお気に入り登録ユーザーへ通知を送る Webhook トリガー';
