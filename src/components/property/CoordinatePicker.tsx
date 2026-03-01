'use client'

import { useState } from 'react'
import { MapPin, Info } from 'lucide-react'

interface CoordinatePickerProps {
    lat: number
    lng: number
    onChange: (lat: number, lng: number) => void
}

export default function CoordinatePicker({ lat, lng, onChange }: CoordinatePickerProps) {
    const [searchQuery, setSearchQuery] = useState('')

    // Pattaya default center if coordinates are zero
    const displayLat = lat || 12.9236
    const displayLng = lng || 100.8824

    const handleMapClick = (e: React.MouseEvent<HTMLDivElement>) => {
        // Since we can't easily get coordinates from a standard iframe, 
        // we provide instructions and manual inputs.
        // For a more advanced version, we would use a proper Map library like Leaflet or Google Maps JS SDK.
        // For now, we'll keep it simple as requested.
    }

    return (
        <div className="flex flex-col sm:flex-row sm:items-end gap-3">
            <div className="flex-shrink-0">
                <a
                    href={`https://www.google.com/maps/search/?api=1&query=${displayLat},${displayLng}`}
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
                        value={lat || ''}
                        onChange={e => onChange(parseFloat(e.target.value), lng)}
                        placeholder="例: 12.9236"
                        className="w-full px-3 py-2.5 bg-slate-50 border border-slate-100 rounded-lg text-xs focus:ring-2 focus:ring-navy-primary outline-none font-bold text-navy-secondary h-[42px]"
                    />
                </div>
                <div>
                    <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1 ml-1">経度 (Longitude)</label>
                    <input
                        type="number"
                        step="0.0000001"
                        value={lng || ''}
                        onChange={e => onChange(lat, parseFloat(e.target.value))}
                        placeholder="例: 100.8824"
                        className="w-full px-3 py-2.5 bg-slate-50 border border-slate-100 rounded-lg text-xs focus:ring-2 focus:ring-navy-primary outline-none font-bold text-navy-secondary h-[42px]"
                    />
                </div>
            </div>


        </div>
    )
}
