'use client'

import { useEffect, useMemo } from 'react'
import { createPortal } from 'react-dom'
import Link from 'next/link'
import { X, LogIn, UserPlus, MessageCircle, Heart } from 'lucide-react'

type DictProperty = Record<string, string | undefined>

interface ContactAuthRequiredModalProps {
  open: boolean
  onClose: () => void
  locale: string
  dictProperty: DictProperty
  /** ログイン・登録後に戻すパス（先頭 /、ロケール付き。クエリ可） */
  returnPath: string
}

export default function ContactAuthRequiredModal({
  open,
  onClose,
  locale,
  dictProperty,
  returnPath,
}: ContactAuthRequiredModalProps) {
  const redirectParam = useMemo(() => {
    const path = returnPath?.trim() || `/${locale}`
    return encodeURIComponent(path.startsWith('/') ? path : `/${locale}`)
  }, [returnPath, locale])

  const loginHref = `/${locale}/login?redirect=${redirectParam}`
  const registerHref = `/${locale}/register?redirect=${redirectParam}`

  const p = dictProperty

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
      aria-labelledby="contact-auth-modal-title"
    >
      <button
        type="button"
        className="absolute inset-0 bg-black/50 backdrop-blur-[2px]"
        aria-label={p.contact_auth_close ?? 'Close'}
        onClick={onClose}
      />
      <div className="relative z-10 flex max-h-[min(90vh,640px)] w-full max-w-lg flex-col overflow-hidden rounded-t-3xl border border-slate-200/80 bg-white shadow-2xl sm:max-h-[85vh] sm:rounded-3xl">
        <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-5 py-4 sm:px-6">
          <div className="min-w-0">
            <h2
              id="contact-auth-modal-title"
              className="text-lg font-black tracking-tight text-navy-secondary sm:text-xl"
            >
              {p.contact_auth_modal_title ?? '会員登録で問い合わせ'}
            </h2>
            <p className="mt-1 text-xs font-bold text-[#06C755]">
              {p.contact_auth_modal_subtitle ?? ''}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 rounded-full p-2 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-800"
            aria-label={p.contact_auth_close ?? 'Close'}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="overflow-y-auto px-5 py-4 sm:px-6 sm:py-5">
          <p className="whitespace-pre-line text-sm font-medium leading-relaxed text-slate-700">
            {p.contact_auth_modal_body ?? ''}
          </p>
          <ul className="mt-4 space-y-2 text-sm font-bold text-slate-800">
            <li className="flex gap-2">
              <MessageCircle className="mt-0.5 h-4 w-4 shrink-0 text-[#06C755]" />
              <span>{p.contact_auth_benefit_line ?? ''}</span>
            </li>
            <li className="flex gap-2">
              <Heart className="mt-0.5 h-4 w-4 shrink-0 text-red-500" />
              <span>{p.contact_auth_benefit_favorites ?? ''}</span>
            </li>
          </ul>
        </div>

        <div className="flex flex-col gap-2 border-t border-slate-100 bg-slate-50/80 px-5 py-4 sm:flex-row sm:px-6">
          <Link
            href={loginHref}
            onClick={onClose}
            className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-navy-primary px-4 py-3 text-sm font-black text-white shadow-md transition hover:bg-navy-secondary"
          >
            <LogIn className="h-4 w-4" />
            {p.contact_auth_login_btn ?? 'ログイン'}
          </Link>
          <Link
            href={registerHref}
            onClick={onClose}
            className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl border-2 border-navy-primary bg-white px-4 py-3 text-sm font-black text-navy-primary transition hover:bg-navy-primary/5"
          >
            <UserPlus className="h-4 w-4" />
            {p.contact_auth_register_btn ?? '新規登録（無料）'}
          </Link>
        </div>
      </div>
    </div>,
    document.body
  )
}
