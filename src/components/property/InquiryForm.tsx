'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Send, Loader2, CheckCircle, ChevronDown, ChevronUp, Lock, MessageCircle, ExternalLink } from 'lucide-react'
import { getErrorMessage } from '@/lib/utils/errors'
import { formatInquirySubmitError, formatLiffError } from '@/lib/utils/inquiry-errors'
import { clsx } from 'clsx'

const PENDING_LINE_INQUIRY_KEY = 'inquiry_line_pending_v1'
const AUTO_SUBMIT_LOCK_PREFIX = 'inquiry_line_auto_'
const PENDING_LINE_MAX_MS = 15 * 60 * 1000

type PendingLineInquiry = {
  v: 1
  propertyId: string
  locale: string
  name: string
  email: string
  message: string
  at: number
}

function readPendingLineInquiry(): PendingLineInquiry | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = sessionStorage.getItem(PENDING_LINE_INQUIRY_KEY)
    if (!raw) return null
    const o = JSON.parse(raw) as PendingLineInquiry
    if (o.v !== 1 || !o.propertyId || typeof o.at !== 'number') return null
    if (Date.now() - o.at > PENDING_LINE_MAX_MS) {
      sessionStorage.removeItem(PENDING_LINE_INQUIRY_KEY)
      return null
    }
    return o
  } catch {
    return null
  }
}

function clearPendingLineInquiry() {
  try {
    sessionStorage.removeItem(PENDING_LINE_INQUIRY_KEY)
  } catch {
    /* */
  }
}

type ObtainLineUserIdResult =
  | { ok: true; userId: string }
  | { ok: false; reason: 'redirect' | 'login' }
  | { ok: false; reason: 'error'; message: string }

/**
 * ブリッジ通過後（inquiry_liff_ready_pid 済み）に LIFF で userId を取得。外部ブラウザでは再 handoff で redirect。
 */
async function obtainLineUserIdForInquiry(
  liffId: string,
  propertyId: string,
  locale: string
): Promise<ObtainLineUserIdResult> {
  const liff = (await import('@line/liff')).default
  try {
    await liff.init({ liffId, withLoginOnExternalBrowser: true })
  } catch (firstInit: unknown) {
    try {
      await liff.init({ liffId, withLoginOnExternalBrowser: false })
    } catch (secondInit: unknown) {
      return {
        ok: false,
        reason: 'error',
        message: formatLiffError(secondInit) || getErrorMessage(secondInit),
      }
    }
  }

  if (!liff.isLoggedIn()) {
    if (!liff.isInClient()) {
      try {
        sessionStorage.removeItem(`${AUTO_SUBMIT_LOCK_PREFIX}${propertyId}`)
        sessionStorage.removeItem('inquiry_liff_ready_pid')
        sessionStorage.setItem('inquiry_resume_line', '1')
        sessionStorage.setItem('inquiry_resume_property_id', propertyId)
        sessionStorage.setItem('inquiry_resume_locale', locale)
      } catch {
        /* */
      }
      window.location.assign(
        `/api/liff-handoff?locale=${encodeURIComponent(locale)}&propertyId=${encodeURIComponent(propertyId)}`
      )
      return { ok: false, reason: 'redirect' }
    }
    liff.login()
    return { ok: false, reason: 'login' }
  }

  try {
    const profile = await liff.getProfile()
    if (!profile?.userId) {
      return {
        ok: false,
        reason: 'error',
        message: 'LINE ユーザーIDを取得できませんでした',
      }
    }
    return { ok: true, userId: profile.userId }
  } catch (profileErr: unknown) {
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
  const liffId = process.env.NEXT_PUBLIC_LINE_LIFF_ID?.trim() || undefined
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isOpen, setIsOpen] = useState(false)
  const [isDesktop, setIsDesktop] = useState(false)
  const [contactSendConsent, setContactSendConsent] = useState(false)
  const [submitPhase, setSubmitPhase] = useState<'idle' | 'armed'>('idle')
  const confirmTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const clearConfirmTimer = useCallback(() => {
    if (confirmTimerRef.current) {
      clearTimeout(confirmTimerRef.current)
      confirmTimerRef.current = null
    }
  }, [])

  useEffect(() => () => clearConfirmTimer(), [clearConfirmTimer])

  useEffect(() => {
    if (!contactSendConsent) {
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

  /** LINE から liff.line.me 経由で戻ったあと「LINEで受け取る」を復元 */
  useEffect(() => {
    if (!isLoggedIn) return
    try {
      const flag = sessionStorage.getItem('inquiry_resume_line')
      const pid = sessionStorage.getItem('inquiry_resume_property_id')
      if (flag === '1' && pid === propertyId) {
        sessionStorage.removeItem('inquiry_resume_line')
        sessionStorage.removeItem('inquiry_resume_property_id')
        sessionStorage.removeItem('inquiry_resume_locale')
        setPreferredReplyChannel('line')
        setIsOpen(true)
        requestAnimationFrame(() => {
          document.getElementById('inquiry-form-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
        })
      }
    } catch {
      /* private mode 等 */
    }
  }, [isLoggedIn, propertyId])

  useEffect(() => {
    if (preferredReplyChannel !== 'line' || !liffId) return
    void import('@line/liff').catch(() => {})
  }, [preferredReplyChannel, liffId])

  const supabase = createClient()
  const p = dict.property ?? {}

  /** ブリッジから戻ったあと、保存済みの1回目の確定内容で自動送信（ユーザーに2回押させない） */
  useEffect(() => {
    if (!isLoggedIn || !liffId) return

    const pending = readPendingLineInquiry()
    if (!pending || pending.propertyId !== propertyId) return

    let liffReady = false
    try {
      liffReady = sessionStorage.getItem('inquiry_liff_ready_pid') === propertyId
    } catch {
      return
    }
    if (!liffReady) return

    const lockKey = `${AUTO_SUBMIT_LOCK_PREFIX}${propertyId}`
    try {
      if (sessionStorage.getItem(lockKey) === '1') return
      sessionStorage.setItem(lockKey, '1')
    } catch {
      return
    }

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
      const sb = createClient()
      const lastInquiry = localStorage.getItem(`last_inquiry_${propertyId}`)
      if (lastInquiry && Date.now() - parseInt(lastInquiry) < 30000) {
        try {
          sessionStorage.removeItem(lockKey)
        } catch {
          /* */
        }
        clearPendingLineInquiry()
        setError('送信の間隔が短すぎます。しばらく待ってから再度お試しください。')
        setLoading(false)
        return
      }

      const isUuid =
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(propertyId)

      if (!isUuid) {
        clearPendingLineInquiry()
        try {
          sessionStorage.removeItem(lockKey)
          sessionStorage.removeItem('inquiry_liff_ready_pid')
        } catch {
          /* */
        }
        localStorage.setItem(`last_inquiry_${propertyId}`, Date.now().toString())
        setLoading(false)
        setSuccess(true)
        return
      }

      const lineResult = await obtainLineUserIdForInquiry(liffId, propertyId, pending.locale)
      if (!lineResult.ok) {
        if (lineResult.reason === 'redirect') {
          return
        }
        if (lineResult.reason === 'login') {
          try {
            sessionStorage.removeItem(lockKey)
          } catch {
            /* */
          }
          setLoading(false)
          return
        }
        clearPendingLineInquiry()
        try {
          sessionStorage.removeItem(lockKey)
        } catch {
          /* */
        }
        setError(
          `${lineResult.message}\n\n${liffHint}${currentPageUrl ? `\n\n現在のページ: ${currentPageUrl}` : ''}\n\n${liffCallbackHint}`
        )
        setLoading(false)
        return
      }

      const emailTrim = pending.email.trim()
      const { error: submitError } = await sb.from('inquiries').insert([
        {
          property_id: propertyId,
          inquirer_name: pending.name.trim(),
          inquirer_email: emailTrim,
          email: emailTrim,
          inquirer_phone: null,
          message: pending.message.trim(),
          preferred_reply_channel: 'line',
          line_user_id: lineResult.userId,
        },
      ])

      if (submitError) {
        clearPendingLineInquiry()
        try {
          sessionStorage.removeItem(lockKey)
        } catch {
          /* */
        }
        setError(formatInquirySubmitError(submitError))
        setLoading(false)
        return
      }

      localStorage.setItem(`last_inquiry_${propertyId}`, Date.now().toString())
      clearPendingLineInquiry()
      try {
        sessionStorage.removeItem(lockKey)
        sessionStorage.removeItem('inquiry_liff_ready_pid')
      } catch {
        /* */
      }
      setSuccess(true)
      setLoading(false)
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps -- dict 全体を依存に入れると毎レンダーで再実行される
  }, [isLoggedIn, propertyId, locale, liffId])

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
    if (!contactSendConsent) {
      return
    }
    if (submitPhase !== 'armed') {
      return
    }

    const lastInquiry = localStorage.getItem(`last_inquiry_${propertyId}`)
    if (lastInquiry && Date.now() - parseInt(lastInquiry) < 30000) {
      setError('送信の間隔が短すぎます。しばらく待ってから再度お試しください。')
      setSubmitPhase('idle')
      clearConfirmTimer()
      return
    }

    setLoading(true)
    setError(null)

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
      if (preferredReplyChannel === 'line') {
        if (!liffId) {
          setError(
            p.inquiry_liff_env_required ??
              '「LINEで受け取る」を利用するにはサイトに LIFF ID（NEXT_PUBLIC_LINE_LIFF_ID）の設定が必要です。'
          )
          setSubmitPhase('idle')
          clearConfirmTimer()
          setLoading(false)
          return
        }

        // 1回目の確定: 入力を保存して即 handoff（await 後の遷移は不可のため）。戻ったら effect が自動で DB 保存する。
        let liffReady = false
        try {
          liffReady = sessionStorage.getItem('inquiry_liff_ready_pid') === propertyId
        } catch {
          liffReady = false
        }

        if (!liffReady) {
          try {
            const payload: PendingLineInquiry = {
              v: 1,
              propertyId,
              locale,
              name: formData.name.trim(),
              email: formData.email.trim(),
              message: formData.message.trim(),
              at: Date.now(),
            }
            sessionStorage.setItem(PENDING_LINE_INQUIRY_KEY, JSON.stringify(payload))
            sessionStorage.setItem('inquiry_resume_line', '1')
            sessionStorage.setItem('inquiry_resume_property_id', propertyId)
            sessionStorage.setItem('inquiry_resume_locale', locale)
          } catch {
            /* ignore */
          }
          window.location.assign(
            `/api/liff-handoff?locale=${encodeURIComponent(locale)}&propertyId=${encodeURIComponent(propertyId)}`
          )
          return
        }

        const lineResult = await obtainLineUserIdForInquiry(liffId, propertyId, locale)
        if (!lineResult.ok) {
          if (lineResult.reason === 'redirect') {
            return
          }
          if (lineResult.reason === 'login') {
            setLoading(false)
            return
          }
          const profileScopeHint = p.inquiry_liff_profile_scope_hint
          setError(
            `${lineResult.message}\n\n${liffHint}${currentPageUrl ? `\n\n現在のページ: ${currentPageUrl}` : ''}\n\n${liffCallbackHint}${profileScopeHint ? `\n\n${profileScopeHint}` : ''}`
          )
          setSubmitPhase('idle')
          clearConfirmTimer()
          setLoading(false)
          return
        }
        lineUid = lineResult.userId
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

      const emailTrim = formData.email.trim()
      const { error: submitError } = await supabase.from('inquiries').insert([
        {
          property_id: propertyId,
          inquirer_name: formData.name.trim(),
          inquirer_email: emailTrim,
          email: emailTrim,
          inquirer_phone: null,
          message: formData.message.trim(),
          preferred_reply_channel: preferredReplyChannel,
          line_user_id: preferredReplyChannel === 'line' ? lineUid : null,
        },
      ])

      if (submitError) {
        console.error('Inquiries insert failed', submitError)
        setError(formatInquirySubmitError(submitError))
        setSubmitPhase('idle')
        clearConfirmTimer()
        return
      }

      localStorage.setItem(`last_inquiry_${propertyId}`, Date.now().toString())
      if (preferredReplyChannel === 'line') {
        clearPendingLineInquiry()
        try {
          sessionStorage.removeItem('inquiry_liff_ready_pid')
        } catch {
          /* ignore */
        }
      }
      setSuccess(true)
    } catch (err: unknown) {
      console.error('Inquiry submission error:', err)
      setError(formatInquirySubmitError(err))
      setSubmitPhase('idle')
      clearConfirmTimer()
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    const lineHint = p.inquiry_success_line_hint ?? ''
    const lineBtn = p.inquiry_success_line_btn ?? 'LINE'
    return (
      <div className="animate-in fade-in zoom-in duration-500 rounded-3xl border border-emerald-100 bg-emerald-50 p-8 text-center sm:p-10">
        <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-white shadow-sm">
          <CheckCircle className="h-10 w-10 text-emerald-500" />
        </div>
        <h3 className="mb-3 text-lg font-normal text-navy-secondary">{dict.property.inquiry_success_title}</h3>
        <p className="text-sm leading-relaxed text-slate-600">{dict.property.inquiry_success_desc}</p>
        {preferredReplyChannel === 'email' && officialLineAddFriendUrl ? (
          <div className="mt-8 rounded-2xl border border-[#06C755]/30 bg-white/90 p-5 shadow-sm">
            <p className="text-sm font-bold text-slate-700">{lineHint}</p>
            <a
              href={officialLineAddFriendUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-4 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#06C755] px-5 py-3 text-sm font-black text-white shadow-lg shadow-[#06C755]/25 transition hover:bg-[#05b34c] sm:w-auto sm:min-w-[280px]"
            >
              <MessageCircle className="h-5 w-5 shrink-0" />
              {lineBtn}
              <ExternalLink className="h-4 w-4 shrink-0 opacity-90" />
            </a>
          </div>
        ) : null}
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
                rows={4}
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

            <fieldset className="rounded-2xl border border-slate-200 bg-white p-4">
              <legend className={clsx(fieldLabelClass, 'mb-2 px-1')}>
                {p.inquiry_reply_channel_heading ?? '返信方法'}
              </legend>
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
                        '確定送信時にLINEログインが開き、公式LINEから返信・通知を受け取ります（友だち追加が必要です）。'}
                    </span>
                  </span>
                </label>
              </div>
              {preferredReplyChannel === 'line' ? (
                <p className="mt-3 rounded-lg bg-slate-50 px-3 py-2 text-[10px] leading-relaxed text-slate-600">
                  {p.inquiry_line_submit_liff_note ??
                    'オレンジの「確定」ボタンを押したときに LINE ログインが始まります。ログイン後はもう一度確定を押して送信を完了してください。'}
                </p>
              ) : null}
            </fieldset>

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
                    <span className="text-center leading-tight">{p.inquiry_send_btn_confirm}</span>
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
