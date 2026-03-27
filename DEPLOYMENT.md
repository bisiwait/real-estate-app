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

## 3. 本番ドメイン（chonburihome.com）

Vercel（またはホスティング先）の **Environment Variables** で次を必ず設定してください。

| 変数 | 例 |
|------|-----|
| `NEXT_PUBLIC_SITE_URL` | `https://chonburihome.com` |
| `NEXT_PUBLIC_BASE_URL` | （未使用なら省略可。使用する場合は `https://chonburihome.com` と揃える） |

ローカルの `.env.local` では `http://localhost:3000` のままで問題ありません。

**Supabase（Authentication → URL Configuration）** でも Site URL・Redirect URLs を `https://chonburihome.com/...` に更新してください。

旧ホストから本番オリジンへ 308 リダイレクトが必要な場合は、**`NEXT_PUBLIC_SITE_URL` を本番 URL に設定したうえで**、ホスティング先の **Environment Variables** に `LEGACY_REDIRECT_HOSTS` を設定します（カンマ区切りのホスト名。例: `old-project.vercel.app`）。リダイレクト先は `NEXT_PUBLIC_SITE_URL` と同じオリジンです。

**注意:** `next build`（本番モード）と `getPublicSiteUrl()` は `NEXT_PUBLIC_SITE_URL`（または Vercel 上の `VERCEL_URL`）に依存します。Vercel **Production** では OGP・リダイレクトのため **`NEXT_PUBLIC_SITE_URL=https://chonburihome.com` を必須**にしてください。

## 4. 本番環境の最適化

- `next.config.ts` で `images.remotePatterns` に Supabase のホスト名が正しく設定されていることを確認してください。
- 認証リダイレクト URL が本番環境のドメインになっているか確認してください。
