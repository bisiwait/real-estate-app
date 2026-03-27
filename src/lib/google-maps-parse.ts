/**
 * リダイレクト後の Google マップ URL から place_id / 座標を抽出する（サーバー・クライアント共通）。
 */

export type ParsedMapsLocation = {
  placeId?: string
  latitude?: number
  longitude?: number
}

function tryDecode(s: string): string {
  let prev = ''
  let cur = s
  let guard = 0
  while (cur !== prev && cur.includes('%') && guard < 5) {
    prev = cur
    try {
      cur = decodeURIComponent(cur.replace(/\+/g, ' '))
    } catch {
      break
    }
    guard += 1
  }
  return cur
}

/** Google Place ID として保存してよさそうか（緩い検証） */
export function isLikelyGooglePlaceId(id: string): boolean {
  const t = id.trim()
  if (t.length < 10 || t.length > 256) return false
  return /^[A-Za-z0-9_+-]+$/.test(t)
}

export function normalizeStoredGooglePlaceId(raw: string | null | undefined): string | null {
  if (raw == null) return null
  const t = String(raw).trim()
  if (!t || !isLikelyGooglePlaceId(t)) return null
  return t
}

function extractCoordsFromText(text: string): { lat: number; lng: number } | undefined {
  const dMatch = text.match(/!3d(-?\d+(?:\.\d+)?)!4d(-?\d+(?:\.\d+)?)/)
  if (dMatch) {
    const lat = parseFloat(dMatch[1])
    const lng = parseFloat(dMatch[2])
    if (Number.isFinite(lat) && Number.isFinite(lng)) return { lat, lng }
  }

  const atMatch = text.match(/@(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)(?:,\d+(?:\.\d+)?[a-z]?)?/)
  if (atMatch) {
    const lat = parseFloat(atMatch[1])
    const lng = parseFloat(atMatch[2])
    if (Number.isFinite(lat) && Number.isFinite(lng)) return { lat, lng }
  }

  const llMatch = text.match(/[?&]ll=(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)\b/)
  if (llMatch) {
    const lat = parseFloat(llMatch[1])
    const lng = parseFloat(llMatch[2])
    if (Number.isFinite(lat) && Number.isFinite(lng)) return { lat, lng }
  }

  const qMatch = text.match(/[?&]q=(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)\b/)
  if (qMatch) {
    const lat = parseFloat(qMatch[1])
    const lng = parseFloat(qMatch[2])
    if (Number.isFinite(lat) && Number.isFinite(lng)) return { lat, lng }
  }

  return undefined
}

function extractPlaceIdFromText(text: string): string | undefined {
  const u = tryDecode(text)
  // ChIJ の後ろの長さは可変のため、プレフィックス＋許可文字で拾い、長さは isLikely で検証
  const chij = u.match(/\b(ChIJ[A-Za-z0-9_-]+)\b/)
  if (chij && isLikelyGooglePlaceId(chij[1])) return chij[1]

  const inData = u.match(/[!&]1s(ChIJ[A-Za-z0-9_-]+)\b/)
  if (inData && isLikelyGooglePlaceId(inData[1])) return inData[1]

  return undefined
}

export function hasCompleteParsedCoords(p: ParsedMapsLocation): boolean {
  return (
    p.latitude !== undefined &&
    p.longitude !== undefined &&
    Number.isFinite(p.latitude) &&
    Number.isFinite(p.longitude)
  )
}

/** HTML 内の Google マップ URL を列挙 */
export function extractMapsUrlsFromHtml(html: string): string[] {
  const out: string[] = []
  const re = /https?:\/\/(?:www\.)?google\.com\/maps[^"'\\s<>]*/gi
  let m: RegExpExecArray | null
  while ((m = re.exec(html)) !== null) {
    out.push(m[0].replace(/&amp;/g, '&'))
  }
  return out
}

function extractCanonicalMapsLikeUrls(html: string): string[] {
  const out: string[] = []
  const og = html.match(/property=["']og:url["']\s+content=["']([^"']+)["']/i)
  if (og?.[1] && og[1].includes('google.com/maps')) {
    out.push(og[1].replace(/&amp;/g, '&'))
  }
  const can = html.match(/rel=["']canonical["']\s+href=["']([^"']+)["']/i)
  if (can?.[1] && can[1].includes('google.com/maps')) {
    out.push(can[1].replace(/&amp;/g, '&'))
  }
  return out
}

/**
 * 短縮リンクのランディング HTML などから、不足している place_id / 座標を補完する。
 */
export function enrichParsedFromHtml(html: string, base: ParsedMapsLocation): ParsedMapsLocation {
  if (!html) return { ...base }
  const out: ParsedMapsLocation = { ...base }

  const decoded = html
    .replace(/&amp;/g, '&')
    .replace(/&#x26;/gi, '&')
    .replace(/\\u0026/g, '&')

  if (!out.placeId) {
    const chij = decoded.match(/\b(ChIJ[A-Za-z0-9_-]+)\b/)
    if (chij && isLikelyGooglePlaceId(chij[1])) out.placeId = chij[1]
  }

  const urlCandidates = [...extractCanonicalMapsLikeUrls(html), ...extractMapsUrlsFromHtml(html)]
  for (const raw of urlCandidates) {
    const p = parseResolvedGoogleMapsUrl(raw)
    if (!out.placeId && p.placeId) out.placeId = p.placeId
    if (out.latitude === undefined && p.latitude !== undefined) out.latitude = p.latitude
    if (out.longitude === undefined && p.longitude !== undefined) out.longitude = p.longitude
  }

  if (!hasCompleteParsedCoords(out)) {
    const c = extractCoordsFromText(decoded)
    if (c) {
      if (out.latitude === undefined) out.latitude = c.lat
      if (out.longitude === undefined) out.longitude = c.lng
    }
  }

  return out
}

/** maps.app.goo.gl / goo.gl など、必ず HTTP で解決すべきホスト */
export function isShortGoogleMapsShareHost(hostname: string): boolean {
  const h = hostname.toLowerCase()
  if (h === 'goo.gl' || h === 'g.co') return true
  if (h.endsWith('.app.goo.gl')) return true
  if (h.includes('goo.gl') && !h.endsWith('google.com') && h !== 'maps.google.com') return true
  return false
}

/**
 * 解決済みの maps.google.com / google.com/maps 系 URL から情報を抽出する。
 */
export function parseResolvedGoogleMapsUrl(rawUrl: string): ParsedMapsLocation {
  const out: ParsedMapsLocation = {}
  const decoded = tryDecode(rawUrl.trim())
  if (!decoded) return out

  let href = decoded
  if (!/^https?:\/\//i.test(href)) href = `https://${href}`

  let u: URL
  try {
    u = new URL(href)
  } catch {
    const pid = extractPlaceIdFromText(decoded)
    if (pid) out.placeId = pid
    const c = extractCoordsFromText(decoded)
    if (c) {
      out.latitude = c.lat
      out.longitude = c.lng
    }
    return out
  }

  const blob = `${u.href} ${u.hash ? u.hash.slice(1) : ''}`

  const fromParams = ['query_place_id', 'place_id', 'placeid'] as const
  let qPid: string | undefined
  for (const k of fromParams) {
    const v = u.searchParams.get(k)
    if (v && isLikelyGooglePlaceId(v)) {
      qPid = v.trim()
      break
    }
  }
  if (qPid) out.placeId = qPid
  else {
    const pid = extractPlaceIdFromText(blob)
    if (pid) out.placeId = pid
  }

  const coords = extractCoordsFromText(blob)
  if (coords) {
    out.latitude = coords.lat
    out.longitude = coords.lng
  }

  return out
}

export function isAllowedGoogleMapsLinkHost(hostname: string): boolean {
  const h = hostname.toLowerCase()
  if (h === 'maps.app.goo.gl' || h === 'goo.gl' || h === 'g.co') return true
  if (h === 'google.com' || h === 'www.google.com') return true
  if (h.endsWith('.google.com') || h.endsWith('.google.co.th')) return true
  if (h === 'maps.google.com' || h.endsWith('.app.goo.gl')) return true
  return false
}
