'use client'

import { useCallback, useState } from 'react'
import { Loader2, MessageCircle } from 'lucide-react'
import { clsx } from 'clsx'
import { getErrorMessage } from '@/lib/utils/errors'

type Dict = Record<string, string>

export interface LineLiffConnectButtonProps {
  liffId: string | undefined
  dict: Dict
  linkedUserId: string | null
  onLinked: (userId: string) => void
  onClear?: () => void
}

export default function LineLiffConnectButton({
  liffId,
  dict,
  linkedUserId,
  onLinked,
  onClear,
}: LineLiffConnectButtonProps) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const connect = useCallback(async () => {
    if (!liffId?.trim()) {
      setError(dict.liff_not_configured ?? 'LIFF が未設定です')
      return
    }
    setBusy(true)
    setError(null)
    try {
      const liff = (await import('@line/liff')).default
      await liff.init({ liffId: liffId.trim() })
      if (!liff.isLoggedIn()) {
        liff.login()
        return
      }
      const profile = await liff.getProfile()
      if (!profile?.userId) {
        throw new Error(dict.liff_no_user_id ?? 'LINE ユーザーIDを取得できませんでした')
      }
      onLinked(profile.userId)
    } catch (e: unknown) {
      setError(getErrorMessage(e))
    } finally {
      setBusy(false)
    }
  }, [liffId, dict.liff_not_configured, dict.liff_no_user_id, onLinked])

  if (linkedUserId) {
    return (
      <div className="rounded-xl border border-emerald-200 bg-emerald-50/80 px-4 py-3 text-sm text-emerald-900">
        <p className="font-bold">{dict.inquiry_liff_linked_ok ?? 'LINE通知用に連携済みです'}</p>
        <p className="mt-1 break-all font-mono text-xs opacity-90">{linkedUserId}</p>
        {onClear ? (
          <button
            type="button"
            onClick={onClear}
            className="mt-2 text-xs font-bold text-emerald-800 underline hover:no-underline"
          >
            {dict.inquiry_liff_clear ?? '連携を解除'}
          </button>
        ) : null}
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={() => void connect()}
        disabled={busy || !liffId?.trim()}
        className={clsx(
          'inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-black shadow-md transition',
          liffId?.trim() && !busy
            ? 'bg-[#06C755] text-white hover:bg-[#05b34c]'
            : 'cursor-not-allowed bg-slate-200 text-slate-500'
        )}
      >
        {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : <MessageCircle className="h-5 w-5" />}
        {dict.inquiry_liff_connect_btn ?? 'LINEで連携（通知用）'}
      </button>
      {error ? <p className="text-xs text-red-600">{error}</p> : null}
      <p className="text-[10px] leading-relaxed text-slate-500">
        {dict.inquiry_liff_hint ??
          'LINEアプリ内または対応ブラウザで開き、公式アカウントと友だちのうえで連携してください。'}
      </p>
    </div>
  )
}
