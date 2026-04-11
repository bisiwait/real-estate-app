-- 物件 status から 商談中 / 成約済 / 期限切れ を廃止（draft / published / pending のみ）

UPDATE public.properties
SET status = 'published'
WHERE status = 'under_negotiation';

UPDATE public.properties
SET status = 'draft'
WHERE status IN ('contracted', 'expired');

UPDATE public.properties
SET status_before_suspension = CASE status_before_suspension
  WHEN 'under_negotiation' THEN 'published'
  WHEN 'contracted' THEN 'draft'
  WHEN 'expired' THEN 'draft'
  ELSE status_before_suspension
END
WHERE status_before_suspension IN ('under_negotiation', 'contracted', 'expired');

ALTER TABLE public.properties DROP CONSTRAINT IF EXISTS properties_status_check;

ALTER TABLE public.properties
  ADD CONSTRAINT properties_status_check
  CHECK (status IN ('draft', 'published', 'pending'));

DROP VIEW IF EXISTS public.active_listings;

CREATE VIEW public.active_listings AS
SELECT
  p.*,
  a.name AS area_name,
  r.name AS region_name
FROM public.properties p
JOIN public.areas a ON p.area_id = a.id
JOIN public.regions r ON a.region_id = r.id
WHERE
  p.status = 'published'
  AND (p.expiry_date IS NULL OR p.expiry_date > NOW());

CREATE OR REPLACE FUNCTION public.restore_properties_after_agent_resume(p_user_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  n int;
BEGIN
  UPDATE public.properties
  SET
    status = CASE
      WHEN status_before_suspension IN ('draft', 'published', 'pending') THEN status_before_suspension
      ELSE 'draft'
    END,
    status_before_suspension = NULL,
    updated_at = NOW()
  WHERE user_id = p_user_id
    AND status_before_suspension IS NOT NULL
    AND status = 'draft';

  GET DIAGNOSTICS n = ROW_COUNT;
  RETURN n;
END;
$$;
