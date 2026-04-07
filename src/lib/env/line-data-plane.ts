import { isDevelopmentDeploymentHost, resolveDataPlaneHostname } from '@/lib/env/deployment-target'

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
