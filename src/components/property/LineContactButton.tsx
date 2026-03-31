'use client'

import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { createPortal } from 'react-dom'
import { useParams } from 'next/navigation'
import { MessageCircle, X, Copy, Loader2, ExternalLink, CheckCircle2 } from 'lucide-react'
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
  /**
   * false のときエージェントが非表示にした扱い。ボタンを出さない（比較表などでは「—」）。
   * 未設定は true（従来どおり）。
   */
  showAgentLineInquiry?: boolean
  /** showAgentLineInquiry が false のとき、プレースホルダーではなく何も描画しない */
  renderNothingWhenHidden?: boolean
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
  showAgentLineInquiry = true,
  renderNothingWhenHidden = false,
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
  const [officialOpen, setOfficialOpen] = useState(false)
  const [officialData, setOfficialData] = useState<{
    nonce: string
    add_friend_url: string
    expires_in_hours: number
  } | null>(null)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [confirmSending, setConfirmSending] = useState(false)

  const rawMsg = pr.inquiry_default_message ?? ''
  const detailUrl = buildPropertyDetailUrl(property, locale)
  const inquiryMessage = useMemo(() => {
    const body = formatMessage(rawMsg, property.title).trimEnd()
    if (!detailUrl) return body
    return `${body}\n\n${detailUrl}`
  }, [rawMsg, property.title, detailUrl])

  const agentLine = showAgentLineInquiry ? (property.agentLineContact ?? '').trim() : ''
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
    if (!modalOpen && !officialOpen && !confirmOpen) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (confirmSending) return
        setModalOpen(false)
        setOfficialOpen(false)
        setConfirmOpen(false)
      }
    }
    document.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [modalOpen, officialOpen, confirmOpen, confirmSending])

  type LogInquiryResult =
    | { kind: 'official'; data: { nonce: string; add_friend_url: string; expires_in_hours: number } }
    | { kind: 'ok' }
    | { kind: 'blocked' }

  const logInquiry = useCallback(async (): Promise<LogInquiryResult> => {
    try {
      const res = await fetch('/api/inquiry-logs/line', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ property_id: property.id }),
      })
      const j = (await res.json().catch(() => ({}))) as {
        error?: string
        code?: string
        official_routing?: {
          nonce?: string
          add_friend_url?: string
          expires_in_hours?: number
        }
      }
      if (res.status === 400 && j.code === 'LINE_CONTACT_REQUIRED') {
        toast.error(
          pr.line_viewer_required_toast ??
            'プロフィールにLINE連絡先を登録してください。'
        )
        onRequireViewerLine?.()
        return { kind: 'blocked' }
      }
      if (!res.ok) {
        console.error('inquiry_logs API failed', res.status, j)
        toast.error(
          typeof j.error === 'string' ? j.error : 'ログの記録に失敗しました。'
        )
        return { kind: 'blocked' }
      }
      const or = j.official_routing
      if (
        or &&
        typeof or.nonce === 'string' &&
        typeof or.add_friend_url === 'string'
      ) {
        return {
          kind: 'official',
          data: {
            nonce: or.nonce,
            add_friend_url: or.add_friend_url,
            expires_in_hours: typeof or.expires_in_hours === 'number' ? or.expires_in_hours : 72,
          },
        }
      }
      return { kind: 'ok' }
    } catch (e) {
      console.error('Failed to log line inquiry', e)
      toast.error('通信に失敗しました。')
      return { kind: 'blocked' }
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

  const handleLineContact = () => {
    if (!isLoggedIn) {
      onRequireAuth?.()
      return
    }
    if (!viewerLineGateReady) return
    if (!entry) return
    setConfirmOpen(true)
  }

  const submitLineInquiry = async () => {
    if (confirmSending) return
    setConfirmSending(true)
    try {
      const logged = await logInquiry()
      setConfirmOpen(false)
      if (logged.kind === 'blocked') return

      if (logged.kind === 'official') {
        setOfficialData(logged.data)
        setOfficialOpen(true)
        return
      }

      toast.success(
        pr.line_confirm_success_recorded ?? 'サイトに記録しました。LINEの手続きに進みます。'
      )

      if (!hasUsableLineContact(viewerLineContact)) {
        onRequireViewerLine?.()
        return
      }

      if (shouldShowLineQrModal()) {
        setModalOpen(true)
        return
      }

      window.location.href = lineOpenUrl
    } finally {
      setConfirmSending(false)
    }
  }

  const copyOfficialNonce = useCallback(async () => {
    if (!officialData?.nonce) return
    try {
      await navigator.clipboard.writeText(officialData.nonce)
      toast.success(pr.line_official_copy_nonce_ok ?? pr.line_copy_inquiry_success ?? 'コピーしました')
    } catch {
      toast.error(pr.line_copy_inquiry_fail ?? 'コピーに失敗しました')
    }
  }, [officialData, pr.line_copy_inquiry_fail, pr.line_copy_inquiry_success, pr.line_official_copy_nonce_ok])

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

  const officialModal =
    officialOpen && officialData && typeof document !== 'undefined'
      ? createPortal(
          <div
            className="fixed inset-0 z-[200] flex items-center justify-center p-4 md:p-6"
            role="dialog"
            aria-modal="true"
            aria-labelledby="line-official-modal-title"
          >
            <button
              type="button"
              className="absolute inset-0 bg-black/45 backdrop-blur-[2px]"
              aria-label={pr.line_modal_close_aria ?? 'Close'}
              onClick={() => {
                setOfficialOpen(false)
                setOfficialData(null)
              }}
            />
            <div className="relative z-10 w-full max-w-sm rounded-2xl border border-slate-200/80 bg-white p-6 shadow-xl md:max-w-md">
              <button
                type="button"
                onClick={() => {
                  setOfficialOpen(false)
                  setOfficialData(null)
                }}
                className="absolute right-3 top-3 rounded-full p-2 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-800"
                aria-label={pr.line_modal_close_aria ?? 'Close'}
              >
                <X className="w-5 h-5" />
              </button>
              <h2
                id="line-official-modal-title"
                className="pr-10 text-center text-lg font-semibold tracking-tight text-slate-900"
              >
                {pr.line_official_modal_title ?? '公式LINEでお問い合わせ'}
              </h2>
              <div className="mt-4 flex gap-3 rounded-xl border border-emerald-200/90 bg-emerald-50/95 px-4 py-3 text-left">
                <CheckCircle2
                  className="h-5 w-5 shrink-0 text-emerald-600"
                  aria-hidden
                />
                <div className="min-w-0">
                  <p className="text-sm font-bold text-emerald-900">
                    {pr.line_official_registered_title ?? 'お問い合わせを受け付けました'}
                  </p>
                  <p className="mt-1.5 text-xs leading-relaxed text-emerald-900/90">
                    {pr.line_official_registered_body ??
                      'このサイトに記録済みです。あと2ステップで公式LINEから担当へつながります。'}
                  </p>
                </div>
              </div>
              <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-left">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  {pr.line_official_property_label ?? 'お問い合わせの物件'}
                </p>
                <p className="mt-1.5 text-sm font-bold leading-snug text-[#1A2B56]">
                  {property.title?.trim() ? property.title : '—'}
                </p>
                {property.refId ? (
                  <p className="mt-2 text-[11px] text-slate-500">
                    {(pr.line_official_ref_label ?? '参照').replace(
                      '{ref}',
                      String(property.refId)
                    )}
                  </p>
                ) : null}
              </div>
              <p className="mt-3 text-center text-xs font-bold text-slate-600">
                {pr.line_official_next_heading ?? '次の手順'}
              </p>
              <ol className="mt-3 space-y-4 text-sm leading-relaxed text-slate-600">
                <li className="flex gap-3">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#06C755]/15 text-xs font-black text-[#025c2c">
                    1
                  </span>
                  <div>
                    <p className="font-bold text-slate-800">
                      {pr.line_official_step_add_friend ?? '公式LINEを友だち追加'}
                    </p>
                    <a
                      href={officialData.add_friend_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-2 inline-flex items-center gap-1.5 rounded-xl border border-[#06C755]/40 bg-[#06C755]/5 px-4 py-2.5 text-sm font-bold text-[#025c2c] transition hover:bg-[#06C755]/10"
                    >
                      <ExternalLink className="h-4 w-4 shrink-0" aria-hidden />
                      {pr.line_official_open_line ?? 'LINEを開く'}
                    </a>
                  </div>
                </li>
                <li className="flex gap-3">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#06C755]/15 text-xs font-black text-[#025c2c">
                    2
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="font-bold text-slate-800">
                      {pr.line_official_step_send_code ?? 'トークに次のコードを送信'}
                    </p>
                    <div className="mt-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-center">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                        {pr.line_official_nonce_label ?? 'お問い合わせコード'}
                      </p>
                      <p className="mt-1 font-mono text-xl font-black tracking-widest text-slate-900">
                        {officialData.nonce}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => void copyOfficialNonce()}
                      className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 py-2.5 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
                    >
                      <Copy className="h-4 w-4 shrink-0" aria-hidden />
                      {pr.line_official_copy_nonce ?? 'コードをコピー'}
                    </button>
                  </div>
                </li>
              </ol>
              <p className="mt-4 text-center text-xs text-slate-400">
                {(pr.line_official_expires_note ?? 'このコードの有効期限: {hours}時間').replace(
                  '{hours}',
                  String(officialData.expires_in_hours)
                )}
              </p>
              <p className="mt-2 text-center text-[11px] leading-relaxed text-slate-500">
                {pr.line_official_footer_note ??
                  '担当エージェントへ内容が連携されます。メッセージは公式LINEのトークで行われます。'}
              </p>
            </div>
          </div>,
          document.body
        )
      : null

  const confirmModal =
    confirmOpen && entry && typeof document !== 'undefined'
      ? createPortal(
          <div
            className="fixed inset-0 z-[200] flex items-center justify-center p-4 md:p-6"
            role="dialog"
            aria-modal="true"
            aria-labelledby="line-confirm-modal-title"
          >
            <button
              type="button"
              className="absolute inset-0 bg-black/45 backdrop-blur-[2px]"
              aria-label={pr.line_modal_close_aria ?? 'Close'}
              disabled={confirmSending}
              onClick={() => {
                if (confirmSending) return
                setConfirmOpen(false)
              }}
            />
            <div className="relative z-10 w-full max-w-md rounded-2xl border border-slate-200/80 bg-white p-6 shadow-xl">
              <button
                type="button"
                disabled={confirmSending}
                onClick={() => setConfirmOpen(false)}
                className="absolute right-3 top-3 rounded-full p-2 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-800 disabled:opacity-40"
                aria-label={pr.line_modal_close_aria ?? 'Close'}
              >
                <X className="w-5 h-5" />
              </button>
              <h2
                id="line-confirm-modal-title"
                className="pr-10 text-center text-lg font-semibold tracking-tight text-slate-900"
              >
                {pr.line_confirm_title ?? 'LINEで問い合わせ'}
              </h2>
              <p className="mt-4 text-center text-sm font-medium leading-relaxed text-slate-700">
                {pr.line_confirm_intro ??
                  'この内容で担当エージェントへ問い合わせます。「送信」でサイトに記録し、LINEの手続きに進みます。'}
              </p>
              <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  {pr.line_confirm_property_label ?? '物件'}
                </p>
                <p className="mt-1 text-sm font-bold leading-snug text-[#1A2B56]">
                  {property.title?.trim() ? property.title : '—'}
                </p>
                {property.refId ? (
                  <p className="mt-1.5 text-[11px] text-slate-500">
                    {(pr.line_official_ref_label ?? '物件番号: {ref}').replace(
                      '{ref}',
                      String(property.refId)
                    )}
                  </p>
                ) : null}
              </div>
              <div className="mt-4">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  {pr.line_confirm_message_label ?? '送信するメッセージ'}
                </p>
                <pre className="mt-2 max-h-36 overflow-y-auto whitespace-pre-wrap break-words rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-left text-xs leading-relaxed text-slate-700">
                  {inquiryMessage.trim() || '—'}
                </pre>
              </div>
              <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  disabled={confirmSending}
                  onClick={() => setConfirmOpen(false)}
                  className="w-full rounded-xl border border-slate-200 py-3 text-sm font-bold text-slate-600 transition hover:bg-slate-50 disabled:opacity-50 sm:w-auto sm:min-w-[7rem]"
                >
                  {pr.line_confirm_cancel ?? 'キャンセル'}
                </button>
                <button
                  type="button"
                  disabled={confirmSending}
                  onClick={() => void submitLineInquiry()}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#06C755] py-3 text-sm font-bold text-white shadow-md transition hover:bg-[#059c46] disabled:opacity-60 sm:w-auto sm:min-w-[7rem] sm:px-6"
                >
                  {confirmSending ? (
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                  ) : null}
                  {confirmSending
                    ? (pr.line_confirm_sending ?? '送信中…')
                    : (pr.line_confirm_send ?? '送信')}
                </button>
              </div>
            </div>
          </div>,
          document.body
        )
      : null

  if (!showAgentLineInquiry) {
    if (renderNothingWhenHidden) return null
    return (
      <span className={`text-slate-400 text-sm font-medium ${className}`}>—</span>
    )
  }

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
        title={waitingProfile ? (pr.line_viewer_gate_loading_hint ?? '') : undefined}
        onClick={handleLineContact}
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
      {officialModal}
      {confirmModal}
    </>
  )
}
