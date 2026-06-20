export type GoogleMapsLocaleConfig = {
  language: string
  region?: string
}

export function resolveGoogleMapsLocale(locale: string): GoogleMapsLocaleConfig {
  if (locale === 'jp') return { language: 'ja', region: 'JP' }
  if (locale === 'th') return { language: 'th', region: 'TH' }
  return { language: 'en', region: 'US' }
}

export type PropertyMapTileLayer = {
  url: string
  attribution: string
  subdomains?: string[]
  maxZoom?: number
}

/** Leaflet フォールバック用タイル（API キー不要） */
export function getLeafletPropertyMapTileLayer(locale: string): PropertyMapTileLayer {
  if (locale === 'jp') {
    return {
      url: 'https://tile.openstreetmap.jp/styles/osm-bright-ja/{z}/{x}/{y}.png',
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, &copy; <a href="https://openstreetmap.jp/">OpenStreetMap 日本</a>',
      maxZoom: 19,
    }
  }

  if (locale === 'en') {
    return {
      url: 'https://tile.openstreetmap.jp/styles/osm-bright-en/{z}/{x}/{y}.png',
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, &copy; <a href="https://openstreetmap.jp/">OpenStreetMap Japan</a>',
      maxZoom: 19,
    }
  }

  return {
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    subdomains: ['a', 'b', 'c'],
    maxZoom: 19,
  }
}
