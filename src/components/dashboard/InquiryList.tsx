'use client'

import Link from 'next/link'
import { useParams } from 'next/navigation'
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
  Smartphone,
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
  /** ダッシュボードからの LINE Push 成功が inquiry_logs にある（初回以降はチャット導線） */
  line_push_already_sent?: boolean
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
  /** 定型文「初回返信」に挿入する表示名（profiles.full_name など） */
  agentDisplayName?: string | null
  /** 公式 LINE Push 返信（プレミアム）。false のときはメール経路のみ */
  viewerPremiumLineInquiry?: boolean
  /** LINE Official Account Manager の該当アカウント画面 URL（アカウントホーム。チャットは画面上部タブから） */
  lineOfficialManagerChatUrl: string
  lineOfficialAccountAppIosUrl: string
  lineOfficialAccountAppAndroidUrl: string
}

function replyPreferenceLabel(inquiry: Inquiry): { mode: 'line' | 'email'; channelLabel: string } {
  const mode = normalizeInquiryReplyChannel(inquiry.preferred_reply_channel)
  return {
    mode,
    channelLabel: mode === 'line' ? 'LINE問い合わせ' : 'メール問い合わせ',
  }
}

export default function InquiryList({
  initialInquiries,
  agentDisplayName,
  viewerPremiumLineInquiry = false,
  lineOfficialManagerChatUrl,
  lineOfficialAccountAppIosUrl,
  lineOfficialAccountAppAndroidUrl,
}: InquiryListProps) {
  const params = useParams()
  const locale = (params?.locale as string) || 'jp'
  const [inquiries, setInquiries] = useState<Inquiry[]>(initialInquiries)
  const replyTemplates = useMemo(
    () => getInquiryReplyTemplates(agentDisplayName ?? ''),
    [agentDisplayName],
  )
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [replyText, setReplyText] = useState('')
  const [isSubmittingReply, setIsSubmittingReply] = useState(false)
  /** LINE 送信失敗後に、明示的にメールへ切り替えて再送する */
  const [forceEmailAfterLineFail, setForceEmailAfterLineFail] = useState(false)
  const supabase = createClient()

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
      setForceEmailAfterLineFail(false)
    } else {
      setExpandedId(id)
      setReplyText('')
      setForceEmailAfterLineFail(false)
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
      const preferred = normalizeInquiryReplyChannel(inquiry.preferred_reply_channel)
      const lineUid = inquiry.line_user_id?.trim()
      const linePushUsed = inquiry.line_push_already_sent === true
      const autoForceEmail = preferred === 'line' && !lineUid
      const forceEmail =
        autoForceEmail ||
        forceEmailAfterLineFail ||
        (!viewerPremiumLineInquiry && preferred === 'line' && Boolean(lineUid))
      const canLinePush =
        viewerPremiumLineInquiry &&
        preferred === 'line' &&
        Boolean(lineUid) &&
        !linePushUsed &&
        !forceEmailAfterLineFail

      const shouldCallNotify = preferred === 'email' || forceEmail || canLinePush

      try {
        if (shouldCallNotify) {
          const notifyRes = await fetch('/api/inquiries/notify-reply', {
            method: 'POST',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              inquiry_id: inquiry.id,
              message: messageToNotify,
              inquiry_reply_id: newReply?.id ?? undefined,
              force_email: forceEmail || undefined,
            }),
          })
          const payload = (await notifyRes.json().catch(() => ({}))) as {
            error?: string
            hint?: string
            code?: string
            can_use_email_fallback?: boolean
            sent_via?: string
            success?: boolean
            sent?: boolean
          }

          if (!notifyRes.ok) {
            const detail = payload.error || notifyRes.statusText
            console.warn('[InquiryList] notify-reply:', notifyRes.status, detail)

            if (notifyRes.status === 502 && payload.sent_via === 'line') {
              setForceEmailAfterLineFail(true)
              alert(
                `${detail}\n\nメールでの返信に切り替える場合は、「代わりにメールで返信する」を押してください。`
              )
            } else if (notifyRes.status === 401) {
              alert(
                '返信は保存されましたが、通知用のセッションがサーバーで認識できませんでした。一度ログアウトして再ログインするか、時間をおいて再度お試しください。'
              )
            } else if (notifyRes.status === 409 && payload.code === 'LINE_PUSH_ALREADY_SENT') {
              setInquiries((prev) =>
                prev.map((i) =>
                  i.id === inquiry.id ? { ...i, line_push_already_sent: true } : i
                )
              )
              setForceEmailAfterLineFail(false)
              alert(
                `${detail}\n\n必要であれば「代わりにメールで返信する」からメール通知を送れます。`
              )
            } else if (notifyRes.status === 502 || notifyRes.status === 503) {
              const hint = payload.hint ? `\n\n${payload.hint}` : ''
              alert(`送信に失敗しました: ${detail}${hint}`)
            } else if (notifyRes.status === 422 && payload.code === 'LINE_USER_ID_MISSING') {
              alert(`${detail}`)
            } else if (notifyRes.status !== 422) {
              alert(`送信に失敗しました: ${detail}`)
            }
          } else {
            setForceEmailAfterLineFail(false)
            if (payload.sent_via === 'line') {
              setInquiries((prev) =>
                prev.map((i) =>
                  i.id === inquiry.id ? { ...i, line_push_already_sent: true } : i
                )
              )
            }
          }
        } else {
          alert(
            '返信を履歴に保存しました。続きのやり取りは LINE Official Account Manager のチャットから、上記の LINE ユーザーIDの友だち宛にご返信ください。'
          )
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

  return (
    <div className="divide-y divide-slate-50">
      {inquiries.map((inquiry) => {
        const pref = replyPreferenceLabel(inquiry)
        const lineUid = inquiry.line_user_id?.trim()
        const lineMissing = pref.mode === 'line' && !lineUid
        const linePushUsed = inquiry.line_push_already_sent === true
        /** ダッシュボードから公式 LINE へ Push する経路（初回のみ） */
        const useLineNotify =
          viewerPremiumLineInquiry &&
          pref.mode === 'line' &&
          !lineMissing &&
          !forceEmailAfterLineFail &&
          !linePushUsed
        const expanded = expandedId === inquiry.id
        const isMemoOnlyMode =
          pref.mode === 'line' && !lineMissing && linePushUsed && !forceEmailAfterLineFail
        const placeholderText = useLineNotify
          ? 'LINEで送信するメッセージを入力…'
          : isMemoOnlyMode
            ? 'メモを入力…'
            : '返信メール本文を入力…'
        const labelText = useLineNotify
          ? 'LINE で送信する内容'
          : isMemoOnlyMode
            ? '返信メモ（履歴に保存）'
            : '返信メールの本文'
        const lineMemoNotSentNotice =
          'ここからはLINEに送信されません続きのやり取りは LINE Official Account Manager のチャットから、上記の LINE ユーザーIDの友だち宛にご返信ください。'
        const linePremiumFlow =
          viewerPremiumLineInquiry && pref.mode === 'line' && Boolean(lineUid) && !lineMissing

        const lineGuidePanel = (
          <div className="rounded-2xl border border-sky-100 bg-sky-50/90 p-4 text-xs font-semibold leading-relaxed text-slate-800 space-y-2">
            <p className="text-[10px] font-black uppercase tracking-widest text-sky-800">運用ガイド</p>
            <ol className="list-decimal space-y-1.5 pl-4">
              <li>
                最初の1通は<strong>この画面から</strong>返信内容を送信してください（お客様のLINEに通知が届きます）。
              </li>
              <li>
                2通目以降は、お客様から返信があったら<strong>「LINE公式チャットを開いて続きを話す」</strong>
                ボタンから管理画面のチャットを開き、通常のLINEのように<strong>無料で</strong>続けてください。
              </li>
            </ol>
            <p className="rounded-lg bg-white/80 p-2.5 text-[11px] text-slate-700 border border-sky-100/80">
              <strong>メリット:</strong>{' '}
              2通目以降を公式チャットで行うと、毎月の<strong>無料Push送信枠</strong>を節約できます。
            </p>
            <p className="text-[11px] text-slate-600">
              パタヤの現場では、技術より<strong>コストと手軽さ</strong>で説明すると伝わりやすいです。最初の1通は「お知らせ」、それ以降は普段のLINE感覚で大丈夫です。
            </p>
            <div className="flex flex-wrap items-center gap-2 border-t border-sky-100/80 pt-3">
              <Smartphone className="h-3.5 w-3.5 text-sky-700 shrink-0" aria-hidden />
              <span className="text-[10px] font-black text-sky-900">外出先はアプリ：</span>
              <a
                href={lineOfficialAccountAppIosUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[10px] font-black text-navy-primary underline decoration-navy-primary/30 hover:text-navy-secondary"
              >
                App Store
              </a>
              <span className="text-slate-300">|</span>
              <a
                href={lineOfficialAccountAppAndroidUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[10px] font-black text-navy-primary underline decoration-navy-primary/30 hover:text-navy-secondary"
              >
                Google Play
              </a>
              <span className="text-[10px] text-slate-500">（LINE公式アカウント）</span>
            </div>
          </div>
        )

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
                    {pref.mode === 'line' &&
                    lineUid &&
                    linePushUsed &&
                    !forceEmailAfterLineFail &&
                    viewerPremiumLineInquiry ? (
                      <span className="border border-[#06C755]/40 bg-[#06C755]/12 px-2 py-0.5 rounded text-[10px] font-black text-[#035c2e]">
                        Push送信済み・公式チャット推奨
                      </span>
                    ) : null}
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
                      お客様は <strong>LINE</strong>{' '}
                      での返信を希望されていますが、<strong>LINE ユーザーID が記録されていません</strong>
                      。この場合は <strong>メール</strong> で返信が送信されます（下のフォームから送信してください）。
                    </p>
                  </div>
                ) : null}

                {!viewerPremiumLineInquiry && pref.mode === 'line' && lineUid ? (
                  <div className="mb-6 rounded-2xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm font-bold text-sky-950 space-y-2">
                    <p>
                      お客様は <strong>LINE</strong> での返信を希望されていますが、
                      <strong>ダッシュボードからの LINE Push はプレミアムプラン専用</strong>
                      です。下のフォームから送信すると <strong>メール</strong> で通知されます。
                    </p>
                    <Link
                      href={`/${locale}/pricing`}
                      className="inline-flex text-xs font-black text-navy-primary underline decoration-navy-primary/40 hover:text-navy-secondary"
                    >
                      プレミアムにアップグレードする
                    </Link>
                  </div>
                ) : null}

                {forceEmailAfterLineFail ? (
                  <div className="mb-6 rounded-2xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm font-bold text-sky-900">
                    <p>
                      {linePushUsed ? (
                        <>
                          <strong>メール</strong> で通知します（LINE Push
                          は初回のみのため、以降は管理画面チャットまたはメールをご利用ください）。内容を確認して送信してください。
                        </>
                      ) : (
                        <>
                          次の送信は <strong>メール</strong> で送ります（LINE
                          送信エラー後の切り替え）。内容を確認して送信してください。
                        </>
                      )}
                    </p>
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
                          <MessageCircle className="w-3 h-3 mr-1.5" /> LINE ユーザーID（Push 宛先）
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

                  {linePremiumFlow && !forceEmailAfterLineFail ? (
                    <div className="space-y-5">
                      <div className="flex flex-wrap items-center gap-2">
                        <h5 className="text-sm font-black text-navy-secondary flex items-center gap-2">
                          <MessageCircle className="h-4 w-4 text-[#06C755]" />
                          LINE で返信
                        </h5>
                        {!linePushUsed ? (
                          <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[10px] font-black text-slate-600">
                            ステップ1 初回メッセージ送信
                          </span>
                        ) : (
                          <span className="rounded-full bg-[#06C755]/15 px-2.5 py-0.5 text-[10px] font-black text-[#035c2e]">
                            ステップ2 公式チャットで継続
                          </span>
                        )}
                      </div>

                      {!linePushUsed ? (
                        <>
                          <label className="sr-only" htmlFor={`inquiry-reply-${inquiry.id}`}>
                            LINE で送信する内容
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
                          <textarea
                            id={`inquiry-reply-${inquiry.id}`}
                            rows={6}
                            className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm focus:ring-2 focus:ring-navy-primary outline-none transition-all resize-none"
                            placeholder={placeholderText}
                            value={replyText}
                            onChange={(e) => setReplyText(e.target.value)}
                            aria-label="LINE で送信する内容"
                          />
                          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
                            <button
                              type="button"
                              onClick={() => handleSendReply(inquiry)}
                              disabled={isSubmittingReply || !replyText.trim()}
                              className="inline-flex items-center justify-center gap-2 rounded-xl bg-navy-primary px-5 py-3 text-sm font-black text-white shadow-lg shadow-navy-primary/20 transition-all hover:bg-navy-secondary disabled:cursor-not-allowed disabled:opacity-50"
                              title="LINE で送信（初回のみ Push）"
                            >
                              {isSubmittingReply ? (
                                <Loader2 className="h-5 w-5 animate-spin" />
                              ) : (
                                <MessageCircle className="h-5 w-5" />
                              )}
                              LINE で送信
                            </button>
                            <p className="text-[10px] font-bold leading-snug text-slate-600 max-w-md">
                              ※初回のみPushメッセージとして送信されます
                            </p>
                          </div>
                          <p className="text-[10px] text-slate-500 font-bold">
                            送信すると公式 LINE からお客様の LINE に通知が届きます（このお問い合わせでは1回まで）。内容は返信履歴にも保存されます。
                          </p>
                          {lineGuidePanel}
                        </>
                      ) : null}

                      {linePushUsed ? (
                        <div className="space-y-4">
                          <div>
                            <p className="mb-2 text-[10px] font-black uppercase tracking-widest text-[#047c3d]">
                              公式チャットへ移動
                            </p>
                            <a
                              href={lineOfficialManagerChatUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[#06C755] px-4 py-4 text-sm font-black text-white shadow-lg shadow-[#06C755]/30 transition-colors hover:bg-[#05b34c]"
                            >
                              LINE公式チャットを開いて続きを話す
                              <ExternalLink className="h-4 w-4 shrink-0" />
                            </a>
                            <p className="mt-2 text-[10px] font-semibold text-slate-500">
                              管理画面が開いたら画面上部の<strong>「チャット」</strong>タブを選び、一覧から上記 LINE
                              ユーザーIDの友だちとのトークを開いてください（個別トークへの直リンクは LINE
                              側で提供されていません）。
                            </p>
                          </div>

                          {lineGuidePanel}

                          <div>
                            <h5 className="text-sm font-black text-navy-secondary mb-3 flex items-center">
                              <MessageCircle className="w-4 h-4 mr-2 text-[#047c3d]" />
                              返信メモ（履歴に保存）
                            </h5>
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
                            <div className="flex flex-col gap-4 md:flex-row md:items-stretch md:gap-5">
                              <div className="relative min-w-0 flex-1">
                                <textarea
                                  id={`inquiry-reply-memo-${inquiry.id}`}
                                  rows={8}
                                  className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm focus:ring-2 focus:ring-navy-primary outline-none transition-all resize-none pr-14"
                                  placeholder={placeholderText}
                                  value={replyText}
                                  onChange={(e) => setReplyText(e.target.value)}
                                  aria-label="返信メモ（履歴に保存）"
                                />
                                <button
                                  type="button"
                                  onClick={() => handleSendReply(inquiry)}
                                  disabled={isSubmittingReply || !replyText.trim()}
                                  className="absolute right-3 bottom-3 p-3 bg-navy-primary text-white rounded-xl hover:bg-navy-secondary transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
                                  title="履歴に保存（Pushは送りません）"
                                >
                                  {isSubmittingReply ? (
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                  ) : (
                                    <MessageCircle className="w-5 h-5" />
                                  )}
                                </button>
                              </div>
                              <aside className="md:w-[min(100%,20rem)] shrink-0 rounded-2xl border border-red-200 bg-red-50 p-4">
                                <p className="text-xs font-black leading-relaxed text-red-600">
                                  {lineMemoNotSentNotice}
                                </p>
                              </aside>
                            </div>
                            <p className="text-[10px] text-slate-500 mt-2 px-1 font-bold">
                              ※この欄の内容は履歴にのみ保存されます（Push・メールは送りません）。
                            </p>
                          </div>
                        </div>
                      ) : null}

                      <button
                        type="button"
                        onClick={() => setForceEmailAfterLineFail(true)}
                        className="text-xs font-black text-sky-700 underline decoration-sky-300 hover:text-sky-900"
                      >
                        代わりにメールで返信する
                      </button>
                    </div>
                  ) : (
                    <div>
                      <h5 className="text-sm font-black text-navy-secondary mb-3 flex items-center">
                        {isMemoOnlyMode ? (
                          <>
                            <MessageCircle className="w-4 h-4 mr-2 text-[#047c3d]" />
                            返信メモ
                          </>
                        ) : (
                          <>
                            <Send className="w-4 h-4 mr-2" />
                            {labelText}
                          </>
                        )}
                      </h5>
                      {!isMemoOnlyMode ? (
                        <label className="sr-only" htmlFor={`inquiry-reply-${inquiry.id}`}>
                          {labelText}
                        </label>
                      ) : null}
                      {!isMemoOnlyMode ? (
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
                      ) : null}
                      <div
                        className={
                          isMemoOnlyMode
                            ? 'flex flex-col gap-4 md:flex-row md:items-stretch md:gap-5'
                            : ''
                        }
                      >
                        <div className={`relative min-w-0 ${isMemoOnlyMode ? 'flex-1' : ''}`}>
                          <textarea
                            id={`inquiry-reply-${inquiry.id}`}
                            rows={isMemoOnlyMode ? 8 : 6}
                            className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm focus:ring-2 focus:ring-navy-primary outline-none transition-all resize-none pr-14"
                            placeholder={placeholderText}
                            value={replyText}
                            onChange={(e) => setReplyText(e.target.value)}
                            aria-label={isMemoOnlyMode ? '返信メモ（履歴に保存）' : labelText}
                          />
                          <button
                            type="button"
                            onClick={() => handleSendReply(inquiry)}
                            disabled={isSubmittingReply || !replyText.trim()}
                            className="absolute right-3 bottom-3 p-3 bg-navy-primary text-white rounded-xl hover:bg-navy-secondary transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
                            title={
                              useLineNotify
                                ? 'LINE で送信'
                                : isMemoOnlyMode
                                  ? '履歴に保存（Pushは送りません）'
                                  : 'メールで送信'
                            }
                          >
                            {isSubmittingReply ? (
                              <Loader2 className="w-5 h-5 animate-spin" />
                            ) : useLineNotify ? (
                              <MessageCircle className="w-5 h-5" />
                            ) : (
                              <Send className="w-5 h-5" />
                            )}
                          </button>
                        </div>
                        {isMemoOnlyMode ? (
                          <aside className="md:w-[min(100%,20rem)] shrink-0 rounded-2xl border border-red-200 bg-red-50 p-4">
                            <p className="text-xs font-black leading-relaxed text-red-600">
                              {lineMemoNotSentNotice}
                            </p>
                          </aside>
                        ) : null}
                      </div>
                      <p className="text-[10px] text-slate-500 mt-2 px-1 font-bold">
                        {useLineNotify
                          ? '※送信すると公式 LINE からお客様の LINE に Push 通知されます（お問い合わせあたり1回まで）。内容は返信履歴にも保存されます。'
                          : isMemoOnlyMode
                            ? '※この欄の内容は履歴にのみ保存されます。'
                            : '※送信するとお客様のメール宛に届きます。内容は返信履歴にも保存されます。'}
                      </p>
                      {pref.mode === 'line' && !lineMissing && (useLineNotify || linePushUsed) ? (
                        <button
                          type="button"
                          onClick={() => setForceEmailAfterLineFail(true)}
                          className="mt-2 text-xs font-black text-sky-700 underline decoration-sky-300 hover:text-sky-900"
                        >
                          代わりにメールで返信する
                        </button>
                      ) : null}
                      {forceEmailAfterLineFail && pref.mode === 'line' && lineUid && !linePushUsed ? (
                        <button
                          type="button"
                          onClick={() => setForceEmailAfterLineFail(false)}
                          className="mt-2 text-xs font-black text-slate-500 underline hover:text-navy-secondary"
                        >
                          LINE で送り直すモードに戻す
                        </button>
                      ) : null}
                    </div>
                  )}

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
  )
}
