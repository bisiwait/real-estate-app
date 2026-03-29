'use client'

import { useEffect, useMemo } from 'react'
import { createPortal } from 'react-dom'
import Link from 'next/link'
import { X, MessageCircle } from 'lucide-react'

type DictProperty = Record<string, string | undefined>

interface ViewerLineRequiredModalProps {
  open: boolean
  onClose: () => void
  locale: string
  dictProperty: DictProperty
}

export default function ViewerLineRequiredModal({
  open,
  onClose,
  locale,
  dictProperty,
}: ViewerLineRequiredModalProps) {
  const p = dictProperty

  const profileEditHref = useMemo(
    () => `/${locale}/profile/edit`,
    [locale]
  )

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [open, onClose])

  if (!open || typeof document === 'undefined') return null

  return createPortal(
    <div
      className="fixed inset-0 z-[220] flex items-end justify-center p-0 sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="viewer-line-required-title"
    >
      <button
        type="button"
        className="absolute inset-0 bg-black/50 backdrop-blur-[2px]"
        aria-label={p.line_modal_close_aria ?? 'Close'}
        onClick={onClose}
      />
      <div className="relative z-10 flex max-h-[min(90vh,520px)] w-full max-w-lg flex-col overflow-hidden rounded-t-3xl border border-slate-200/80 bg-white shadow-2xl sm:max-h-[85vh] sm:rounded-3xl">
        <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-5 py-4 sm:px-6">
          <div className="min-w-0">
            <h2
              id="viewer-line-required-title"
              className="text-lg font-black tracking-tight text-navy-secondary sm:text-xl"
            >
              {p.line_viewer_required_title ?? 'LINE連絡先の登録が必要です'}
            </h2>
            <p className="mt-1 text-xs font-bold text-[#06C755]">
              {p.line_viewer_required_subtitle ?? ''}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 rounded-full p-2 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-800"
            aria-label={p.line_modal_close_aria ?? 'Close'}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="overflow-y-auto px-5 py-4 sm:px-6 sm:py-5">
          <p className="whitespace-pre-line text-sm font-medium leading-relaxed text-slate-700">
            {p.line_viewer_required_body ?? ''}
          </p>
          <ul className="mt-4 space-y-2 text-sm font-bold text-slate-800">
            <li className="flex gap-2">
              <MessageCircle className="mt-0.5 h-4 w-4 shrink-0 text-[#06C755]" />
              <span>{p.line_viewer_required_bullet ?? ''}</span>
            </li>
          </ul>
        </div>

        <div className="border-t border-slate-100 bg-slate-50/80 px-5 py-4 sm:px-6">
          <Link
            href={profileEditHref}
            onClick={onClose}
            className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#06C755] px-4 py-3 text-sm font-black text-white shadow-md transition hover:bg-[#05b34c]"
          >
            <MessageCircle className="h-4 w-4" />
            {p.line_viewer_required_cta ?? 'プロフィールでLINE連絡先を登録'}
          </Link>
        </div>
      </div>
    </div>,
    document.body
  )
}
