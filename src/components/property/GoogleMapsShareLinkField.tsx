'use client'

import { useState } from 'react'
import { Link2, Loader2 } from 'lucide-react'
import { browserReverseGeocodeToPlaceId } from '@/lib/browser-geocode-place-id'
import { normalizeStoredGooglePlaceId } from '@/lib/google-maps-parse'

export type ResolvedMapsFields = {
  google_place_id: string | null
  latitude: number | null
  longitude: number | null
}

type Props = {
  onResolved: (data: ResolvedMapsFields) => void
  /** Place ID のみ手入力で反映（共有リンクと併用可） */
  onManualPlaceId?: (placeId: string) => void
  className?: string
}

export default function GoogleMapsShareLinkField({ onResolved, onManualPlaceId, className }: Props) {
  const [url, setUrl] = useState('')
  const [manualPid, setManualPid] = useState('')
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState<{ tone: 'ok' | 'warn' | 'err'; text: string } | null>(null)

  const handleResolve = async () => {
    const trimmed = url.trim()
    if (!trimmed) return
    setBusy(true)
    setNotice(null)
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

      let finalPid = placeId
      if (!finalPid && lat !== null && lng !== null) {
        try {
          finalPid = await browserReverseGeocodeToPlaceId(lat, lng)
        } catch {
          /* キー未設定・ブロック時はスキップ */
        }
      }

      onResolved({
        google_place_id: finalPid,
        latitude: lat,
        longitude: lng,
      })

      if (finalPid) {
        setNotice({ tone: 'ok', text: 'Place ID を取得しました（保存すると DB に書き込まれます）' })
      } else if (lat !== null && lng !== null) {
        setNotice({
          tone: 'warn',
          text: '座標のみ取得しました。Place ID は未取得です。下の手入力に ChIJ… を貼るか、ブラウザで Geocoding がブロックされていないかご確認ください。',
        })
      } else {
        setNotice({ tone: 'ok', text: '座標を取得しました' })
      }
    } catch (e: unknown) {
      setNotice({ tone: 'err', text: e instanceof Error ? e.message : 'エラーが発生しました' })
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
      {notice && (
        <p
          className={`mt-2 text-[10px] font-bold ${
            notice.tone === 'ok' ? 'text-emerald-600' : notice.tone === 'warn' ? 'text-amber-700' : 'text-red-500'
          }`}
        >
          {notice.text}
        </p>
      )}
      <p className="mt-1.5 text-[9px] font-medium leading-relaxed text-slate-400">
        共有メニューからコピーした短縮 URL でも構いません。取得できた場合は Place ID を保存し、無理な場合は座標を更新します。
      </p>

      {onManualPlaceId ? (
        <div className="mt-4 border-t border-slate-100 pt-3">
          <label className="mb-1 ml-1 block text-[9px] font-black uppercase tracking-widest text-slate-400">
            Place ID 手入力（ChIJ…）
          </label>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-stretch">
            <input
              type="text"
              placeholder="ChIJ..."
              value={manualPid}
              onChange={(e) => setManualPid(e.target.value)}
              className="min-h-[42px] flex-1 rounded-lg border border-slate-100 bg-white px-3 py-2.5 font-mono text-[11px] font-bold text-navy-secondary outline-none focus:ring-2 focus:ring-navy-primary"
            />
            <button
              type="button"
              onClick={() => {
                const t = manualPid.trim()
                if (!normalizeStoredGooglePlaceId(t)) {
                  setNotice({ tone: 'err', text: 'Place ID の形式が正しくありません（ChIJ で始まる英数字など）' })
                  return
                }
                onManualPlaceId(t)
                setNotice({ tone: 'ok', text: 'Place ID を反映しました（保存で DB に書き込み）' })
              }}
              className="flex h-[42px] shrink-0 items-center justify-center rounded-lg border-2 border-slate-100 bg-white px-4 text-[11px] font-black text-navy-secondary shadow-sm transition-all hover:border-navy-primary"
            >
              反映
            </button>
          </div>
        </div>
      ) : null}
    </div>
  )
}
