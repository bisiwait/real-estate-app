'use client'

import { useEffect, useLayoutEffect, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { formatLiffError } from '@/lib/utils/inquiry-errors'
import { flowStorageGet, flowStorageSet, flowStorageRemove } from '@/lib/inquiry-line-flow-storage'

const LOCALES = new Set(['jp', 'en', 'th'])
const PROP_UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const UUID_IN_STRING =
  /([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/i
const LIFF_INIT_MS = 12_000
/** init が固まったまま loading だけ見せ続けない（バックグラウンドタブでは setTimeout が遅延し得る） */
const BRIDGE_FAILSAFE_MS = 12_000
const BRIDGE_RELOAD_FLAG = 'inquiry_bridge_autoreload_v1'
/** InquiryForm と同じキー（LINE ログインコールバックは liff.state が無いのでここから復元する） */
const PENDING_LINE_INQUIRY_KEY = 'inquiry_line_pending_v1'
const PENDING_MAX_MS = 15 * 60 * 1000

/** Strict Mode 二重 effect や古い init 完了で setState / 二重 init しない */
let inquiryBridgeEffectGeneration = 0

/** 同一ページ内で liff.init を並列に呼ばない（SDK がリロードや不安定化し得る） */
let bridgeLiffInitPromise: Promise<void> | null = null

function clearBridgeLiffInitSlot(): void {
  bridgeLiffInitPromise = null
}

/** 別タブで外部ブラウザを開かせないよう、常に同一コンテキスト優先（失敗時のみ従来の外部ログインにフォールバック） */
async function initLiffOnceForBridge(
  liff: { init: (config: { liffId: string; withLoginOnExternalBrowser: boolean }) => Promise<void> },
  liffId: string
): Promise<void> {
  if (!bridgeLiffInitPromise) {
    const p = (async () => {
      try {
        await liff.init({ liffId, withLoginOnExternalBrowser: false })
      } catch {
        await liff.init({ liffId, withLoginOnExternalBrowser: true })
      }
    })()
    bridgeLiffInitPromise = p
    void p.finally(() => {
      if (bridgeLiffInitPromise === p) bridgeLiffInitPromise = null
    })
  }
  await bridgeLiffInitPromise
}

function hasOAuthCodeInUrl(): boolean {
  if (typeof window === 'undefined') return false
  try {
    return !!new URLSearchParams(window.location.search).get('code')
  } catch {
    return false
  }
}

/** InquiryForm が保存した pending（期限付き） */
function readPendingLineInquiryForBridge():
  | { propertyId: string; locale: string }
  | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = flowStorageGet(PENDING_LINE_INQUIRY_KEY)
    if (!raw) return null
    const o = JSON.parse(raw) as {
      v?: number
      propertyId?: string
      locale?: string
      at?: number
    }
    if (o.v !== 1 || !o.propertyId || typeof o.at !== 'number') return null
    if (Date.now() - o.at > PENDING_MAX_MS) {
      flowStorageRemove(PENDING_LINE_INQUIRY_KEY)
      return null
    }
    if (!PROP_UUID.test(o.propertyId)) return null
    const locRaw = o.locale
    const loc = locRaw && LOCALES.has(locRaw) ? locRaw : null
    if (!loc) return null
    return { propertyId: o.propertyId.toLowerCase(), locale: loc }
  } catch {
    return null
  }
}

function buildSyntheticStateFromStorage(fallbackLocale: string): string | null {
  try {
    if (flowStorageGet('inquiry_resume_line') === '1') {
      const pid = flowStorageGet('inquiry_resume_property_id')
      const locRaw = flowStorageGet('inquiry_resume_locale')
      const loc = locRaw && LOCALES.has(locRaw) ? locRaw : fallbackLocale
      if (pid && PROP_UUID.test(pid)) return `${loc}:${pid.toLowerCase()}`
    }
    const pend = readPendingLineInquiryForBridge()
    if (pend) return `${pend.locale}:${pend.propertyId}`
    const pidOnly = flowStorageGet('inquiry_resume_property_id')
    const locOnly = flowStorageGet('inquiry_resume_locale')
    if (
      pidOnly &&
      PROP_UUID.test(pidOnly) &&
      locOnly &&
      LOCALES.has(locOnly)
    ) {
      return `${locOnly}:${pidOnly.toLowerCase()}`
    }
  } catch {
    /* */
  }
  return null
}

/** liff.init が固まっても 404 に落ちないよう、フォームが保存したセッションがあれば即物件へ */
function redirectFromSessionResume(fallbackLocaleFromPath: string): boolean {
  if (typeof window === 'undefined') return false
  try {
    const synthetic = buildSyntheticStateFromStorage(fallbackLocaleFromPath)
    if (!synthetic) return false
    const parsed = parseLiffState(synthetic, fallbackLocaleFromPath)
    if (!parsed) return false
    const { safeLocale, propId } = parsed
    flowStorageSet('inquiry_liff_ready_pid', propId)
    flowStorageRemove('inquiry_resume_line')
    flowStorageRemove('inquiry_resume_property_id')
    flowStorageRemove('inquiry_resume_locale')
    try {
      sessionStorage.removeItem(BRIDGE_RELOAD_FLAG)
    } catch {
      /* */
    }
    window.location.replace(
      `${window.location.origin}/${safeLocale}/properties/${propId}`
    )
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

/** クエリの liff.state のみ（OAuth の state と混同しない） */
function readLiffStateQueryParamRaw(): string | null {
  if (typeof window === 'undefined') return null
  try {
    const s = new URLSearchParams(window.location.search).get('liff.state')
    return s && s.trim().length > 0 ? s.trim() : null
  } catch {
    return null
  }
}

/**
 * OAuth code が無いときはトークン交換不要。Chrome 等で liff.init が固まるのを避け、URL の liff.state だけで物件へ飛ばす。
 */
function redirectFromUrlQueryLiffState(fallbackLocale: string): boolean {
  if (typeof window === 'undefined') return false
  if (hasOAuthCodeInUrl()) return false
  const raw = readLiffStateQueryParamRaw()
  if (!raw) return false
  const parsed = parseLiffState(raw, fallbackLocale)
  if (!parsed) return false
  const { safeLocale, propId } = parsed
  try {
    flowStorageSet('inquiry_liff_ready_pid', propId)
    flowStorageRemove('inquiry_resume_line')
    flowStorageRemove('inquiry_resume_property_id')
    flowStorageRemove('inquiry_resume_locale')
    sessionStorage.removeItem(BRIDGE_RELOAD_FLAG)
  } catch {
    /* */
  }
  window.location.replace(`${window.location.origin}/${safeLocale}/properties/${propId}`)
  return true
}

/**
 * 自サイトのクエリの liff.state、および LINE Login コールバックの state（環境によってはこちらに渡る）。
 */
function readLiffStateFromPageUrl(fallbackLocale: string): string | null {
  if (typeof window === 'undefined') return null
  try {
    const q = new URLSearchParams(window.location.search)
    const liff = q.get('liff.state')
    if (liff && liff.length > 0) return liff
    const oauthState = q.get('state')?.trim()
    if (oauthState) {
      if (parseLiffState(oauthState, fallbackLocale)) return oauthState
      try {
        const dec = decodeURIComponent(oauthState)
        if (dec !== oauthState && parseLiffState(dec, fallbackLocale)) return dec
      } catch {
        /* */
      }
    }
  } catch {
    /* */
  }
  return null
}

/**
 * @line/liff 2.x の npm バンドルには getState が無い環境がある（呼ぶと getState is not a function）。
 * ある場合のみ使い、無ければ URL / 共有ストレージ（session + local）に任せる。
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
    const pid = flowStorageGet('inquiry_resume_property_id')
    if (pid && PROP_UUID.test(pid)) {
      const locRaw = flowStorageGet('inquiry_resume_locale')
      const loc = locRaw && LOCALES.has(locRaw) ? locRaw : fallbackLocaleFromPath
      return `/${loc}/properties/${pid}`
    }
    const pend = readPendingLineInquiryForBridge()
    if (pend) return `/${pend.locale}/properties/${pend.propertyId}`
  } catch {
    return null
  }
  return null
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

  /** 描画前に URL だけで戻れるなら LIFF を起動しない（Chrome で init 待ちで固まる対策） */
  useLayoutEffect(() => {
    if (typeof window === 'undefined') return
    redirectFromUrlQueryLiffState(safeFallback)
  }, [safeFallback])

  useEffect(() => {
    const liffId = process.env.NEXT_PUBLIC_LINE_LIFF_ID?.trim()
    if (!liffId) {
      setMsg('LIFF ID が設定されていません（本番の環境変数 NEXT_PUBLIC_LINE_LIFF_ID）。')
      setUiKind('action')
      return
    }

    const effectGen = ++inquiryBridgeEffectGeneration
    const myGen = effectGen
    let cancelled = false
    let flowCompleted = false
    let failsafeId: ReturnType<typeof setInterval> | null = null
    const markFlowDone = () => {
      flowCompleted = true
      if (failsafeId != null) {
        clearInterval(failsafeId)
        failsafeId = null
      }
    }
    const startWall = typeof window !== 'undefined' ? Date.now() : 0

    if (typeof window !== 'undefined') {
      failsafeId = window.setInterval(() => {
        if (cancelled || flowCompleted || inquiryBridgeEffectGeneration !== myGen) return
        if (Date.now() - startWall < BRIDGE_FAILSAFE_MS) return
        markFlowDone()
        clearBridgeLiffInitSlot()
        if (redirectFromSessionResume(safeFallback)) {
          return
        }
        try {
          if (hasOAuthCodeInUrl() && !sessionStorage.getItem(BRIDGE_RELOAD_FLAG)) {
            sessionStorage.setItem(BRIDGE_RELOAD_FLAG, '1')
            window.location.reload()
            return
          }
        } catch {
          /* */
        }
        setUiKind('action')
        setMsg(
          'LINE との接続が完了しませんでした（ブラウザをバックグラウンドにしたままだと進まないことがあります）。\n\n' +
            '「問い合わせ中の物件ページに戻る」を押すか、**ページを閉じて**もう一度物件ページから「LINEで受け取る」→確定をお試しください。'
        )
      }, 800)
    }

    ;(async () => {
      if (typeof window !== 'undefined' && !hasOAuthCodeInUrl()) {
        if (redirectFromUrlQueryLiffState(safeFallback)) {
          markFlowDone()
          return
        }
        if (redirectFromSessionResume(safeFallback)) {
          markFlowDone()
          return
        }
      }
      try {
        const liff = (await import('@line/liff')).default
        try {
          await Promise.race([
            initLiffOnceForBridge(liff, liffId),
            new Promise<never>((_, rej) =>
              setTimeout(() => rej(new Error('LIFF_INIT_TIMEOUT')), LIFF_INIT_MS)
            ),
          ])
        } catch (initErr) {
          if (initErr instanceof Error && initErr.message === 'LIFF_INIT_TIMEOUT') {
            clearBridgeLiffInitSlot()
            if (typeof window !== 'undefined') {
              if (redirectFromSessionResume(safeFallback)) {
                markFlowDone()
                return
              }
              try {
                if (hasOAuthCodeInUrl() && !sessionStorage.getItem(BRIDGE_RELOAD_FLAG)) {
                  sessionStorage.setItem(BRIDGE_RELOAD_FLAG, '1')
                  markFlowDone()
                  window.location.reload()
                  return
                }
              } catch {
                /* */
              }
            }
          }
          throw initErr
        }
        if (cancelled || effectGen !== inquiryBridgeEffectGeneration) return

        const fromSdk = readLiffStateFromSdk(liff)
        let state: string | undefined = fromSdk
        if (!state) {
          const fromPage = readLiffStateFromPageUrl(safeFallback)
          if (fromPage) state = fromPage
        }
        if (!state) {
          const synthetic = buildSyntheticStateFromStorage(safeFallback)
          if (synthetic) state = synthetic
        }
        if (!state) {
          if (effectGen !== inquiryBridgeEffectGeneration) return
          markFlowDone()
          setUiKind('action')
          setMsg(
            '問い合わせの続きが見つかりませんでした（この画面は完了ではありません）。' +
              ' LINE ログインのコールバックでは URL に liff.state が付かないため、同じブラウザで先に物件ページから「LINEで受け取る」→確定まで進んでください。' +
              ' 別アプリで開いている・プライベートモード・別端末の場合は保存情報が使えません。'
          )
          return
        }
        const parsed = parseLiffState(state, safeFallback)
        if (!parsed) {
          if (effectGen !== inquiryBridgeEffectGeneration) return
          markFlowDone()
          setUiKind('action')
          setMsg('リンクが無効です。物件ページからやり直してください。')
          return
        }
        const { safeLocale, propId } = parsed

        try {
          flowStorageSet('inquiry_liff_ready_pid', propId)
          flowStorageRemove('inquiry_resume_line')
          flowStorageRemove('inquiry_resume_property_id')
          flowStorageRemove('inquiry_resume_locale')
          sessionStorage.removeItem(BRIDGE_RELOAD_FLAG)
        } catch {
          /* private mode */
        }

        markFlowDone()
        const path = `/${safeLocale}/properties/${propId}`
        window.location.replace(`${window.location.origin}${path}`)
      } catch (e) {
        console.error('[line-inquiry-bridge]', e)
        if (!cancelled && effectGen === inquiryBridgeEffectGeneration) {
          clearBridgeLiffInitSlot()
          if (typeof window !== 'undefined' && redirectFromSessionResume(safeFallback)) {
            markFlowDone()
            return
          }
          markFlowDone()
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
      inquiryBridgeEffectGeneration += 1
      if (failsafeId != null) {
        clearInterval(failsafeId)
        failsafeId = null
      }
    }
  }, [safeFallback])

  const escapeHref = resumeHref ?? `/${safeFallback}/properties`

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-6 bg-slate-50 px-6 text-center">
      <p className="max-w-md text-sm font-medium leading-relaxed text-navy-secondary whitespace-pre-line">
        {msg}
      </p>
      {uiKind === 'loading' ? (
        <p className="max-w-md text-xs text-slate-500">
          <Link href={escapeHref} className="font-bold text-navy-primary underline underline-offset-2">
            しばらく進まないときはこちら（物件ページへ戻る）
          </Link>
        </p>
      ) : null}
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
