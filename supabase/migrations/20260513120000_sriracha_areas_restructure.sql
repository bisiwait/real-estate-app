-- シラチャエリアの再編: 中心部への統合・南北追加・名称変更（物件一覧の area.name と一致させる）
DO $$
DECLARE
    rid uuid;
    central_id uuid;
    park_id uuid;
BEGIN
    SELECT id INTO rid FROM public.regions WHERE slug = 'sriracha' LIMIT 1;
    IF rid IS NULL THEN
        RAISE NOTICE 'sriracha region not found; skip';
        RETURN;
    END IF;

    SELECT id INTO central_id
    FROM public.areas
    WHERE region_id = rid AND slug = 'sriracha-central'
    LIMIT 1;

    IF central_id IS NULL THEN
        SELECT id INTO central_id
        FROM public.areas
        WHERE region_id = rid AND (slug = 'robinson-area' OR name = 'ロビンソン周辺' OR name = 'シラチャ中心部')
        ORDER BY CASE WHEN name = 'シラチャ中心部' OR slug = 'sriracha-central' THEN 0 ELSE 1 END
        LIMIT 1;
    END IF;

    SELECT id INTO park_id
    FROM public.areas
    WHERE region_id = rid AND (slug = 'park-area' OR name = 'スカパープ公園周辺')
    LIMIT 1;

    IF central_id IS NOT NULL AND park_id IS NOT NULL AND central_id <> park_id THEN
        UPDATE public.properties SET area_id = central_id WHERE area_id = park_id;
        UPDATE public.projects SET area_id = central_id WHERE area_id = park_id;
        DELETE FROM public.areas WHERE id = park_id;
    END IF;

    IF central_id IS NOT NULL THEN
        UPDATE public.areas
        SET name = 'シラチャ中心部', slug = 'sriracha-central'
        WHERE id = central_id;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM public.areas WHERE region_id = rid AND name = 'シラチャ北部') THEN
        INSERT INTO public.areas (region_id, name, slug) VALUES (rid, 'シラチャ北部', 'sriracha-north');
    END IF;

    IF NOT EXISTS (SELECT 1 FROM public.areas WHERE region_id = rid AND name = 'シラチャ南部') THEN
        INSERT INTO public.areas (region_id, name, slug) VALUES (rid, 'シラチャ南部', 'sriracha-south');
    END IF;

    UPDATE public.areas
    SET name = 'イオン周辺', slug = 'sriracha-aeon'
    WHERE region_id = rid AND name IN ('アサンプション周辺', 'イオン周辺');

    UPDATE public.areas
    SET name = 'Jパーク周辺', slug = 'sriracha-jpark'
    WHERE region_id = rid AND name IN ('J-Park周辺', 'Jパーク周辺');

    UPDATE public.areas
    SET name = 'その他', slug = 'sriracha-other'
    WHERE region_id = rid AND name IN ('スラサック・山側', 'その他');
END $$;
