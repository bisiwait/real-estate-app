'use client'

import React, { useCallback, useEffect, useState } from 'react'
import {
  MessageCircle,
  Phone,
  FileText,
  User,
  Home,
  Users,
  ExternalLink,
  Pencil,
  Loader2,
  ChevronDown,
} from 'lucide-react'
import { buildLineContactUrl } from '@/lib/line-contact-url'

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

function getTypeIcon(type: string) {
  switch (String(type).toLowerCase()) {
    case 'line':
      return <MessageCircle className="h-4 w-4 text-[#06C755]" />
    case 'phone':
      return <Phone className="h-4 w-4 text-blue-500" />
    case 'form':
      return <FileText className="h-4 w-4 text-slate-500" />
    default:
      return <MessageCircle className="h-4 w-4 text-slate-400" />
  }
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

interface LeadsViewProps {
  initialLeads: LeadRow[]
  locale: string
}

export default function LeadsView({ initialLeads, locale }: LeadsViewProps) {
  const [leads, setLeads] = useState<LeadRow[]>(initialLeads || [])
  const [savingId, setSavingId] = useState<string | null>(null)

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
        console.error('Failed to update lead status', await res.text())
        return
      }
      setLeads((prev) =>
        prev.map((l) => (l.id === leadId ? { ...l, status } : l))
      )
    } finally {
      setSavingId(null)
    }
  }, [])

  if (!leads || leads.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 p-20 text-center text-slate-400">
        <Users className="h-12 w-12 opacity-20" />
        <p className="text-sm font-bold">まだリード情報がありません。</p>
      </div>
    )
  }

  const publicPropertyUrl = (propertyId: string) =>
    `/${locale}/properties/${propertyId}`
  const editPropertyUrl = (propertyId: string) =>
    `/${locale}/dashboard/edit/${propertyId}`

  return (
    <div className="divide-y divide-slate-100">
      <div className="border-b border-slate-100 px-4 py-5 sm:px-6">
        <h3 className="text-lg font-black text-navy-secondary sm:text-xl">
          リード（問い合わせ）詳細
        </h3>
        <p className="mt-1 text-xs font-bold text-slate-500">
          次のアクションから対応を進め、ステータスで進捗を管理できます。
        </p>
      </div>

      <ul className="divide-y divide-slate-100">
        {leads.map((lead) => {
          const isLine = String(lead.inquiry_type).toLowerCase() === 'line'
          const lineUrl = buildLineContactUrl(lead.profile?.line_id)
          const showLineAction = isLine && !!lineUrl
          const statusVal = normalizeStatus(lead.status)

          return (
            <li key={lead.id} className="px-4 py-6 sm:px-6">
              <div className="mx-auto flex max-w-3xl flex-col gap-5">
                {/* アクション優先 */}
                <div
                  className={`rounded-2xl border p-4 sm:p-5 ${
                    showLineAction
                      ? 'border-[#06C755]/40 bg-gradient-to-br from-[#06C755]/12 via-white to-slate-50/80'
                      : 'border-slate-200 bg-slate-50/80'
                  }`}
                >
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">
                    次に取るアクション
                  </p>
                  {showLineAction ? (
                    <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <p className="text-sm font-bold text-slate-700">
                        お客様の LINE にすぐ返信できます
                      </p>
                      <a
                        href={lineUrl!}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#06C755] px-6 py-3.5 text-sm font-black text-white shadow-lg shadow-[#06C755]/25 transition hover:bg-[#05b34c] active:scale-[0.99]"
                      >
                        <MessageCircle className="h-5 w-5" />
                        LINEで返信する
                        <ExternalLink className="h-4 w-4 opacity-80" />
                      </a>
                    </div>
                  ) : isLine ? (
                    <p className="mt-2 text-sm text-slate-600">
                      ログインユーザーのプロフィールに LINE ID が未登録のため、ここからは開けません。メール等でご連絡ください。
                    </p>
                  ) : (
                    <p className="mt-2 text-sm text-slate-600">
                      物件ページの確認や、登録済みの連絡先からフォローしてください。
                    </p>
                  )}
                </div>

                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0 flex-1 space-y-3">
                    <div className="flex flex-wrap items-center gap-2">
                      {getTypeIcon(lead.inquiry_type)}
                      <span className="text-xs font-bold capitalize text-slate-600">
                        {getTypeLabel(lead.inquiry_type)}
                      </span>
                      <span className="text-[10px] text-slate-400">·</span>
                      <time className="text-xs font-medium text-slate-500">
                        {new Date(lead.created_at).toLocaleString('ja-JP', {
                          timeZone: 'Asia/Bangkok',
                          year: 'numeric',
                          month: '2-digit',
                          day: '2-digit',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </time>
                    </div>

                    <div>
                      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                        問い合わせ物件
                      </p>
                      <p className="mt-1 text-base font-black text-navy-secondary">
                        {lead.property?.title || '（タイトルなし）'}
                      </p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        <a
                          href={publicPropertyUrl(lead.property_id)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 rounded-lg border border-navy-primary/20 bg-white px-3 py-2 text-xs font-bold text-navy-primary shadow-sm transition hover:bg-navy-primary/5"
                        >
                          <Home className="h-3.5 w-3.5" />
                          公開ページを見る
                          <ExternalLink className="h-3 w-3 opacity-60" />
                        </a>
                        <a
                          href={editPropertyUrl(lead.property_id)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 shadow-sm transition hover:bg-slate-50"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                          編集画面を開く
                          <ExternalLink className="h-3 w-3 opacity-60" />
                        </a>
                      </div>
                    </div>

                    <div className="flex items-start gap-3 rounded-xl border border-slate-100 bg-slate-50/80 p-3">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white shadow-sm">
                        <User className="h-4 w-4 text-slate-400" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                          ユーザー
                        </p>
                        <p className="text-sm font-bold text-navy-secondary">
                          {lead.profile?.full_name || 'ゲスト（未ログイン）'}
                        </p>
                        <p className="text-xs text-slate-500">
                          {lead.profile?.email || '—'}
                        </p>
                        {lead.profile?.line_id ? (
                          <p className="mt-1 font-mono text-[11px] text-slate-600">
                            LINE ID: {lead.profile.line_id}
                          </p>
                        ) : null}
                      </div>
                    </div>
                  </div>

                  <div className="w-full shrink-0 sm:w-52">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                      ステータス
                    </label>
                    <div className="relative mt-1.5">
                      <select
                        value={statusVal}
                        disabled={savingId === lead.id}
                        onChange={(e) =>
                          updateStatus(lead.id, e.target.value as LeadStatusValue)
                        }
                        className="w-full appearance-none rounded-xl border border-slate-200 bg-white py-2.5 pl-3 pr-9 text-sm font-bold text-navy-secondary shadow-sm outline-none focus:border-navy-primary focus:ring-2 focus:ring-navy-primary/15 disabled:opacity-60"
                      >
                        {STATUS_OPTIONS.map((o) => (
                          <option key={o.value} value={o.value}>
                            {o.label}
                          </option>
                        ))}
                      </select>
                      {savingId === lead.id ? (
                        <Loader2 className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-navy-primary" />
                      ) : (
                        <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                      )}
                    </div>
                    <p className="mt-2 text-[10px] leading-relaxed text-slate-400">
                      Supabase の inquiry_logs に保存されます
                    </p>
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
