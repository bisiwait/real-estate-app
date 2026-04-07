import {
  getLineOfficialIdForHostname,
  getLineOfficialManagerChatUrlOverrideForHostname,
  getOfficialLineAddFriendUrlForHostname,
} from '@/lib/env/line-data-plane'
import { resolveDataPlaneHostname } from '@/lib/env/deployment-target'
import { expandShortLineFriendUrlServer } from '@/lib/expand-line-friend-url'
import { repairMistypedLinEeOnLineMeHost } from '@/lib/repair-line-friend-host'

/**
 * サイト共通の公式 LINE（友だち追加）URL。
 * 物件問い合わせ後のサンクス等で使用。Vercel では NEXT_PUBLIC_* を設定。
 *
 * 優先: `NEXT_PUBLIC_OFFICIAL_LINE_ADD_URL`。
 * 次: `NEXT_PUBLIC_LINE_OFFICIAL_ID`（@Basic ID）。
 * Messaging API（チャネルアクセストークン）は利用しない。
 */
const DEFAULT_OFFICIAL_LINE_ID = '@chonburihome'

/** Basic ID（@xxx）または既存の line.me URL から友だち追加 URL を返す */
export function basicIdOrUrlToAddFriendUrl(idOrUrl: string): string {
  const raw = idOrUrl.trim()
  if (/^https?:\/\//i.test(raw)) return repairMistypedLinEeOnLineMeHost(raw)

  const pathId = raw.startsWith('@') ? raw : `@${raw.replace(/^@+/g, '')}`
  const segment =
    pathId.startsWith('@') && pathId.length > 1
      ? `@${encodeURIComponent(pathId.slice(1))}`
      : encodeURIComponent(pathId)
  return `https://line.me/R/ti/p/${segment}`
}

/** ビルド時・クライアントで参照。env の公開変数とコードデフォルトのみ。 */
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
 * 運用で確実な URL が分かる場合は `NEXT_PUBLIC_LINE_OFFICIAL_MANAGER_CHAT_URL` で全文指定。
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

/** サーバー専用。公開 env の URL / Basic ID → コードデフォルトの順。 */
export async function resolveLineOfficialManagerChatUrl(hostname?: string | null): Promise<string> {
  const host = resolveDataPlaneHostname(hostname ?? null)
  return getLineOfficialManagerChatUrl(host)
}

/**
 * サーバー専用。公開 env → コードデフォルトの順で解決する。
 */
export async function resolveOfficialLineAddFriendUrl(hostname?: string | null): Promise<string> {
  const host = resolveDataPlaneHostname(hostname ?? null)
  const fromEnv = getOfficialLineAddFriendUrlForHostname(host)?.trim()
  if (fromEnv) return expandShortLineFriendUrlServer(fromEnv)

  const lineOfficialId = getLineOfficialIdForHostname(host)?.trim()
  if (lineOfficialId) {
    return expandShortLineFriendUrlServer(basicIdOrUrlToAddFriendUrl(lineOfficialId))
  }

  return expandShortLineFriendUrlServer(basicIdOrUrlToAddFriendUrl(DEFAULT_OFFICIAL_LINE_ID))
}
