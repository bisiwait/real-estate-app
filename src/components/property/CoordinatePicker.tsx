'use client'

import { MapPin } from 'lucide-react'
import { normalizeStoredGooglePlaceId, normalizeStoredMapsShareUrl } from '@/lib/google-maps-parse'
import {
    DEFAULT_MAP_LAT,
    DEFAULT_MAP_LNG,
    finiteCoord,
    googleMapsUrlFromLatLng,
    googleMapsUrlFromPlaceId,
} from '@/lib/google-maps-url'

interface CoordinatePickerProps {
    lat: number | null | undefined
    lng: number | null | undefined
    /** 有効なときは「Googleマップで開く」が Place の公式ページへ遷移 */
    googlePlaceId?: string | null
    /** Place 表示用（プロジェクト名など）。Place ID があるときに渡すと左パネル表示になりやすい */
    placeNameHint?: string | null
    /** 保存した共有リンク（最優先で「Googleマップで開く」） */
    mapsShareUrl?: string | null
    onChange: (lat: number, lng: number) => void
}

export default function CoordinatePicker({
    lat,
    lng,
    googlePlaceId,
    placeNameHint,
    mapsShareUrl,
    onChange,
}: CoordinatePickerProps) {
    const displayLat = finiteCoord(lat, DEFAULT_MAP_LAT)
    const displayLng = finiteCoord(lng, DEFAULT_MAP_LNG)
    const pid = normalizeStoredGooglePlaceId(googlePlaceId ?? null)
    const safeShare = normalizeStoredMapsShareUrl(mapsShareUrl ?? null)
    const mapsHref = safeShare
        ? safeShare
        : pid
          ? googleMapsUrlFromPlaceId(pid, placeNameHint)
          : googleMapsUrlFromLatLng(displayLat, displayLng)

    return (
        <div className="flex flex-col sm:flex-row sm:items-end gap-3">
            <div className="flex-shrink-0">
                <a
                    href={mapsHref}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="bg-white border-2 border-slate-100 hover:border-navy-primary px-3 py-2.5 rounded-lg text-[11px] font-black text-navy-secondary transition-all flex items-center justify-center shadow-sm h-[42px]"
                >
                    <MapPin className="w-3.5 h-3.5 mr-1.5 text-navy-primary" />
                    Googleマップで開く
                </a>
            </div>

            <div className="flex-1 grid grid-cols-2 gap-3">
                <div>
                    <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1 ml-1">緯度 (Latitude)</label>
                    <input
                        type="number"
                        step="0.0000001"
                        value={Number.isFinite(lat as number) ? lat : ''}
                        onChange={e => {
                            const v = e.target.value.trim()
                            if (v === '') return
                            const n = Number(v)
                            if (!Number.isFinite(n)) return
                            onChange(n, finiteCoord(lng, DEFAULT_MAP_LNG))
                        }}
                        placeholder="例: 12.9236"
                        className="w-full px-3 py-2.5 bg-slate-50 border border-slate-100 rounded-lg text-xs focus:ring-2 focus:ring-navy-primary outline-none font-bold text-navy-secondary h-[42px]"
                    />
                </div>
                <div>
                    <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1 ml-1">経度 (Longitude)</label>
                    <input
                        type="number"
                        step="0.0000001"
                        value={Number.isFinite(lng as number) ? lng : ''}
                        onChange={e => {
                            const v = e.target.value.trim()
                            if (v === '') return
                            const n = Number(v)
                            if (!Number.isFinite(n)) return
                            onChange(finiteCoord(lat, DEFAULT_MAP_LAT), n)
                        }}
                        placeholder="例: 100.8824"
                        className="w-full px-3 py-2.5 bg-slate-50 border border-slate-100 rounded-lg text-xs focus:ring-2 focus:ring-navy-primary outline-none font-bold text-navy-secondary h-[42px]"
                    />
                </div>
            </div>


        </div>
    )
}
