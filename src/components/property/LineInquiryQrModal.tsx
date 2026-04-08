'use client'

import { useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import { QRCodeSVG } from 'qrcode.react'

type LineInquiryQrModalProps = {
  isOpen: boolean
  onClose: () => void
  /** 友だち追加URLなど、QRに埋め込む文字列 */
  url: string
  dict: {
    line_inquiry_qr_modal_title?: string
    line_inquiry_qr_modal_hint?: string
    line_inquiry_qr_modal_close?: string
  }
}

export function LineInquiryQrModal({
  isOpen,
  onClose,
  url,
  dict,
}: LineInquiryQrModalProps) {
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

  if (!isOpen || typeof document === 'undefined') return null

  const title =
    dict.line_inquiry_qr_modal_title ?? 'LINEで問い合わせ'
  const hint =
    dict.line_inquiry_qr_modal_hint ??
    'スマホのカメラで読み取るとLINEでお問い合わせいただけます'
  const closeLabel = dict.line_inquiry_qr_modal_close ?? '閉じる'

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
      <div className="relative z-[1] w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-6 shadow-xl">
        <button
          type="button"
          onClick={onClose}
          className="absolute right-3 top-3 rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-800"
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
        <p className="mt-2 text-sm font-medium leading-relaxed text-slate-600">
          {hint}
        </p>
        <div className="mt-5 flex justify-center rounded-xl border border-slate-100 bg-white p-4">
          <QRCodeSVG value={url} size={200} level="M" includeMargin />
        </div>
        <button
          type="button"
          onClick={onClose}
          className="mt-5 w-full rounded-xl border border-slate-200 py-3 text-sm font-black text-slate-700 transition hover:bg-slate-50"
        >
          {closeLabel}
        </button>
      </div>
    </div>,
    document.body
  )
}
