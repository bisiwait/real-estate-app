'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'

const LOCALES = new Set(['jp', 'en', 'th'])

/**
 * LIFF のエンドポイント URL として本パスを LINE Developers に登録する（例: https://ドメイン/jp/line/inquiry-bridge）。
 * liff.line.me から開いたとき liff.state に「locale:propertyUuid」を渡し、物件ページへ戻す。
 */
export default function LineInquiryBridgePage() {
  const params = useParams()
  const router = useRouter()
  const fallbackLocale = (params?.locale as string) || 'jp'
  const [msg, setMsg] = useState('LINE に接続しています…')

  useEffect(() => {
    const liffId = process.env.NEXT_PUBLIC_LINE_LIFF_ID?.trim()
    if (!liffId) {
      setMsg('LIFF ID が設定されていません。')
      return
    }

    let cancelled = false
    ;(async () => {
      try {
        const liff = (await import('@line/liff')).default
        try {
          await liff.init({ liffId, withLoginOnExternalBrowser: false })
        } catch {
          await liff.init({ liffId, withLoginOnExternalBrowser: true })
        }
        if (cancelled) return

        let state = liff.getState()
        if (!state || typeof state !== 'string') {
          setMsg('リンク情報がありません。物件ページから「LINEで受け取る」を選んで送信してください。')
          return
        }
        state = state.trim()
        try {
          const decoded = decodeURIComponent(state)
          if (decoded !== state) state = decoded
        } catch {
          /* そのまま */
        }

        const sep = state.indexOf(':')
        const loc = sep >= 0 ? state.slice(0, sep) : fallbackLocale
        const propId = sep >= 0 ? state.slice(sep + 1) : state
        const safeLocale = LOCALES.has(loc) ? loc : fallbackLocale

        if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(propId)) {
          setMsg('リンクが無効です。')
          return
        }

        try {
          sessionStorage.setItem('inquiry_liff_ready_pid', propId)
        } catch {
          /* private mode */
        }

        router.replace(`/${safeLocale}/properties/${propId}`)
      } catch (e) {
        console.error('[line-inquiry-bridge]', e)
        if (!cancelled) setMsg('接続に失敗しました。LINE アプリ内で開き直すか、しばらくしてから再度お試しください。')
      }
    })()

    return () => {
      cancelled = true
    }
  }, [fallbackLocale, router])

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 bg-slate-50 px-6 text-center">
      <p className="text-sm font-medium text-navy-secondary">{msg}</p>
    </div>
  )
}
