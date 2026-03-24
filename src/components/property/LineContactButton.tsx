'use client'

import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { createPortal } from 'react-dom'
import { useParams } from 'next/navigation'
import { MessageCircle, X } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

const LINE_ID = '@164exdsf'
const MD_MIN_PX = 768

function isDesktopViewport(): boolean {
  if (typeof window === 'undefined') return false
  return window.matchMedia(`(min-width: ${MD_MIN_PX}px)`).matches
}

interface PropertyInfo {
  id: string
  title: string
  price?: string
  url?: string
  refId?: string
  agentId?: string
}

interface LineContactButtonProps {
  property: PropertyInfo
  dict: {
    property?: Record<string, string>
  }
  className?: string
  variant?: 'full' | 'icon'
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

export default function LineContactButton({
  property,
  dict,
  className = '',
  variant = 'full',
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

  const lineMessageUrl = `https://line.me/R/oaMessage/${LINE_ID}/?${encodeURIComponent(inquiryMessage)}`
  const qrSrc = `https://api.qrserver.com/v1/create-qr-code/?size=240x240&margin=2&data=${encodeURIComponent(lineMessageUrl)}`

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
      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()

      await supabase.from('inquiry_logs').insert({
        property_id: property.id,
        user_id: user?.id || null,
        inquiry_type: 'line',
      })
    } catch (e) {
      console.error('Failed to log line inquiry', e)
    }
  }, [property.id])

  const handleLineContact = async () => {
    await logInquiry()

    if (isDesktopViewport()) {
      setModalOpen(true)
      return
    }

    window.location.href = lineMessageUrl
  }

  const baseClasses =
    variant === 'icon'
      ? 'flex flex-col items-center justify-center gap-0.5 rounded-xl border-2 border-[#06C755] bg-white text-[#06C755] font-black uppercase text-center transition-all active:scale-95 shadow-sm shadow-[#06C755]/10'
      : 'flex w-full items-center justify-center gap-2 rounded-lg border border-[#06C755] bg-white py-3 font-bold text-[#06C755] shadow-sm transition-all hover:bg-[#06C755] hover:text-white'

  const modal =
    modalOpen && typeof document !== 'undefined'
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
                <X className="h-5 w-5" />
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
                  {pr.line_modal_scan_hint ?? ''}
                </p>
                <div className="w-full rounded-xl border border-slate-100 bg-slate-50 px-4 py-3 text-center">
                  <p className="text-xs font-medium text-slate-500">
                    {pr.line_modal_id_label ?? 'LINE ID'}
                  </p>
                  <p className="mt-1 font-mono text-base font-semibold text-slate-900">
                    {LINE_ID}
                  </p>
                </div>
              </div>
            </div>
          </div>,
          document.body
        )
      : null

  return (
    <>
      <button
        type="button"
        onClick={handleLineContact}
        className={`${baseClasses} ${className}`}
      >
        <MessageCircle
          className={variant === 'icon' ? 'h-5 w-5' : 'h-5 w-5'}
          fill="currentColor"
          strokeWidth={0}
        />
        <span className={variant === 'icon' ? 'text-[10px] leading-tight px-1' : ''}>
          {pr.line_inquiry_btn ?? 'LINE'}
        </span>
      </button>
      {modal}
    </>
  )
}
