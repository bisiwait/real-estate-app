import { NextResponse } from 'next/server'
import {
  enrichParsedFromHtml,
  hasCompleteParsedCoords,
  isAllowedGoogleMapsLinkHost,
  isShortGoogleMapsShareHost,
  parseResolvedGoogleMapsUrl,
} from '@/lib/google-maps-parse'
import { reverseGeocodeToPlaceId } from '@/lib/google-maps-reverse-geocode'

export const runtime = 'nodejs'

function mergeParsed(
  a: ReturnType<typeof parseResolvedGoogleMapsUrl>,
  b: ReturnType<typeof parseResolvedGoogleMapsUrl>
) {
  return {
    placeId: a.placeId || b.placeId,
    latitude: a.latitude ?? b.latitude,
    longitude: a.longitude ?? b.longitude,
  }
}

function mustFetchRemote(href: string, parsed: ReturnType<typeof parseResolvedGoogleMapsUrl>): boolean {
  let u: URL
  try {
    u = new URL(href)
  } catch {
    return true
  }

  if (!isAllowedGoogleMapsLinkHost(u.hostname)) return false

  // 短縮リンクは必ず追従（初回 parse では情報が無い／res.url だけでは足りないことがある）
  if (isShortGoogleMapsShareHost(u.hostname)) return true

  // 完全な maps URL で place_id も座標も取れているなら fetch 不要
  if (parsed.placeId && hasCompleteParsedCoords(parsed)) return false
  if (parsed.placeId) return false
  if (hasCompleteParsedCoords(parsed)) return false

  return true
}

export async function POST(req: Request) {
  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const urlRaw = typeof body === 'object' && body !== null && 'url' in body
    ? String((body as { url?: unknown }).url ?? '')
    : ''

  if (!urlRaw.trim()) {
    return NextResponse.json({ error: 'url が必要です' }, { status: 400 })
  }

  let href = urlRaw.trim()
  if (!/^https?:\/\//i.test(href)) href = `https://${href}`

  let finalUrl = href
  let parsed = parseResolvedGoogleMapsUrl(finalUrl)

  let u: URL
  try {
    u = new URL(href)
  } catch {
    return NextResponse.json({ error: 'URL の形式が正しくありません' }, { status: 400 })
  }

  if (!isAllowedGoogleMapsLinkHost(u.hostname)) {
    return NextResponse.json(
      { error: 'Google マップの共有リンクのみ対応しています' },
      { status: 400 }
    )
  }

  if (mustFetchRemote(href, parsed)) {
    try {
      const res = await fetch(href, {
        redirect: 'follow',
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
          Accept:
            'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
          'Accept-Language': 'ja,en-US;q=0.9,en;q=0.8',
        },
        signal: AbortSignal.timeout(20000),
      })

      finalUrl = res.url || href
      parsed = mergeParsed(parsed, parseResolvedGoogleMapsUrl(finalUrl))

      const ct = res.headers.get('content-type') || ''
      if (ct.includes('text/html')) {
        const html = await res.text()
        parsed = enrichParsedFromHtml(html, parsed)
      }
    } catch {
      return NextResponse.json(
        { error: 'リンクを取得できませんでした。ブラウザで開いたあとの長い URL を貼り付けてお試しください。' },
        { status: 502 }
      )
    }
  }

  // 座標はあるが Place ID が無い → Geocoding で place_id を補完
  if (!parsed.placeId && hasCompleteParsedCoords(parsed)) {
    const pid = await reverseGeocodeToPlaceId(parsed.latitude!, parsed.longitude!)
    if (pid) parsed = { ...parsed, placeId: pid }
  }

  return NextResponse.json({
    google_place_id: parsed.placeId ?? null,
    latitude: parsed.latitude ?? null,
    longitude: parsed.longitude ?? null,
    resolvedUrl: finalUrl,
  })
}
