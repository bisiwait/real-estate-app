'use client'

import { useEffect, useRef, useState } from 'react'
import { ensureGoogleMapsScript } from '@/lib/google-maps-browser-loader'
import { resolvePropertyMapTitle, type PropertyMapPoint } from '@/lib/property-map-coords'

type PropertyNearbyMapProps = {
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

function markerSymbol(color: string, scale: number): google.maps.Symbol {
    return {
        path: google.maps.SymbolPath.CIRCLE,
        fillColor: color,
        fillOpacity: 1,
        strokeColor: '#ffffff',
        strokeWeight: 2,
        scale,
    }
}

function focusMapOnProperty(map: google.maps.Map, lat: number, lng: number) {
    map.setCenter({ lat, lng })
    map.setZoom(PROPERTY_CENTER_ZOOM)
}

export default function PropertyNearbyMap({
    center,
    nearby,
    locale,
    currentLabel,
    viewDetailLabel,
}: PropertyNearbyMapProps) {
    const containerRef = useRef<HTMLDivElement>(null)
    const [loadError, setLoadError] = useState(false)

    useEffect(() => {
        if (!isValidCoord(center.lat, center.lng) || !containerRef.current) return

        let cancelled = false
        const markers: google.maps.Marker[] = []
        const infoWindows: google.maps.InfoWindow[] = []
        let map: google.maps.Map | null = null
        let resizeObserver: ResizeObserver | null = null

        const run = async () => {
            try {
                await ensureGoogleMapsScript(locale)
                if (cancelled || !containerRef.current) return

                map = new google.maps.Map(containerRef.current, {
                    center: { lat: center.lat, lng: center.lng },
                    zoom: PROPERTY_CENTER_ZOOM,
                    scrollwheel: false,
                    mapTypeControl: false,
                    streetViewControl: false,
                    fullscreenControl: true,
                })

                const recenter = () => {
                    if (!map) return
                    focusMapOnProperty(map, center.lat, center.lng)
                }

                recenter()
                google.maps.event.addListenerOnce(map, 'idle', recenter)

                if (typeof ResizeObserver !== 'undefined' && containerRef.current) {
                    resizeObserver = new ResizeObserver(() => recenter())
                    resizeObserver.observe(containerRef.current)
                }

                const currentMarker = new google.maps.Marker({
                    map,
                    position: { lat: center.lat, lng: center.lng },
                    title: center.title,
                    zIndex: 1000,
                    icon: markerSymbol('#2A4076', 11),
                })
                markers.push(currentMarker)

                const currentInfo = new google.maps.InfoWindow({
                    content: `<div style="font-family:sans-serif;font-size:13px;line-height:1.4;padding:2px 0;">
                        <div style="font-weight:600;color:#1A2B56;">${escapeHtml(center.title)}</div>
                        <div style="font-size:11px;color:#64748b;margin-top:4px;">${escapeHtml(currentLabel)}</div>
                    </div>`,
                })
                infoWindows.push(currentInfo)
                currentMarker.addListener('click', () => {
                    currentInfo.open({ map, anchor: currentMarker })
                })

                for (const item of nearby) {
                    if (!isValidCoord(item.lat, item.lng)) continue
                    const title = resolvePropertyMapTitle(item, locale)
                    const marker = new google.maps.Marker({
                        map,
                        position: { lat: item.lat, lng: item.lng },
                        title,
                        zIndex: 100,
                        icon: markerSymbol('#64748B', 8),
                    })
                    markers.push(marker)

                    const href = `/${locale}/properties/${item.id}`
                    const info = new google.maps.InfoWindow({
                        content: `<div style="font-family:sans-serif;font-size:13px;line-height:1.4;padding:2px 0;">
                            <div style="font-weight:600;color:#1A2B56;margin-bottom:6px;">${escapeHtml(title)}</div>
                            <a href="${href}" style="font-size:11px;font-weight:600;color:#2A4076;text-decoration:none;">${escapeHtml(viewDetailLabel)}</a>
                        </div>`,
                    })
                    infoWindows.push(info)
                    marker.addListener('click', () => {
                        info.open({ map, anchor: marker })
                    })
                }

                if (!cancelled) setLoadError(false)
            } catch (error) {
                console.warn('[PropertyNearbyMap] Google Maps init failed', error)
                if (!cancelled) setLoadError(true)
            }
        }

        void run()

        return () => {
            cancelled = true
            resizeObserver?.disconnect()
            infoWindows.forEach((info) => info.close())
            markers.forEach((marker) => marker.setMap(null))
            map = null
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

    if (loadError) {
        return (
            <div className="flex h-[320px] items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 text-sm text-slate-500 md:h-[420px]">
                地図を読み込めませんでした
            </div>
        )
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

function escapeHtml(value: string): string {
    return value
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;')
}
