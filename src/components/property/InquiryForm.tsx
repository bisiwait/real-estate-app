'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Send, Loader2, CheckCircle, ChevronDown, ChevronUp, Lock } from 'lucide-react'
import { getErrorMessage } from '@/lib/utils/errors'
import {
  formatInquirySubmitError,
  formatLiffError,
  isLiffAccessTokenRevokedError,
} from '@/lib/utils/inquiry-errors'
import { clsx } from 'clsx'
import { useDeviceType } from '@/hooks/useDeviceType'
import {
  postLineInquiryReturnPath,
  clearLineInquiryPendingCookie,
} from '@/lib/inquiry-line-return-cookie'
import type { LineInquiryPendingPayload } from '@/lib/inquiry-line-pending-cookie'
import { flowStorageGet, flowStorageSet, flowStorageRemove } from '@/lib/inquiry-line-flow-storage'

const PENDING_LINE_INQUIRY_KEY = 'inquiry_line_pending_v1'
const AUTO_SUBMIT_LOCK_PREFIX = 'inquiry_line_auto_'
/** リロードや LIFF 遷移で非同期が中断すると '1' ロックが残り自動送信が永久停止するため、時刻ベースで失効させる */
const AUTO_SUBMIT_LOCK_TTL_MS = 120_000

function isAutoSubmitLockHeld(lockKey: string): boolean {
  try {
    const v = flowStorageGet(lockKey)
    if (!v) return false
    const ts = parseInt(v, 10)
    if (!Number.isFinite(ts)) {
      flowStorageRemove(lockKey)
      return false
    }
    if (Date.now() - ts > AUTO_SUBMIT_LOCK_TTL_MS) {
      flowStorageRemove(lockKey)
      return false
    }
    return true
  } catch {
    return false
  }
}

function armAutoSubmitLock(lockKey: string): void {
  flowStorageSet(lockKey, String(Date.now()))
}

/** 同一タブで OAuth 復帰しやすくする（別タブを開きやすい withLoginOnExternalBrowser: true は使わない） */
function liffLoginInPlace(liff: {
  login: (config?: { redirectUri?: string }) => void
}): void {
  if (typeof window !== 'undefined') {
    const href = window.location.href.split('#')[0]
    if (href) {
      try {
        liff.login({ redirectUri: href })
        return
      } catch {
        /* Endpoint URL と redirectUri の整合で失敗する場合 */
      }
    }
  }
  liff.login()
}

/** LINE 内で liff.login() 直後: ブリッジを通っていなくても自動送信 effect を走らせる */
const LINE_OAUTH_RESUME_PID_KEY = 'inquiry_line_after_oauth_pid'
const PENDING_LINE_MAX_MS = 15 * 60 * 1000

/** false のとき返信方法 UI を出さず、問い合わせは常にメール希望として保存する（スマホの LINE 問い合わせも無効になる） */
const SHOW_INQUIRY_REPLY_CHANNEL = true

/** DB 保存後、送信者宛の受付控えメール（Webhook に依存しない。inquiries は RLS で送信者が SELECT できないため内容で送る） */
async function requestInquiryConfirmationEmail(
  supabase: ReturnType<typeof createClient>,
  payload: {
    property_id: string
    locale: string
    inquirer_email: string
    inquirer_name: string
    message: string
  }
) {
  try {
    const {
      data: { session },
    } = await supabase.auth.getSession()
    const headers: Record<string, string> = { 'Content-Type': 'application/json' }
    if (session?.access_token) {
      headers.Authorization = `Bearer ${session.access_token}`
    }
    const res = await fetch('/api/inquiries/confirm-email', {
      method: 'POST',
      credentials: 'include',
      headers,
      body: JSON.stringify(payload),
    })
    if (!res.ok) {
      const j = (await res.json().catch(() => ({}))) as { error?: string }
      console.warn('[InquiryForm] confirm-email failed', res.status, j.error || res.statusText)
    }
  } catch (e) {
    console.warn('[InquiryForm] confirm-email', e)
  }
}

/** 画面上で失敗箇所を特定しやすくする（setError に加えて alert） */
function inquiryDebugAlert(stage: string, message: string) {
  if (typeof window === 'undefined') return
  try {
    window.alert(`[お問い合わせ / ${stage}]\n\n${message}`)
  } catch {
    /* */
  }
}

/** LIFF getProfile().userId を DB 用に正規化（空は null） */
function normalizeLineMessagingUserId(raw: string | null | undefined): string | null {
  const t = typeof raw === 'string' ? raw.trim() : ''
  return t.length > 0 ? t : null
}

/**
 * inquiries INSERT は RLS で authenticated のみ許可。LIFF 復帰直後にセッションが無いと保存できない。
 */
async function ensureSupabaseSessionForInquiry(
  sb: ReturnType<typeof createClient>
): Promise<{ ok: true } | { ok: false; message: string }> {
  const {
    data: { session },
  } = await sb.auth.getSession()
  if (session?.user?.id) return { ok: true }
  await sb.auth.refreshSession()
  const {
    data: { session: s2 },
  } = await sb.auth.getSession()
  if (s2?.user?.id) return { ok: true }
  return {
    ok: false,
    message:
      'ログインセッションが有効ではありません（Supabase）。お手数ですが一度ログアウトして再ログインのうえ、もう一度送信してください。\n\n※LINE 連携のあとセッションが切れていると、データベースへの保存が拒否（RLS）されます。',
  }
}

type PendingLineInquiry = LineInquiryPendingPayload

function readPendingLineInquiry(): PendingLineInquiry | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = flowStorageGet(PENDING_LINE_INQUIRY_KEY)
    if (!raw) return null
    const o = JSON.parse(raw) as PendingLineInquiry
    if (o.v !== 1 || !o.propertyId || typeof o.at !== 'number') return null
    if (Date.now() - o.at > PENDING_LINE_MAX_MS) {
      flowStorageRemove(PENDING_LINE_INQUIRY_KEY)
      return null
    }
    try {
      sessionStorage.setItem(PENDING_LINE_INQUIRY_KEY, raw)
    } catch {
      /* */
    }
    return o
  } catch {
    return null
  }
}

function clearPendingLineInquiry() {
  flowStorageRemove(PENDING_LINE_INQUIRY_KEY)
  void clearLineInquiryPendingCookie()
}

type ObtainLineUserIdResult =
  | { ok: true; userId: string }
  | { ok: false; reason: 'login' }
  | { ok: false; reason: 'error'; message: string }

type LiffLineProbe =
  | { kind: 'ok'; userId: string }
  | { kind: 'need_handoff' }
  | { kind: 'need_login' }
  | { kind: 'error'; message: string }

async function clearInvalidLiffSession(liff: { logout?: () => Promise<void> }): Promise<void> {
  try {
    if (typeof liff.logout === 'function') await liff.logout()
  } catch {
    /* */
  }
}

type LiffFriendshipCapable = {
  isInClient: () => boolean
  isApiAvailable?: (apiName: string) => boolean
  getFriendship?: () => Promise<{ friendFlag: boolean }>
  requestFriendship?: () => Promise<void>
  getProfile: () => Promise<{ userId?: string | null }>
}

/**
 * LINE アプリ内 WebView では未友だち時に requestFriendship を先に出し、続けて getProfile する。
 * 外部ブラウザでは友だち追加は LIFF の botPrompt（コンソールで aggressive 推奨）に依存。
 */
async function getLineUserIdAfterFriendshipIfNeeded(liff: LiffFriendshipCapable): Promise<string> {
  let calledRequestFriendship = false
  try {
    if (typeof liff.isApiAvailable === 'function' && liff.isApiAvailable('getFriendship') && liff.getFriendship) {
      const { friendFlag } = await liff.getFriendship()
      if (
        !friendFlag &&
        liff.isInClient() &&
        liff.isApiAvailable('requestFriendship') &&
        typeof liff.requestFriendship === 'function'
      ) {
        try {
          await liff.requestFriendship()
          calledRequestFriendship = true
        } catch {
          /* キャンセル等 */
        }
      }
    }
  } catch {
    /* getFriendship 非対応環境 */
  }
  if (calledRequestFriendship) {
    await new Promise((r) => setTimeout(r, 600))
  }
  const maxAttempts = calledRequestFriendship ? 5 : 1
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      const profile = await liff.getProfile()
      const uid = normalizeLineMessagingUserId(profile?.userId)
      if (uid) return uid
    } catch (e) {
      if (attempt === maxAttempts - 1) throw e
    }
    if (attempt < maxAttempts - 1) {
      await new Promise((r) => setTimeout(r, 450))
    }
  }
  throw new Error('LINE_USER_ID_EMPTY')
}

/**
 * handoff 前に呼ぶ。既に LINE にログイン済みなら userId のみ返し、毎回のブリッジ＆「ログインしました」相当を避ける。
 */
async function probeLiffLineUserId(liffId: string): Promise<LiffLineProbe> {
  const liff = (await import('@line/liff')).default
  try {
    await liff.init({ liffId, withLoginOnExternalBrowser: false })
  } catch (e: unknown) {
    return { kind: 'error', message: formatLiffError(e) || getErrorMessage(e) }
  }
  if (liff.isLoggedIn()) {
    try {
      const uid = await getLineUserIdAfterFriendshipIfNeeded(liff)
      return { kind: 'ok', userId: uid }
    } catch (e: unknown) {
      if (e instanceof Error && e.message === 'LINE_USER_ID_EMPTY') {
        return {
          kind: 'error',
          message:
            'LINE ユーザーIDを取得できませんでした。LIFF の profile スコープを確認してください。',
        }
      }
      if (isLiffAccessTokenRevokedError(e)) {
        await clearInvalidLiffSession(liff)
        if (liff.isLoggedIn()) {
          return {
            kind: 'error',
            message:
              'LINE のログイン状態が古くなっています。ブラウザのデータを消せない場合は、しばらく時間をおいてから再度お試しください。',
          }
        }
        if (liff.isInClient()) return { kind: 'need_login' }
        return { kind: 'need_handoff' }
      }
      return { kind: 'error', message: formatLiffError(e) || getErrorMessage(e) }
    }
  }
  if (liff.isInClient()) {
    return { kind: 'need_login' }
  }
  return { kind: 'need_handoff' }
}

/**
 * ブリッジ通過後（inquiry_liff_ready_pid 済み）に LIFF で userId を取得。
 * 未ログイン時は liff.login()（同一タブ復帰を優先）。
 */
async function obtainLineUserIdForInquiry(
  liffId: string,
  propertyId: string,
  locale: string,
  pendingForCookie: PendingLineInquiry | null
): Promise<ObtainLineUserIdResult> {
  const liff = (await import('@line/liff')).default
  try {
    await liff.init({ liffId, withLoginOnExternalBrowser: false })
  } catch (firstInit: unknown) {
    return {
      ok: false,
      reason: 'error',
      message: formatLiffError(firstInit) || getErrorMessage(firstInit),
    }
  }

  if (!liff.isLoggedIn()) {
    /**
     * 外部ブラウザでも liff.login() で OAuth 復帰できる。ここで handoff へ再度 assign すると
     * ブリッジ→物件→未ログイン→handoff のループになり、DB 保存まで到達しない。
     * 初回の「LINEで受け取る」は handleSubmit が handoff へ飛ばす（liff_ready 前のみ）。
     */
    await postLineInquiryReturnPath(
      `/${locale}/properties/${propertyId}`,
      pendingForCookie ?? undefined
    )
    try {
      flowStorageRemove(`${AUTO_SUBMIT_LOCK_PREFIX}${propertyId}`)
      flowStorageSet(LINE_OAUTH_RESUME_PID_KEY, propertyId)
    } catch {
      /* */
    }
    liffLoginInPlace(liff)
    return { ok: false, reason: 'login' }
  }

  try {
    const uid = await getLineUserIdAfterFriendshipIfNeeded(liff)
    try {
      flowStorageRemove(LINE_OAUTH_RESUME_PID_KEY)
    } catch {
      /* */
    }
    return { ok: true, userId: uid }
  } catch (profileErr: unknown) {
    if (
      profileErr instanceof Error &&
      profileErr.message === 'LINE_USER_ID_EMPTY'
    ) {
      return {
        ok: false,
        reason: 'error',
        message:
          'LINE ユーザーIDを取得できませんでした。LIFF の profile スコープを確認してください。',
      }
    }
    if (isLiffAccessTokenRevokedError(profileErr)) {
      await clearInvalidLiffSession(liff)
      if (!liff.isLoggedIn()) {
        await postLineInquiryReturnPath(
          `/${locale}/properties/${propertyId}`,
          pendingForCookie ?? undefined
        )
        try {
          flowStorageRemove(`${AUTO_SUBMIT_LOCK_PREFIX}${propertyId}`)
          flowStorageSet(LINE_OAUTH_RESUME_PID_KEY, propertyId)
        } catch {
          /* */
        }
        liffLoginInPlace(liff)
        return { ok: false, reason: 'login' }
      }
    }
    return {
      ok: false,
      reason: 'error',
      message: formatLiffError(profileErr) || getErrorMessage(profileErr),
    }
  }
}

export type InquiryContactPrefill = {
  full_name: string | null
  email: string | null
  phone?: string | null
  line_id?: string | null
}

interface InquiryFormProps {
  propertyId: string
  propertyName: string
  dict: any
  isLoggedIn: boolean
  onRequireAuth?: () => void
  contactPrefill?: InquiryContactPrefill | null
  /** 問い合わせ完了後の公式LINE友だち追加URL */
  officialLineAddFriendUrl: string
}

export default function InquiryForm({
  propertyId,
  propertyName,
  dict,
  isLoggedIn,
  onRequireAuth,
  contactPrefill,
  officialLineAddFriendUrl,
}: InquiryFormProps) {
  const routeParams = useParams()
  const locale = (routeParams?.locale as string) || 'jp'

  const defaultMessage =
    dict.property.inquiry_default_message?.replace('{propertyName}', propertyName) ||
    `Regarding "${propertyName}", please give me more details.`

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    message: defaultMessage,
  })
  const [preferredReplyChannel, setPreferredReplyChannel] = useState<'email' | 'line'>('email')
  const { isSmartphone } = useDeviceType()
  const liffId = process.env.NEXT_PUBLIC_LINE_LIFF_ID?.trim() || undefined
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isOpen, setIsOpen] = useState(false)
  const [isDesktop, setIsDesktop] = useState(false)
  const [contactSendConsent, setContactSendConsent] = useState(false)
  const [submitPhase, setSubmitPhase] = useState<'idle' | 'armed'>('idle')
  const confirmTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  /** LINE 自動送信の二重実行防止（await 中に別 effect が走る対策） */
  const lineAutoSubmitInFlightRef = useRef(false)
  /** LINE エリア下の「公式LINE登録」から確定した場合、同意チェックなしで送信を許可 */
  const lineAreaSubmitWithoutConsentRef = useRef(false)
  /** タブが LINE 等に隠れてから戻ったあと自動送信を再試行 */
  const [lineAutoResumeNonce, setLineAutoResumeNonce] = useState(0)

  const clearConfirmTimer = useCallback(() => {
    if (confirmTimerRef.current) {
      clearTimeout(confirmTimerRef.current)
      confirmTimerRef.current = null
    }
  }, [])

  useEffect(() => () => clearConfirmTimer(), [clearConfirmTimer])

  useEffect(() => {
    if (!contactSendConsent) {
      lineAreaSubmitWithoutConsentRef.current = false
      setSubmitPhase('idle')
      clearConfirmTimer()
    }
  }, [contactSendConsent, clearConfirmTimer])

  const armSubmitConfirm = useCallback(() => {
    clearConfirmTimer()
    setSubmitPhase('armed')
    confirmTimerRef.current = setTimeout(() => {
      setSubmitPhase('idle')
      confirmTimerRef.current = null
    }, 3000)
  }, [clearConfirmTimer])

  useEffect(() => {
    setIsDesktop(window.innerWidth >= 1024)
    const handleResize = () => setIsDesktop(window.innerWidth >= 1024)
    window.addEventListener('resize', handleResize)

    const handleOpenEvent = () => {
      if (!isLoggedIn) {
        onRequireAuth?.()
        return
      }
      setIsOpen(true)
    }
    window.addEventListener('open-inquiry-form', handleOpenEvent)

    return () => {
      window.removeEventListener('resize', handleResize)
      window.removeEventListener('open-inquiry-form', handleOpenEvent)
    }
  }, [isLoggedIn, onRequireAuth])

  useEffect(() => {
    if (!isLoggedIn || !contactPrefill) return
    setFormData((prev) => ({
      ...prev,
      name: contactPrefill.full_name ?? prev.name,
      email: contactPrefill.email ?? prev.email,
    }))
  }, [isLoggedIn, contactPrefill])

  useEffect(() => {
    if (!SHOW_INQUIRY_REPLY_CHANNEL) {
      setPreferredReplyChannel('email')
      return
    }
    if (!isSmartphone) {
      try {
        const pending = readPendingLineInquiry()
        if (pending?.propertyId.toLowerCase() === propertyId.toLowerCase()) return
        if (flowStorageGet('inquiry_liff_ready_pid')?.toLowerCase() === propertyId.toLowerCase())
          return
      } catch {
        /* */
      }
      setPreferredReplyChannel('email')
    }
  }, [isSmartphone, propertyId])

  /** sessionStorage 単体では別タブで消えるため、httpOnly からも下書きを戻す */
  useEffect(() => {
    if (!SHOW_INQUIRY_REPLY_CHANNEL) return
    if (!isLoggedIn) return
    if (readPendingLineInquiry()) return

    let cancelled = false
    void (async () => {
      try {
        const res = await fetch(`${window.location.origin}/api/inquiry/line-pending-restore`, {
          credentials: 'same-origin',
        })
        if (!res.ok || cancelled) return
        const data = (await res.json()) as { pending?: PendingLineInquiry | null }
        const p = data.pending
        if (!p || p.propertyId.toLowerCase() !== propertyId.toLowerCase()) return
        try {
          flowStorageSet(PENDING_LINE_INQUIRY_KEY, JSON.stringify(p))
        } catch {
          return
        }
        setLineAutoResumeNonce((n) => n + 1)
      } catch {
        /* */
      }
    })()
    return () => {
      cancelled = true
    }
  }, [isLoggedIn, propertyId])

  /** LINE から liff.line.me 経由で戻ったあと「LINEで受け取る」を復元（スマートフォンのみ） */
  useEffect(() => {
    if (!SHOW_INQUIRY_REPLY_CHANNEL) return
    if (!isLoggedIn) return
    if (!isSmartphone) {
      try {
        const pending = readPendingLineInquiry()
        if (pending?.propertyId.toLowerCase() === propertyId.toLowerCase()) return
        if (flowStorageGet('inquiry_liff_ready_pid')?.toLowerCase() === propertyId.toLowerCase())
          return
        flowStorageRemove('inquiry_resume_line')
        flowStorageRemove('inquiry_resume_property_id')
        flowStorageRemove('inquiry_resume_locale')
      } catch {
        /* */
      }
      return
    }
    try {
      const flag = flowStorageGet('inquiry_resume_line')
      const pid = flowStorageGet('inquiry_resume_property_id')
      if (flag === '1' && pid?.toLowerCase() === propertyId.toLowerCase()) {
        flowStorageRemove('inquiry_resume_line')
        flowStorageRemove('inquiry_resume_property_id')
        flowStorageRemove('inquiry_resume_locale')
        setPreferredReplyChannel('line')
        setIsOpen(true)
        requestAnimationFrame(() => {
          document.getElementById('inquiry-form-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
        })
      }
    } catch {
      /* private mode 等 */
    }
  }, [isLoggedIn, propertyId, isSmartphone])

  /** LINE 連携後にブラウザへ戻ったタイミングで、保留中の自動送信をもう一度試す */
  useEffect(() => {
    if (!SHOW_INQUIRY_REPLY_CHANNEL || !isLoggedIn) return
    let wasHidden = document.visibilityState === 'hidden'
    const bump = () => {
      const pending = readPendingLineInquiry()
      if (
        !pending ||
        pending.propertyId.toLowerCase() !== propertyId.toLowerCase()
      )
        return
      let ready = false
      try {
        ready =
          flowStorageGet('inquiry_liff_ready_pid')?.toLowerCase() === propertyId.toLowerCase()
      } catch {
        return
      }
      if (!ready) return
      if (lineAutoSubmitInFlightRef.current) return
      try {
        flowStorageRemove(`${AUTO_SUBMIT_LOCK_PREFIX}${propertyId}`)
      } catch {
        /* */
      }
      setLineAutoResumeNonce((n) => n + 1)
    }
    const onVis = () => {
      const hidden = document.visibilityState === 'hidden'
      if (wasHidden && !hidden) bump()
      wasHidden = hidden
    }
    document.addEventListener('visibilitychange', onVis)
    return () => document.removeEventListener('visibilitychange', onVis)
  }, [isLoggedIn, propertyId])

  useEffect(() => {
    if (!SHOW_INQUIRY_REPLY_CHANNEL) return
    if (preferredReplyChannel !== 'line' || !liffId) return
    void import('@line/liff').catch(() => {})
  }, [preferredReplyChannel, liffId])

  const supabase = createClient()
  const p = dict.property ?? {}

  /** ブリッジから戻ったあと、保存済みの1回目の確定内容で自動送信（ユーザーに2回押させない） */
  useEffect(() => {
    if (!SHOW_INQUIRY_REPLY_CHANNEL) return
    if (!isLoggedIn || !liffId) return

    const pending = readPendingLineInquiry()
    if (!pending || pending.propertyId.toLowerCase() !== propertyId.toLowerCase()) return

    let liffReady = false
    let oauthResume = false
    try {
      liffReady =
        flowStorageGet('inquiry_liff_ready_pid')?.toLowerCase() === propertyId.toLowerCase()
      oauthResume =
        flowStorageGet(LINE_OAUTH_RESUME_PID_KEY)?.toLowerCase() === propertyId.toLowerCase()
    } catch {
      return
    }
    if (!liffReady && !oauthResume) return

    const lockKey = `${AUTO_SUBMIT_LOCK_PREFIX}${propertyId}`
    try {
      if (isAutoSubmitLockHeld(lockKey)) return
      armAutoSubmitLock(lockKey)
    } catch {
      return
    }

    if (lineAutoSubmitInFlightRef.current) {
      try {
        flowStorageRemove(lockKey)
      } catch {
        /* */
      }
      return
    }
    lineAutoSubmitInFlightRef.current = true

    const liffHint =
      p.inquiry_liff_endpoint_hint ??
      'LINE Developers の LIFF で「エンドポイント URL」を、いま表示しているページの URL（https・www の有無・パスまで）と一致させてください。'
    const liffCallbackHint =
      p.inquiry_liff_callback_url_hint ??
      'LINEログインチャネル「コールバック URL」に、いまのページのオリジンを登録してください。'
    const currentPageUrl =
      typeof window !== 'undefined' ? `${window.location.origin}${window.location.pathname}` : ''

    setPreferredReplyChannel('line')
    setIsOpen(true)
    setFormData({
      name: pending.name,
      email: pending.email,
      message: pending.message,
    })
    setLoading(true)
    setError(null)

    ;(async () => {
      try {
      await new Promise((r) => setTimeout(r, 450))
      const sb = createClient()
      const lastInquiry = localStorage.getItem(`last_inquiry_${propertyId}`)
      if (lastInquiry && Date.now() - parseInt(lastInquiry) < 30000) {
        try {
          flowStorageRemove(lockKey)
          flowStorageRemove(LINE_OAUTH_RESUME_PID_KEY)
        } catch {
          /* */
        }
        clearPendingLineInquiry()
        const rateMsg = '送信の間隔が短すぎます。しばらく待ってから再度お試しください。'
        inquiryDebugAlert('送信間隔（自動送信）', rateMsg)
        setError(rateMsg)
        setLoading(false)
        return
      }

      const isUuid =
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(propertyId)

      if (!isUuid) {
        clearPendingLineInquiry()
        try {
          flowStorageRemove(lockKey)
          flowStorageRemove('inquiry_liff_ready_pid')
          flowStorageRemove(LINE_OAUTH_RESUME_PID_KEY)
        } catch {
          /* */
        }
        localStorage.setItem(`last_inquiry_${propertyId}`, Date.now().toString())
        setLoading(false)
        setSuccess(true)
        return
      }

      let lineResult = await obtainLineUserIdForInquiry(
        liffId,
        propertyId,
        pending.locale,
        pending
      )
      if (!lineResult.ok && lineResult.reason === 'error') {
        await new Promise((r) => setTimeout(r, 1200))
        lineResult = await obtainLineUserIdForInquiry(
          liffId,
          propertyId,
          pending.locale,
          pending
        )
      }
      if (!lineResult.ok) {
        if (lineResult.reason === 'login') {
          try {
            flowStorageRemove(lockKey)
          } catch {
            /* */
          }
          setLoading(false)
          return
        }
        clearPendingLineInquiry()
        try {
          flowStorageRemove(lockKey)
          flowStorageRemove(LINE_OAUTH_RESUME_PID_KEY)
        } catch {
          /* */
        }
        const errText = `${lineResult.message}\n\n${liffHint}${currentPageUrl ? `\n\n現在のページ: ${currentPageUrl}` : ''}\n\n${liffCallbackHint}`
        console.error('[InquiryForm] LINE auto-submit obtainLineUserIdForInquiry', lineResult)
        inquiryDebugAlert('LINE（自動送信）', errText)
        setError(errText)
        setLoading(false)
        return
      }

      const lineUserIdForDb = lineResult.userId

      const sessionCheck = await ensureSupabaseSessionForInquiry(sb)
      if (!sessionCheck.ok) {
        clearPendingLineInquiry()
        try {
          flowStorageRemove(lockKey)
          flowStorageRemove(LINE_OAUTH_RESUME_PID_KEY)
        } catch {
          /* */
        }
        console.error('[InquiryForm] auto-submit no session', sessionCheck.message)
        inquiryDebugAlert('認証（RLS・自動送信）', sessionCheck.message)
        setError(sessionCheck.message)
        setLoading(false)
        return
      }

      const emailTrim = pending.email.trim()
      const nameTrim = pending.name.trim()
      const messageTrim = pending.message.trim()
      const { error: submitError } = await sb.from('inquiries').insert([
        {
          property_id: propertyId,
          inquirer_name: nameTrim,
          inquirer_email: emailTrim,
          email: emailTrim,
          inquirer_phone: null,
          message: messageTrim,
          preferred_reply_channel: 'line',
          line_user_id: lineUserIdForDb,
        },
      ])

      if (submitError) {
        clearPendingLineInquiry()
        try {
          flowStorageRemove(lockKey)
          flowStorageRemove(LINE_OAUTH_RESUME_PID_KEY)
        } catch {
          /* */
        }
        const formatted = formatInquirySubmitError(submitError)
        console.error('[InquiryForm] auto-submit insert failed', submitError)
        inquiryDebugAlert('DB保存（inquiries・自動送信）', formatted)
        setError(formatted)
        setLoading(false)
        return
      }

      localStorage.setItem(`last_inquiry_${propertyId}`, Date.now().toString())
      clearPendingLineInquiry()
      try {
        flowStorageRemove(lockKey)
          flowStorageRemove('inquiry_liff_ready_pid')
          flowStorageRemove(LINE_OAUTH_RESUME_PID_KEY)
      } catch {
        /* */
      }
      void requestInquiryConfirmationEmail(sb, {
        property_id: propertyId,
        locale,
        inquirer_email: emailTrim,
        inquirer_name: nameTrim,
        message: messageTrim,
      })
      setSuccess(true)
      setLoading(false)
      } catch (unexpected: unknown) {
        const formatted = formatInquirySubmitError(unexpected)
        console.error('[InquiryForm] auto-submit unexpected', unexpected)
        inquiryDebugAlert('自動送信・例外', formatted)
        clearPendingLineInquiry()
        try {
          flowStorageRemove(lockKey)
          flowStorageRemove(LINE_OAUTH_RESUME_PID_KEY)
        } catch {
          /* */
        }
        setError(formatted)
        setLoading(false)
      } finally {
        lineAutoSubmitInFlightRef.current = false
        try {
          flowStorageRemove(lockKey)
        } catch {
          /* */
        }
      }
    })()
    return () => {
      lineAutoSubmitInFlightRef.current = false
      try {
        flowStorageRemove(`${AUTO_SUBMIT_LOCK_PREFIX}${propertyId}`)
      } catch {
        /* */
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- dict 全体を依存に入れると毎レンダーで再実行される
  }, [isLoggedIn, propertyId, locale, liffId, lineAutoResumeNonce])

  const innerVisible = !isLoggedIn || isOpen || isDesktop

  const fieldLabelClass =
    'mb-1.5 ml-1 block text-[10px] font-normal uppercase tracking-widest text-slate-400'
  const fieldInputClass =
    'w-full rounded-xl border border-slate-100 bg-slate-50 px-4 py-3.5 text-sm outline-none transition-all focus:ring-2 focus:ring-navy-primary'

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!isLoggedIn) {
      onRequireAuth?.()
      return
    }
    if (submitPhase !== 'armed') {
      return
    }
    if (!contactSendConsent && !lineAreaSubmitWithoutConsentRef.current) {
      return
    }
    lineAreaSubmitWithoutConsentRef.current = false

    const lastInquiry = localStorage.getItem(`last_inquiry_${propertyId}`)
    if (lastInquiry && Date.now() - parseInt(lastInquiry) < 30000) {
      const rateMsg = '送信の間隔が短すぎます。しばらく待ってから再度お試しください。'
      inquiryDebugAlert('送信間隔', rateMsg)
      setError(rateMsg)
      setSubmitPhase('idle')
      clearConfirmTimer()
      return
    }

    setLoading(true)
    setError(null)

    const effectiveChannel: 'email' | 'line' =
      SHOW_INQUIRY_REPLY_CHANNEL && isSmartphone ? preferredReplyChannel : 'email'
    if (SHOW_INQUIRY_REPLY_CHANNEL && !isSmartphone && preferredReplyChannel === 'line') {
      setError(
        p.inquiry_line_blocked_desktop ??
          'PC・タブレットでは「LINEで受け取る」はご利用いただけません。メールでの返信のみとなります。'
      )
      setPreferredReplyChannel('email')
      setSubmitPhase('idle')
      clearConfirmTimer()
      setLoading(false)
      return
    }

    let lineUid: string | null = null

    const liffHint =
      p.inquiry_liff_endpoint_hint ??
      'LINE Developers の LIFF で「エンドポイント URL」を、いま表示しているページの URL（https・www の有無・パスまで）と一致させてください。Vercel の本番ドメインと LIFF の登録 URL が違うとこのエラーになります。'

    const liffCallbackHint =
      p.inquiry_liff_callback_url_hint ??
      'LINEログインチャネル「チャネル基本設定」の「コールバック URL」に、いまのページのオリジン（例: https://chonburihome.com ）を登録してください。未登録だとログイン後に失敗することがあります。'

    const currentPageUrl =
      typeof window !== 'undefined' ? `${window.location.origin}${window.location.pathname}` : ''

    try {
      if (effectiveChannel === 'line') {
        if (!liffId) {
          const msg =
            p.inquiry_liff_env_required ??
            '「LINEで受け取る」を利用するにはサイトに LIFF ID（NEXT_PUBLIC_LINE_LIFF_ID）の設定が必要です。'
          inquiryDebugAlert('設定', msg)
          setError(msg)
          setSubmitPhase('idle')
          clearConfirmTimer()
          setLoading(false)
          return
        }

        // 未ブリッジ時: 既に LINE ログイン済みなら handoff せず送信へ。外部ブラウザのみ handoff。LINE 内未ログインは pending + liff.login() 後に effect が保存。
        let liffReady = false
        try {
          liffReady =
            flowStorageGet('inquiry_liff_ready_pid')?.toLowerCase() === propertyId.toLowerCase()
        } catch {
          liffReady = false
        }

        if (!liffReady) {
          const probe = await probeLiffLineUserId(liffId)
          if (probe.kind === 'ok') {
            lineUid = probe.userId
            try {
              flowStorageSet('inquiry_liff_ready_pid', propertyId)
            } catch {
              /* */
            }
          } else if (probe.kind === 'need_login') {
            const linePayload: PendingLineInquiry = {
              v: 1,
              propertyId,
              locale,
              name: formData.name.trim(),
              email: formData.email.trim(),
              message: formData.message.trim(),
              at: Date.now(),
            }
            try {
              flowStorageSet(PENDING_LINE_INQUIRY_KEY, JSON.stringify(linePayload))
              flowStorageSet('inquiry_resume_line', '1')
              flowStorageSet('inquiry_resume_property_id', propertyId)
              flowStorageSet('inquiry_resume_locale', locale)
            } catch {
              /* */
            }
            await postLineInquiryReturnPath(`/${locale}/properties/${propertyId}`, linePayload)
            const res = await obtainLineUserIdForInquiry(
              liffId,
              propertyId,
              locale,
              linePayload
            )
            if (!res.ok) {
              if (res.reason === 'login') {
                setLoading(false)
                return
              }
              const errText = `${res.message}\n\n${liffHint}${currentPageUrl ? `\n\n現在のページ: ${currentPageUrl}` : ''}\n\n${liffCallbackHint}${p.inquiry_liff_profile_scope_hint ? `\n\n${p.inquiry_liff_profile_scope_hint}` : ''}`
              console.error('[InquiryForm] obtainLineUserIdForInquiry (need_login)', res)
              inquiryDebugAlert('LINE（手動送信）', errText)
              setError(errText)
              setSubmitPhase('idle')
              clearConfirmTimer()
              setLoading(false)
              return
            }
            lineUid = res.userId
          } else if (probe.kind === 'error') {
            inquiryDebugAlert('LINE（確認）', probe.message)
            setError(probe.message)
            setSubmitPhase('idle')
            clearConfirmTimer()
            setLoading(false)
            return
          } else {
            try {
              flowStorageRemove(LINE_OAUTH_RESUME_PID_KEY)
            } catch {
              /* */
            }
            const handoffPayload: PendingLineInquiry = {
              v: 1,
              propertyId,
              locale,
              name: formData.name.trim(),
              email: formData.email.trim(),
              message: formData.message.trim(),
              at: Date.now(),
            }
            try {
              flowStorageSet(PENDING_LINE_INQUIRY_KEY, JSON.stringify(handoffPayload))
              flowStorageSet('inquiry_resume_line', '1')
              flowStorageSet('inquiry_resume_property_id', propertyId)
              flowStorageSet('inquiry_resume_locale', locale)
            } catch {
              /* ignore */
            }
            await postLineInquiryReturnPath(`/${locale}/properties/${propertyId}`, handoffPayload)
            window.location.assign(
              `/api/liff-handoff?locale=${encodeURIComponent(locale)}&propertyId=${encodeURIComponent(propertyId)}`
            )
            return
          }
        }

        if (lineUid === null) {
          const lineResult = await obtainLineUserIdForInquiry(liffId, propertyId, locale, null)
          if (!lineResult.ok) {
            if (lineResult.reason === 'login') {
              setLoading(false)
              return
            }
            const profileScopeHint = p.inquiry_liff_profile_scope_hint
            const errText = `${lineResult.message}\n\n${liffHint}${currentPageUrl ? `\n\n現在のページ: ${currentPageUrl}` : ''}\n\n${liffCallbackHint}${profileScopeHint ? `\n\n${profileScopeHint}` : ''}`
            console.error('[InquiryForm] obtainLineUserIdForInquiry', lineResult)
            inquiryDebugAlert('LINE（手動送信）', errText)
            setError(errText)
            setSubmitPhase('idle')
            clearConfirmTimer()
            setLoading(false)
            return
          }
          lineUid = lineResult.userId
        }
      }

      if (effectiveChannel === 'line') {
        const normalized = normalizeLineMessagingUserId(lineUid)
        if (!normalized) {
          const msg =
            'LINE ユーザーID（liff.getProfile().userId）を取得できませんでした。保存を中断しました。'
          console.error('[InquiryForm]', msg)
          inquiryDebugAlert('LINE userId', msg)
          setError(msg)
          setSubmitPhase('idle')
          clearConfirmTimer()
          setLoading(false)
          return
        }
        lineUid = normalized
      }

      const isUuid =
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(propertyId)

      if (!isUuid) {
        console.warn('Mock property detected (non-UUID ID). This inquiry will not be saved to the database.')
        await new Promise((resolve) => setTimeout(resolve, 1000))
        localStorage.setItem(`last_inquiry_${propertyId}`, Date.now().toString())
        setSuccess(true)
        return
      }

      const sessionCheck = await ensureSupabaseSessionForInquiry(supabase)
      if (!sessionCheck.ok) {
        console.error('[InquiryForm] no Supabase session before insert', sessionCheck.message)
        inquiryDebugAlert('認証（RLS）', sessionCheck.message)
        setError(sessionCheck.message)
        setSubmitPhase('idle')
        clearConfirmTimer()
        setLoading(false)
        return
      }

      const emailTrim = formData.email.trim()
      const nameTrim = formData.name.trim()
      const messageTrim = formData.message.trim()
      const { error: submitError } = await supabase.from('inquiries').insert([
        {
          property_id: propertyId,
          inquirer_name: nameTrim,
          inquirer_email: emailTrim,
          email: emailTrim,
          inquirer_phone: null,
          message: messageTrim,
          preferred_reply_channel: effectiveChannel,
          line_user_id: effectiveChannel === 'line' ? lineUid : null,
        },
      ])

      if (submitError) {
        const formatted = formatInquirySubmitError(submitError)
        console.error('Inquiries insert failed', submitError)
        inquiryDebugAlert('DB保存（inquiries）', formatted)
        setError(formatted)
        setSubmitPhase('idle')
        clearConfirmTimer()
        return
      }

      localStorage.setItem(`last_inquiry_${propertyId}`, Date.now().toString())
      if (effectiveChannel === 'line') {
        clearPendingLineInquiry()
        try {
          flowStorageRemove('inquiry_liff_ready_pid')
          flowStorageRemove(LINE_OAUTH_RESUME_PID_KEY)
        } catch {
          /* ignore */
        }
      }
      void requestInquiryConfirmationEmail(supabase, {
        property_id: propertyId,
        locale,
        inquirer_email: emailTrim,
        inquirer_name: nameTrim,
        message: messageTrim,
      })
      setSuccess(true)
    } catch (err: unknown) {
      const formatted = formatInquirySubmitError(err)
      console.error('Inquiry submission error:', err)
      inquiryDebugAlert('予期しないエラー', formatted)
      setError(formatted)
      setSubmitPhase('idle')
      clearConfirmTimer()
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="animate-in fade-in zoom-in duration-500 rounded-3xl border border-emerald-100 bg-emerald-50 p-8 text-center sm:p-10">
        <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-white shadow-sm">
          <CheckCircle className="h-10 w-10 text-emerald-500" />
        </div>
        <h3 className="mb-3 text-lg font-normal text-navy-secondary">{dict.property.inquiry_success_title}</h3>
        <p className="text-sm leading-relaxed text-slate-600">{dict.property.inquiry_success_desc}</p>
      </div>
    )
  }

  return (
    <div id="inquiry-form-section" className="relative overflow-visible scroll-mt-24">
      <button
        type="button"
        onClick={() => {
          if (!isLoggedIn) {
            onRequireAuth?.()
            return
          }
          if (!isDesktop) setIsOpen(!isOpen)
        }}
        className="flex w-full items-center justify-between lg:cursor-default"
        disabled={isDesktop}
      >
        <h3 className="flex items-center text-base font-normal text-navy-secondary">
          <Send className="mr-3 h-5 w-5 text-navy-primary" />
          {dict.property.inquiry_title}
          {!isLoggedIn ? (
            <Lock className="ml-2 h-4 w-4 text-amber-600" aria-hidden />
          ) : null}
        </h3>
        <div className="rounded-lg bg-slate-50 p-1 text-navy-primary lg:hidden">
          {isOpen ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
        </div>
      </button>

      <div
        className={clsx(
          'px-0.5 transition-all duration-500 ease-in-out lg:max-h-none lg:opacity-100 lg:overflow-visible',
          innerVisible
            ? 'mt-6 max-h-[2400px] overflow-visible opacity-100'
            : 'max-h-0 overflow-hidden opacity-0 lg:max-h-none lg:overflow-visible lg:opacity-100'
        )}
      >
        {!isLoggedIn ? (
          <div className="rounded-2xl border border-amber-100 bg-gradient-to-br from-amber-50/90 to-white p-6 text-center shadow-sm">
            <p className="text-sm font-black text-navy-secondary">{p.contact_gate_title}</p>
            <p className="mt-3 whitespace-pre-line text-left text-xs font-medium leading-relaxed text-slate-600">
              {p.contact_auth_modal_body}
            </p>
            <button
              type="button"
              onClick={() => onRequireAuth?.()}
              className="mt-5 w-full min-h-11 rounded-xl bg-navy-primary py-3 text-sm font-black text-white shadow-md transition hover:bg-navy-secondary"
            >
              {p.contact_gate_cta}
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <p className="text-[10px] font-medium text-slate-500">{p.contact_prefill_note}</p>

            <div>
              <label className={fieldLabelClass}>
                {dict.labels.name_label} ({dict.common.required})
              </label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder={dict.labels.name_placeholder}
                className={fieldInputClass}
                onInvalid={(e) =>
                  (e.target as HTMLInputElement).setCustomValidity(dict.property.error_name_required)
                }
                onInput={(e) => (e.target as HTMLInputElement).setCustomValidity('')}
              />
            </div>

            <div>
              <label className={fieldLabelClass}>
                {dict.labels.email_label} ({dict.common.required})
              </label>
              <input
                type="email"
                required
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="example@mail.com"
                className={fieldInputClass}
                onInvalid={(e) =>
                  (e.target as HTMLInputElement).setCustomValidity(dict.property.error_email_invalid)
                }
                onInput={(e) => (e.target as HTMLInputElement).setCustomValidity('')}
              />
            </div>

            <div>
              <label className={fieldLabelClass}>{dict.labels.inquiry_content_label}</label>
              <textarea
                rows={6}
                required
                value={formData.message}
                onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                className={clsx(fieldInputClass, 'resize-none')}
                onInvalid={(e) =>
                  (e.target as HTMLTextAreaElement).setCustomValidity(dict.property.error_message_required)
                }
                onInput={(e) => (e.target as HTMLTextAreaElement).setCustomValidity('')}
              />
            </div>

            {SHOW_INQUIRY_REPLY_CHANNEL ? (
              <fieldset className="rounded-2xl border border-slate-200 bg-white p-4">
                <legend className={clsx(fieldLabelClass, 'mb-2 px-1')}>
                  {p.inquiry_reply_channel_heading ?? '返信方法'}
                </legend>
                {isSmartphone ? (
                  <>
                    <p className="mb-3 text-[11px] leading-relaxed text-slate-500">
                      {p.inquiry_reply_channel_intro_v2 ??
                        p.inquiry_reply_channel_intro ??
                        '担当からの返信の受け取り方を選びます。メールアドレスはどちらの場合も記録されます。'}
                    </p>
                    <div className="space-y-3">
                      <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-100 bg-slate-50/80 p-3 has-[:checked]:border-navy-primary/40 has-[:checked]:bg-navy-primary/5">
                        <input
                          type="radio"
                          name="preferred_reply_channel"
                          className="mt-1 h-4 w-4 text-navy-primary"
                          checked={preferredReplyChannel === 'email'}
                          onChange={() => setPreferredReplyChannel('email')}
                        />
                        <span>
                          <span className="block text-sm font-bold text-navy-secondary">
                            {p.inquiry_reply_by_email ?? p.inquiry_reply_email_only ?? 'メールで受け取る'}
                          </span>
                          <span className="mt-0.5 block text-[11px] text-slate-500">
                            {p.inquiry_reply_by_email_desc ??
                              p.inquiry_reply_email_only_desc ??
                              '返信はメールで受け取ります。'}
                          </span>
                        </span>
                      </label>
                      <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-100 bg-slate-50/80 p-3 has-[:checked]:border-navy-primary/40 has-[:checked]:bg-navy-primary/5">
                        <input
                          type="radio"
                          name="preferred_reply_channel"
                          className="mt-1 h-4 w-4 text-navy-primary"
                          checked={preferredReplyChannel === 'line'}
                          onChange={() => setPreferredReplyChannel('line')}
                        />
                        <span className="min-w-0 flex-1">
                          <span className="block text-sm font-bold text-navy-secondary">
                            {p.inquiry_reply_by_line ?? 'LINEで受け取る'}
                          </span>
                          <span className="mt-0.5 block text-[11px] text-slate-500">
                            {p.inquiry_reply_by_line_desc ??
                              '公式LINEのトークで返信を受け取るには友だち追加が必要です。入力内容を担当へ届けるには送信後の LINE ログイン（連携）も必要です。'}
                          </span>
                        </span>
                      </label>
                    </div>
                    {preferredReplyChannel === 'line' ? (
                      <>
                        {submitPhase === 'idle' ? (
                          <button
                            type="button"
                            disabled={loading}
                            onClick={() => {
                              lineAreaSubmitWithoutConsentRef.current = !contactSendConsent
                              armSubmitConfirm()
                            }}
                            className={clsx(
                              'mt-3 flex w-full min-h-[52px] items-center justify-center gap-2 rounded-xl py-4 text-sm font-black shadow-lg transition-all',
                              !loading
                                ? 'bg-navy-primary text-white hover:bg-navy-secondary hover:shadow-xl'
                                : 'cursor-not-allowed bg-slate-300 text-slate-500 opacity-55 shadow-none'
                            )}
                          >
                            {loading ? (
                              <Loader2 className="h-5 w-5 animate-spin" />
                            ) : (
                              <>
                                <span>公式LINE登録</span>
                                <Send className="h-4 w-4 shrink-0" />
                              </>
                            )}
                          </button>
                        ) : (
                          <button
                            type="submit"
                            disabled={loading}
                            className={clsx(
                              'mt-3 flex w-full min-h-[52px] items-center justify-center gap-2 rounded-xl py-4 text-sm font-black shadow-lg transition-all',
                              !loading
                                ? 'bg-orange-600 text-white shadow-orange-600/30 hover:bg-orange-700 hover:shadow-xl'
                                : 'cursor-not-allowed bg-slate-300 text-slate-500 opacity-55'
                            )}
                          >
                            {loading ? (
                              <Loader2 className="h-5 w-5 animate-spin" />
                            ) : (
                              <>
                                <span className="text-center leading-tight">
                                  {p.inquiry_send_btn_confirm_line ?? p.inquiry_send_btn_confirm}
                                </span>
                                <Send className="h-4 w-4 shrink-0" />
                              </>
                            )}
                          </button>
                        )}
                      </>
                    ) : null}
                  </>
                ) : (
                  <div className="rounded-xl border border-slate-100 bg-slate-50/80 px-4 py-3">
                    <p className="text-[11px] leading-relaxed text-slate-500">
                      {p.inquiry_reply_channel_intro_desktop ??
                        p.inquiry_reply_channel_intro_v2 ??
                        'メールアドレス宛に担当からご返信いたします。'}
                    </p>
                    <p className="mt-2 text-sm font-bold text-navy-secondary">
                      {p.inquiry_reply_desktop_notice ?? '返信はメールにて差し上げます。'}
                    </p>
                    {officialLineAddFriendUrl ? (
                      <div className="mt-4 border-t border-slate-200/80 pt-4">
                        <p className="text-[10px] leading-relaxed text-slate-500">
                          {p.inquiry_pc_line_qr_hint ??
                            'LINEでのやり取りをご希望の方は、スマートフォンで下のQRコードを読み取り、公式アカウントからお問い合わせください。'}
                        </p>
                        <div className="mt-3 flex justify-center">
                          {/* eslint-disable-next-line @next/next/no-img-element -- 外部QR APIの動的URLのため */}
                          <img
                            src={`https://api.qrserver.com/v1/create-qr-code/?size=120x120&margin=1&data=${encodeURIComponent(officialLineAddFriendUrl)}`}
                            alt=""
                            width={120}
                            height={120}
                            className="rounded-lg border border-slate-200 bg-white p-1"
                          />
                        </div>
                      </div>
                    ) : null}
                  </div>
                )}
              </fieldset>
            ) : null}

            {error && (
              <div className="whitespace-pre-line px-1 text-xs font-normal text-red-500">{error}</div>
            )}

            <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50/90 p-4">
              <label htmlFor="inquiry-contact-consent" className="flex cursor-pointer items-start gap-3">
                <input
                  id="inquiry-contact-consent"
                  type="checkbox"
                  checked={contactSendConsent}
                  onChange={(e) => setContactSendConsent(e.target.checked)}
                  className="mt-0.5 h-5 w-5 shrink-0 rounded border-slate-300 text-navy-primary focus:ring-2 focus:ring-navy-primary"
                />
                <span className="text-sm font-bold leading-snug text-navy-secondary">
                  {p.inquiry_contact_send_consent}
                </span>
              </label>
            </div>

            {submitPhase === 'idle' ? (
              <button
                type="button"
                disabled={loading || !contactSendConsent}
                onClick={() => {
                  lineAreaSubmitWithoutConsentRef.current = false
                  if (contactSendConsent) armSubmitConfirm()
                }}
                className={clsx(
                  'mt-3 flex w-full min-h-[52px] items-center justify-center gap-2 rounded-xl py-4 text-sm font-black shadow-lg transition-all',
                  contactSendConsent && !loading
                    ? 'bg-navy-primary text-white hover:bg-navy-secondary hover:shadow-xl'
                    : 'cursor-not-allowed bg-slate-300 text-slate-500 opacity-55 shadow-none'
                )}
              >
                {loading ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <>
                    <span>{p.inquiry_send_btn_primary ?? dict.property.submit_inquiry_btn}</span>
                    <Send className="h-4 w-4 shrink-0" />
                  </>
                )}
              </button>
            ) : (
              <button
                type="submit"
                disabled={loading || !contactSendConsent}
                className={clsx(
                  'mt-3 flex w-full min-h-[52px] items-center justify-center gap-2 rounded-xl py-4 text-sm font-black shadow-lg transition-all',
                  !loading && contactSendConsent
                    ? 'bg-orange-600 text-white shadow-orange-600/30 hover:bg-orange-700 hover:shadow-xl'
                    : 'cursor-not-allowed bg-slate-300 text-slate-500 opacity-55'
                )}
              >
                {loading ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <>
                    <span className="text-center leading-tight">
                      {SHOW_INQUIRY_REPLY_CHANNEL &&
                      isSmartphone &&
                      preferredReplyChannel === 'line'
                        ? (p.inquiry_send_btn_confirm_line ?? p.inquiry_send_btn_confirm)
                        : p.inquiry_send_btn_confirm}
                    </span>
                    <Send className="h-4 w-4 shrink-0" />
                  </>
                )}
              </button>
            )}

            <p className="mt-4 whitespace-pre-line text-center text-[10px] text-slate-400">
              {dict.property.inquiry_footer_note}
            </p>
          </form>
        )}
      </div>
    </div>
  )
}
