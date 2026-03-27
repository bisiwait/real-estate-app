'use client'

import { useEffect, useRef, useState } from 'react'
import { Loader } from '@googlemaps/js-api-loader'
import { normalizeStoredGooglePlaceId, normalizeStoredMapsShareUrl } from '@/lib/google-maps-parse'
import { DEFAULT_MAP_LAT, DEFAULT_MAP_LNG, finiteCoord } from '@/lib/google-maps-url'

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

type Props = {
  /** 保存した共有リンク（最優先で iframe 表示・openInMapsUrl と一致） */
  mapsShareUrl?: string | null
  googlePlaceId?: string | null
  latitude?: number | null
  longitude?: number | null
  propertyTitle: string
  openInMapsUrl: string
}

export default function PropertyLocationMap({
  mapsShareUrl,
  googlePlaceId,
  latitude,
  longitude,
  propertyTitle,
  openInMapsUrl,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY

  const safeShare = normalizeStoredMapsShareUrl(mapsShareUrl ?? null)

  useEffect(() => {
    if (safeShare) return
    if (!apiKey) {
      setLoadError(null)
      return
    }
    const el = containerRef.current
    if (!el) return

    const pid = normalizeStoredGooglePlaceId(googlePlaceId ?? null)
    const lat0 = finiteCoord(latitude, DEFAULT_MAP_LAT)
    const lng0 = finiteCoord(longitude, DEFAULT_MAP_LNG)
    const coordinateOnly = !pid
    let cancelled = false

    const loader = new Loader({
      apiKey,
      version: 'weekly',
      language: 'ja',
      region: 'TH',
    })

    ;(async () => {
      try {
        await loader.load()
      } catch {
        if (!cancelled) setLoadError('地図の読み込みに失敗しました')
        return
      }
      if (cancelled || !containerRef.current) return

      setLoadError(null)

      const center = { lat: lat0, lng: lng0 }
      const map = new google.maps.Map(containerRef.current, {
        center,
        zoom: 17,
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: true,
      })

      const openMaps = () => {
        window.open(openInMapsUrl, '_blank', 'noopener,noreferrer')
      }

      const placeMarker = (pos: google.maps.LatLngLiteral) => {
        const marker = new google.maps.Marker({
          position: pos,
          map,
          title: propertyTitle,
        })
        marker.addListener('click', openMaps)
        if (coordinateOnly) {
          const iw = new google.maps.InfoWindow({
            content: `<div style="font-weight:600;font-size:13px;max-width:240px;padding:4px 6px;line-height:1.35">${escapeHtml(propertyTitle)}</div>`,
          })
          iw.open({ map, anchor: marker, shouldFocus: false })
        }
      }

      if (pid) {
        const geocoder = new google.maps.Geocoder()
        geocoder.geocode({ placeId: pid }, (results, status) => {
          if (cancelled) return
          if (status === 'OK' && results?.[0]?.geometry?.location) {
            const loc = results[0].geometry.location
            map.setCenter({ lat: loc.lat(), lng: loc.lng() })
            placeMarker({ lat: loc.lat(), lng: loc.lng() })
          } else {
            placeMarker(center)
          }
        })
      } else {
        placeMarker(center)
      }
    })()

    return () => {
      cancelled = true
      if (containerRef.current) containerRef.current.innerHTML = ''
    }
  }, [safeShare, apiKey, googlePlaceId, latitude, longitude, propertyTitle, openInMapsUrl])

  if (safeShare) {
    return (
      <div className="w-full space-y-2">
        <div className="relative h-64 w-full overflow-hidden rounded-2xl border border-slate-100 bg-slate-100">
          <iframe
            title="Google マップ"
            src={safeShare}
            className="h-full w-full border-0"
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            allowFullScreen
          />
        </div>
        <p className="text-center text-[10px] leading-relaxed text-slate-500">
          登録した共有リンクをそのまま表示しています。Google の仕様で枠内が空になる場合は、下のボタンから同じ場所を開いてください。
        </p>
      </div>
    )
  }

  if (!apiKey) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
        地図を表示するには <code className="text-xs">NEXT_PUBLIC_GOOGLE_MAPS_API_KEY</code> の設定が必要です。
      </div>
    )
  }

  return (
    <div className="w-full space-y-2">
      <div
        ref={containerRef}
        className="h-64 w-full overflow-hidden rounded-2xl border border-slate-100 bg-slate-100"
        role="application"
        aria-label="物件位置の地図"
      />
      {loadError ? <p className="text-center text-xs text-red-500">{loadError}</p> : null}
      <p className="text-center text-[10px] text-slate-400">ピンをタップすると Google マップで開きます</p>
    </div>
  )
}
