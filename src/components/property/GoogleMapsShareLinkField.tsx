'use client'

import { useState } from 'react'
import { Link2, Loader2 } from 'lucide-react'
import { browserReverseGeocodeToPlaceId } from '@/lib/browser-geocode-place-id'
import { normalizeStoredGooglePlaceId, normalizeStoredMapsShareUrl } from '@/lib/google-maps-parse'

export type ResolvedMapsFields = {
  google_place_id: string | null
  latitude: number | null
  longitude: number | null
  /** 貼り付けた共有 URL（そのまま DB 保存・表示用） */
  maps_share_url: string | null
}

type Props = {
  /** 現在の共有リンク（DB または未保存の入力）。設定済みならここに表示されます */
  shareUrl: string
  onShareUrlChange: (value: string) => void
  onResolved: (data: ResolvedMapsFields) => void
  className?: string
}

export default function GoogleMapsShareLinkField({
  shareUrl,
  onShareUrlChange,
  onResolved,
  className,
}: Props) {
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState<{ tone: 'ok' | 'warn' | 'err'; text: string } | null>(null)

  const handleApply = async () => {
    const trimmed = shareUrl.trim()
    if (!trimmed) return

    const normShare = normalizeStoredMapsShareUrl(trimmed)
    if (!normShare) {
      setNotice({
        tone: 'err',
        text: 'Google マップの共有 URL として無効です（maps.app.goo.gl / google.com/maps など）',
      })
      return
    }

    onShareUrlChange(normShare)

    setBusy(true)
    setNotice(null)

    const toNum = (v: unknown): number | null => {
      if (typeof v === 'number' && Number.isFinite(v)) return v
      if (typeof v === 'string' && v.trim() !== '') {
        const n = parseFloat(v)
        return Number.isFinite(n) ? n : null
      }
      return null
    }

    const applyLinkOnly = (tone: 'ok' | 'warn', text: string) => {
      onResolved({
        google_place_id: null,
        latitude: null,
        longitude: null,
        maps_share_url: normShare,
      })
      setNotice({ tone, text })
    }

    try {
      const res = await fetch('/api/maps/resolve-share-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: normShare }),
      })
      const data = (await res.json().catch(() => ({}))) as Record<string, unknown>

      if (!res.ok) {
        const msg = typeof data.error === 'string' ? data.error : '解析に失敗しました'
        applyLinkOnly(
          'warn',
          `共有リンクはフォームに反映しました。${msg}（物件ページではこのリンクで表示・開けます）保存で確定します。`,
        )
        return
      }

      const rawPid = data.google_place_id
      const placeId =
        typeof rawPid === 'string' && normalizeStoredGooglePlaceId(rawPid) ? rawPid.trim() : null
      const lat = toNum(data.latitude)
      const lng = toNum(data.longitude)

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
        maps_share_url: normShare,
      })

      if (finalPid) {
        setNotice({
          tone: 'ok',
          text: '共有リンク・座標・Place ID を反映しました。保存で確定します。',
        })
      } else if (lat !== null && lng !== null) {
        setNotice({
          tone: 'warn',
          text: '共有リンクと座標を反映しました。Place ID は未取得です。保存で確定します。',
        })
      } else {
        setNotice({
          tone: 'warn',
          text: '共有リンクのみ反映しました（座標・Place ID は取得できませんでした）。保存で確定します。',
        })
      }
    } catch {
      applyLinkOnly(
        'warn',
        '共有リンクはフォームに反映しました。通信エラーのため座標は取得できませんでした。保存で確定します。',
      )
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
          value={shareUrl}
          onChange={(e) => onShareUrlChange(e.target.value)}
          className="min-h-[42px] flex-1 rounded-lg border border-slate-100 bg-white px-3 py-2.5 text-xs font-bold text-navy-secondary outline-none focus:ring-2 focus:ring-navy-primary"
        />
        <button
          type="button"
          onClick={handleApply}
          disabled={busy || !shareUrl.trim()}
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
        共有リンクを正規化し、可能な範囲で座標・Place ID も取り込みます。取得できない場合でもリンクはフォームに残り、物件ページで表示・開けます。
      </p>
    </div>
  )
}
