import { NextRequest, NextResponse } from 'next/server'
import { buildLiffInquiryHandoffUrl } from '@/lib/line/liff-open-url'

const PROPERTY_UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const LOCALES = new Set(['jp', 'en', 'th'])

/**
 * 物件問い合わせ「LINEで受け取る」1回目の遷移先。
 * クライアントで liff.line.me URL を組むと環境・キャッシュ・ブラウザ差で誤った形に見えることがあるため、
 * サーバーが必ず ?liff.state= の形式で 302 する。
 */
export async function GET(request: NextRequest) {
  const liffId = process.env.NEXT_PUBLIC_LINE_LIFF_ID?.trim()
  if (!liffId) {
    return NextResponse.json({ error: 'LIFF not configured' }, { status: 503 })
  }

  const rawLocale = request.nextUrl.searchParams.get('locale') || 'jp'
  const propertyId = (request.nextUrl.searchParams.get('propertyId') || '').trim()
  const safeLocale = LOCALES.has(rawLocale) ? rawLocale : 'jp'

  if (!PROPERTY_UUID.test(propertyId)) {
    return NextResponse.json({ error: 'Invalid propertyId' }, { status: 400 })
  }

  const target = buildLiffInquiryHandoffUrl(liffId, safeLocale, propertyId.toLowerCase())
  const res = NextResponse.redirect(target, 302)
  res.headers.set('Cache-Control', 'no-store, max-age=0')
  return res
}
