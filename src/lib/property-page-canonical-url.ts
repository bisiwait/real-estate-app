import { hostHeaderFromHeaders } from '@/lib/env/deployment-target'
import { getPublicSiteUrl } from '@/lib/site-url'

/**
 * 物件詳細の絶対 URL（OGP 等と揃え、リクエスト Host が取れるときはそれを優先）。
 * クライアントでは `window.location.href` で上書きする想定。
 */
export function buildPropertyDetailAbsoluteUrl(
  headers: Headers,
  locale: string,
  propertyId: string
): string {
  const host = hostHeaderFromHeaders(headers)
  const path = `/${locale}/properties/${propertyId}`
  if (host) {
    const xfProto = headers.get('x-forwarded-proto')?.split(',')[0]?.trim().toLowerCase()
    const local = host.startsWith('localhost') || host.startsWith('127.')
    const proto =
      xfProto === 'http' || xfProto === 'https' ? xfProto : local ? 'http' : 'https'
    return `${proto}://${host}${path}`
  }
  return `${getPublicSiteUrl()}${path}`
}
