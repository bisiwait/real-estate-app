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
        <div className="space-y-4">
            <div className="bg-amber-50 border border-amber-100 p-4 rounded-2xl flex items-start space-x-3 text-[11px] text-amber-700 font-bold leading-relaxed">
                <Info className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <div>
                    <p className="mb-1 uppercase tracking-wider">座標の取得方法</p>
                    <ol className="list-decimal list-inside space-y-1 font-medium">
                        <li>下の「Googleマップで開く」をクリック</li>
                        <li>場所を右クリックし、表示される数字（緯度, 経度）をコピー</li>
                        <li>下の入力欄に貼り付けてください</li>
                    </ol>
                </div>
            </div>

            <div className="flex items-center space-x-4">
                <a
                    href={`https://www.google.com/maps/search/?api=1&query=${displayLat},${displayLng}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="bg-white border-2 border-slate-100 hover:border-navy-primary px-4 py-2 rounded-xl text-xs font-black text-navy-secondary transition-all flex items-center shadow-sm"
                >
                    <MapPin className="w-3.5 h-3.5 mr-2 text-navy-primary" />
                    Googleマップで開く
                </a>
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">緯度 (Latitude)</label>
                    <input
                        type="number"
                        step="0.0000001"
                        value={lat || ''}
                        onChange={e => onChange(parseFloat(e.target.value), lng)}
                        placeholder="例: 12.9236"
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-sm focus:ring-2 focus:ring-navy-primary outline-none font-bold text-navy-secondary"
                    />
                </div>
                <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">経度 (Longitude)</label>
                    <input
                        type="number"
                        step="0.0000001"
                        value={lng || ''}
                        onChange={e => onChange(lat, parseFloat(e.target.value))}
                        placeholder="例: 100.8824"
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-sm focus:ring-2 focus:ring-navy-primary outline-none font-bold text-navy-secondary"
                    />
                </div>
            </div>

            <div className="relative rounded-2xl overflow-hidden h-48 bg-slate-100 border border-slate-100">
                <iframe
                    width="100%"
                    height="100%"
                    frameBorder="0"
                    style={{ border: 0 }}
                    src={`https://www.google.com/maps/embed/v1/view?key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || ''}&center=${displayLat},${displayLng}&zoom=15`}
                    allowFullScreen
                    className="grayscale opacity-50 pointer-events-none"
                ></iframe>
                <div className="absolute inset-0 flex items-center justify-center bg-slate-900/10 backdrop-blur-[2px]">
                    <div className="bg-white/90 px-4 py-2 rounded-full shadow-lg flex items-center space-x-2">
                        <MapPin className="w-4 h-4 text-red-500 animate-bounce" />
                        <span className="text-[10px] font-black text-navy-secondary">この付近が地図に表示されます</span>
                    </div>
                </div>
            </div>
        </div>
    )
}
