'use client'

import { useState, useEffect, useCallback } from 'react'
import { Mail, MessageCircle, ExternalLink, Home, User, X, Calendar, Hash, Reply } from 'lucide-react'
import type {
  AdminMailInquiryRow,
  AdminLineLeadRow,
} from '@/lib/supabase/fetch-admin-inquiries'

type SubTab = 'mail' | 'line'

type MailReplyRow = {
  id: string
  message: string
  created_at: string
  sender_id: string | null
  sender_name: string | null
}

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
  const [mailDetail, setMailDetail] = useState<AdminMailInquiryRow | null>(null)
  const [mailReplies, setMailReplies] = useState<MailReplyRow[] | null>(null)
  const [mailRepliesLoading, setMailRepliesLoading] = useState(false)
  const [mailRepliesError, setMailRepliesError] = useState<string | null>(null)

  const closeMailDetail = useCallback(() => {
    setMailDetail(null)
    setMailReplies(null)
    setMailRepliesError(null)
    setMailRepliesLoading(false)
  }, [])

  useEffect(() => {
    if (!mailDetail) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeMailDetail()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [mailDetail, closeMailDetail])

  useEffect(() => {
    if (!mailDetail) {
      setMailReplies(null)
      setMailRepliesError(null)
      setMailRepliesLoading(false)
      return
    }
    let cancelled = false
    setMailRepliesLoading(true)
    setMailRepliesError(null)
    setMailReplies(null)

    fetch(`/api/admin/inquiry-replies?inquiry_id=${encodeURIComponent(mailDetail.id)}`, {
      credentials: 'include',
    })
      .then(async (res) => {
        const data = (await res.json().catch(() => ({}))) as { error?: string; replies?: MailReplyRow[] }
        if (!res.ok) throw new Error(data.error || res.statusText)
        return data.replies ?? []
      })
      .then((replies) => {
        if (!cancelled) setMailReplies(replies)
      })
      .catch((e) => {
        if (!cancelled) {
          setMailRepliesError(e instanceof Error ? e.message : '返信履歴の取得に失敗しました')
          setMailReplies([])
        }
      })
      .finally(() => {
        if (!cancelled) setMailRepliesLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [mailDetail?.id])

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
                    <th className="px-4 py-3 w-24">操作</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {mailInquiries.map((row) => (
                    <tr key={row.id} className="hover:bg-slate-50/50 align-top">
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
                      <td className="px-4 py-3">
                        <button
                          type="button"
                          onClick={() => setMailDetail(row)}
                          className="rounded-lg border border-navy-primary/25 bg-navy-primary/5 px-3 py-1.5 text-[10px] font-black text-navy-primary transition-colors hover:bg-navy-primary hover:text-white"
                        >
                          詳細
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {mailDetail ? (
        <div
          className="fixed inset-0 z-[220] overflow-y-auto overscroll-y-contain"
          role="presentation"
        >
          <div
            className="flex min-h-full justify-center items-start sm:items-center px-4 pt-4 pb-[max(1.5rem,env(safe-area-inset-bottom,0px))] sm:py-8 bg-navy-primary/50 backdrop-blur-sm"
            onClick={closeMailDetail}
          >
            <div
              role="dialog"
              aria-modal="true"
              aria-labelledby="admin-mail-inquiry-detail-title"
              className="my-4 w-full max-w-2xl max-h-[calc(100dvh-2rem)] overflow-y-auto rounded-3xl border border-slate-100 bg-white shadow-2xl touch-pan-y sm:my-0 sm:max-h-[min(90dvh,calc(100dvh-4rem))]"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-slate-100 bg-slate-50 px-5 py-4">
                <div className="flex min-w-0 items-center gap-2">
                  <Mail className="h-5 w-5 shrink-0 text-navy-primary" />
                  <h2 id="admin-mail-inquiry-detail-title" className="truncate text-base font-black text-navy-secondary">
                    メール問い合わせ詳細
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={closeMailDetail}
                  className="rounded-full p-2 text-slate-400 transition-colors hover:bg-slate-200 hover:text-navy-secondary"
                  aria-label="閉じる"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="space-y-5 p-5">
                <dl className="space-y-4 text-sm">
                  <div className="flex gap-3">
                    <Calendar className="mt-0.5 h-4 w-4 shrink-0 text-slate-300" />
                    <div>
                      <dt className="text-[10px] font-black uppercase tracking-widest text-slate-400">受信日時</dt>
                      <dd className="mt-1 font-bold text-navy-secondary">{formatDt(mailDetail.created_at)}</dd>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <Hash className="mt-0.5 h-4 w-4 shrink-0 text-slate-300" />
                    <div className="min-w-0 flex-1">
                      <dt className="text-[10px] font-black uppercase tracking-widest text-slate-400">お問い合わせID</dt>
                      <dd className="mt-1 break-all font-mono text-xs text-slate-600">{mailDetail.id}</dd>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <Home className="mt-0.5 h-4 w-4 shrink-0 text-slate-300" />
                    <div className="min-w-0 flex-1">
                      <dt className="text-[10px] font-black uppercase tracking-widest text-slate-400">物件</dt>
                      <dd className="mt-1">
                        <a
                          href={propertyHref(mailDetail.property_id)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 font-bold text-navy-primary hover:underline"
                        >
                          {mailDetail.property_title || mailDetail.property_id}
                          <ExternalLink className="h-3.5 w-3.5 shrink-0 opacity-60" />
                        </a>
                      </dd>
                    </div>
                  </div>
                  <div>
                    <dt className="text-[10px] font-black uppercase tracking-widest text-slate-400">掲載エージェント</dt>
                    <dd className="mt-1 font-bold text-navy-secondary">{mailDetail.owner_name || '—'}</dd>
                  </div>
                  <div className="rounded-2xl border border-slate-100 bg-slate-50/80 p-4">
                    <dt className="text-[10px] font-black uppercase tracking-widest text-slate-400">問い合わせ者</dt>
                    <dd className="mt-2 space-y-1">
                      <p className="font-bold text-navy-secondary">{mailDetail.inquirer_name}</p>
                      <p className="break-all text-slate-600">{mailDetail.inquirer_email}</p>
                      {mailDetail.inquirer_phone ? (
                        <p className="text-slate-600">{mailDetail.inquirer_phone}</p>
                      ) : (
                        <p className="text-xs text-slate-400">電話: 未入力</p>
                      )}
                    </dd>
                  </div>
                  <div>
                    <dt className="mb-2 text-[10px] font-black uppercase tracking-widest text-slate-400">ステータス</dt>
                    <dd>
                      {!mailDetail.is_read ? (
                        <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-black text-amber-800">
                          未読
                        </span>
                      ) : (
                        <span className="text-sm font-bold text-slate-500">既読</span>
                      )}
                    </dd>
                  </div>
                </dl>

                <div>
                  <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400">お問い合わせ内容</h3>
                  <div className="mt-2 max-h-[40vh] overflow-y-auto rounded-2xl border border-slate-100 bg-slate-50 p-4">
                    <p className="whitespace-pre-wrap break-words text-sm font-medium leading-relaxed text-slate-800">
                      {mailDetail.message}
                    </p>
                  </div>
                </div>

                <div>
                  <h3 className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-400">
                    <Reply className="h-3.5 w-3.5" />
                    返信履歴（エージェント）
                  </h3>
                  {mailRepliesLoading ? (
                    <p className="mt-3 text-sm font-bold text-slate-400">読み込み中…</p>
                  ) : mailRepliesError ? (
                    <p className="mt-3 text-sm font-bold text-red-600">{mailRepliesError}</p>
                  ) : !mailReplies || mailReplies.length === 0 ? (
                    <p className="mt-3 text-sm font-bold text-slate-400">まだ返信はありません</p>
                  ) : (
                    <ol className="mt-3 space-y-3">
                      {mailReplies.map((r) => (
                        <li
                          key={r.id}
                          className="rounded-2xl border border-emerald-100/80 bg-emerald-50/40 p-4"
                        >
                          <div className="mb-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
                            <time className="font-bold text-navy-secondary">{formatDt(r.created_at)}</time>
                            {r.sender_name ? (
                              <span className="font-bold text-emerald-800">{r.sender_name}</span>
                            ) : r.sender_id ? (
                              <span className="break-all font-mono text-[10px] text-slate-500">{r.sender_id}</span>
                            ) : (
                              <span className="text-slate-500">送信者不明</span>
                            )}
                          </div>
                          <p className="whitespace-pre-wrap break-words text-sm leading-relaxed text-slate-800">
                            {r.message}
                          </p>
                        </li>
                      ))}
                    </ol>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}

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
