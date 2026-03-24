'use client'

import { useState } from 'react'
import { Mail, MessageCircle, ExternalLink, Home, User } from 'lucide-react'
import type {
  AdminMailInquiryRow,
  AdminLineLeadRow,
} from '@/lib/supabase/fetch-admin-inquiries'

type SubTab = 'mail' | 'line'

const TZ = 'Asia/Bangkok'

function formatDt(iso: string) {
  return new Date(iso).toLocaleString('ja-JP', {
    timeZone: TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

const LINE_STATUS_JA: Record<string, string> = {
  pending: '未対応',
  replied: '返信済み',
  viewing: '内見予約',
  won: '成約',
  lost: '失注',
  new: '新規',
  contacted: '対応中',
  closed: '終了',
}

interface Props {
  locale: string
  mailInquiries: AdminMailInquiryRow[]
  lineLeads: AdminLineLeadRow[]
}

export default function AdminInquiriesPanel({
  locale,
  mailInquiries,
  lineLeads,
}: Props) {
  const [sub, setSub] = useState<SubTab>('mail')

  const propertyHref = (id: string) => `/${locale}/properties/${id}`

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="mb-6 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setSub('mail')}
          className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-black transition-all ${
            sub === 'mail'
              ? 'bg-navy-primary text-white shadow-lg'
              : 'bg-white text-slate-500 ring-1 ring-slate-200 hover:bg-slate-50'
          }`}
        >
          <Mail className="h-4 w-4" />
          メール問い合わせ
          <span className="rounded-full bg-white/20 px-2 py-0.5 text-xs">{mailInquiries.length}</span>
        </button>
        <button
          type="button"
          onClick={() => setSub('line')}
          className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-black transition-all ${
            sub === 'line'
              ? 'bg-[#06C755] text-white shadow-lg'
              : 'bg-white text-slate-500 ring-1 ring-slate-200 hover:bg-slate-50'
          }`}
        >
          <MessageCircle className="h-4 w-4" />
          LINE問い合わせ
          <span className="rounded-full bg-white/20 px-2 py-0.5 text-xs">{lineLeads.length}</span>
        </button>
      </div>

      {sub === 'mail' && (
        <div className="overflow-hidden rounded-3xl border border-slate-100 bg-white shadow-xl">
          <div className="border-b border-slate-100 px-6 py-4">
            <h3 className="text-lg font-black text-navy-secondary">メール問い合わせ（inquiries）</h3>
            <p className="mt-1 text-xs font-bold text-slate-500">
              物件ページのフォームから送信された内容です。
            </p>
          </div>
          <div className="overflow-x-auto">
            {mailInquiries.length === 0 ? (
              <p className="p-12 text-center text-sm font-bold text-slate-400">データがありません</p>
            ) : (
              <table className="w-full min-w-[880px] text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/80 text-[10px] font-black uppercase tracking-widest text-slate-400">
                    <th className="px-4 py-3">日時</th>
                    <th className="px-4 py-3">物件</th>
                    <th className="px-4 py-3">掲載エージェント</th>
                    <th className="px-4 py-3">問い合わせ者</th>
                    <th className="px-4 py-3">内容</th>
                    <th className="px-4 py-3">未読</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {mailInquiries.map((row) => (
                    <tr key={row.id} className="hover:bg-slate-50/50">
                      <td className="whitespace-nowrap px-4 py-3 font-bold text-navy-secondary">
                        {formatDt(row.created_at)}
                      </td>
                      <td className="max-w-[200px] px-4 py-3">
                        <a
                          href={propertyHref(row.property_id)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 font-bold text-navy-primary hover:underline"
                        >
                          <Home className="h-3.5 w-3.5 shrink-0" />
                          <span className="line-clamp-2">{row.property_title || row.property_id.slice(0, 8)}</span>
                          <ExternalLink className="h-3 w-3 shrink-0 opacity-50" />
                        </a>
                      </td>
                      <td className="px-4 py-3 text-slate-600">{row.owner_name || '—'}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-start gap-2">
                          <User className="mt-0.5 h-4 w-4 shrink-0 text-slate-300" />
                          <div>
                            <p className="font-bold text-navy-secondary">{row.inquirer_name}</p>
                            <p className="text-xs text-slate-500">{row.inquirer_email}</p>
                            {row.inquirer_phone ? (
                              <p className="text-xs text-slate-500">{row.inquirer_phone}</p>
                            ) : null}
                          </div>
                        </div>
                      </td>
                      <td className="max-w-xs px-4 py-3">
                        <p className="line-clamp-4 whitespace-pre-wrap text-xs text-slate-600">{row.message}</p>
                      </td>
                      <td className="px-4 py-3">
                        {!row.is_read ? (
                          <span className="rounded-full bg-amber-100 px-2 py-1 text-[10px] font-black text-amber-800">
                            未読
                          </span>
                        ) : (
                          <span className="text-xs text-slate-400">既読</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {sub === 'line' && (
        <div className="overflow-hidden rounded-3xl border border-slate-100 bg-white shadow-xl">
          <div className="border-b border-slate-100 px-6 py-4">
            <h3 className="text-lg font-black text-navy-secondary">LINE問い合わせ（inquiry_logs）</h3>
            <p className="mt-1 text-xs font-bold text-slate-500">
              サイト上の「LINE問い合わせ」ボタンから記録されたログです。
            </p>
          </div>
          <div className="overflow-x-auto">
            {lineLeads.length === 0 ? (
              <p className="p-12 text-center text-sm font-bold text-slate-400">データがありません</p>
            ) : (
              <table className="w-full min-w-[920px] text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/80 text-[10px] font-black uppercase tracking-widest text-slate-400">
                    <th className="px-4 py-3">日時</th>
                    <th className="px-4 py-3">物件</th>
                    <th className="px-4 py-3">掲載エージェント</th>
                    <th className="px-4 py-3">ユーザー</th>
                    <th className="px-4 py-3">LINE ID</th>
                    <th className="px-4 py-3">ステータス</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {lineLeads.map((row) => (
                    <tr key={row.id} className="hover:bg-slate-50/50">
                      <td className="whitespace-nowrap px-4 py-3 font-bold text-navy-secondary">
                        {formatDt(row.created_at)}
                      </td>
                      <td className="max-w-[200px] px-4 py-3">
                        <a
                          href={propertyHref(row.property_id)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 font-bold text-navy-primary hover:underline"
                        >
                          <Home className="h-3.5 w-3.5 shrink-0" />
                          <span className="line-clamp-2">{row.property_title || row.property_id.slice(0, 8)}</span>
                          <ExternalLink className="h-3 w-3 shrink-0 opacity-50" />
                        </a>
                      </td>
                      <td className="px-4 py-3 text-slate-600">{row.agent_name || '—'}</td>
                      <td className="px-4 py-3">
                        <p className="font-bold text-navy-secondary">{row.inquirer_name || 'ゲスト'}</p>
                        <p className="text-xs text-slate-500">{row.inquirer_email || '—'}</p>
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-slate-700">
                        {row.inquirer_line_id || '—'}
                      </td>
                      <td className="px-4 py-3">
                        <span className="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-black text-slate-700">
                          {LINE_STATUS_JA[row.status] || row.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
