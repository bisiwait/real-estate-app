'use client'

import { useState, useEffect, useLayoutEffect, useRef, useCallback, useMemo } from 'react'
import { createPortal } from 'react-dom'
import { useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import {
  Send,
  Loader2,
  CheckCircle,
  ChevronDown,
  ChevronUp,
  Lock,
  X,
  MessageCircle,
  Mail,
} from 'lucide-react'
import { formatInquirySubmitError } from '@/lib/utils/inquiry-errors'
import { clsx } from 'clsx'
import { LineInquiryQrModal } from '@/components/property/LineInquiryQrModal'
import { LineInquiryMessageLaunchPanel } from '@/components/property/LineInquiryMessageLaunchPanel'
import { useLineAssignLaunch } from '@/components/property/useLineAssignLaunch'
import { useDeviceType } from '@/hooks/useDeviceType'
import { postLineInquiryLog } from '@/lib/line-inquiry-log-client'
import { buildLineInquiryShareText } from '@/lib/line-inquiry-share-text'
import { replaceLineInquiryUrlPrefill } from '@/lib/line-oa-message-inquiry-url'
import { copyTextToClipboard } from '@/lib/clipboard-copy'

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

function inquiryDebugAlert(stage: string, message: string) {
  if (typeof window === 'undefined') return
  try {
    window.alert(`[お問い合わせ / ${stage}]\n\n${message}`)
  } catch {
    /* */
  }
}

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
      'ログインセッションが有効ではありません。お手数ですが一度ログアウトして再ログインのうえ、もう一度送信してください。',
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
  /** 掲載オーナー（エージェント）の auth user id。LINE 計測の agent_id 突合に使用 */
  agentId?: string
  propertyName: string
  dict: any
  isLoggedIn: boolean
  onRequireAuth?: () => void
  contactPrefill?: InquiryContactPrefill | null
  officialLineAddFriendUrl: string
  /** クリップボード用テンプレートの {propertyUrl} に使う（正規の物件ページ URL） */
  propertyPageUrl: string
  ownerPremiumLineInquiry?: boolean
}

export default function InquiryForm({
  propertyId,
  agentId,
  propertyName,
  dict,
  isLoggedIn,
  onRequireAuth,
  contactPrefill,
  officialLineAddFriendUrl,
  propertyPageUrl,
}: InquiryFormProps) {
  const routeParams = useParams()
  const locale = (routeParams?.locale as string) || 'jp'
  const supabase = createClient()

  const defaultMessage =
    dict.property.inquiry_default_message?.replace('{propertyName}', propertyName) ||
    `Regarding "${propertyName}", please give me more details.`

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    message: defaultMessage,
  })
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isOpen, setIsOpen] = useState(false)
  const [isDesktop, setIsDesktop] = useState(false)
  const [contactSendConsent, setContactSendConsent] = useState(false)
  const [submitPhase, setSubmitPhase] = useState<'idle' | 'armed'>('idle')
  const confirmTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [portalReady, setPortalReady] = useState(false)
  const [lineQrModalOpen, setLineQrModalOpen] = useState(false)
  /** LINE 連携ありのときのみ使用。メール / LINE のセグメント切替 */
  const [inquiryChannel, setInquiryChannel] = useState<'mail' | 'line'>('mail')
  const lineAddFriendUrl = officialLineAddFriendUrl?.trim() ?? ''
  const hasOfficialLine = Boolean(lineAddFriendUrl)
  const { isSmartphone: isSmartphoneDevice } = useDeviceType()

  const shareText = useMemo(() => {
    const tpl =
      dict.property?.line_inquiry_share_text_template ??
      'ChonburiHomeを見て連絡しました。\n{propertyName}\n{propertyUrl}\nの空室状況を確認していただけますか？\nよろしくお願いします。'
    return buildLineInquiryShareText(tpl, propertyName, propertyPageUrl.trim())
  }, [dict.property?.line_inquiry_share_text_template, propertyName, propertyPageUrl])

  /** oaMessage で送信先を固定し、下書きだけ定型文に差し替え（/R/msg/text は送信先選択になるため使わない） */
  const lineChatLaunchUrl = useMemo(
    () => replaceLineInquiryUrlPrefill(lineAddFriendUrl, shareText.trim()),
    [lineAddFriendUrl, shareText]
  )

  const lineLaunch = useLineAssignLaunch(lineChatLaunchUrl)

  /**
   * 公式アカウント宛 oaMessage（下書き＝定型文）で起動 ＋ クリップボード保険。
   * await せず copy を先に走らせ、遷移で失われにくくする。
   */
  const handleLineInquiryMain = useCallback(() => {
    if (!hasOfficialLine) return
    const text = shareText.trim()
    if (!text) return
    void copyTextToClipboard(text)
    postLineInquiryLog({ propertyId, agentId }, { throttleScope: 'line-launch' })
    if (isSmartphoneDevice) {
      lineLaunch.launchAssign()
    } else {
      setLineQrModalOpen(true)
    }
  }, [
    hasOfficialLine,
    shareText,
    propertyId,
    agentId,
    isSmartphoneDevice,
    lineLaunch.launchAssign,
  ])

  useEffect(() => {
    if (!hasOfficialLine) setInquiryChannel('mail')
  }, [hasOfficialLine])

  const clearConfirmTimer = useCallback(() => {
    if (confirmTimerRef.current) {
      clearTimeout(confirmTimerRef.current)
      confirmTimerRef.current = null
    }
  }, [])

  useEffect(() => () => clearConfirmTimer(), [clearConfirmTimer])

  useLayoutEffect(() => {
    setPortalReady(true)
  }, [])

  useEffect(() => {
    if (!success) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setSuccess(false)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [success])

  useEffect(() => {
    if (!contactSendConsent) {
      setSubmitPhase('idle')
      clearConfirmTimer()
    }
  }, [contactSendConsent, clearConfirmTimer])

  const armSubmitConfirm = useCallback(() => {
    clearConfirmTimer()
    setSubmitPhase('armed')
    confirmTimerRef.current = window.setTimeout(() => {
      setSubmitPhase('idle')
      confirmTimerRef.current = null
    }, 3000)
  }, [clearConfirmTimer])

  useEffect(() => {
    setIsDesktop(window.innerWidth >= 1024)
    const handleResize = () => setIsDesktop(window.innerWidth >= 1024)
    window.addEventListener('resize', handleResize)

    const handleOpenEvent = () => {
      setInquiryChannel('mail')
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
    if (!contactSendConsent) {
      return
    }

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

    try {
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
          preferred_reply_channel: 'email',
          line_user_id: null,
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

  const p = dict.property ?? {}
  const inquirySuccessCloseLabel = p.contact_auth_close ?? '閉じる'

  if (success) {
    if (!portalReady || typeof document === 'undefined') {
      return null
    }
    return createPortal(
      <div
        className="fixed inset-0 z-[100010] flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-[2px]"
        role="alertdialog"
        aria-modal="true"
        aria-live="polite"
        aria-labelledby="inquiry-success-title"
        onClick={() => setSuccess(false)}
      >
        <div
          className="animate-in fade-in zoom-in duration-500 relative w-full max-w-md rounded-3xl border border-emerald-100 bg-emerald-50 p-8 pt-12 text-center shadow-2xl sm:p-10 sm:pt-14"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            type="button"
            onClick={() => setSuccess(false)}
            className="absolute right-3 top-3 flex h-10 w-10 items-center justify-center rounded-full text-slate-500 transition hover:bg-white/80 hover:text-navy-secondary"
            aria-label={inquirySuccessCloseLabel}
          >
            <X className="h-5 w-5" strokeWidth={2} />
          </button>
          <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-white shadow-sm">
            <CheckCircle className="h-10 w-10 text-emerald-500" />
          </div>
          <h3 id="inquiry-success-title" className="mb-3 text-lg font-normal text-navy-secondary">
            {dict.property.inquiry_success_title}
          </h3>
          <p className="text-sm leading-relaxed text-slate-600">{dict.property.inquiry_success_desc}</p>
          <button
            type="button"
            onClick={() => setSuccess(false)}
            className="mt-8 w-full rounded-xl bg-navy-primary py-3.5 text-sm font-black text-white shadow-md transition hover:bg-navy-secondary"
          >
            {inquirySuccessCloseLabel}
          </button>
        </div>
      </div>,
      document.body
    )
  }

  return (
    <>
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
        {hasOfficialLine ? (
          <div
            className="mb-5"
            role="tablist"
            aria-label={p.inquiry_title ?? 'お問い合わせ'}
          >
            <div className="flex rounded-2xl border border-slate-200/90 bg-slate-100/95 p-1 shadow-inner">
              <button
                type="button"
                role="tab"
                id="inquiry-tab-mail"
                aria-selected={inquiryChannel === 'mail'}
                aria-controls="inquiry-panel-mail"
                tabIndex={inquiryChannel === 'mail' ? 0 : -1}
                onClick={() => setInquiryChannel('mail')}
                className={clsx(
                  'relative flex min-h-12 flex-1 items-center justify-center gap-2 rounded-xl px-2 py-2.5 text-center text-xs font-black transition-all sm:text-sm',
                  inquiryChannel === 'mail'
                    ? 'bg-white text-navy-primary shadow-md shadow-slate-200/80 ring-1 ring-slate-200/60'
                    : 'text-slate-500 hover:bg-white/50 hover:text-slate-700'
                )}
              >
                <Mail className="h-4 w-4 shrink-0" aria-hidden />
                <span>{p.inquiry_channel_tab_mail ?? 'メール'}</span>
              </button>
              <button
                type="button"
                role="tab"
                id="inquiry-tab-line"
                aria-selected={inquiryChannel === 'line'}
                aria-controls="inquiry-panel-line"
                tabIndex={inquiryChannel === 'line' ? 0 : -1}
                title={p.inquiry_channel_line_badge_hint}
                onClick={() => setInquiryChannel('line')}
                className={clsx(
                  'relative flex min-h-12 flex-1 flex-col items-center justify-center gap-1 rounded-xl px-2 py-2 text-center transition-all sm:flex-row sm:gap-2 sm:py-2.5',
                  inquiryChannel === 'line'
                    ? 'bg-white text-[#047c3d] shadow-md shadow-[#06C755]/15 ring-1 ring-[#06C755]/25'
                    : 'text-slate-500 hover:bg-white/50 hover:text-slate-700'
                )}
              >
                <span className="flex items-center gap-2 text-xs font-black sm:text-sm">
                  <MessageCircle className="h-4 w-4 shrink-0" aria-hidden />
                  <span>{p.inquiry_channel_tab_line ?? 'LINE'}</span>
                </span>
                <span
                  className="inline-flex max-w-full items-center rounded-full bg-[#06C755]/15 px-2 py-0.5 text-[9px] font-black uppercase tracking-wide text-[#047c3d] ring-1 ring-[#06C755]/20"
                  aria-hidden
                >
                  {p.inquiry_channel_line_badge ?? 'おすすめ'}
                </span>
              </button>
            </div>
          </div>
        ) : null}

        {(!hasOfficialLine || inquiryChannel === 'mail') && !isLoggedIn ? (
          <div
            id={hasOfficialLine ? 'inquiry-panel-mail' : undefined}
            role={hasOfficialLine ? 'tabpanel' : undefined}
            aria-labelledby={hasOfficialLine ? 'inquiry-tab-mail' : undefined}
            className="rounded-2xl border border-amber-100 bg-gradient-to-br from-amber-50/90 to-white p-6 text-center shadow-sm"
          >
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
        ) : null}

        {(!hasOfficialLine || inquiryChannel === 'mail') && isLoggedIn ? (
          <form
            id={hasOfficialLine ? 'inquiry-panel-mail' : undefined}
            role={hasOfficialLine ? 'tabpanel' : undefined}
            aria-labelledby={hasOfficialLine ? 'inquiry-tab-mail' : undefined}
            onSubmit={handleSubmit}
            className="space-y-4"
          >
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
        ) : null}

        {hasOfficialLine && inquiryChannel === 'line' ? (
          <div
            id="inquiry-panel-line"
            role="tabpanel"
            aria-labelledby="inquiry-tab-line"
            className="rounded-2xl border-2 border-[#06C755]/35 bg-gradient-to-br from-[#06C755]/10 to-white p-4 shadow-sm"
          >
            <LineInquiryMessageLaunchPanel
              isSmartphone={isSmartphoneDevice}
              isSending={lineLaunch.isSending}
              onMainClick={handleLineInquiryMain}
              showDirectLineFallback={Boolean(
                isSmartphoneDevice && lineLaunch.showFallback && lineLaunch.launchUrl
              )}
              fallbackUrl={lineLaunch.launchUrl}
              onFallbackClick={() =>
                postLineInquiryLog({ propertyId, agentId }, { throttleScope: 'line-direct-link' })
              }
              dict={{
                line_inquiry_main_btn: p.line_inquiry_main_btn ?? 'LINEで問い合わせる',
                line_inquiry_paste_after_friend_note:
                  p.line_inquiry_paste_after_friend_note ??
                  '※初めての方は、友だち追加後にトーク画面で『貼り付け』をして送信してください',
                line_inquiry_already_friend_note:
                  p.line_inquiry_already_friend_note ??
                  '※すでに友だちの場合、LINEの仕様で入力欄に文面が入らないことがあります。上のボタンを押したときにクリップボードへコピーした文章を『貼り付け』して送信してください。',
                line_inquiry_desktop_qr_sub:
                  p.line_inquiry_desktop_qr_sub ??
                  'クリックするとQRコードが表示されます。スマホで読み取って問い合わせください。',
                line_open_line_direct_link: p.line_open_line_direct_link ?? 'LINEを直接開く',
                line_inquiry_sending_btn: p.line_inquiry_sending_btn,
              }}
            />
          </div>
        ) : null}
      </div>
    </div>
    <LineInquiryQrModal
      isOpen={lineQrModalOpen}
      onClose={() => setLineQrModalOpen(false)}
      url={lineLaunch.launchUrl || lineAddFriendUrl}
      shareText={shareText}
      dict={{
        line_inquiry_qr_modal_title: p.line_inquiry_qr_modal_title,
        line_inquiry_qr_modal_hint: p.line_inquiry_qr_modal_hint,
        line_inquiry_qr_modal_close: p.line_inquiry_qr_modal_close,
        line_inquiry_qr_modal_friend_register_note: p.line_inquiry_qr_modal_friend_register_note,
        line_inquiry_qr_modal_copy_btn: p.line_inquiry_qr_modal_copy_btn,
        line_inquiry_copy_toast: p.line_inquiry_copy_toast,
      }}
    />
    </>
  )
}
