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
 * 指定座標を画面中央にピン留め表示する Google マップ URL。
 * `/search/?query=lat,lng` は検索扱いになり別候補へ飛ぶことがあるため使わない。
 */
export function googleMapsUrlFromLatLng(
  lat: number,
  lng: number,
  zoom = 17
): string {
  const la = finiteCoord(lat, DEFAULT_MAP_LAT)
  const ln = finiteCoord(lng, DEFAULT_MAP_LNG)
  const { lat: nLat, lng: nLng } = normalizeLatLngForThailand(la, ln)
  return `https://www.google.com/maps/@${nLat},${nLng},${zoom}z`
}
