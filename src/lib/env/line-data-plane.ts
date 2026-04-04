import { isDevelopmentDeploymentHost, resolveDataPlaneHostname } from '@/lib/env/deployment-target'

/**
 * LIFF ID（NEXT_PUBLIC_* はクライアントにも埋め込まれる）
 */
export function getLineLiffIdForHostname(hostname: string | null | undefined): string | undefined {
  const host = resolveDataPlaneHostname(hostname)
  const dev = isDevelopmentDeploymentHost(host)
  const id = (
    dev
      ? process.env.NEXT_PUBLIC_LINE_LIFF_ID_DEV?.trim() || process.env.NEXT_PUBLIC_LINE_LIFF_ID?.trim()
      : process.env.NEXT_PUBLIC_LINE_LIFF_ID?.trim()
  )?.trim()
  return id || undefined
}

/** ブラウザで利用 */
export function getBrowserLineLiffId(): string | undefined {
  const h =
    typeof window !== 'undefined' && window.location?.hostname ? window.location.hostname : null
  return getLineLiffIdForHostname(h)
}

/** Messaging API（サーバーのみ） */
export function getLineOfficialChannelAccessTokenForHostname(hostname: string | null | undefined): string | undefined {
  const host = resolveDataPlaneHostname(hostname)
  const dev = isDevelopmentDeploymentHost(host)
  const t = dev
    ? process.env.LINE_OFFICIAL_CHANNEL_ACCESS_TOKEN_DEV?.trim() ||
      process.env.LINE_OFFICIAL_CHANNEL_ACCESS_TOKEN?.trim()
    : process.env.LINE_OFFICIAL_CHANNEL_ACCESS_TOKEN?.trim()
  return t || undefined
}

export function getLineOfficialChannelSecretForHostname(hostname: string | null | undefined): string | undefined {
  const host = resolveDataPlaneHostname(hostname)
  const dev = isDevelopmentDeploymentHost(host)
  const s = dev
    ? process.env.LINE_OFFICIAL_CHANNEL_SECRET_DEV?.trim() || process.env.LINE_OFFICIAL_CHANNEL_SECRET?.trim()
    : process.env.LINE_OFFICIAL_CHANNEL_SECRET?.trim()
  return s || undefined
}

/** 友だち追加 URL（公開） */
export function getOfficialLineAddFriendUrlForHostname(hostname: string | null | undefined): string | undefined {
  const host = resolveDataPlaneHostname(hostname)
  const dev = isDevelopmentDeploymentHost(host)
  const fromEnv = dev
    ? process.env.NEXT_PUBLIC_OFFICIAL_LINE_ADD_URL_DEV?.trim() ||
      process.env.NEXT_PUBLIC_OFFICIAL_LINE_ADD_URL?.trim()
    : process.env.NEXT_PUBLIC_OFFICIAL_LINE_ADD_URL?.trim()
  return fromEnv || undefined
}

/** Basic ID 系（@xxx） */
export function getLineOfficialIdForHostname(hostname: string | null | undefined): string | undefined {
  const host = resolveDataPlaneHostname(hostname)
  const dev = isDevelopmentDeploymentHost(host)
  const id = dev
    ? process.env.NEXT_PUBLIC_LINE_OFFICIAL_ID_DEV?.trim() || process.env.NEXT_PUBLIC_LINE_OFFICIAL_ID?.trim()
    : process.env.NEXT_PUBLIC_LINE_OFFICIAL_ID?.trim()
  return id?.trim() || undefined
}

/** Manager チャット URL 上書き（公開） */
export function getLineOfficialManagerChatUrlOverrideForHostname(
  hostname: string | null | undefined
): string | undefined {
  const host = resolveDataPlaneHostname(hostname)
  const dev = isDevelopmentDeploymentHost(host)
  const u = dev
    ? process.env.NEXT_PUBLIC_LINE_OFFICIAL_MANAGER_CHAT_URL_DEV?.trim() ||
      process.env.NEXT_PUBLIC_LINE_OFFICIAL_MANAGER_CHAT_URL?.trim()
    : process.env.NEXT_PUBLIC_LINE_OFFICIAL_MANAGER_CHAT_URL?.trim()
  return u || undefined
}

export type LineMessagingPlane = 'dev' | 'prod'

export function lineMessagingPlaneForHostname(hostname: string | null | undefined): LineMessagingPlane {
  const host = resolveDataPlaneHostname(hostname)
  return isDevelopmentDeploymentHost(host) ? 'dev' : 'prod'
}
