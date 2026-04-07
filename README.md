# Chonburi Home（real_estate）

Next.js（App Router）の不動産掲載・問い合わせアプリです。

## 必要環境

- Node.js（プロジェクトに合わせた LTS 推奨）
- npm（このリポジトリは `npm` を想定）

## 初回セットアップ

1. 依存関係のインストール

   ```bash
   npm install
   ```

2. 環境変数

   リポジトリ直下の `.env.example` をコピーして `.env.local` を作成し、値を埋めます。

   ```bash
   cp .env.example .env.local
   ```

   **`.env.local` とサーバー専用シークレット（`SUPABASE_SERVICE_ROLE_KEY` 等）は Git にコミットしないでください。**

3. 開発サーバー

   ```bash
   npm run dev
   ```

   ブラウザで [http://localhost:3000](http://localhost:3000) を開きます。

4. 本番ビルド確認（任意）

   ```bash
   npm run build
   npm run start
   ```

## 環境の切り替え（本番 DB / 開発 DB）

アプリは **リクエストのホスト名** に応じて、Supabase・公式 LINE 用の公開 URL（友だち追加など）の接続先を切り替えられます。

### 開発扱いになるホスト

次のとき **開発用** の変数（`*_DEV` サフィックス）が使われます。

- `localhost`
- `127.0.0.1`
- `::1`
- `dev.chonburihome.com`（完全一致）

それ以外（例: `chonburihome.com`、Vercel の本番ドメイン）は **本番用** の `NEXT_PUBLIC_SUPABASE_URL` 等が使われます。

### 設定のルール

| 用途 | 本番（既定） | 開発ホスト用（任意） |
|------|-------------|----------------------|
| Supabase URL / anon | `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `NEXT_PUBLIC_SUPABASE_URL_DEV`, `NEXT_PUBLIC_SUPABASE_ANON_KEY_DEV` |
| Supabase サービスロール | `SUPABASE_SERVICE_ROLE_KEY` | `SUPABASE_SERVICE_ROLE_KEY_DEV` |
| 公式 LINE 友だち追加 URL / Manager URL 等 | `NEXT_PUBLIC_OFFICIAL_LINE_ADD_URL` 等 | `NEXT_PUBLIC_OFFICIAL_LINE_ADD_URL_DEV` 等 |

開発ホストと判定されたが `*_DEV` の Supabase ペアが **未設定** の場合は、コンソールに警告を出し **本番 Supabase** にフォールバックします（誤って空の開発 DB に繋がないため）。

### 実装の置き場所

- ホスト判定: `src/lib/env/deployment-target.ts`（`isDevelopmentDeploymentHost`, `resolveDataPlaneHostname` など）
- Supabase: `src/lib/env/supabase-data-plane.ts`
- 公式 LINE（公開 URL）: `src/lib/env/line-data-plane.ts`

### ローカルでの推奨

`.env.local` では次を推奨します。

- `NEXT_PUBLIC_SITE_URL=http://localhost:3000`  
  → ISR / `unstable_cache` など **HTTP リクエストが無い処理** でも「開発扱い」で Supabase を選びやすくなります。

### Vercel の例

- **本番プロジェクト**: 本番用の `NEXT_PUBLIC_*` と `SUPABASE_*` のみ。`*_DEV` は空でよい。
- **開発用デプロイ（dev.chonburihome.com）**: 上表の `*_DEV` にステージング用 Supabase / 公式 LINE URL を設定。

## その他コマンド

| コマンド | 説明 |
|----------|------|
| `npm run lint` | ESLint |
| `npm run icons:generate` | タブ用アイコン生成（`scripts/`） |

## English summary

- Copy `.env.example` to `.env.local` and fill in secrets (never commit `.env.local`).
- **Dev hosts** `localhost`, `127.0.0.1`, `::1`, and `dev.chonburihome.com` use optional `*_DEV` Supabase / LINE URL env vars when set; otherwise production keys are used (with a dev warning).
- Set `NEXT_PUBLIC_SITE_URL=http://localhost:3000` locally so background jobs without a `Host` header still resolve the dev data plane.
- See `src/lib/env/deployment-target.ts` and `supabase-data-plane.ts` for details.
