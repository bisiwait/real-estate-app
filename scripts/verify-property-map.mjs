/**
 * 物件詳細マップ（Leaflet + OpenStreetMap）のスモークテスト
 * 実行: node scripts/verify-property-map.mjs
 */
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const root = join(import.meta.dirname, '..')

function readSrc(relPath) {
  return readFileSync(join(root, relPath), 'utf8')
}

const mapComponent = readSrc('src/components/property/PropertyNearbyMap.tsx')
assert.match(mapComponent, /from 'leaflet'/)
assert.match(mapComponent, /L\.map\(/)
assert.match(mapComponent, /L\.tileLayer/)
assert.match(mapComponent, /focusPropertyCenter/)
assert.match(mapComponent, /PROPERTY_CENTER_ZOOM/)
assert.doesNotMatch(mapComponent, /google\.maps/)
assert.doesNotMatch(mapComponent, /react-leaflet/)
assert.doesNotMatch(mapComponent, /PropertyNearbyMapGoogle/)
assert.doesNotMatch(mapComponent, /地図を読み込めませんでした/)

const detailClient = readSrc('src/app/[locale]/properties/[id]/PropertyDetailClient.tsx')
assert.match(detailClient, /PropertyNearbyMap/)
assert.doesNotMatch(detailClient, /PropertyMapErrorBoundary/)

const tiles = readSrc('src/lib/property-map-tiles.ts')
assert.match(tiles, /openstreetmap/)
assert.match(tiles, /osm-bright-ja/)
assert.match(tiles, /maptiler-basic-ja/)
assert.match(tiles, /normalizePropertyMapLocale/)
assert.match(tiles, /getPropertyMapTileLayerFallbacks/)
assert.doesNotMatch(tiles, /getPropertyMapTileLayerFallback\(\): PropertyMapTileLayer \{[\s\S]*return STANDARD_OSM[\s\S]*\}[\s\S]*if \(isJapanese/)

console.log('verify-property-map: OK')
