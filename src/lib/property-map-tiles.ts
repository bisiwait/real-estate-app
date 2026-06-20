export type PropertyMapTileLayer = {
  url: string
  attribution: string
  subdomains?: string
  maxZoom?: number
}

const STANDARD_OSM: PropertyMapTileLayer = {
  url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
  attribution:
    '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
  subdomains: 'abc',
  maxZoom: 19,
}

const OSM_JAPAN_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, &copy; <a href="https://openstreetmap.jp/">OpenStreetMap 日本</a>'

const OSM_BRIGHT_JA: PropertyMapTileLayer = {
  url: 'https://tile.openstreetmap.jp/styles/osm-bright-ja/{z}/{x}/{y}.png',
  attribution: OSM_JAPAN_ATTRIBUTION,
  maxZoom: 19,
}

const MAPTILER_BASIC_JA: PropertyMapTileLayer = {
  url: 'https://tile.openstreetmap.jp/styles/maptiler-basic-ja/{z}/{x}/{y}.png',
  attribution: OSM_JAPAN_ATTRIBUTION,
  maxZoom: 19,
}

const OSM_JAPAN_STANDARD: PropertyMapTileLayer = {
  url: 'https://{s}.tile.openstreetmap.jp/{z}/{x}/{y}.png',
  attribution: OSM_JAPAN_ATTRIBUTION,
  subdomains: 'abc',
  maxZoom: 19,
}

const OSM_BRIGHT_EN: PropertyMapTileLayer = {
  url: 'https://tile.openstreetmap.jp/styles/osm-bright-en/{z}/{x}/{y}.png',
  attribution:
    '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, &copy; <a href="https://openstreetmap.jp/">OpenStreetMap Japan</a>',
  maxZoom: 19,
}

/** 物件詳細マップ用 locale（jp / ja を日本語として扱う） */
export function normalizePropertyMapLocale(locale: string): string {
  const lower = locale.trim().toLowerCase()
  if (lower === 'ja' || lower === 'jp') return 'jp'
  if (lower === 'en') return 'en'
  if (lower === 'th') return 'th'
  return lower
}

export function isJapanesePropertyMapLocale(locale: string): boolean {
  return normalizePropertyMapLocale(locale) === 'jp'
}

/** 物件詳細マップ用 Leaflet タイル（OpenStreetMap） */
export function getPropertyMapTileLayer(locale: string): PropertyMapTileLayer {
  const normalized = normalizePropertyMapLocale(locale)

  if (normalized === 'jp') {
    return OSM_BRIGHT_JA
  }

  if (normalized === 'en') {
    return OSM_BRIGHT_EN
  }

  return STANDARD_OSM
}

/** 日本語 locale 用の代替タイル（英語 OSM には切り替えない） */
export function getPropertyMapTileLayerFallbacks(locale: string): PropertyMapTileLayer[] {
  if (isJapanesePropertyMapLocale(locale)) {
    return [MAPTILER_BASIC_JA, OSM_JAPAN_STANDARD]
  }

  if (normalizePropertyMapLocale(locale) === 'en') {
    return [STANDARD_OSM]
  }

  return [STANDARD_OSM]
}

/** @deprecated getPropertyMapTileLayerFallbacks を使用 */
export function getPropertyMapTileLayerFallback(): PropertyMapTileLayer {
  return STANDARD_OSM
}

export function createLeafletTileLayerOptions(layer: PropertyMapTileLayer): {
  attribution: string
  maxZoom: number
  subdomains?: string
} {
  const options: {
    attribution: string
    maxZoom: number
    subdomains?: string
  } = {
    attribution: layer.attribution,
    maxZoom: layer.maxZoom ?? 19,
  }
  if (layer.url.includes('{s}') && layer.subdomains) {
    options.subdomains = layer.subdomains
  }
  return options
}
