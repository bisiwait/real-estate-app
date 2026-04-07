'use client'

import { useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  Mail,
  Calendar,
  User,
  Phone,
  CheckCircle,
  ChevronDown,
  ChevronUp,
  Reply,
  Send,
  Loader2,
  MessageCircle,
  Sparkles,
  Eraser,
  ExternalLink,
} from 'lucide-react'
import { normalizeInquiryReplyChannel } from '@/lib/inquiry-channel'
import { getInquiryReplyTemplates } from '@/lib/inquiry-reply-templates'

interface Inquiry {
  id: string
  property_id: string
  inquirer_name: string
  inquirer_email: string
  inquirer_phone: string | null
  message: string
  is_read: boolean
  created_at: string
  preferred_reply_channel?: string | null
  line_user_id?: string | null
  property?: {
    title: string
  }
  replies?: {
    id: string
    message: string
    created_at: string
  }[]
}

interface InquiryListProps {
  initialInquiries: any[]
  agentDisplayName?: string | null
  lineOfficialManagerChatUrl: string
  lineOfficialAccountAppIosUrl: string
  lineOfficialAccountAppAndroidUrl: string
}

function replyPreferenceLabel(inquiry: Inquiry): { mode: 'line' | 'email'; channelLabel: string } {
  const mode = normalizeInquiryReplyChannel(inquiry.preferred_reply_channel)
  return {
    mode,
    channelLabel: mode === 'line' ? 'LINE希望（履歴）' : 'メール問い合わせ',
  }
}

export default function InquiryList({
  initialInquiries,
  agentDisplayName,
  lineOfficialManagerChatUrl,
  lineOfficialAccountAppIosUrl,
  lineOfficialAccountAppAndroidUrl,
}: InquiryListProps) {
  const [inquiries, setInquiries] = useState<Inquiry[]>(initialInquiries)
  const replyTemplates = useMemo(
    () => getInquiryReplyTemplates(agentDisplayName ?? ''),
    [agentDisplayName]
  )
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [replyText, setReplyText] = useState('')
  const [isSubmittingReply, setIsSubmittingReply] = useState(false)
  const [channelFilter, setChannelFilter] = useState<'all' | 'email' | 'line'>('all')
  const [replyFilter, setReplyFilter] = useState<'all' | 'pending' | 'replied'>('all')
  const supabase = createClient()

  const filteredInquiries = useMemo(() => {
    return inquiries.filter((inq) => {
      const mode = normalizeInquiryReplyChannel(inq.preferred_reply_channel)
      if (channelFilter === 'email' && mode !== 'email') return false
      if (channelFilter === 'line' && mode !== 'line') return false
      const hasReplies = (inq.replies?.length ?? 0) > 0
      if (replyFilter === 'pending' && hasReplies) return false
      if (replyFilter === 'replied' && !hasReplies) return false
      return true
    })
  }, [inquiries, channelFilter, replyFilter])

  const handleToggleRead = async (id: string, currentReadStatus: boolean) => {
    if (currentReadStatus) return

    try {
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)

      if (isUuid) {
        const { error } = await supabase.from('inquiries').update({ is_read: true }).eq('id', id)

        if (error) throw error
      } else {
        console.log('Mock inquiry detected. Marking as read in local state only.')
      }

      setInquiries((prev) => prev.map((inq) => (inq.id === id ? { ...inq, is_read: true } : inq)))
    } catch (err) {
      console.error('Error marking as read:', err)
    }
  }

  const toggleExpand = (id: string, isRead: boolean) => {
    if (expandedId === id) {
      setExpandedId(null)
      setReplyText('')
    } else {
      setExpandedId(id)
      setReplyText('')
      if (!isRead) {
        handleToggleRead(id, isRead)
      }
    }
  }

  const handleSendReply = async (inquiry: Inquiry) => {
    if (!replyText.trim()) return

    setIsSubmittingReply(true)
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const { data: newReply, error } = await supabase
        .from('inquiry_replies')
        .insert([
          {
            inquiry_id: inquiry.id,
            sender_id: user.id,
            message: replyText.trim(),
          },
        ])
        .select()
        .single()

      if (error) throw error

      const messageToNotify = replyText.trim()

      try {
        const notifyRes = await fetch('/api/inquiries/notify-reply', {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            inquiry_id: inquiry.id,
            message: messageToNotify,
            inquiry_reply_id: newReply?.id ?? undefined,
          }),
        })
        const payload = (await notifyRes.json().catch(() => ({}))) as {
          error?: string
          hint?: string
          code?: string
          success?: boolean
          sent?: boolean
        }

        if (!notifyRes.ok) {
          const detail = payload.error || notifyRes.statusText
          console.warn('[InquiryList] notify-reply:', notifyRes.status, detail)

          if (notifyRes.status === 401) {
            alert(
              '返信は保存されましたが、通知用のセッションがサーバーで認識できませんでした。一度ログアウトして再ログインするか、時間をおいて再度お試しください。'
            )
          } else if (notifyRes.status === 502 || notifyRes.status === 503) {
            const hint = payload.hint ? `\n\n${payload.hint}` : ''
            alert(`メール通知に失敗しました: ${detail}${hint}`)
          } else if (notifyRes.status === 422) {
            alert(`${detail}`)
          } else if (notifyRes.status !== 422) {
            alert(`送信に失敗しました: ${detail}`)
          }
        }
      } catch (notifyErr) {
        console.warn('[InquiryList] notify-reply fetch failed:', notifyErr)
      }

      setInquiries((prev) =>
        prev.map((inq) => {
          if (inq.id === inquiry.id) {
            return {
              ...inq,
              replies: [...(inq.replies || []), newReply],
            }
          }
          return inq
        })
      )
      setReplyText('')
    } catch (err) {
      console.error('Error sending reply:', err)
      alert('返信の保存に失敗しました。')
    } finally {
      setIsSubmittingReply(false)
    }
  }

  if (inquiries.length === 0) {
    return (
      <div className="p-20 text-center">
        <p className="text-slate-400 font-medium">お問い合わせはありません</p>
      </div>
    )
  }

  const filterChip = (active: boolean) =>
    `whitespace-nowrap px-3 py-2 text-[10px] sm:text-xs font-bold rounded-lg transition-all ${
      active ? 'bg-white shadow-sm text-navy-primary' : 'text-slate-500 hover:text-navy-primary'
    }`

  return (
    <div>
      <div className="border-b border-slate-100 bg-slate-50/80 px-4 py-4 sm:px-6 space-y-3">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
          <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 shrink-0">
            種別
          </span>
          <div className="flex min-w-0 bg-slate-100 p-1 rounded-xl border border-slate-200 gap-0.5">
            <button type="button" onClick={() => setChannelFilter('all')} className={filterChip(channelFilter === 'all')}>
              すべて
            </button>
            <button
              type="button"
              onClick={() => setChannelFilter('email')}
              className={`${filterChip(channelFilter === 'email')} flex items-center justify-center gap-1`}
            >
              <Mail className="h-3.5 w-3.5 shrink-0 opacity-70" />
              メール
            </button>
            <button
              type="button"
              onClick={() => setChannelFilter('line')}
              className={`${filterChip(channelFilter === 'line')} flex items-center justify-center gap-1`}
            >
              <MessageCircle className="h-3.5 w-3.5 shrink-0 opacity-70" />
              LINE希望
            </button>
          </div>
          <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 shrink-0">
            対応
          </span>
          <div className="flex min-w-0 bg-slate-100 p-1 rounded-xl border border-slate-200 gap-0.5">
            <button type="button" onClick={() => setReplyFilter('all')} className={filterChip(replyFilter === 'all')}>
              すべて
            </button>
            <button type="button" onClick={() => setReplyFilter('pending')} className={filterChip(replyFilter === 'pending')}>
              未対応
            </button>
            <button type="button" onClick={() => setReplyFilter('replied')} className={filterChip(replyFilter === 'replied')}>
              返信済み
            </button>
          </div>
        </div>
        <p className="text-[10px] font-bold text-slate-400">
          表示 {filteredInquiries.length} / 全 {inquiries.length} 件
        </p>
      </div>

      {filteredInquiries.length === 0 ? (
        <div className="p-16 text-center space-y-3">
          <p className="text-slate-500 font-medium text-sm">条件に一致するお問い合わせはありません</p>
          <button
            type="button"
            onClick={() => {
              setChannelFilter('all')
              setReplyFilter('all')
            }}
            className="text-xs font-black text-navy-primary underline decoration-navy-primary/30 hover:text-navy-secondary"
          >
            フィルターをリセット
          </button>
        </div>
      ) : null}

      <div className={`divide-y divide-slate-50 ${filteredInquiries.length === 0 ? 'hidden' : ''}`}>
        {filteredInquiries.map((inquiry) => {
          const pref = replyPreferenceLabel(inquiry)
          const lineUid = inquiry.line_user_id?.trim()
          const lineMissing = pref.mode === 'line' && !lineUid
          const expanded = expandedId === inquiry.id

          return (
            <div
              key={inquiry.id}
              className={`p-6 transition-all ${!inquiry.is_read ? 'bg-navy-primary/[0.02]' : ''}`}
            >
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center space-x-4">
                  <div
                    className={`w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 ${
                      !inquiry.is_read
                        ? 'bg-navy-primary text-white shadow-lg shadow-navy-primary/20'
                        : 'bg-slate-100 text-slate-400'
                    }`}
                  >
                    {pref.mode === 'line' ? (
                      <MessageCircle className="w-6 h-6" />
                    ) : (
                      <Mail className="w-6 h-6" />
                    )}
                  </div>
                  <div>
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      {!inquiry.is_read && (
                        <span className="bg-navy-primary text-white px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider">
                          New
                        </span>
                      )}
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-black ${
                          pref.mode === 'line'
                            ? 'bg-[#06C755]/15 text-[#047c3d]'
                            : 'bg-sky-100 text-sky-800'
                        }`}
                      >
                        {pref.channelLabel}
                      </span>
                      {inquiry.replies && inquiry.replies.length > 0 ? (
                        <span className="bg-emerald-100 text-emerald-600 px-2 py-0.5 rounded text-[10px] font-bold">
                          返信済み
                        </span>
                      ) : (
                        <span className="bg-slate-100 text-slate-500 px-2 py-0.5 rounded text-[10px] font-bold">
                          未対応
                        </span>
                      )}
                      <span className="text-xs text-slate-400 font-bold uppercase tracking-widest flex items-center">
                        <Calendar className="w-3 h-3 mr-1" />
                        {new Date(inquiry.created_at).toLocaleString('ja-JP', {
                          timeZone: 'Asia/Bangkok',
                          year: 'numeric',
                          month: '2-digit',
                          day: '2-digit',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>
                    <h4 className="text-lg font-bold text-navy-secondary">
                      {inquiry.inquirer_name}{' '}
                      <span className="text-sm font-normal text-slate-400 ml-1">さんからのお問い合わせ</span>
                    </h4>
                    <p className="text-xs text-navy-primary font-bold mt-1">
                      対象物件: {inquiry.property?.title || 'Unknown Property'}
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => toggleExpand(inquiry.id, inquiry.is_read)}
                  className={`flex items-center space-x-2 px-6 py-2.5 rounded-xl text-sm font-bold transition-all border ${
                    expanded
                      ? 'bg-navy-secondary text-white border-navy-secondary shadow-lg'
                      : 'bg-white text-navy-primary border-navy-primary/10 hover:border-navy-primary/30 hover:shadow-md'
                  }`}
                >
                  <span>{expanded ? '内容を閉じる' : '詳細を確認'}</span>
                  {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>
              </div>

              {expanded && (
                <div className="mt-8 pt-8 border-t border-slate-100 animate-in slide-in-from-top-4 duration-300">
                  <div className="mb-6 flex flex-wrap items-center gap-2">
                    <span
                      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-black ${
                        pref.mode === 'line'
                          ? 'bg-[#06C755]/15 text-[#047c3d]'
                          : 'bg-sky-100 text-sky-800'
                      }`}
                    >
                      {pref.mode === 'line' ? <MessageCircle className="w-3.5 h-3.5" /> : <Mail className="w-3.5 h-3.5" />}
                      {pref.channelLabel}
                    </span>
                  </div>

                  {lineMissing ? (
                    <div className="mb-6 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-bold text-amber-900">
                      <p>
                        お客様は <strong>LINE</strong> での返信を希望されていますが、
                        <strong>LINE ユーザーID が記録されていません</strong>。下のフォームから送信すると、
                        <strong>メール</strong>で通知されます。
                      </p>
                    </div>
                  ) : null}

                  {pref.mode === 'line' && lineUid ? (
                    <div className="mb-6 space-y-3 rounded-2xl border border-emerald-100 bg-emerald-50/90 px-4 py-3 text-sm text-slate-800">
                      <p>
                        お客様は <strong>LINE</strong> を希望した記録があります。ダッシュボードからの通知は
                        <strong>メール</strong>のみです。LINE 上で続けてやり取りする場合は、LINE Official Account
                        Manager のチャットから対応してください。
                      </p>
                      <a
                        href={lineOfficialManagerChatUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 text-xs font-black text-navy-primary underline decoration-navy-primary/40 hover:text-navy-secondary"
                      >
                        チャット管理を開く
                        <ExternalLink className="h-3.5 w-3.5 shrink-0" />
                      </a>
                      <div className="flex flex-wrap items-center gap-2 border-t border-emerald-100/80 pt-3 text-[10px] font-bold text-slate-600">
                        <span className="font-black text-emerald-900">LINE公式アプリ:</span>
                        <a
                          href={lineOfficialAccountAppIosUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-navy-primary underline"
                        >
                          App Store
                        </a>
                        <span className="text-slate-300">|</span>
                        <a
                          href={lineOfficialAccountAppAndroidUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-navy-primary underline"
                        >
                          Google Play
                        </a>
                      </div>
                    </div>
                  ) : null}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
                    <div className="space-y-4">
                      <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 flex items-center">
                          <User className="w-3 h-3 mr-1.5" /> お名前
                        </p>
                        <p className="text-sm font-bold text-navy-secondary">{inquiry.inquirer_name}</p>
                      </div>
                      <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 flex items-center">
                          <Mail className="w-3 h-3 mr-1.5" /> メールアドレス
                        </p>
                        <p className="text-sm font-bold text-navy-secondary select-all">{inquiry.inquirer_email}</p>
                      </div>
                      {pref.mode === 'line' && lineUid ? (
                        <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 flex items-center">
                            <MessageCircle className="w-3 h-3 mr-1.5" /> LINE ユーザーID（参照用）
                          </p>
                          <p className="break-all font-mono text-xs text-navy-secondary select-all">{lineUid}</p>
                        </div>
                      ) : null}
                      {inquiry.inquirer_phone && (
                        <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 flex items-center">
                            <Phone className="w-3 h-3 mr-1.5" /> 電話番号
                          </p>
                          <p className="text-sm font-bold text-navy-secondary select-all">{inquiry.inquirer_phone}</p>
                        </div>
                      )}
                    </div>
                    <div className="bg-navy-primary/[0.03] p-6 rounded-3xl border border-navy-primary/5">
                      <p className="text-[10px] font-black text-navy-primary/60 uppercase tracking-widest mb-4">
                        メッセージ内容
                      </p>
                      <div className="text-slate-600 text-sm leading-relaxed whitespace-pre-wrap italic">
                        &ldquo;{inquiry.message}&rdquo;
                      </div>
                    </div>
                  </div>

                  <div className="space-y-6">
                    <div>
                      <h5 className="text-sm font-black text-navy-secondary mb-4 flex items-center">
                        <Reply className="w-4 h-4 mr-2" />
                        返信履歴
                      </h5>

                      {inquiry.replies && inquiry.replies.length > 0 ? (
                        <div className="space-y-4 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                          {inquiry.replies.map((reply) => (
                            <div
                              key={reply.id}
                              className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm ml-4 relative"
                            >
                              <div className="absolute top-4 -left-2 w-4 h-4 bg-white border-l border-t border-slate-100 rotate-45"></div>
                              <p className="text-xs text-slate-400 mb-2 font-bold">
                                {new Date(reply.created_at).toLocaleString('ja-JP', {
                                  timeZone: 'Asia/Bangkok',
                                  year: 'numeric',
                                  month: '2-digit',
                                  day: '2-digit',
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })}
                              </p>
                              <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap break-words">
                                {reply.message}
                              </p>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-slate-400 italic">まだ返信はありません</p>
                      )}
                    </div>

                    <hr className="my-8 border-0 border-t-2 border-slate-200" />

                    <div>
                      <h5 className="text-sm font-black text-navy-secondary mb-3 flex items-center">
                        <Send className="w-4 h-4 mr-2" />
                        返信メールの本文
                      </h5>
                      <label className="sr-only" htmlFor={`inquiry-reply-${inquiry.id}`}>
                        返信メールの本文
                      </label>
                      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="flex items-center gap-1 text-[10px] font-black uppercase tracking-wider text-slate-400">
                            <Sparkles className="h-3 w-3" />
                            定型文
                          </span>
                          {replyTemplates.map((t) => (
                            <button
                              key={t.label}
                              type="button"
                              onClick={() => setReplyText(t.text)}
                              className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-[10px] font-black text-navy-secondary transition hover:border-navy-primary/40 hover:bg-slate-50"
                            >
                              {t.label}
                            </button>
                          ))}
                        </div>
                        <button
                          type="button"
                          onClick={() => setReplyText('')}
                          disabled={!replyText}
                          className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-[10px] font-black text-slate-500 transition hover:border-slate-300 hover:bg-slate-50 hover:text-navy-secondary disabled:cursor-not-allowed disabled:opacity-40"
                          title="本文を空にします"
                        >
                          <Eraser className="h-3 w-3" />
                          本文をクリア
                        </button>
                      </div>
                      <div className="relative min-w-0">
                        <textarea
                          id={`inquiry-reply-${inquiry.id}`}
                          rows={6}
                          className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm focus:ring-2 focus:ring-navy-primary outline-none transition-all resize-none pr-14"
                          placeholder="返信メール本文を入力…"
                          value={replyText}
                          onChange={(e) => setReplyText(e.target.value)}
                          aria-label="返信メールの本文"
                        />
                        <button
                          type="button"
                          onClick={() => handleSendReply(inquiry)}
                          disabled={isSubmittingReply || !replyText.trim()}
                          className="absolute right-3 bottom-3 p-3 bg-navy-primary text-white rounded-xl hover:bg-navy-secondary transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
                          title="メールで送信"
                        >
                          {isSubmittingReply ? (
                            <Loader2 className="w-5 h-5 animate-spin" />
                          ) : (
                            <Send className="w-5 h-5" />
                          )}
                        </button>
                      </div>
                      <p className="text-[10px] text-slate-500 mt-2 px-1 font-bold">
                        ※送信するとお客様のメール宛に届きます。内容は返信履歴にも保存されます。
                      </p>
                    </div>

                    {!inquiry.is_read && (
                      <div className="flex items-center text-emerald-600 bg-emerald-50 px-4 py-2 rounded-lg text-xs font-bold w-fit">
                        <CheckCircle className="w-4 h-4 mr-2" />
                        既読としてマークしました
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
