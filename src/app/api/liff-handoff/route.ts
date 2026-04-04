import { NextRequest, NextResponse } from 'next/server'
import {
  buildLiffInquiryBridgeDirectUrl,
  buildLiffInquiryHandoffUrl,
} from '@/lib/line/liff-open-url'
import { getPublicSiteUrl } from '@/lib/site-url'
import { hostHeaderFromRequest } from '@/lib/env/deployment-target'
import { getLineLiffIdForHostname } from '@/lib/env/line-data-plane'

const PROPERTY_UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const LOCALES = new Set(['jp', 'en', 'th'])

function isTruthyEnv(v: string | undefined): boolean {
  const s = v?.trim().toLowerCase()
  return s === '1' || s === 'true' || s === 'yes'
}

/** オープンリダイレクト防止: 許可したホストだけ x-forwarded-host を採用 */
function resolveHandoffOrigin(request: NextRequest): string {
  const requestHost = request.headers.get('x-forwarded-host')?.split(',')[0]?.trim().toLowerCase()
  const protoRaw = request.headers.get('x-forwarded-proto')?.split(',')[0]?.trim().toLowerCase()
  const proto = protoRaw === 'http' || protoRaw === 'https' ? protoRaw : 'https'

  let canonicalHost: string
  try {
    canonicalHost = new URL(getPublicSiteUrl()).host.toLowerCase()
  } catch {
    canonicalHost = ''
  }
  const altCanonical =
    canonicalHost && !canonicalHost.startsWith('www.')
      ? `www.${canonicalHost}`
      : ''

  if (requestHost) {
    const local =
      requestHost.startsWith('localhost') ||
      requestHost.startsWith('127.0.0.1')
    const vercelPreview = requestHost.endsWith('.vercel.app')
    const matchesCanonical =
      !!canonicalHost &&
      (requestHost === canonicalHost || requestHost === altCanonical)

    if (local) {
      return `http://${requestHost}`
    }
    if (vercelPreview || matchesCanonical) {
      return `${proto}://${requestHost}`
    }
  }

  return getPublicSiteUrl()
}

/**
 * 物件問い合わせ「LINEで受け取る」1回目の遷移先。
 * 既定: 自サイトの inquiry-bridge へ直接 302（liff.line.me ゲートウェイのリロードループ回避）。
 * NEXT_PUBLIC_LIFF_HANDOFF_VIA_LINE_ME=true のとき従来どおり liff.line.me へ 302。
 */
export async function GET(request: NextRequest) {
  const liffId = getLineLiffIdForHostname(hostHeaderFromRequest(request))
  if (!liffId) {
    return NextResponse.json({ error: 'LIFF not configured' }, { status: 503 })
  }

  const rawLocale = request.nextUrl.searchParams.get('locale') || 'jp'
  const propertyId = (request.nextUrl.searchParams.get('propertyId') || '').trim()
  const safeLocale = LOCALES.has(rawLocale) ? rawLocale : 'jp'

  if (!PROPERTY_UUID.test(propertyId)) {
    return NextResponse.json({ error: 'Invalid propertyId' }, { status: 400 })
  }

  const pid = propertyId.toLowerCase()
  const viaLineMe = isTruthyEnv(process.env.NEXT_PUBLIC_LIFF_HANDOFF_VIA_LINE_ME)
  const target = viaLineMe
    ? buildLiffInquiryHandoffUrl(liffId, safeLocale, pid)
    : buildLiffInquiryBridgeDirectUrl(resolveHandoffOrigin(request), safeLocale, pid)

  const res = NextResponse.redirect(target, 302)
  res.headers.set('Cache-Control', 'no-store, max-age=0')
  return res
}
