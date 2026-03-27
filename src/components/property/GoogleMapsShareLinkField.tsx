'use client'

import { useState } from 'react'
import { Link2, Loader2 } from 'lucide-react'
import { normalizeStoredGooglePlaceId } from '@/lib/google-maps-parse'

export type ResolvedMapsFields = {
  google_place_id: string | null
  latitude: number | null
  longitude: number | null
}

type Props = {
  onResolved: (data: ResolvedMapsFields) => void
  className?: string
}

export default function GoogleMapsShareLinkField({ onResolved, className }: Props) {
  const [url, setUrl] = useState('')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  const handleResolve = async () => {
    const trimmed = url.trim()
    if (!trimmed) return
    setBusy(true)
    setMessage(null)
    try {
      const res = await fetch('/api/maps/resolve-share-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: trimmed }),
      })
      const data = await res.json()
      if (!res.ok) {
        throw new Error(typeof data.error === 'string' ? data.error : '解析に失敗しました')
      }

      const toNum = (v: unknown): number | null => {
        if (typeof v === 'number' && Number.isFinite(v)) return v
        if (typeof v === 'string' && v.trim() !== '') {
          const n = parseFloat(v)
          return Number.isFinite(n) ? n : null
        }
        return null
      }

      const rawPid = data.google_place_id
      const placeId =
        typeof rawPid === 'string' && normalizeStoredGooglePlaceId(rawPid) ? rawPid.trim() : null
      const lat = toNum(data.latitude)
      const lng = toNum(data.longitude)

      if (!placeId && (lat === null || lng === null)) {
        throw new Error('リンクから Place ID または座標を取得できませんでした')
      }

      onResolved({
        google_place_id: placeId,
        latitude: lat,
        longitude: lng,
      })

      if (placeId) setMessage('Place ID を取得しました（地図表示で優先されます）')
      else setMessage('座標を取得しました')
    } catch (e: unknown) {
      setMessage(e instanceof Error ? e.message : 'エラーが発生しました')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className={className}>
      <label className="mb-1 ml-1 block text-[9px] font-black uppercase tracking-widest text-slate-400">
        Google マップ共有リンク（任意）
      </label>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-stretch">
        <input
          type="url"
          inputMode="url"
          placeholder="https://maps.app.goo.gl/..."
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          className="min-h-[42px] flex-1 rounded-lg border border-slate-100 bg-white px-3 py-2.5 text-xs font-bold text-navy-secondary outline-none focus:ring-2 focus:ring-navy-primary"
        />
        <button
          type="button"
          onClick={handleResolve}
          disabled={busy || !url.trim()}
          className="flex h-[42px] shrink-0 items-center justify-center gap-2 rounded-lg border-2 border-slate-100 bg-white px-4 text-[11px] font-black text-navy-secondary shadow-sm transition-all hover:border-navy-primary disabled:cursor-not-allowed disabled:opacity-50"
        >
          {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Link2 className="h-3.5 w-3.5" />}
          取り込む
        </button>
      </div>
      {message && (
        <p
          className={`mt-2 text-[10px] font-bold ${message.includes('取得しました') ? 'text-emerald-600' : 'text-red-500'}`}
        >
          {message}
        </p>
      )}
      <p className="mt-1.5 text-[9px] font-medium leading-relaxed text-slate-400">
        共有メニューからコピーした短縮 URL でも構いません。取得できた場合は Place ID を保存し、無理な場合は座標を更新します。
      </p>
    </div>
  )
}
