'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Send, Loader2, CheckCircle, ChevronDown, ChevronUp, Lock, MessageCircle, ExternalLink } from 'lucide-react'
import { getErrorMessage } from '@/lib/utils/errors'
import { clsx } from 'clsx'
import { normalizeStoredLineContact } from '@/lib/line-contact-url'

export type InquiryContactPrefill = {
  full_name: string | null
  email: string | null
  phone: string | null
  line_id: string | null
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
  const defaultMessage =
    dict.property.inquiry_default_message?.replace('{propertyName}', propertyName) ||
    `Regarding "${propertyName}", please give me more details.`

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    lineId: '',
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
      phone: contactPrefill.phone ?? prev.phone,
      lineId: contactPrefill.line_id ?? prev.lineId,
    }))
  }, [isLoggedIn, contactPrefill])

  const supabase = createClient()
  const p = dict.property ?? {}

  const innerVisible = !isLoggedIn || isOpen || isDesktop

  const labelEmphasis = isLoggedIn
    ? 'mb-2 ml-1 block text-xs font-black uppercase tracking-wide text-navy-primary'
    : 'mb-1.5 ml-1 block text-[10px] font-normal uppercase tracking-widest text-slate-400'
  const labelDefault = 'mb-1.5 ml-1 block text-[10px] font-normal uppercase tracking-widest text-slate-400'

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

      const lineTag = p.inquiry_line_contact_message_tag ?? 'LINE'
      const lineVal = normalizeStoredLineContact(formData.lineId)
      const lineSuffix = lineVal ? `\n\n[${lineTag}: ${lineVal}]` : ''
      const messageBody = `${formData.message.trim()}${lineSuffix}`

      const { error: submitError } = await supabase.from('inquiries').insert([
        {
          property_id: propertyId,
          inquirer_name: formData.name,
          inquirer_email: formData.email,
          inquirer_phone: formData.phone || null,
          message: messageBody,
        },
      ])

      if (submitError) throw submitError

      localStorage.setItem(`last_inquiry_${propertyId}`, Date.now().toString())
      setSuccess(true)
    } catch (err: unknown) {
      console.error('Inquiry submission error:', err)
      setError(getErrorMessage(err))
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
        {officialLineAddFriendUrl ? (
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
              <label className="mb-1.5 ml-1 block text-[10px] font-normal uppercase tracking-widest text-slate-400">
                {dict.labels.name_label} ({dict.common.required})
              </label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder={dict.labels.name_placeholder}
                className="w-full rounded-xl border border-slate-100 bg-slate-50 px-4 py-3.5 text-sm outline-none transition-all focus:ring-2 focus:ring-navy-primary"
                onInvalid={(e) =>
                  (e.target as HTMLInputElement).setCustomValidity(dict.property.error_name_required)
                }
                onInput={(e) => (e.target as HTMLInputElement).setCustomValidity('')}
              />
            </div>

            <div>
              <label className="mb-1.5 ml-1 block text-[10px] font-normal uppercase tracking-widest text-slate-400">
                {dict.labels.email_label} ({dict.common.required})
              </label>
              <input
                type="email"
                required
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="example@mail.com"
                className="w-full rounded-xl border border-slate-100 bg-slate-50 px-4 py-3.5 text-sm outline-none transition-all focus:ring-2 focus:ring-navy-primary"
                onInvalid={(e) =>
                  (e.target as HTMLInputElement).setCustomValidity(dict.property.error_email_invalid)
                }
                onInput={(e) => (e.target as HTMLInputElement).setCustomValidity('')}
              />
            </div>

            <div>
              <label className={isLoggedIn ? labelEmphasis : labelDefault}>{dict.labels.phone_label}</label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="+66 00 000 0000"
                className={clsx(
                  'w-full rounded-xl border bg-slate-50 px-4 py-3.5 text-sm outline-none transition-all focus:ring-2 focus:ring-navy-primary',
                  isLoggedIn
                    ? 'border border-slate-100 border-l-4 border-l-navy-primary shadow-sm'
                    : 'border border-slate-100'
                )}
              />
            </div>

            <div>
              <label className={isLoggedIn ? labelEmphasis : labelDefault}>
                {p.inquiry_line_contact_label ?? p.inquiry_line_id_label}
              </label>
              <input
                type="text"
                value={formData.lineId}
                onChange={(e) => setFormData({ ...formData, lineId: e.target.value })}
                placeholder={p.inquiry_line_contact_placeholder ?? '@example'}
                className={clsx(
                  'w-full rounded-xl border bg-slate-50 px-4 py-3.5 text-sm outline-none transition-all focus:ring-2 focus:ring-navy-primary',
                  isLoggedIn
                    ? 'border border-slate-100 border-l-4 border-l-navy-primary shadow-sm'
                    : 'border border-slate-100'
                )}
              />
              <p className="mt-1 text-[10px] text-slate-400">
                {p.inquiry_line_contact_hint ?? p.inquiry_line_id_hint}
              </p>
            </div>

            <div>
              <label className="mb-1.5 ml-1 block text-[10px] font-normal uppercase tracking-widest text-slate-400">
                {dict.labels.inquiry_content_label}
              </label>
              <textarea
                rows={4}
                required
                value={formData.message}
                onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                className="w-full resize-none rounded-xl border border-slate-100 bg-slate-50 px-4 py-3.5 text-sm outline-none transition-all focus:ring-2 focus:ring-navy-primary"
                onInvalid={(e) =>
                  (e.target as HTMLTextAreaElement).setCustomValidity(dict.property.error_message_required)
                }
                onInput={(e) => (e.target as HTMLTextAreaElement).setCustomValidity('')}
              />
            </div>

            {error && <div className="px-1 text-xs font-normal text-red-500">{error}</div>}

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
