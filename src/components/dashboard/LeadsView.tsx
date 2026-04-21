'use client'

import React, { useCallback, useEffect, useState } from 'react'
import {
  MessageCircle,
  FileText,
  User,
  Users,
  ExternalLink,
  Loader2,
  ChevronDown,
  Copy,
} from 'lucide-react'
import { toast } from 'sonner'
import { buildLeadLineReplyUrls } from '@/lib/line-contact-url'

export type LeadStatusValue = 'pending' | 'replied' | 'viewing' | 'won' | 'lost'

export interface LeadRow {
  id: string
  created_at: string
  inquiry_type: string
  status: string
  property_id: string
  user_id: string | null
  notes?: string | null
  property?: { title: string; id: string } | null
  profile?: {
    full_name: string | null
    email: string | null
    phone: string | null
    line_id: string | null
  } | null
}

function normalizeStatus(raw: string | undefined | null): LeadStatusValue {
  const s = (raw || '').toLowerCase()
  if (
    s === 'pending' ||
    s === 'replied' ||
    s === 'viewing' ||
    s === 'won' ||
    s === 'lost'
  ) {
    return s
  }
  if (s === 'new') return 'pending'
  if (s === 'contacted') return 'replied'
  if (s === 'closed') return 'won'
  return 'pending'
}

function getTypeLabel(type: string, dict: any) {
  switch (String(type).toLowerCase()) {
    case 'line':
      return 'LINE'
    case 'phone':
      return dict.leads_type_phone
    case 'form':
      return dict.leads_type_form
    default:
      return type
  }
}

function openLineReplyPreferApp(
  e: React.MouseEvent<HTMLAnchorElement>,
  httpsUrl: string,
  appUrl: string | null,
  isMobile: boolean
) {
  if (!isMobile || !appUrl) return
  e.preventDefault()
  window.location.href = appUrl
  window.setTimeout(() => {
    window.open(httpsUrl, '_blank', 'noopener,noreferrer')
  }, 700)
}

function lineCopyPayload(lineId: string | null | undefined): string {
  const urls = buildLeadLineReplyUrls(lineId)
  if (urls?.httpsUrl) return urls.httpsUrl
  return (lineId ?? '').trim()
}

async function copyLineContact(lineId: string | null | undefined, dict: any) {
  const text = lineCopyPayload(lineId)
  if (!text) {
    toast.message(dict.leads_copy_empty)
    return
  }
  try {
    await navigator.clipboard.writeText(text)
    toast.success(dict.leads_copy_success)
  } catch {
    toast.error(dict.leads_copy_failed)
  }
}

interface LeadsViewProps {
  initialLeads: LeadRow[]
  locale: string
  dict: any
}

function useMobileUa() {
  const [mobile, setMobile] = useState(false)
  useEffect(() => {
    const ua = typeof navigator !== 'undefined' ? navigator.userAgent || '' : ''
    setMobile(/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua))
  }, [])
  return mobile
}

function formatInquiryAt(iso: string, locale: string) {
  const formatLocale = locale === 'th' ? 'th-TH' : locale === 'en' ? 'en-US' : 'ja-JP'
  return new Date(iso).toLocaleString(formatLocale, {
    timeZone: 'Asia/Bangkok',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export default function LeadsView({ initialLeads, locale, dict }: LeadsViewProps) {
  const [leads, setLeads] = useState<LeadRow[]>(initialLeads || [])
  const [savingId, setSavingId] = useState<string | null>(null)
  const isMobileUa = useMobileUa()
  const statusOptions: { value: LeadStatusValue; label: string }[] = [
    { value: 'pending', label: dict.inquiries_pending },
    { value: 'replied', label: dict.inquiries_replied },
    { value: 'viewing', label: dict.leads_status_viewing },
    { value: 'won', label: dict.leads_status_won },
    { value: 'lost', label: dict.leads_status_lost },
  ]

  useEffect(() => {
    setLeads(initialLeads || [])
  }, [initialLeads])

  const updateStatus = useCallback(async (leadId: string, status: LeadStatusValue) => {
    setSavingId(leadId)
    try {
      const res = await fetch(`/api/inquiry-logs/${leadId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ status }),
      })
      if (!res.ok) {
        const t = await res.text()
        console.error('Failed to update lead status', t)
        toast.error(dict.leads_status_update_failed)
        return
      }
      setLeads((prev) =>
        prev.map((l) => (l.id === leadId ? { ...l, status } : l))
      )
      toast.success(dict.leads_status_updated)
    } finally {
      setSavingId(null)
    }
  }, [])

  if (!leads || leads.length === 0) {
    return (
      <div className="flex flex-col">
        <div className="flex flex-col items-center gap-2 px-4 py-16 text-center text-slate-400">
          <Users className="h-10 w-10 opacity-20" />
          <p className="text-sm font-bold">{dict.leads_empty}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col">
      <div className="divide-y divide-slate-200/80">
        <div className="px-3 py-3 sm:px-4 lg:px-3 lg:py-2">
          <h3 className="text-base font-black text-navy-secondary lg:text-sm">{dict.leads_title}</h3>
          <p className="mt-0.5 text-[11px] text-slate-500 lg:mt-0 lg:text-[10px] lg:leading-snug">
            {dict.leads_description}
          </p>
        </div>

        <ul className="divide-y divide-slate-200/80">
        {leads.map((lead) => {
          const isLine = String(lead.inquiry_type).toLowerCase() === 'line'
          const lineUrls = buildLeadLineReplyUrls(lead.profile?.line_id)
          const showLineAction = isLine && !!lineUrls
          const statusVal = normalizeStatus(lead.status)
          const lineRaw = lead.profile?.line_id?.trim() || ''
          const canCopyLine = Boolean(lineCopyPayload(lead.profile?.line_id))
          const userName = lead.profile?.full_name || dict.leads_guest_user
          const propertyTitle = lead.property?.title || dict.leads_untitled
          const messageBody = (lead.notes ?? '').trim()

          return (
            <li key={lead.id} className="px-3 py-4 sm:px-4 lg:px-3 lg:py-2.5">
              <div className="mx-auto max-w-3xl lg:mx-0 lg:max-w-none">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:gap-5">
                  <div className="min-w-0 flex-1 space-y-3 lg:space-y-2">
                    {showLineAction ? (
                      <a
                        href={lineUrls!.httpsUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) =>
                          openLineReplyPreferApp(
                            e,
                            lineUrls!.httpsUrl,
                            lineUrls!.appUrl,
                            isMobileUa
                          )
                        }
                        className="flex w-full min-h-[52px] items-center justify-center gap-2 rounded-2xl bg-[#06C755] px-4 py-3.5 text-base font-black text-white shadow-[0_8px_24px_-6px_rgba(6,199,85,0.45)] transition hover:bg-[#05b34c] active:scale-[0.99] sm:min-h-[48px] sm:text-[15px] lg:min-h-0 lg:rounded-lg lg:py-2 lg:text-sm lg:shadow-md"
                      >
                        <MessageCircle
                          className="h-6 w-6 shrink-0 lg:h-5 lg:w-5"
                          strokeWidth={2.25}
                          aria-hidden
                        />
                        {dict.leads_reply_via_line}
                        <ExternalLink className="h-4 w-4 shrink-0 opacity-90 lg:h-3.5 lg:w-3.5" aria-hidden />
                      </a>
                    ) : isLine ? (
                      <p className="rounded-xl border border-amber-200/80 bg-amber-50/90 px-3 py-2 text-xs font-bold text-amber-900 lg:rounded-md lg:px-2.5 lg:py-1.5 lg:text-[11px] lg:leading-snug">
                        {dict.leads_line_contact_missing}
                      </p>
                    ) : null}

                    <dl className="grid gap-2.5 text-sm lg:gap-1.5 lg:text-xs">
                      <div className="min-w-0">
                        <dt className="sr-only">
                          {dict.leads_meta_label}
                        </dt>
                        <dd className="m-0 flex min-w-0 items-center gap-2 overflow-x-auto overscroll-x-contain pb-0.5 [-ms-overflow-style:none] [scrollbar-width:thin] lg:gap-3 [&::-webkit-scrollbar]:h-1 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-slate-200">
                          <span className="inline-flex shrink-0 items-baseline gap-1.5 whitespace-nowrap">
                            <span className="text-[10px] font-bold uppercase tracking-wide text-slate-400 lg:text-[9px]">
                              {dict.leads_datetime}
                            </span>
                            <span className="font-semibold tabular-nums text-navy-secondary lg:text-xs">
                              {formatInquiryAt(lead.created_at, locale)}
                              <span className="ml-1 font-normal text-slate-400">
                                · {getTypeLabel(lead.inquiry_type, dict)}
                              </span>
                            </span>
                          </span>
                          <span
                            className="shrink-0 text-slate-200 select-none"
                            aria-hidden
                          >
                            |
                          </span>
                          <span className="inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap">
                            <span className="text-[10px] font-bold uppercase tracking-wide text-slate-400 lg:text-[9px]">
                              {dict.leads_user}
                            </span>
                            <User
                              className="h-3.5 w-3.5 shrink-0 text-slate-400 lg:h-3 lg:w-3"
                              aria-hidden
                            />
                            <span className="max-w-[10rem] truncate font-bold text-navy-secondary sm:max-w-[14rem] lg:max-w-none lg:text-xs">
                              {userName}
                            </span>
                          </span>
                          <span
                            className="shrink-0 text-slate-200 select-none"
                            aria-hidden
                          >
                            |
                          </span>
                          <span className="inline-flex min-w-0 shrink-0 items-center gap-1.5 whitespace-nowrap">
                            <span className="shrink-0 text-[10px] font-bold uppercase tracking-wide text-slate-400 lg:text-[9px]">
                              LINE
                            </span>
                            {lineRaw ? (
                              <>
                                <span className="font-mono text-xs text-slate-700 lg:text-[11px]">
                                  {lineRaw}
                                </span>
                                {canCopyLine ? (
                                  <button
                                    type="button"
                                    onClick={() => copyLineContact(lead.profile?.line_id, dict)}
                                    className="inline-flex shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white p-2 text-slate-600 transition hover:border-[#06C755]/40 hover:bg-[#06C755]/5 hover:text-[#025c2c] lg:p-1.5"
                                    title={dict.leads_copy_line_title}
                                    aria-label={dict.leads_copy_line_aria}
                                  >
                                    <Copy className="h-4 w-4 lg:h-3.5 lg:w-3.5" />
                                  </button>
                                ) : null}
                              </>
                            ) : (
                              <span className="text-slate-400 lg:text-xs">—</span>
                            )}
                          </span>
                        </dd>
                      </div>

                      <div>
                        <dt className="text-[10px] font-bold uppercase tracking-wider text-slate-400 lg:text-[9px]">{dict.leads_property}</dt>
                        <dd className="mt-0.5 font-semibold text-navy-secondary lg:mt-0 lg:text-xs lg:leading-snug">
                          {propertyTitle}
                        </dd>
                      </div>

                      <div>
                        <dt className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 lg:text-[9px]">
                          <FileText className="h-3 w-3 lg:h-2.5 lg:w-2.5" aria-hidden />
                          {dict.leads_message}
                        </dt>
                        <dd className="mt-0.5 whitespace-pre-wrap break-words text-sm leading-relaxed text-slate-700 lg:mt-0 lg:text-xs lg:leading-snug">
                          {messageBody || dict.leads_no_message}
                        </dd>
                      </div>
                    </dl>
                  </div>

                  <div className="border-t border-slate-100 pt-3 lg:w-36 lg:shrink-0 lg:border-l lg:border-t-0 lg:border-slate-100 lg:pl-4 lg:pt-0">
                    <label
                      htmlFor={`lead-status-${lead.id}`}
                      className="text-[10px] font-bold uppercase tracking-wider text-slate-400 lg:text-[9px]"
                    >
                      {dict.leads_status}
                    </label>
                    <div className="relative mt-1.5 lg:mt-1">
                      <select
                        id={`lead-status-${lead.id}`}
                        value={statusVal}
                        disabled={savingId === lead.id}
                        onChange={(e) =>
                          updateStatus(lead.id, e.target.value as LeadStatusValue)
                        }
                        className="min-h-12 w-full appearance-none rounded-xl border border-slate-200 bg-white py-3 pl-3 pr-10 text-sm font-bold text-navy-secondary outline-none focus:border-navy-primary focus:ring-2 focus:ring-navy-primary/15 disabled:opacity-60 lg:min-h-9 lg:rounded-lg lg:py-1.5 lg:pl-2 lg:pr-8 lg:text-xs"
                      >
                        {statusOptions.map((o) => (
                          <option key={o.value} value={o.value}>
                            {o.label}
                          </option>
                        ))}
                      </select>
                      {savingId === lead.id ? (
                        <Loader2 className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-navy-primary lg:right-2 lg:h-3.5 lg:w-3.5" />
                      ) : (
                        <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 lg:right-2 lg:h-3.5 lg:w-3.5" />
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </li>
          )
        })}
        </ul>
      </div>
    </div>
  )
}
