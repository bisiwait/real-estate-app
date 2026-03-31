'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { formatLiffError } from '@/lib/utils/inquiry-errors'

const LOCALES = new Set(['jp', 'en', 'th'])
const PROP_UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const UUID_IN_STRING =
  /([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/i
const LIFF_INIT_MS = 12_000

/** liff.init が固まっても 404 に落ちないよう、フォームが保存したセッションがあれば即物件へ */
function redirectFromSessionResume(fallbackLocaleFromPath: string): boolean {
  if (typeof window === 'undefined') return false
  try {
    if (sessionStorage.getItem('inquiry_resume_line') !== '1') return false
    const pid = sessionStorage.getItem('inquiry_resume_property_id')
    if (!pid || !PROP_UUID.test(pid)) return false
    const locRaw = sessionStorage.getItem('inquiry_resume_locale')
    const safeLocale = locRaw && LOCALES.has(locRaw) ? locRaw : fallbackLocaleFromPath
    const idLower = pid.toLowerCase()
    sessionStorage.setItem('inquiry_liff_ready_pid', idLower)
    sessionStorage.removeItem('inquiry_resume_line')
    sessionStorage.removeItem('inquiry_resume_property_id')
    sessionStorage.removeItem('inquiry_resume_locale')
    window.location.replace(`${window.location.origin}/${safeLocale}/properties/${idLower}`)
    return true
  } catch {
    return false
  }
}

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

/** 自サイトのクエリに付いた liff.state（LINE の挙動差のフォールバック） */
function readLiffStateFromPageUrl(): string | null {
  if (typeof window === 'undefined') return null
  try {
    const s = new URLSearchParams(window.location.search).get('liff.state')
    if (s && s.length > 0) return s
  } catch {
    /* */
  }
  return null
}

/**
 * @line/liff 2.x の npm バンドルには getState が無い環境がある（呼ぶと getState is not a function）。
 * ある場合のみ使い、無ければ URL / sessionStorage に任せる。
 */
function readLiffStateFromSdk(liff: { getState?: () => unknown }): string | undefined {
  try {
    if (typeof liff.getState !== 'function') return undefined
    const v = liff.getState()
    return typeof v === 'string' && v.length > 0 ? v : undefined
  } catch {
    return undefined
  }
}

function readResumePropertyHref(fallbackLocaleFromPath: string): string | null {
  try {
    const pid = sessionStorage.getItem('inquiry_resume_property_id')
    if (!pid || !PROP_UUID.test(pid)) return null
    const locRaw = sessionStorage.getItem('inquiry_resume_locale')
    const loc = locRaw && LOCALES.has(locRaw) ? locRaw : fallbackLocaleFromPath
    return `/${loc}/properties/${pid}`
  } catch {
    return null
  }
}

/**
 * LIFF のエンドポイント URL として本パスを LINE Developers に登録する（例: https://ドメイン/jp/line/inquiry-bridge）。
 * liff.line.me から開いたとき liff.state に「locale:propertyUuid」を渡し、物件ページへ戻す。
 *
 * LINE は liff.line.me 上で ?liff.state= を .../jp:uuid 形式のパスへリダイレクト表示することがある（プラットフォーム側）。
 * その場合でも SDK の getState（利用可能なら）か、自サイト URL のクエリ liff.state= で復元を試す。
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
      if (typeof window !== 'undefined' && redirectFromSessionResume(safeFallback)) {
        return
      }
      try {
        const liff = (await import('@line/liff')).default
        const runInit = async () => {
          try {
            await liff.init({ liffId, withLoginOnExternalBrowser: true })
          } catch {
            await liff.init({ liffId, withLoginOnExternalBrowser: false })
          }
        }
        try {
          await Promise.race([
            runInit(),
            new Promise<never>((_, rej) =>
              setTimeout(() => rej(new Error('LIFF_INIT_TIMEOUT')), LIFF_INIT_MS)
            ),
          ])
        } catch (initErr) {
          if (
            initErr instanceof Error &&
            initErr.message === 'LIFF_INIT_TIMEOUT' &&
            typeof window !== 'undefined' &&
            redirectFromSessionResume(safeFallback)
          ) {
            return
          }
          throw initErr
        }
        if (cancelled) return

        const fromSdk = readLiffStateFromSdk(liff)
        let state: string | undefined = fromSdk
        if (!state) {
          const fromPage = readLiffStateFromPageUrl()
          if (fromPage) state = fromPage
        }
        if (!state) {
          try {
            if (sessionStorage.getItem('inquiry_resume_line') === '1') {
              const pid = sessionStorage.getItem('inquiry_resume_property_id')
              const locRaw = sessionStorage.getItem('inquiry_resume_locale')
              const loc =
                locRaw && LOCALES.has(locRaw) ? locRaw : safeFallback
              if (pid && PROP_UUID.test(pid)) {
                state = `${loc}:${pid}`
              }
            }
          } catch {
            /* */
          }
        }
        if (!state) {
          setUiKind('action')
          setMsg(
            'ここで止まっている場合、問い合わせはまだ完了していません（この画面は成功ではありません）。' +
              ' LINE は liff.line.me の URL をパス形式に書き換えて見せることがありますが、通常はこのあとエンドポイントへ渡ります。' +
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
          sessionStorage.removeItem('inquiry_resume_line')
          sessionStorage.removeItem('inquiry_resume_property_id')
          sessionStorage.removeItem('inquiry_resume_locale')
        } catch {
          /* private mode */
        }

        const path = `/${safeLocale}/properties/${propId}`
        window.location.replace(`${window.location.origin}${path}`)
      } catch (e) {
        console.error('[line-inquiry-bridge]', e)
        if (!cancelled) {
          if (typeof window !== 'undefined' && redirectFromSessionResume(safeFallback)) {
            return
          }
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
