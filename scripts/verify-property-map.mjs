/**
 * 物件詳細マップ関連のスモークテスト（API キー不要）
 * 実行: node scripts/verify-property-map.mjs
 */
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const root = join(import.meta.dirname, '..')

function readSrc(relPath) {
  return readFileSync(join(root, relPath), 'utf8')
}

const mapEntry = readSrc('src/components/property/PropertyNearbyMap.tsx')
assert.match(mapEntry, /PropertyNearbyMapLeaflet/)
assert.match(mapEntry, /PropertyNearbyMapGoogle/)
assert.match(mapEntry, /onFailure/)
assert.doesNotMatch(mapEntry, /地図を読み込めませんでした/)

const leafletMap = readSrc('src/components/property/PropertyNearbyMapLeaflet.tsx')
assert.match(leafletMap, /FocusPropertyCenter/)
assert.match(leafletMap, /PROPERTY_CENTER_ZOOM/)
assert.doesNotMatch(leafletMap, /fitBounds/)

const googleLoader = readSrc('src/lib/google-maps-browser-loader.ts')
assert.match(googleLoader, /@googlemaps\/js-api-loader/)
assert.match(googleLoader, /hasGoogleMapsApiKey/)

const locale = readSrc('src/lib/google-maps-locale.ts')
assert.match(locale, /osm-bright-ja/)

console.log('verify-property-map: OK')
