'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import L from 'leaflet'
import { MapContainer, Marker, Popup, TileLayer, useMap } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import { getLeafletPropertyMapTileLayer } from '@/lib/google-maps-locale'
import { resolvePropertyMapTitle, type PropertyMapPoint } from '@/lib/property-map-coords'

export type PropertyNearbyMapViewProps = {
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

function FocusPropertyCenter({ lat, lng }: { lat: number; lng: number }) {
    const map = useMap()

    useEffect(() => {
        map.invalidateSize()
        map.setView([lat, lng], PROPERTY_CENTER_ZOOM, { animate: false })
    }, [map, lat, lng])

    return null
}

function createMarkerIcon(fill: string, size = 28) {
    return L.divIcon({
        className: '',
        html: `<div style="width:${size}px;height:${size}px;border-radius:50% 50% 50% 0;background:${fill};border:2px solid #fff;box-shadow:0 4px 12px rgba(15,23,42,0.35);transform:rotate(-45deg);"></div>`,
        iconSize: [size, size],
        iconAnchor: [size / 2, size],
        popupAnchor: [0, -size + 4],
    })
}

export default function PropertyNearbyMapLeaflet({
    center,
    nearby,
    locale,
    currentLabel,
    viewDetailLabel,
}: PropertyNearbyMapViewProps) {
    const [mounted, setMounted] = useState(false)

    useEffect(() => {
        setMounted(true)
    }, [])

    const currentMarkerIcon = useMemo(() => createMarkerIcon('#2A4076', 32), [])
    const nearbyMarkerIcon = useMemo(() => createMarkerIcon('#64748B', 24), [])
    const tileLayer = useMemo(() => getLeafletPropertyMapTileLayer(locale), [locale])

    if (!mounted || !isValidCoord(center.lat, center.lng)) {
        return (
            <div
                className="h-[320px] w-full animate-pulse rounded-2xl bg-slate-100 md:h-[420px]"
                aria-hidden
            />
        )
    }

    return (
        <div
            className="overflow-hidden rounded-2xl border border-slate-200 shadow-sm"
            style={{ height: '320px', width: '100%' }}
        >
            <MapContainer
                center={[center.lat, center.lng]}
                zoom={PROPERTY_CENTER_ZOOM}
                scrollWheelZoom={false}
                style={{ height: '100%', width: '100%' }}
                className="z-0"
            >
                <TileLayer
                    attribution={tileLayer.attribution}
                    url={tileLayer.url}
                    {...(tileLayer.subdomains ? { subdomains: tileLayer.subdomains } : {})}
                    maxZoom={tileLayer.maxZoom}
                />
                <FocusPropertyCenter lat={center.lat} lng={center.lng} />
                <Marker position={[center.lat, center.lng]} icon={currentMarkerIcon}>
                    <Popup>
                        <div className="space-y-1 text-sm">
                            <p className="font-semibold text-[#1A2B56]">{center.title}</p>
                            <p className="text-xs text-slate-500">{currentLabel}</p>
                        </div>
                    </Popup>
                </Marker>
                {nearby
                    .filter((item) => isValidCoord(item.lat, item.lng))
                    .map((item) => (
                        <Marker key={item.id} position={[item.lat, item.lng]} icon={nearbyMarkerIcon}>
                            <Popup>
                                <div className="space-y-2 text-sm">
                                    <p className="font-semibold text-[#1A2B56]">
                                        {resolvePropertyMapTitle(item, locale)}
                                    </p>
                                    <Link
                                        href={`/${locale}/properties/${item.id}`}
                                        className="inline-flex text-xs font-semibold text-[#2A4076] hover:underline"
                                    >
                                        {viewDetailLabel}
                                    </Link>
                                </div>
                            </Popup>
                        </Marker>
                    ))}
            </MapContainer>
        </div>
    )
}
