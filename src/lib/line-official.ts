import { unstable_cache } from 'next/cache'
import {
  getLineOfficialChannelAccessTokenForHostname,
  getLineOfficialIdForHostname,
  getLineOfficialManagerChatUrlOverrideForHostname,
  getOfficialLineAddFriendUrlForHostname,
  lineMessagingPlaneForHostname,
} from '@/lib/env/line-data-plane'
import { resolveDataPlaneHostname } from '@/lib/env/deployment-target'
import { expandShortLineFriendUrlServer } from '@/lib/expand-line-friend-url'

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
  const fromEnv =
    getOfficialLineAddFriendUrlForHostname(
      typeof window !== 'undefined' ? window.location.hostname : null
    ) || process.env.NEXT_PUBLIC_OFFICIAL_LINE_ADD_URL?.trim()
  if (fromEnv) return fromEnv

  const id = (
    getLineOfficialIdForHostname(typeof window !== 'undefined' ? window.location.hostname : null) ||
    process.env.NEXT_PUBLIC_LINE_OFFICIAL_ID ||
    DEFAULT_OFFICIAL_LINE_ID
  ).trim()
  return basicIdOrUrlToAddFriendUrl(id)
}

/** Basic ID（@xxx）を正規化（クライアント・サーバー共通・公開 env のみ） */
export function getOfficialLineBasicIdForPaths(hostname?: string | null): string {
  const id = (
    getLineOfficialIdForHostname(hostname ?? null) ||
    process.env.NEXT_PUBLIC_LINE_OFFICIAL_ID ||
    DEFAULT_OFFICIAL_LINE_ID
  ).trim()
  return id.startsWith('@') ? id : `@${id.replace(/^@+/g, '')}`
}

/**
 * LINE Official Account Manager の該当公式アカウント画面（ブラウザ）。
 *
 * 旧: `.../account/@xxx/chat/` は LINE 側のルーティング変更等で **404** になることがある。
 * 現状: **アカウントホーム**（`/account/@basicId/`）へ開き、画面上部の **「チャット」**タブから一覧へ進む。
 *
 * 運用で確実な URL が分かる場合は `NEXT_PUBLIC_LINE_OFFICIAL_MANAGER_CHAT_URL` で全文指定。
 * ダッシュボード SSR では `resolveLineOfficialManagerChatUrl()` を推奨（トークンから real basicId を取得）。
 */
export function getLineOfficialManagerChatUrl(hostname?: string | null): string {
  const override = getLineOfficialManagerChatUrlOverrideForHostname(hostname ?? null)?.trim()
  if (override) return override

  const pathId = getOfficialLineBasicIdForPaths(hostname ?? null)
  return `https://manager.line.biz/account/${pathId}/`
}

/** 外出先対応用「LINE公式アカウント」アプリ（LY Corporation） */
export const LINE_OFFICIAL_ACCOUNT_APP_IOS =
  'https://apps.apple.com/jp/app/line-official-account/id1450599059'
export const LINE_OFFICIAL_ACCOUNT_APP_ANDROID =
  'https://play.google.com/store/apps/details?id=com.linecorp.lineoa'

/** Messaging API の bot/info から Basic ID のみ取得 */
async function fetchBotInfoBasicId(accessToken: string): Promise<string | null> {
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
    return data.basicId?.trim() || null
  } catch (e) {
    console.warn('[line-official] bot/info error', e)
    return null
  }
}

async function fetchAddFriendUrlFromMessagingApi(
  accessToken: string
): Promise<string | null> {
  const bid = await fetchBotInfoBasicId(accessToken)
  if (!bid) return null
  return basicIdOrUrlToAddFriendUrl(bid)
}

const cachedManagerBaseUrlFromBotTokenDev = unstable_cache(
  async () => {
    const token =
      process.env.LINE_OFFICIAL_CHANNEL_ACCESS_TOKEN_DEV?.trim() ||
      process.env.LINE_OFFICIAL_CHANNEL_ACCESS_TOKEN?.trim()
    if (!token) return null
    const bid = await fetchBotInfoBasicId(token)
    if (!bid) return null
    const pathId = bid.startsWith('@') ? bid : `@${bid.replace(/^@+/g, '')}`
    return `https://manager.line.biz/account/${pathId}/`
  },
  ['line-official-manager-base-from-bot-info', 'dev'],
  { revalidate: 3600 }
)

const cachedManagerBaseUrlFromBotTokenProd = unstable_cache(
  async () => {
    const token = process.env.LINE_OFFICIAL_CHANNEL_ACCESS_TOKEN?.trim()
    if (!token) return null
    const bid = await fetchBotInfoBasicId(token)
    if (!bid) return null
    const pathId = bid.startsWith('@') ? bid : `@${bid.replace(/^@+/g, '')}`
    return `https://manager.line.biz/account/${pathId}/`
  },
  ['line-official-manager-base-from-bot-info', 'prod'],
  { revalidate: 3600 }
)

/** サーバー専用。env 上書き → bot/info の Basic ID → 公開 env / デフォルトの順 */
export async function resolveLineOfficialManagerChatUrl(hostname?: string | null): Promise<string> {
  const host = resolveDataPlaneHostname(hostname ?? null)
  const override = getLineOfficialManagerChatUrlOverrideForHostname(host)?.trim()
  if (override) return override

  const plane = lineMessagingPlaneForHostname(host)
  const fromApi =
    plane === 'dev'
      ? await cachedManagerBaseUrlFromBotTokenDev()
      : await cachedManagerBaseUrlFromBotTokenProd()
  if (fromApi) return fromApi

  return getLineOfficialManagerChatUrl(host)
}

const cachedAddFriendUrlFromBotTokenDev = unstable_cache(
  async () => {
    const token =
      process.env.LINE_OFFICIAL_CHANNEL_ACCESS_TOKEN_DEV?.trim() ||
      process.env.LINE_OFFICIAL_CHANNEL_ACCESS_TOKEN?.trim()
    if (!token) return null
    return fetchAddFriendUrlFromMessagingApi(token)
  },
  ['line-official-add-friend-from-bot-info', 'dev'],
  { revalidate: 3600 }
)

const cachedAddFriendUrlFromBotTokenProd = unstable_cache(
  async () => {
    const token = process.env.LINE_OFFICIAL_CHANNEL_ACCESS_TOKEN?.trim()
    if (!token) return null
    return fetchAddFriendUrlFromMessagingApi(token)
  },
  ['line-official-add-friend-from-bot-info', 'prod'],
  { revalidate: 3600 }
)

/**
 * サーバー専用。公開 env → Messaging API（basicId）→ コードデフォルトの順で解決する。
 */
export async function resolveOfficialLineAddFriendUrl(hostname?: string | null): Promise<string> {
  const host = resolveDataPlaneHostname(hostname ?? null)
  const fromEnv = getOfficialLineAddFriendUrlForHostname(host)?.trim()
  if (fromEnv) return expandShortLineFriendUrlServer(fromEnv)

  const lineOfficialId = getLineOfficialIdForHostname(host)?.trim()
  if (lineOfficialId) {
    return expandShortLineFriendUrlServer(basicIdOrUrlToAddFriendUrl(lineOfficialId))
  }

  const token = getLineOfficialChannelAccessTokenForHostname(host)
  if (token) {
    const plane = lineMessagingPlaneForHostname(host)
    const fromApi =
      plane === 'dev'
        ? await cachedAddFriendUrlFromBotTokenDev()
        : await cachedAddFriendUrlFromBotTokenProd()
    if (fromApi) return expandShortLineFriendUrlServer(fromApi)
  }

  return expandShortLineFriendUrlServer(basicIdOrUrlToAddFriendUrl(DEFAULT_OFFICIAL_LINE_ID))
}
