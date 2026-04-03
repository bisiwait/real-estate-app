import { unstable_cache } from 'next/cache'

/**
 * サイト共通の公式 LINE（友だち追加）URL。
 * 物件問い合わせ後のサンクス等で使用。Vercel では NEXT_PUBLIC_* を設定。
 *
 * 優先: `NEXT_PUBLIC_OFFICIAL_LINE_ADD_URL`（本番の Chonburi Home 公式アカウントの line.me URL をそのまま指定）。
 * 次: `NEXT_PUBLIC_LINE_OFFICIAL_ID`。
 * サーバー側のみ: `LINE_OFFICIAL_CHANNEL_ACCESS_TOKEN` があれば Messaging API の bot/info から Basic ID を取得して URL を組み立てる
 * （`resolveOfficialLineAddFriendUrl` / 物件詳細ページ・inquiry-logs API）。
 * クライアント単体ではトークンを使えないため、未設定時は下記デフォルト Basic ID を使う。
 *
 * 注意: 開発用アカウント（bisidev 等）やプレビュー用 URL を本番の env に入れないこと。
 * Messaging API トークンと必ず同一の公式アカウントに揃える。
 */
const DEFAULT_OFFICIAL_LINE_ID = '@chonburihome'

/** Basic ID（@xxx）または既存の line.me URL から友だち追加 URL を返す */
export function basicIdOrUrlToAddFriendUrl(idOrUrl: string): string {
  const raw = idOrUrl.trim()
  if (/^https?:\/\//i.test(raw)) return raw

  const pathId = raw.startsWith('@') ? raw : `@${raw.replace(/^@+/g, '')}`
  const segment =
    pathId.startsWith('@') && pathId.length > 1
      ? `@${encodeURIComponent(pathId.slice(1))}`
      : encodeURIComponent(pathId)
  return `https://line.me/R/ti/p/${segment}`
}

/** ビルド時・クライアントで参照。env の公開変数とコードデフォルトのみ（トークンは使わない）。 */
export function getOfficialLineAddFriendUrl(): string {
  const fromEnv = process.env.NEXT_PUBLIC_OFFICIAL_LINE_ADD_URL?.trim()
  if (fromEnv) return fromEnv

  const id = (process.env.NEXT_PUBLIC_LINE_OFFICIAL_ID || DEFAULT_OFFICIAL_LINE_ID).trim()
  return basicIdOrUrlToAddFriendUrl(id)
}

/** Basic ID（@xxx）を正規化（クライアント・サーバー共通・公開 env のみ） */
export function getOfficialLineBasicIdForPaths(): string {
  const id = (process.env.NEXT_PUBLIC_LINE_OFFICIAL_ID || DEFAULT_OFFICIAL_LINE_ID).trim()
  return id.startsWith('@') ? id : `@${id.replace(/^@+/g, '')}`
}

/**
 * LINE Official Account Manager のチャット一覧（ブラウザ）。
 * 特定ユーザーとのトークへ直接飛ぶ公開 URL は提供されないため、一覧から該当トークを開いてください。
 */
export function getLineOfficialManagerChatUrl(): string {
  const pathId = getOfficialLineBasicIdForPaths()
  return `https://manager.line.biz/account/${pathId}/chat/`
}

/** 外出先対応用「LINE公式アカウント」アプリ（LY Corporation） */
export const LINE_OFFICIAL_ACCOUNT_APP_IOS =
  'https://apps.apple.com/jp/app/line-official-account/id1450599059'
export const LINE_OFFICIAL_ACCOUNT_APP_ANDROID =
  'https://play.google.com/store/apps/details?id=com.linecorp.lineoa'

async function fetchAddFriendUrlFromMessagingApi(
  accessToken: string
): Promise<string | null> {
  try {
    const res = await fetch('https://api.line.me/v2/bot/info', {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
    if (!res.ok) {
      console.warn(
        '[line-official] bot/info failed',
        res.status,
        await res.text().catch(() => '')
      )
      return null
    }
    const data = (await res.json()) as { basicId?: string }
    const bid = data.basicId?.trim()
    if (!bid) return null
    return basicIdOrUrlToAddFriendUrl(bid)
  } catch (e) {
    console.warn('[line-official] bot/info error', e)
    return null
  }
}

const getCachedAddFriendUrlFromBotToken = unstable_cache(
  async () => {
    const token = process.env.LINE_OFFICIAL_CHANNEL_ACCESS_TOKEN?.trim()
    if (!token) return null
    return fetchAddFriendUrlFromMessagingApi(token)
  },
  ['line-official-add-friend-from-bot-info'],
  { revalidate: 3600 }
)

/**
 * サーバー専用。公開 env → Messaging API（basicId）→ コードデフォルトの順で解決する。
 */
export async function resolveOfficialLineAddFriendUrl(): Promise<string> {
  const fromEnv = process.env.NEXT_PUBLIC_OFFICIAL_LINE_ADD_URL?.trim()
  if (fromEnv) return fromEnv

  const lineOfficialId = process.env.NEXT_PUBLIC_LINE_OFFICIAL_ID?.trim()
  if (lineOfficialId) return basicIdOrUrlToAddFriendUrl(lineOfficialId)

  const token = process.env.LINE_OFFICIAL_CHANNEL_ACCESS_TOKEN?.trim()
  if (token) {
    const fromApi = await getCachedAddFriendUrlFromBotToken()
    if (fromApi) return fromApi
  }

  return basicIdOrUrlToAddFriendUrl(DEFAULT_OFFICIAL_LINE_ID)
}
