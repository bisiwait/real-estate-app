# デプロイガイド (Cloudflare Pages & Supabase)

このプロジェクトを Cloudflare Pages にデプロイし、Supabase と連携させるための手順です。

## 1. Supabase の準備

1. [Supabase Dashboard](https://app.supabase.com/) で新規プロジェクトを作成します。
2. `supabase/migrations` フォルダにある SQL ファイルを実行してテーブルとポリシーを作成します。
   - `20240220_initial_schema.sql`
   - `20240224_storage_setup.sql` などを順に実行。
3. `Authentication` 設定で、デプロイ後の URL を許可リストに追加します。

## 2. Cloudflare Pages へのデプロイ

1. GitHub リポジトリを Cloudflare Pages に接続します。
2. ビルド設定を以下のように指定します：
   - **Framework preset**: `Next.js`
   - **Build command**: `npm run build`
   - **Build output directory**: `.next`
3. 環境変数を設定します（重要）：
   - `NEXT_PUBLIC_SUPABASE_URL`: Supabase のプロジェクトURL
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Supabase の Anon Key
   - その他、`.env.local` にある必要な変数。

## 3. 本番環境の最適化

- `next.config.ts` で `images.remotePatterns` に Supabase のホスト名が正しく設定されていることを確認してください。
- 認証リダイレクト URL が本番環境のドメインになっているか確認してください。
