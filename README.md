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

   問い合わせ・LINE 周りで **現在有効な変数** は `.env.example` の「公式LINE」「LINE ログイン（Supabase）」「メール（Resend）」を参照してください。**LIFF ID や Messaging API 用トークンはアプリコードでは参照しません**（旧仕様で設定している場合は Vercel / `.env.local` から削除して問題ありません。一覧は下記「旧仕様の環境変数」）。

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

## 問い合わせと LINE（現仕様）

- **フォーム送信**: 会員ログイン後、物件ページのお問い合わせフォームから送信すると `inquiries` に保存されます。担当エージェントへの通知は **メール（Resend）** を中心としたサーバー処理です（ダッシュボードからの返信通知もメール）。
- **公式 LINE ボタン**: 物件ページの「LINE で空室を確認する」などは、**友だち追加 URL（`line.me` / `lin.ee` 等）への通常のリンク遷移**で、本文に物件情報を載せた状態で LINE を開きます。**LIFF アプリ・Messaging API Webhook は使いません。**
- **エージェント設定**: ダッシュボードの「LINE 連携の設定」で、公式アカウントの **友だち追加 URL**（または Basic ID）を登録します。チャット対応は LINE Official Account Manager 側の設定に依存します。

## 旧仕様の環境変数（削除してよい）

リファクタ後、**アプリおよびこのリポジトリの Next.js / Supabase Edge Functions コードから参照されない**例です。Vercel やローカル `.env.local` に残っていれば削除して構いません。

| 例（名前） | 備考 |
|------------|------|
| `NEXT_PUBLIC_LINE_LIFF_ID` / `NEXT_PUBLIC_LINE_LIFF_ID_DEV` | LIFF 廃止 |
| 旧ドキュメントにあったその他の LIFF 関連変数 | コードに無ければ削除 |
| `LINE_OFFICIAL_CHANNEL_SECRET` / `LINE_OFFICIAL_CHANNEL_ACCESS_TOKEN`（および `*_DEV`） | Messaging API 廃止 |
| `LINE_CHANNEL_ID` / `LINE_CHANNEL_SECRET` / `LINE_CHANNEL_ACCESS_TOKEN` | コード未参照 |
| Webhook 用の `LINE_OFFICIAL_WEBHOOK_*` 文言変数 | ルート削除済みなら不要 |

※ Supabase **Custom OAuth（マイページの LINE 連携）** 用の `NEXT_PUBLIC_SUPABASE_LINE_PROVIDER` などは、引き続きプロジェクトで使う場合のみ設定してください。

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
- **Inquiries**: logged-in users submit the property form; agents are notified primarily by **email**. The green LINE buttons are **normal deep links** to your official account add-friend / chat URL with prefilled text—**no LIFF or Messaging API** in this app.
- **Dev hosts** `localhost`, `127.0.0.1`, `::1`, and `dev.chonburihome.com` use optional `*_DEV` Supabase / official LINE URL env vars when set; otherwise production keys are used (with a dev warning).
- Set `NEXT_PUBLIC_SITE_URL=http://localhost:3000` locally so background jobs without a `Host` header still resolve the dev data plane.
- Remove legacy **LIFF / Messaging API** env vars from Vercel if still present (see Japanese section「旧仕様の環境変数」).
- See `src/lib/env/deployment-target.ts` and `supabase-data-plane.ts` for details.
