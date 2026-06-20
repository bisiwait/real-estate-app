export type PropertyMapTileLayer = {
  url: string
  attribution: string
  subdomains?: string[]
  maxZoom?: number
}

/**
 * 物件詳細マップ用タイル。日本語 UI（locale=jp）では OSM 日本の日本語ラベルタイルを使う。
 */
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

  return {
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    subdomains: ['a', 'b', 'c'],
    maxZoom: 19,
  }
}
