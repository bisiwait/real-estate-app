-- 1. Enable Http Extension (If not already enabled)
CREATE EXTENSION IF NOT EXISTS "http" WITH SCHEMA "extensions";

-- 2. Create the webhook function
-- Replace YOUR_SITE_URL with your actual production URL (e.g., https://your-project.pages.dev)
CREATE OR REPLACE FUNCTION public.send_inquiry_notification()
RETURNS TRIGGER AS $$
DECLARE
  webhook_url TEXT := 'YOUR_SITE_URL/api/webhooks/inquiry';
  payload JSONB;
BEGIN
  payload := jsonb_build_object(
    'type', TG_OP,
    'table', TG_TABLE_NAME,
    'record', row_to_json(NEW)
  );

  PERFORM extensions.http_post(
    url := webhook_url,
    body := payload::text,
    headers := '{"Content-Type": "application/json"}'::jsonb
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Create the trigger
DROP TRIGGER IF EXISTS on_inquiry_created_webhook ON public.inquiries;
CREATE TRIGGER on_inquiry_created_webhook
  AFTER INSERT ON public.inquiries
  FOR EACH ROW
  EXECUTE FUNCTION public.send_inquiry_notification();

COMMENT ON FUNCTION public.send_inquiry_notification IS 'Sends a POST request to the Next.js API route whenever a new inquiry is created.';
