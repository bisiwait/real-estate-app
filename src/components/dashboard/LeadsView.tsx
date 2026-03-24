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

const STATUS_OPTIONS: { value: LeadStatusValue; label: string }[] = [
  { value: 'pending', label: '未対応' },
  { value: 'replied', label: '返信済み' },
  { value: 'viewing', label: '内見予約' },
  { value: 'won', label: '成約' },
  { value: 'lost', label: '失注' },
]

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

function getTypeLabel(type: string) {
  switch (String(type).toLowerCase()) {
    case 'line':
      return 'LINE'
    case 'phone':
      return '電話'
    case 'form':
      return 'フォーム'
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

async function copyLineContact(lineId: string | null | undefined) {
  const text = lineCopyPayload(lineId)
  if (!text) {
    toast.message('コピーする内容がありません')
    return
  }
  try {
    await navigator.clipboard.writeText(text)
    toast.success('コピーしました')
  } catch {
    toast.error('コピーに失敗しました')
  }
}

interface LeadsViewProps {
  initialLeads: LeadRow[]
  locale: string
}

function useMobileUa() {
  const [mobile, setMobile] = useState(false)
  useEffect(() => {
    const ua = typeof navigator !== 'undefined' ? navigator.userAgent || '' : ''
    setMobile(/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua))
  }, [])
  return mobile
}

function formatInquiryAt(iso: string) {
  return new Date(iso).toLocaleString('ja-JP', {
    timeZone: 'Asia/Bangkok',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export default function LeadsView({ initialLeads }: LeadsViewProps) {
  const [leads, setLeads] = useState<LeadRow[]>(initialLeads || [])
  const [savingId, setSavingId] = useState<string | null>(null)
  const isMobileUa = useMobileUa()

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
        toast.error('ステータスの更新に失敗しました')
        return
      }
      setLeads((prev) =>
        prev.map((l) => (l.id === leadId ? { ...l, status } : l))
      )
      toast.success('ステータスを更新しました')
    } finally {
      setSavingId(null)
    }
  }, [])

  if (!leads || leads.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 px-4 py-16 text-center text-slate-400">
        <Users className="h-10 w-10 opacity-20" />
        <p className="text-sm font-bold">まだリード情報がありません。</p>
      </div>
    )
  }

  return (
    <div className="divide-y divide-slate-200/80">
      <div className="px-3 py-3 sm:px-4">
        <h3 className="text-base font-black text-navy-secondary">リード（問い合わせ）詳細</h3>
        <p className="mt-0.5 text-[11px] text-slate-500">LINE で返信し、ステータスを更新してください。</p>
      </div>

      <ul className="divide-y divide-slate-200/80">
        {leads.map((lead) => {
          const isLine = String(lead.inquiry_type).toLowerCase() === 'line'
          const lineUrls = buildLeadLineReplyUrls(lead.profile?.line_id)
          const showLineAction = isLine && !!lineUrls
          const statusVal = normalizeStatus(lead.status)
          const lineRaw = lead.profile?.line_id?.trim() || ''
          const canCopyLine = Boolean(lineCopyPayload(lead.profile?.line_id))
          const userName = lead.profile?.full_name || 'ゲスト（未ログイン）'
          const propertyTitle = lead.property?.title || '（タイトルなし）'
          const messageBody = (lead.notes ?? '').trim()

          return (
            <li key={lead.id} className="px-3 py-4 sm:px-4">
              <div className="mx-auto max-w-3xl space-y-3">
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
                    className="flex w-full min-h-[52px] items-center justify-center gap-2 rounded-2xl bg-[#06C755] px-4 py-3.5 text-base font-black text-white shadow-[0_8px_24px_-6px_rgba(6,199,85,0.45)] transition hover:bg-[#05b34c] active:scale-[0.99] sm:min-h-[48px] sm:text-[15px]"
                  >
                    <MessageCircle className="h-6 w-6 shrink-0" strokeWidth={2.25} aria-hidden />
                    LINEで返信する
                    <ExternalLink className="h-4 w-4 shrink-0 opacity-90" aria-hidden />
                  </a>
                ) : isLine ? (
                  <p className="rounded-xl border border-amber-200/80 bg-amber-50/90 px-3 py-2 text-xs font-bold text-amber-900">
                    LINE連絡先が未登録のため、返信用リンクを表示できません。
                  </p>
                ) : null}

                <dl className="grid gap-2.5 text-sm">
                  <div>
                    <dt className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      問い合わせ日時
                    </dt>
                    <dd className="mt-0.5 font-semibold text-navy-secondary">
                      {formatInquiryAt(lead.created_at)}
                      <span className="ml-2 text-xs font-normal text-slate-400">
                        · {getTypeLabel(lead.inquiry_type)}
                      </span>
                    </dd>
                  </div>

                  <div>
                    <dt className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      ユーザー名
                    </dt>
                    <dd className="mt-0.5 flex items-center gap-2 font-bold text-navy-secondary">
                      <User className="h-3.5 w-3.5 shrink-0 text-slate-400" aria-hidden />
                      {userName}
                    </dd>
                  </div>

                  <div>
                    <dt className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      LINE連絡先
                    </dt>
                    <dd className="mt-0.5">
                      {lineRaw ? (
                        <div className="flex items-start gap-2">
                          <p className="min-w-0 flex-1 break-all font-mono text-xs leading-relaxed text-slate-700">
                            {lineRaw}
                          </p>
                          {canCopyLine ? (
                            <button
                              type="button"
                              onClick={() => copyLineContact(lead.profile?.line_id)}
                              className="mt-0.5 inline-flex shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white p-2.5 text-slate-600 transition hover:border-[#06C755]/40 hover:bg-[#06C755]/5 hover:text-[#025c2c]"
                              title="開く用URL（または入力値）をコピー"
                              aria-label="LINE連絡先をコピー"
                            >
                              <Copy className="h-4 w-4" />
                            </button>
                          ) : null}
                        </div>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </dd>
                  </div>

                  <div>
                    <dt className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      対象物件
                    </dt>
                    <dd className="mt-0.5 font-semibold text-navy-secondary">{propertyTitle}</dd>
                  </div>

                  <div>
                    <dt className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      <FileText className="h-3 w-3" aria-hidden />
                      メッセージ内容
                    </dt>
                    <dd className="mt-0.5 whitespace-pre-wrap break-words text-sm leading-relaxed text-slate-700">
                      {messageBody || '（記載なし）'}
                    </dd>
                  </div>
                </dl>

                <div className="border-t border-slate-100 pt-3">
                  <label
                    htmlFor={`lead-status-${lead.id}`}
                    className="text-[10px] font-bold uppercase tracking-wider text-slate-400"
                  >
                    対応ステータス
                  </label>
                  <div className="relative mt-1.5">
                    <select
                      id={`lead-status-${lead.id}`}
                      value={statusVal}
                      disabled={savingId === lead.id}
                      onChange={(e) =>
                        updateStatus(lead.id, e.target.value as LeadStatusValue)
                      }
                      className="min-h-12 w-full appearance-none rounded-xl border border-slate-200 bg-white py-3 pl-3 pr-10 text-sm font-bold text-navy-secondary outline-none focus:border-navy-primary focus:ring-2 focus:ring-navy-primary/15 disabled:opacity-60"
                    >
                      {STATUS_OPTIONS.map((o) => (
                        <option key={o.value} value={o.value}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                    {savingId === lead.id ? (
                      <Loader2 className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-navy-primary" />
                    ) : (
                      <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    )}
                  </div>
                </div>
              </div>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
