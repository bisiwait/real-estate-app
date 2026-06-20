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

/** 物件詳細マップ用 Leaflet タイル（OpenStreetMap） */
export function getPropertyMapTileLayer(locale: string): PropertyMapTileLayer {
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

  return STANDARD_OSM
}

export function getPropertyMapTileLayerFallback(): PropertyMapTileLayer {
  return STANDARD_OSM
}
