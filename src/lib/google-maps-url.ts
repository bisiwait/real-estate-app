import { normalizeStoredGooglePlaceId, normalizeStoredMapsShareUrl } from '@/lib/google-maps-parse'

/** パタヤ周辺のデフォルト（座標未設定時） */
export const DEFAULT_MAP_LAT = 12.9236
export const DEFAULT_MAP_LNG = 100.8824

/**
 * 数値として有効な座標だけ採用（DB 文字列・null 対応）
 */
export function finiteCoord(value: unknown, fallback: number): number {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string' && value.trim() !== '') {
    const n = Number(value)
    if (Number.isFinite(n)) return n
  }
  return fallback
}

/**
 * タイ（チョンブリ付近）では緯度 ≈5–22、経度 ≈97–106。
 * 入力が入れ替わっているときだけ入れ替えて返す。
 */
export function normalizeLatLngForThailand(lat: number, lng: number): { lat: number; lng: number } {
  const looksNormal = lat >= 5 && lat <= 22 && lng >= 97 && lng <= 106
  const looksSwapped = lng >= 5 && lng <= 22 && lat >= 97 && lat <= 106
  if (looksNormal) return { lat, lng }
  if (looksSwapped) return { lat: lng, lng: lat }
  return { lat, lng }
}

/**
 * 指定座標にピンを立てて開く Google マップ URL。
 *
 * - `maps?q=緯度,経度` … 座標マーカー（赤ピン）が付きやすい。`z` でズーム。
 * - `maps/@緯度,経度,zoomz` … 中心移動のみでピンが出ないことがあるため使わない。
 * - `maps/search/?api=1&query=` … テキスト検索扱いになり別場所へ飛ぶことがあったため使わない。
 */
export function googleMapsUrlFromLatLng(
  lat: number,
  lng: number,
  zoom = 17
): string {
  const la = finiteCoord(lat, DEFAULT_MAP_LAT)
  const ln = finiteCoord(lng, DEFAULT_MAP_LNG)
  const { lat: nLat, lng: nLng } = normalizeLatLngForThailand(la, ln)
  const url = new URL('https://www.google.com/maps')
  url.searchParams.set('q', `${nLat},${nLng}`)
  url.searchParams.set('z', String(zoom))
  return url.toString()
}

/**
 * Place ID で Google マップの該当施設ページを開く。
 *
 * - 施設名が分かるときは [Maps URL の検索形式](https://developers.google.com/maps/documentation/urls/get-started#search-action)
 *   `query` + `query_place_id` で左パネル付きの Place 表示になりやすい。
 * - 名前が無いときは `q=place_id:...`（従来どおりブラウザでよく使われる形式）。
 */
export function googleMapsUrlFromPlaceId(placeId: string, placeNameHint?: string | null): string {
  const id = normalizeStoredGooglePlaceId(placeId)
  if (!id) return googleMapsUrlFromLatLng(DEFAULT_MAP_LAT, DEFAULT_MAP_LNG)
  const hint = typeof placeNameHint === 'string' ? placeNameHint.trim() : ''
  if (hint.length > 0) {
    const url = new URL('https://www.google.com/maps/search/')
    url.searchParams.set('api', '1')
    url.searchParams.set('query', hint)
    url.searchParams.set('query_place_id', id)
    return url.toString()
  }
  const url = new URL('https://www.google.com/maps')
  url.searchParams.set('q', `place_id:${id}`)
  return url.toString()
}

export type ProjectMapFields = {
  /** 共有リンクをそのまま保存（Place ID より優先して開く・埋め込みに利用） */
  google_maps_share_url?: string | null
  google_place_id?: string | null
  latitude?: unknown
  longitude?: unknown
  name?: string | null
  name_jp?: string | null
} | null
  | undefined

export type PropertyProjectMapsContext = {
  /** マップの Place 表示用（物件タイトル・建物名など） */
  mapSearchHint?: string | null
}

/**
 * 物件に紐づくプロジェクトについて、マップで開く URL（Place ID 優先、無効時は座標）。
 */
export function propertyProjectOpenMapsUrl(
  project: ProjectMapFields,
  context?: PropertyProjectMapsContext
): string {
  if (!project) return googleMapsUrlFromLatLng(DEFAULT_MAP_LAT, DEFAULT_MAP_LNG)
  const share = normalizeStoredMapsShareUrl(project.google_maps_share_url ?? null)
  if (share) return share
  const pid = normalizeStoredGooglePlaceId(project.google_place_id ?? null)
  if (pid) {
    const fromContext = context?.mapSearchHint?.trim()
    const fromProject = [project.name_jp, project.name]
      .filter((s): s is string => typeof s === 'string' && s.trim().length > 0)
      .join(' ')
      .trim()
    const hint = fromContext || fromProject || null
    return googleMapsUrlFromPlaceId(pid, hint)
  }
  return googleMapsUrlFromLatLng(Number(project.latitude), Number(project.longitude))
}
