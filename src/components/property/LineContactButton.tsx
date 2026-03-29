'use client'

import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { createPortal } from 'react-dom'
import { useParams } from 'next/navigation'
import { MessageCircle, X, Copy, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { buildLineInquiryEntryUrl, hasUsableLineContact } from '@/lib/line-contact-url'

const MD_MIN_PX = 768

/**
 * QR モーダルを出すか。
 * - md 以上: モーダル（従来どおり）
 * - 狭い幅でも、マウス主体の PC（coarse なし）はモーダル（DevTools モバイル幅でも line.me 中間ページに飛ばさない）
 * - スマホ等（pointer: coarse）かつ md 未満: LINE へ直接遷移
 */
function shouldShowLineQrModal(): boolean {
  if (typeof window === 'undefined') return false
  if (window.matchMedia(`(min-width: ${MD_MIN_PX}px)`).matches) return true
  return !window.matchMedia('(pointer: coarse)').matches
}

export interface PropertyInfo {
  id: string
  title: string
  price?: string
  url?: string
  refId?: string
  agentId?: string
  /** 出品エージェントの profiles.line_id（LINE ID / 友だち追加 URL / 公式 @BasicId） */
  agentLineContact?: string | null
}

interface LineContactButtonProps {
  property: PropertyInfo
  dict: {
    property?: Record<string, string>
  }
  className?: string
  variant?: 'full' | 'icon'
  /** false のとき LINE 遷移せずログイン誘導 */
  isLoggedIn?: boolean
  onRequireAuth?: () => void
  /** ログイン中の問い合わせ者の profiles.line_id（未設定なら LINE 問い合わせ不可） */
  viewerLineContact?: string | null
  /**
   * ログイン時にプロフィール取得が終わったら true。
   * false のあいだは誤ブロックを防ぐためボタンを待機表示にする。
   */
  viewerLineGateReady?: boolean
  /** LINE 連絡先未登録のとき（登録誘導モーダル） */
  onRequireViewerLine?: () => void
}

function formatMessage(template: string, propertyName: string) {
  return template.replace(/\{propertyName\}/g, propertyName)
}

/** 比較ページ等で渡されたURL（相対可）、または現在オリジン＋ロケールの物件詳細パス */
function buildPropertyDetailUrl(
  property: PropertyInfo,
  locale: string
): string {
  let raw = property.url?.trim() || ''
  if (raw.startsWith('/')) {
    if (typeof window === 'undefined') return ''
    raw = `${window.location.origin}${raw}`
  }
  if (raw) return raw
  if (typeof window === 'undefined' || !property.id) return ''
  return `${window.location.origin}/${locale}/properties/${property.id}`
}

function displayLineContactLabel(raw: string): string {
  const t = raw.trim()
  if (t.length <= 48) return t
  return `${t.slice(0, 45)}…`
}

export default function LineContactButton({
  property,
  dict,
  className = '',
  variant = 'full',
  isLoggedIn = true,
  onRequireAuth,
  viewerLineContact = null,
  viewerLineGateReady = true,
  onRequireViewerLine,
}: LineContactButtonProps) {
  const params = useParams()
  const locale = (params?.locale as string) || 'jp'
  const pr = dict.property ?? {}
  const [modalOpen, setModalOpen] = useState(false)

  const rawMsg = pr.inquiry_default_message ?? ''
  const detailUrl = buildPropertyDetailUrl(property, locale)
  const inquiryMessage = useMemo(() => {
    const body = formatMessage(rawMsg, property.title).trimEnd()
    if (!detailUrl) return body
    return `${body}\n\n${detailUrl}`
  }, [rawMsg, property.title, detailUrl])

  const agentLine = (property.agentLineContact ?? '').trim()
  const entry = useMemo(
    () => buildLineInquiryEntryUrl(agentLine || null, inquiryMessage),
    [agentLine, inquiryMessage]
  )

  const lineOpenUrl = entry?.url ?? ''
  const entryMode = entry?.mode
  const qrSrc = lineOpenUrl
    ? `https://api.qrserver.com/v1/create-qr-code/?size=240x240&margin=2&data=${encodeURIComponent(lineOpenUrl)}`
    : ''

  useEffect(() => {
    if (!modalOpen) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setModalOpen(false)
    }
    document.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [modalOpen])

  const logInquiry = useCallback(async () => {
    try {
      const res = await fetch('/api/inquiry-logs/line', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ property_id: property.id }),
      })
      if (!res.ok) {
        const j = (await res.json().catch(() => ({}))) as {
          error?: string
          code?: string
        }
        console.error('inquiry_logs API failed', res.status, j)
        if (res.status === 400 && j.code === 'LINE_CONTACT_REQUIRED') {
          toast.error(
            pr.line_viewer_required_toast ??
              'プロフィールにLINE連絡先を登録してください。'
          )
          onRequireViewerLine?.()
        }
      }
    } catch (e) {
      console.error('Failed to log line inquiry', e)
    }
  }, [property.id, pr.line_viewer_required_toast, onRequireViewerLine])

  const copyInquiryMessage = useCallback(async () => {
    if (!inquiryMessage.trim()) return
    try {
      await navigator.clipboard.writeText(inquiryMessage)
      toast.success(pr.line_copy_inquiry_success ?? 'コピーしました')
    } catch {
      toast.error(pr.line_copy_inquiry_fail ?? 'コピーに失敗しました')
    }
  }, [inquiryMessage, pr.line_copy_inquiry_fail, pr.line_copy_inquiry_success])

  const handleLineContact = async () => {
    if (!isLoggedIn) {
      onRequireAuth?.()
      return
    }
    if (!viewerLineGateReady) return
    if (!hasUsableLineContact(viewerLineContact)) {
      onRequireViewerLine?.()
      return
    }
    if (!entry) return

    await logInquiry()

    if (shouldShowLineQrModal()) {
      setModalOpen(true)
      return
    }

    window.location.href = lineOpenUrl
  }

  const baseClasses =
    variant === 'icon'
      ? 'flex flex-col items-center justify-center gap-0.5 rounded-xl border-2 border-[#06C755] bg-white text-[#06C755] font-black uppercase text-center transition-all active:scale-95 shadow-sm shadow-[#06C755]/10'
      : 'flex w-full items-center justify-center gap-2 rounded-lg border border-[#06C755] bg-white py-3 font-bold text-[#06C755] shadow-sm transition-all hover:bg-[#06C755] hover:text-white'

  const disabledClasses =
    'cursor-not-allowed border-slate-200 bg-slate-100 text-slate-400 shadow-none hover:bg-slate-100 hover:text-slate-400'

  const modalHint =
    entryMode === 'oa_prefill'
      ? (pr.line_modal_scan_hint ?? '')
      : (pr.line_modal_scan_hint_paste ?? pr.line_modal_scan_hint ?? '')

  const modal =
    modalOpen && entry && typeof document !== 'undefined'
      ? createPortal(
          <div
            className="fixed inset-0 z-[200] flex items-center justify-center p-4 md:p-6"
            role="dialog"
            aria-modal="true"
            aria-labelledby="line-modal-title"
          >
            <button
              type="button"
              className="absolute inset-0 bg-black/45 backdrop-blur-[2px]"
              aria-label={pr.line_modal_close_aria ?? 'Close'}
              onClick={() => setModalOpen(false)}
            />
            <div className="relative z-10 w-full max-w-sm rounded-2xl border border-slate-200/80 bg-white p-6 shadow-xl md:max-w-md">
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="absolute right-3 top-3 rounded-full p-2 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-800"
                aria-label={pr.line_modal_close_aria ?? 'Close'}
              >
                <X className="w-5 h-5" />
              </button>
              <h2
                id="line-modal-title"
                className="pr-10 text-center text-lg font-semibold tracking-tight text-slate-900"
              >
                {pr.line_modal_title ?? 'LINE'}
              </h2>
              <div className="mt-5 flex flex-col items-center gap-4">
                <div className="rounded-xl border border-slate-100 bg-slate-50 p-3 shadow-inner">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={qrSrc}
                    alt=""
                    width={220}
                    height={220}
                    className="h-[220px] w-[220px] object-contain"
                  />
                </div>
                <p className="text-center text-sm leading-relaxed text-slate-600">
                  {modalHint}
                </p>
                {entryMode === 'open_chat' && inquiryMessage.trim() ? (
                  <button
                    type="button"
                    onClick={() => void copyInquiryMessage()}
                    className="flex w-full items-center justify-center gap-2 rounded-xl border border-[#06C755]/40 bg-[#06C755]/5 py-3 text-sm font-bold text-[#025c2c] transition hover:bg-[#06C755]/10"
                  >
                    <Copy className="h-4 w-4 shrink-0" aria-hidden />
                    {pr.line_copy_inquiry_message ?? '問い合わせ文をコピー'}
                  </button>
                ) : null}
                <div className="w-full rounded-xl border border-slate-100 bg-slate-50 px-4 py-3 text-center">
                  <p className="text-xs font-medium text-slate-500">
                    {pr.line_modal_id_label_agent ?? pr.line_modal_id_label ?? 'LINE'}
                  </p>
                  <p className="mt-1 break-all font-mono text-sm font-semibold text-slate-900">
                    {displayLineContactLabel(agentLine)}
                  </p>
                </div>
              </div>
            </div>
          </div>,
          document.body
        )
      : null

  if (!entry) {
    return (
      <button
        type="button"
        disabled
        title={pr.line_not_configured_hint ?? ''}
        className={`${baseClasses} ${disabledClasses} ${className}`}
      >
        <MessageCircle
          className={variant === 'icon' ? 'h-5 w-5' : 'h-5 w-5'}
          fill="currentColor"
          strokeWidth={0}
        />
        <span
          className={
            variant === 'icon' ? 'text-[10px] leading-tight px-1' : ''
          }
        >
          {pr.line_inquiry_btn ?? 'LINE'}
        </span>
      </button>
    )
  }

  const waitingProfile =
    isLoggedIn && !viewerLineGateReady && Boolean(entry)

  return (
    <>
      <button
        type="button"
        disabled={waitingProfile}
        title={
          waitingProfile
            ? (pr.line_viewer_gate_loading_hint ?? '')
            : isLoggedIn &&
                viewerLineGateReady &&
                !hasUsableLineContact(viewerLineContact)
              ? (pr.line_viewer_required_title ?? '')
              : undefined
        }
        onClick={() => void handleLineContact()}
        className={`${baseClasses} ${className} ${waitingProfile ? disabledClasses : ''}`}
      >
        {waitingProfile ? (
          <Loader2
            className={variant === 'icon' ? 'h-5 w-5 animate-spin' : 'h-5 w-5 animate-spin'}
            aria-hidden
          />
        ) : (
          <MessageCircle
            className={variant === 'icon' ? 'h-5 w-5' : 'h-5 w-5'}
            fill="currentColor"
            strokeWidth={0}
          />
        )}
        <span
          className={
            variant === 'icon' ? 'text-[10px] leading-tight px-1' : ''
          }
        >
          {pr.line_inquiry_btn ?? 'LINE'}
        </span>
      </button>
      {modal}
    </>
  )
}
