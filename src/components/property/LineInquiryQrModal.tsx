'use client'

import { useEffect, useCallback, useState, useRef, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { X, ClipboardCopy } from 'lucide-react'
import { QRCodeSVG } from 'qrcode.react'
import { copyTextToClipboard } from '@/lib/clipboard-copy'

export type LineInquiryQrModalDict = {
  line_inquiry_qr_modal_title?: string
  line_inquiry_qr_modal_hint?: string
  line_inquiry_qr_modal_close?: string
  line_inquiry_flow_step_add?: string
  line_inquiry_flow_step_paste?: string
  line_inquiry_flow_step_send?: string
  line_inquiry_copy_prefill_btn?: string
  line_inquiry_copy_toast?: string
  line_inquiry_qr_first_time_note?: string
}

type LineInquiryQrModalProps = {
  isOpen: boolean
  onClose: () => void
  /** QR に埋め込む line.me URL */
  url: string
  /** クリップボード用の定型文（URL のクエリと同一） */
  prefillBody: string
  dict: LineInquiryQrModalDict
}

function StepRow({ n, children }: { n: number; children: ReactNode }) {
  return (
    <li className="flex gap-3">
      <span
        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-navy-primary text-[12px] font-black text-white shadow-sm"
        aria-hidden
      >
        {n}
      </span>
      <span className="min-w-0 pt-0.5 text-[13px] font-medium leading-snug text-slate-700">
        {children}
      </span>
    </li>
  )
}

export function LineInquiryQrModal({
  isOpen,
  onClose,
  url,
  prefillBody,
  dict,
}: LineInquiryQrModalProps) {
  const [toast, setToast] = useState(false)
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const clearToastTimer = useCallback(() => {
    if (toastTimerRef.current) {
      clearTimeout(toastTimerRef.current)
      toastTimerRef.current = null
    }
  }, [])

  const showToast = useCallback(() => {
    setToast(true)
    clearToastTimer()
    toastTimerRef.current = window.setTimeout(() => {
      setToast(false)
      toastTimerRef.current = null
    }, 2500)
  }, [clearToastTimer])

  const onKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    },
    [onClose]
  )

  useEffect(() => {
    if (!isOpen) return
    document.addEventListener('keydown', onKeyDown)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      document.body.style.overflow = prev
    }
  }, [isOpen, onKeyDown])

  useEffect(() => {
    if (!isOpen) {
      setToast(false)
      clearToastTimer()
    }
  }, [isOpen, clearToastTimer])

  useEffect(() => () => clearToastTimer(), [clearToastTimer])

  const handleCopyPrefill = async () => {
    const ok = await copyTextToClipboard(prefillBody)
    if (ok) showToast()
  }

  if (!isOpen || typeof document === 'undefined') return null

  const title = dict.line_inquiry_qr_modal_title ?? 'LINEで問い合わせ'
  const hint =
    dict.line_inquiry_qr_modal_hint ??
    'スマホのカメラで読み取るとLINEでお問い合わせいただけます'
  const closeLabel = dict.line_inquiry_qr_modal_close ?? '閉じる'
  const step1 = dict.line_inquiry_flow_step_add ?? 'QRコードで友だちを追加'
  const step2 = dict.line_inquiry_flow_step_paste ?? 'トーク画面に文章を貼り付け'
  const step3 = dict.line_inquiry_flow_step_send ?? '送信'
  const copyBtn =
    dict.line_inquiry_copy_prefill_btn ?? '問い合わせ文章をコピー'
  const toastMsg = dict.line_inquiry_copy_toast ?? 'コピーしました！'
  const firstNote =
    dict.line_inquiry_qr_first_time_note ??
    '※初めての方は、友だち追加後にこの文章を貼り付けて送信してください'

  const canCopy = Boolean(prefillBody.trim())

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="line-inquiry-qr-modal-title"
    >
      <button
        type="button"
        className="absolute inset-0 bg-black/50"
        aria-label={closeLabel}
        onClick={onClose}
      />
      <div className="relative z-[1] flex max-h-[min(90vh,640px)] w-full max-w-sm flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl">
        <div className="overflow-y-auto overscroll-contain p-6 pb-4">
          <button
            type="button"
            onClick={onClose}
            className="absolute right-3 top-3 z-10 rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-800"
            aria-label={closeLabel}
          >
            <X className="h-5 w-5" aria-hidden />
          </button>
          <h2
            id="line-inquiry-qr-modal-title"
            className="pr-10 text-lg font-black text-navy-primary"
          >
            {title}
          </h2>
          <p className="mt-2 text-sm font-medium leading-relaxed text-slate-600">{hint}</p>

          <ol className="mt-4 space-y-3 rounded-xl border border-slate-100 bg-[#F8FAFF] p-4">
            <StepRow n={1}>{step1}</StepRow>
            <StepRow n={2}>{step2}</StepRow>
            <StepRow n={3}>{step3}</StepRow>
          </ol>

          <div className="mt-5 flex justify-center rounded-xl border border-slate-100 bg-white p-4">
            <QRCodeSVG value={url} size={200} level="M" includeMargin />
          </div>

          {canCopy ? (
            <button
              type="button"
              onClick={handleCopyPrefill}
              className="mt-4 flex w-full min-h-12 items-center justify-center gap-2 rounded-xl border-2 border-navy-primary/25 bg-navy-primary/5 py-3 text-sm font-black text-navy-primary transition hover:bg-navy-primary/10"
            >
              <ClipboardCopy className="h-4 w-4 shrink-0" aria-hidden />
              {copyBtn}
            </button>
          ) : null}

          <p className="mt-3 text-center text-[11px] font-medium leading-relaxed text-slate-500">
            {firstNote}
          </p>
        </div>

        <div className="border-t border-slate-100 p-4 pt-3">
          <button
            type="button"
            onClick={onClose}
            className="w-full rounded-xl border border-slate-200 py-3 text-sm font-black text-slate-700 transition hover:bg-slate-50"
          >
            {closeLabel}
          </button>
        </div>

        {toast ? (
          <div
            className="pointer-events-none absolute bottom-24 left-1/2 z-20 -translate-x-1/2 animate-in fade-in zoom-in-95 duration-200 rounded-full bg-navy-primary px-5 py-2.5 text-sm font-black text-white shadow-lg"
            role="status"
          >
            {toastMsg}
          </div>
        ) : null}
      </div>
    </div>,
    document.body
  )
}
