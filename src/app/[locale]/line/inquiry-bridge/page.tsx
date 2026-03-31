'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { formatLiffError } from '@/lib/utils/inquiry-errors'

const LOCALES = new Set(['jp', 'en', 'th'])
const UUID_IN_STRING =
  /([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/i

/** liff.state の前後にゴミが付く場合でも UUID を拾う。ロケールは小文字化して照合 */
function parseLiffState(
  raw: string,
  fallbackLocale: string
): { safeLocale: string; propId: string } | null {
  let state = raw.trim()
  try {
    const decoded = decodeURIComponent(state)
    if (decoded !== state) state = decoded
  } catch {
    /* そのまま */
  }
  const sep = state.indexOf(':')
  const locRaw = sep >= 0 ? state.slice(0, sep).trim() : ''
  const tail = sep >= 0 ? state.slice(sep + 1) : state
  const um = tail.match(UUID_IN_STRING)
  if (!um) return null
  const propId = um[1].toLowerCase()
  const normLoc = locRaw.toLowerCase()
  const safeLocale = LOCALES.has(normLoc) ? normLoc : fallbackLocale
  return { safeLocale, propId }
}

function readResumePropertyHref(locale: string): string | null {
  try {
    const pid = sessionStorage.getItem('inquiry_resume_property_id')
    if (
      pid &&
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(pid)
    ) {
      return `/${locale}/properties/${pid}`
    }
  } catch {
    /* */
  }
  return null
}

/**
 * LIFF のエンドポイント URL として本パスを LINE Developers に登録する（例: https://ドメイン/jp/line/inquiry-bridge）。
 * liff.line.me から開いたとき liff.state に「locale:propertyUuid」を渡し、物件ページへ戻す。
 *
 * PC の Chrome でこの URL を直接開くと LIFF が成立せず失敗する。成功時は即座に物件詳細へ replace され、この画面は見えない。
 */
export default function LineInquiryBridgePage() {
  const params = useParams()
  const fallbackLocale = (params?.locale as string) || 'jp'
  const safeFallback = LOCALES.has(fallbackLocale) ? fallbackLocale : 'jp'

  const [msg, setMsg] = useState('LINE に接続しています…')
  /** 成功時は即リダイレクトするため、ユーザーに見えるのは failed / needs_line / no_state のみ */
  const [uiKind, setUiKind] = useState<'loading' | 'action'>('loading')
  const [resumeHref, setResumeHref] = useState<string | null>(null)

  useEffect(() => {
    setResumeHref(readResumePropertyHref(safeFallback))
  }, [safeFallback])

  useEffect(() => {
    const liffId = process.env.NEXT_PUBLIC_LINE_LIFF_ID?.trim()
    if (!liffId) {
      setMsg('LIFF ID が設定されていません（本番の環境変数 NEXT_PUBLIC_LINE_LIFF_ID）。')
      setUiKind('action')
      return
    }

    let cancelled = false
    ;(async () => {
      try {
        const liff = (await import('@line/liff')).default
        // PC・外部ブラウザでは false 先だと init が落ちやすい。フォーム側と同様 true を先に試す。
        try {
          await liff.init({ liffId, withLoginOnExternalBrowser: true })
        } catch {
          await liff.init({ liffId, withLoginOnExternalBrowser: false })
        }
        if (cancelled) return

        let state = liff.getState()
        if (!state || typeof state !== 'string') {
          setUiKind('action')
          setMsg(
            'ここで止まっている場合、問い合わせはまだ完了していません（この画面は成功ではありません）。' +
              ' 住所欄に /line/inquiry-bridge と直接開いていると動きません。' +
              ' 物件ページで「LINEで受け取る」を選び、送信から LINE 経由で開き直してください。'
          )
          return
        }
        const parsed = parseLiffState(state, safeFallback)
        if (!parsed) {
          setUiKind('action')
          setMsg('リンクが無効です。物件ページからやり直してください。')
          return
        }
        const { safeLocale, propId } = parsed

        try {
          sessionStorage.setItem('inquiry_liff_ready_pid', propId)
        } catch {
          /* private mode */
        }

        // LINE 内ブラウザでは App Router の client 遷移が壊れ 404 や真っ白になることがあるためフルロードする
        const path = `/${safeLocale}/properties/${propId}`
        window.location.replace(`${window.location.origin}${path}`)
      } catch (e) {
        console.error('[line-inquiry-bridge]', e)
        if (!cancelled) {
          setUiKind('action')
          const detail = formatLiffError(e)
          setMsg(
            '問い合わせは完了していません（この表示はエラーです）。' +
              ' PC のブラウザでこの URL を直接開いている場合は、スマホの LINE 内ブラウザで物件ページから「LINEで受け取る」→送信の流れを使ってください。' +
              (detail && detail !== 'LIFF エラー' ? `\n\n（技術メッセージ: ${detail}）` : '')
          )
        }
      }
    })()

    return () => {
      cancelled = true
    }
  }, [safeFallback])

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-6 bg-slate-50 px-6 text-center">
      <p className="max-w-md text-sm font-medium leading-relaxed text-navy-secondary whitespace-pre-line">
        {msg}
      </p>
      {uiKind === 'action' && (
        <div className="flex max-w-md flex-col gap-3 text-sm">
          {resumeHref ? (
            <Link
              href={resumeHref}
              className="rounded-xl bg-navy-primary px-5 py-3 font-medium text-white transition hover:opacity-90"
            >
              問い合わせ中の物件ページに戻る
            </Link>
          ) : null}
          <Link
            href={`/${safeFallback}/properties`}
            className="rounded-xl border border-slate-200 bg-white px-5 py-3 font-medium text-navy-secondary transition hover:bg-slate-50"
          >
            物件一覧へ
          </Link>
        </div>
      )}
    </div>
  )
}
