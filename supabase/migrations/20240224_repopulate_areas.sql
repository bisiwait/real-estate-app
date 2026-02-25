-- エリア情報の不足を解消するためのSQLスクリプト

DO $$
DECLARE
    pattaya_id UUID;
    sriracha_id UUID;
BEGIN
    -- 1. 地域（Region）の存在確認と作成
    INSERT INTO public.regions (name, slug) 
    VALUES ('Pattaya', 'pattaya'), ('Sriracha', 'sriracha')
    ON CONFLICT (slug) DO NOTHING;

    -- IDを取得
    SELECT id INTO pattaya_id FROM public.regions WHERE slug = 'pattaya';
    SELECT id INTO sriracha_id FROM public.regions WHERE slug = 'sriracha';

    -- 2. パタヤのエリア（Areas）
    -- 重複を避けるため、名前と地域IDの組み合わせが存在しない場合のみ挿入
    IF NOT EXISTS (SELECT 1 FROM public.areas WHERE name = 'Pratumnak' AND region_id = pattaya_id) THEN
        INSERT INTO public.areas (region_id, name, slug) VALUES (pattaya_id, 'Pratumnak', 'pratumnak');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM public.areas WHERE name = 'Jomtien' AND region_id = pattaya_id) THEN
        INSERT INTO public.areas (region_id, name, slug) VALUES (pattaya_id, 'Jomtien', 'jomtien');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM public.areas WHERE name = 'Central Pattaya' AND region_id = pattaya_id) THEN
        INSERT INTO public.areas (region_id, name, slug) VALUES (pattaya_id, 'Central Pattaya', 'central-pattaya');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM public.areas WHERE name = 'North Pattaya / Wongamat' AND region_id = pattaya_id) THEN
        INSERT INTO public.areas (region_id, name, slug) VALUES (pattaya_id, 'North Pattaya / Wongamat', 'north-pattaya');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM public.areas WHERE name = 'East Pattaya' AND region_id = pattaya_id) THEN
        INSERT INTO public.areas (region_id, name, slug) VALUES (pattaya_id, 'East Pattaya', 'east-pattaya');
    END IF;

    -- 3. シラチャのエリア（Areas）
    IF NOT EXISTS (SELECT 1 FROM public.areas WHERE name = 'ロビンソン周辺' AND region_id = sriracha_id) THEN
        INSERT INTO public.areas (region_id, name, slug) VALUES (sriracha_id, 'ロビンソン周辺', 'robinson-area');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM public.areas WHERE name = 'スカパープ公園周辺' AND region_id = sriracha_id) THEN
        INSERT INTO public.areas (region_id, name, slug) VALUES (sriracha_id, 'スカパープ公園周辺', 'park-area');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM public.areas WHERE name = 'アサンプション周辺' AND region_id = sriracha_id) THEN
        INSERT INTO public.areas (region_id, name, slug) VALUES (sriracha_id, 'アサンプション周辺', 'assumption-area');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM public.areas WHERE name = 'J-Park周辺' AND region_id = sriracha_id) THEN
        INSERT INTO public.areas (region_id, name, slug) VALUES (sriracha_id, 'J-Park周辺', 'j-park-area');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM public.areas WHERE name = 'スラサック・山側' AND region_id = sriracha_id) THEN
        INSERT INTO public.areas (region_id, name, slug) VALUES (sriracha_id, 'スラサック・山側', 'surasak-area');
    END IF;

END $$;
