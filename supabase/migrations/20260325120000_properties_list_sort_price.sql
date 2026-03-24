-- 一覧の価格ソート用（賃貸・売買混在時は行ごとに表示価格に近い値で比較）
ALTER TABLE public.properties
ADD COLUMN IF NOT EXISTS list_sort_price NUMERIC
GENERATED ALWAYS AS (
  CASE
    WHEN COALESCE(is_presale, false) THEN COALESCE(sale_price, price, 0)
    WHEN COALESCE(is_for_rent, false) AND COALESCE(is_for_sale, false) THEN
      COALESCE(
        CASE
          WHEN rent_price IS NOT NULL AND sale_price IS NOT NULL THEN LEAST(rent_price, sale_price)
          ELSE NULL
        END,
        rent_price,
        sale_price,
        price,
        0
      )
    WHEN COALESCE(is_for_rent, false) THEN COALESCE(rent_price, price, 0)
    WHEN COALESCE(is_for_sale, false) THEN COALESCE(sale_price, price, 0)
    ELSE COALESCE(price, rent_price, sale_price, 0)
  END
) STORED;

CREATE INDEX IF NOT EXISTS idx_properties_list_sort_price ON public.properties (list_sort_price);
