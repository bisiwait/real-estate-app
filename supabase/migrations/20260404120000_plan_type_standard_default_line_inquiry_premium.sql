-- plan_type: 新規行のデフォルトを standard に（既存の free は standard へ寄せる。premium 契約は据え置き）
ALTER TABLE public.profiles
  ALTER COLUMN plan_type SET DEFAULT 'standard';

UPDATE public.profiles
SET plan_type = 'standard'
WHERE (plan_type IS NULL OR plan_type = 'free')
  AND NOT (
    COALESCE(plan, '') = 'premium'
    OR COALESCE(plan_type, '') = 'premium'
  );

COMMENT ON COLUMN public.profiles.plan_type IS 'エージェントプラン表示用: standard / premium 等。LINE 物件問い合わせはプレミアム（契約有効）のみ。';

-- 掲載オーナーがプレミアム（契約期内）または管理者のときのみ LINE 希望の問い合わせを許可
CREATE OR REPLACE FUNCTION public.profile_property_line_inquiry_eligible(p_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = p_user_id
      AND (
        p.is_admin IS TRUE
        OR (
          (p.plan_type = 'premium' OR p.plan = 'premium')
          AND (
            p.current_period_end IS NULL
            OR p.current_period_end > now()
          )
        )
      )
  );
$$;

CREATE OR REPLACE FUNCTION public.set_inquiry_owner()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  prop_owner uuid;
  want_line boolean;
  ok boolean;
BEGIN
  IF NEW.property_id IS NOT NULL THEN
    SELECT user_id INTO prop_owner
    FROM public.properties
    WHERE id = NEW.property_id;
    NEW.owner_id := prop_owner;
  END IF;

  -- LINE 希望のときのみプレミアムを要求（line_user_id だけ残っていて channel が email のケースは従来どおり許可）
  IF NEW.preferred_reply_channel = 'line' THEN
    IF NEW.owner_id IS NULL THEN
      RAISE EXCEPTION 'LINE inquiry requires a property with an owner'
        USING ERRCODE = '23514';
    END IF;
    SELECT public.profile_property_line_inquiry_eligible(NEW.owner_id) INTO ok;
    IF NOT ok THEN
      RAISE EXCEPTION 'LINE inquiry is only available for Premium listing agents (active subscription)'
        USING ERRCODE = '23514';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.profile_property_line_inquiry_eligible(uuid) IS '物件の掲載者が公式 LINE 経由の問い合わせ（preferred_reply_channel=line 等）を受け付けられるか';
