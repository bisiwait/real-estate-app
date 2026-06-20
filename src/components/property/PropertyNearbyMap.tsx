'use client'

import { useEffect, useRef } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import {
  createLeafletTileLayerOptions,
  getPropertyMapTileLayer,
  getPropertyMapTileLayerFallbacks,
  normalizePropertyMapLocale,
} from '@/lib/property-map-tiles'
import { resolvePropertyMapTitle, type PropertyMapPoint } from '@/lib/property-map-coords'

export type PropertyNearbyMapProps = {
  center: PropertyMapPoint
  nearby: PropertyMapPoint[]
  locale: string
  currentLabel: string
  viewDetailLabel: string
}

const PROPERTY_CENTER_ZOOM = 16

function isValidCoord(lat: unknown, lng: unknown): lat is number {
  return (
    typeof lat === 'number' &&
    typeof lng === 'number' &&
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    lat >= -90 &&
    lat <= 90 &&
    lng >= -180 &&
    lng <= 180
  )
}

function createMarkerIcon(fill: string, size: number) {
  return L.divIcon({
    className: '',
    html: `<div style="width:${size}px;height:${size}px;border-radius:50% 50% 50% 0;background:${fill};border:2px solid #fff;box-shadow:0 4px 12px rgba(15,23,42,0.35);transform:rotate(-45deg);"></div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size],
    popupAnchor: [0, -size + 4],
  })
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function focusPropertyCenter(map: L.Map, lat: number, lng: number) {
  map.invalidateSize()
  map.setView([lat, lng], PROPERTY_CENTER_ZOOM, { animate: false })
}

function addTileLayer(map: L.Map, locale: string): L.TileLayer {
  const mapLocale = normalizePropertyMapLocale(locale)
  const primary = getPropertyMapTileLayer(mapLocale)
  const fallbacks = getPropertyMapTileLayerFallbacks(mapLocale)

  let layer = L.tileLayer(primary.url, createLeafletTileLayerOptions(primary))
  layer.addTo(map)

  let fallbackIndex = 0
  let errorCount = 0
  const switchToNextLayer = () => {
    if (fallbackIndex >= fallbacks.length) return
    const next = fallbacks[fallbackIndex]
    fallbackIndex += 1
    map.removeLayer(layer)
    layer = L.tileLayer(next.url, createLeafletTileLayerOptions(next))
    layer.addTo(map)
    errorCount = 0
    layer.on('tileerror', onTileError)
  }

  const onTileError = () => {
    errorCount += 1
    // 単発の欠損タイルでは切り替えず、連続失敗時のみフォールバック
    if (errorCount >= 4) {
      switchToNextLayer()
    }
  }

  layer.on('tileerror', onTileError)

  return layer
}

export default function PropertyNearbyMap({
  center,
  nearby,
  locale,
  currentLabel,
  viewDetailLabel,
}: PropertyNearbyMapProps) {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const container = containerRef.current
    if (!container || !isValidCoord(center.lat, center.lng)) return

    const map = L.map(container, {
      center: [center.lat, center.lng],
      zoom: PROPERTY_CENTER_ZOOM,
      scrollWheelZoom: false,
      attributionControl: true,
    })

    addTileLayer(map, normalizePropertyMapLocale(locale))

    L.marker([center.lat, center.lng], {
      icon: createMarkerIcon('#DC2626', 32),
      zIndexOffset: 1000,
    })
      .addTo(map)
      .bindPopup(
        `<div style="font-family:sans-serif;font-size:13px;line-height:1.4;">
          <div style="font-weight:600;color:#1A2B56;">${escapeHtml(center.title)}</div>
          <div style="font-size:11px;color:#64748b;margin-top:4px;">${escapeHtml(currentLabel)}</div>
        </div>`
      )

    for (const item of nearby) {
      if (!isValidCoord(item.lat, item.lng)) continue
      const title = resolvePropertyMapTitle(item, locale)
      const href = `/${locale}/properties/${item.id}`
      L.marker([item.lat, item.lng], {
        icon: createMarkerIcon('#64748B', 24),
      })
        .addTo(map)
        .bindPopup(
          `<div style="font-family:sans-serif;font-size:13px;line-height:1.4;">
            <div style="font-weight:600;color:#1A2B56;margin-bottom:6px;">${escapeHtml(title)}</div>
            <a href="${href}" style="font-size:11px;font-weight:600;color:#2A4076;text-decoration:none;">${escapeHtml(viewDetailLabel)}</a>
          </div>`
        )
    }

    focusPropertyCenter(map, center.lat, center.lng)

    const resizeObserver =
      typeof ResizeObserver !== 'undefined'
        ? new ResizeObserver(() => focusPropertyCenter(map, center.lat, center.lng))
        : null
    resizeObserver?.observe(container)

    const raf = requestAnimationFrame(() => focusPropertyCenter(map, center.lat, center.lng))

    return () => {
      cancelAnimationFrame(raf)
      resizeObserver?.disconnect()
      map.remove()
    }
  }, [
    center.id,
    center.lat,
    center.lng,
    center.title,
    nearby,
    locale,
    currentLabel,
    viewDetailLabel,
  ])

  if (!isValidCoord(center.lat, center.lng)) {
    return null
  }

  return (
    <div
      className="overflow-hidden rounded-2xl border border-slate-200 shadow-sm"
      style={{ height: '320px', width: '100%' }}
    >
      <div ref={containerRef} style={{ height: '100%', width: '100%' }} />
    </div>
  )
}
