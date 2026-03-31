/**
 * サイト共通の公式 LINE（友だち追加）URL。
 * 物件問い合わせ後のサンクス等で使用。Vercel では NEXT_PUBLIC_* を設定。
 *
 * 公式LINEルーティング（Messaging API）を有効にする場合:
 * - `LINE_OFFICIAL_CHANNEL_SECRET` と `LINE_OFFICIAL_CHANNEL_ACCESS_TOKEN` を設定
 * - Webhook URL: `/api/webhooks/line-official`
 * - ここで返す友だち追加URLは、上記トークンと同一の LINE Official Account と一致させること
 */
const DEFAULT_OFFICIAL_LINE_ID = '@164exdsf'

export function getOfficialLineAddFriendUrl(): string {
  const fromEnv = process.env.NEXT_PUBLIC_OFFICIAL_LINE_ADD_URL?.trim()
  if (fromEnv) return fromEnv

  const id = (process.env.NEXT_PUBLIC_LINE_OFFICIAL_ID || DEFAULT_OFFICIAL_LINE_ID).trim()
  if (/^https?:\/\//i.test(id)) return id

  const pathId = id.startsWith('@') ? id : `@${id.replace(/^@+/g, '')}`
  const segment =
    pathId.startsWith('@') && pathId.length > 1
      ? `@${encodeURIComponent(pathId.slice(1))}`
      : encodeURIComponent(pathId)
  return `https://line.me/R/ti/p/${segment}`
}
