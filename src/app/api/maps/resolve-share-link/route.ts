import { NextResponse } from 'next/server'
import {
  isAllowedGoogleMapsLinkHost,
  parseResolvedGoogleMapsUrl,
} from '@/lib/google-maps-parse'

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

function extractMapsUrlsFromHtml(html: string): string[] {
  const out: string[] = []
  const re = /https?:\/\/(?:www\.)?google\.com\/maps[^"'\\s<>]*/gi
  let m: RegExpExecArray | null
  while ((m = re.exec(html)) !== null) {
    out.push(m[0])
  }
  return out
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

  const needsFetch = !parsed.placeId && parsed.latitude === undefined

  if (needsFetch) {
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

    try {
      const res = await fetch(href, {
        redirect: 'follow',
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (compatible; ChonburiHome/1.0)',
          Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        },
        signal: AbortSignal.timeout(15000),
      })

      finalUrl = res.url

      parsed = parseResolvedGoogleMapsUrl(finalUrl)

      const ct = res.headers.get('content-type') || ''
      if (!parsed.placeId && parsed.latitude === undefined && ct.includes('text/html')) {
        const html = await res.text()
        const candidates = extractMapsUrlsFromHtml(html)
        for (const c of candidates) {
          const p = parseResolvedGoogleMapsUrl(c)
          parsed = mergeParsed(parsed, p)
          if (parsed.placeId || (parsed.latitude !== undefined && parsed.longitude !== undefined)) {
            break
          }
        }
      }
    } catch {
      return NextResponse.json(
        { error: 'リンクを取得できませんでした。長い URL を直接貼り付けてお試しください。' },
        { status: 502 }
      )
    }
  }

  return NextResponse.json({
    google_place_id: parsed.placeId ?? null,
    latitude: parsed.latitude ?? null,
    longitude: parsed.longitude ?? null,
    resolvedUrl: finalUrl,
  })
}
