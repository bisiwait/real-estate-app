/**
 * サイト共通の公式 LINE（友だち追加）URL。
 * 物件問い合わせ後のサンクス等で使用。Vercel では NEXT_PUBLIC_* を設定。
 *
 * 優先: `NEXT_PUBLIC_OFFICIAL_LINE_ADD_URL`（本番の Chonburi Home 公式アカウントの line.me URL をそのまま指定）。
 * 未設定時は `NEXT_PUBLIC_LINE_OFFICIAL_ID`、さらに未設定なら下記デフォルト（Basic ID は LINE コンソールの値に合わせて変更可）。
 *
 * 注意: 開発用アカウント（bisidev 等）やプレビュー用 URL を本番の env に入れないこと。
 * Messaging API トークンと必ず同一の公式アカウントに揃える。
 */
const DEFAULT_OFFICIAL_LINE_ID = '@chonburihome'

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
