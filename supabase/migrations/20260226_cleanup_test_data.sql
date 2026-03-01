-- 全てのデモデータ（物件、プロジェクト、問い合わせ、通知、エリア、地域）を削除してクリーンな状態にする
-- 外部キー制約を考慮し、依存関係の下位テーブルから順に削除、または CASCADE を使用します

BEGIN;

-- 1. トランザクション・通知系データの削除
DELETE FROM public.inquiry_replies;
DELETE FROM public.inquiries;
DELETE FROM public.payments;

-- 2. 物件・プロジェクトデータの削除
DELETE FROM public.properties;
DELETE FROM public.projects;

-- 3. マスターデータ（エリア・地域）の削除
-- マスターデータは保持するためコメントアウト
-- DELETE FROM public.areas;
-- DELETE FROM public.regions;

COMMIT;

-- 補足: IDのシーケンスもリセットしたい場合は以下も実行してください（UUIDを使用していないテーブルがある場合）
-- ALTER SEQUENCE IF EXISTS properties_id_seq RESTART WITH 1;
-- ALTER SEQUENCE IF EXISTS projects_id_seq RESTART WITH 1;
