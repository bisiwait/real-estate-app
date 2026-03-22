-- 掲載クレジットによる公開制限・減算を廃止（available_credits カラムは互換のため残す）

CREATE OR REPLACE FUNCTION public.decrement_credit_on_publish()
RETURNS TRIGGER AS $$
BEGIN
  -- 公開時のクレジットチェック・減算は行わない
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
