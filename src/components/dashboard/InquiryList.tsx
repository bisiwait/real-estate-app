'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Mail, Calendar, User, Phone, CheckCircle, ChevronDown, ChevronUp, Reply, Send, Loader2 } from 'lucide-react'

interface Inquiry {
    id: string
    property_id: string
    inquirer_name: string
    inquirer_email: string
    inquirer_phone: string | null
    message: string
    is_read: boolean
    created_at: string
    property?: {
        title: string
    },
    replies?: {
        id: string
        message: string
        created_at: string
    }[]
}

interface InquiryListProps {
    initialInquiries: any[]
}

export default function InquiryList({ initialInquiries }: InquiryListProps) {
    const [inquiries, setInquiries] = useState<Inquiry[]>(initialInquiries)
    const [expandedId, setExpandedId] = useState<string | null>(null)
    const [replyText, setReplyText] = useState('')
    const [isSubmittingReply, setIsSubmittingReply] = useState(false)
    const supabase = createClient()

    const handleToggleRead = async (id: string, currentReadStatus: boolean) => {
        if (currentReadStatus) return // Already read

        try {
            // Check if ID is a valid UUID
            const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)

            if (isUuid) {
                const { error } = await supabase
                    .from('inquiries')
                    .update({ is_read: true })
                    .eq('id', id)

                if (error) throw error
            } else {
                console.log('Mock inquiry detected. Marking as read in local state only.')
            }

            setInquiries(prev => prev.map(inq =>
                inq.id === id ? { ...inq, is_read: true } : inq
            ))
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

    const handleSendReply = async (inquiryId: string) => {
        if (!replyText.trim()) return

        setIsSubmittingReply(true)
        try {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) throw new Error('Not authenticated')

            const { data: newReply, error } = await supabase
                .from('inquiry_replies')
                .insert([
                    {
                        inquiry_id: inquiryId,
                        sender_id: user.id,
                        message: replyText
                    }
                ])
                .select()
                .single()

            if (error) throw error

            // Update local state
            setInquiries(prev => prev.map(inq => {
                if (inq.id === inquiryId) {
                    return {
                        ...inq,
                        replies: [...(inq.replies || []), newReply]
                    }
                }
                return inq
            }))
            setReplyText('')
        } catch (err) {
            console.error('Error sending reply:', err)
            alert('返信の送信に失敗しました。')
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
            {inquiries.map((inquiry) => (
                <div key={inquiry.id} className={`p-6 transition-all ${!inquiry.is_read ? 'bg-navy-primary/[0.02]' : ''}`}>
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="flex items-center space-x-4">
                            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 ${!inquiry.is_read ? 'bg-navy-primary text-white shadow-lg shadow-navy-primary/20' : 'bg-slate-100 text-slate-400'
                                }`}>
                                <Mail className="w-6 h-6" />
                            </div>
                            <div>
                                <div className="flex items-center space-x-3 mb-1">
                                    {!inquiry.is_read && (
                                        <span className="bg-navy-primary text-white px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider">New</span>
                                    )}
                                    {inquiry.replies && inquiry.replies.length > 0 ? (
                                        <span className="bg-emerald-100 text-emerald-600 px-2 py-0.5 rounded text-[10px] font-bold">返信済み</span>
                                    ) : (
                                        <span className="bg-slate-100 text-slate-500 px-2 py-0.5 rounded text-[10px] font-bold">未対応</span>
                                    )}
                                    <span className="text-xs text-slate-400 font-bold uppercase tracking-widest flex items-center">
                                        <Calendar className="w-3 h-3 mr-1" />
                                        {new Date(inquiry.created_at).toLocaleDateString('ja-JP')}
                                    </span>
                                </div>
                                <h4 className="text-lg font-bold text-navy-secondary">
                                    {inquiry.inquirer_name} <span className="text-sm font-normal text-slate-400 ml-1">さんからのお問い合わせ</span>
                                </h4>
                                <p className="text-xs text-navy-primary font-bold mt-1">
                                    対象物件: {inquiry.property?.title || 'Unknown Property'}
                                </p>
                            </div>
                        </div>

                        <button
                            onClick={() => toggleExpand(inquiry.id, inquiry.is_read)}
                            className={`flex items-center space-x-2 px-6 py-2.5 rounded-xl text-sm font-bold transition-all border ${expandedId === inquiry.id
                                ? 'bg-navy-secondary text-white border-navy-secondary shadow-lg'
                                : 'bg-white text-navy-primary border-navy-primary/10 hover:border-navy-primary/30 hover:shadow-md'
                                }`}
                        >
                            <span>{expandedId === inquiry.id ? '内容を閉じる' : '詳細を確認'}</span>
                            {expandedId === inquiry.id ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </button>
                    </div>

                    {expandedId === inquiry.id && (
                        <div className="mt-8 pt-8 border-t border-slate-100 animate-in slide-in-from-top-4 duration-300">
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
                                    <p className="text-[10px] font-black text-navy-primary/60 uppercase tracking-widest mb-4">メッセージ内容</p>
                                    <div className="text-slate-600 text-sm leading-relaxed whitespace-pre-wrap italic">
                                        "{inquiry.message}"
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-6">
                                <h5 className="text-sm font-black text-navy-secondary mb-4 flex items-center">
                                    <Reply className="w-4 h-4 mr-2" />
                                    返信履歴
                                </h5>

                                {inquiry.replies && inquiry.replies.length > 0 ? (
                                    <div className="space-y-4 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                                        {inquiry.replies.map((reply) => (
                                            <div key={reply.id} className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm ml-4 relative">
                                                <div className="absolute top-4 -left-2 w-4 h-4 bg-white border-l border-t border-slate-100 rotate-45"></div>
                                                <p className="text-xs text-slate-400 mb-2 font-bold">
                                                    {new Date(reply.created_at).toLocaleString('ja-JP')}
                                                </p>
                                                <p className="text-sm text-slate-700 leading-relaxed">{reply.message}</p>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="text-xs text-slate-400 italic">まだ返信はありません</p>
                                )}

                                <div className="mt-6 pt-6 border-t border-slate-100">
                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">返信を作成する</label>
                                    <div className="relative">
                                        <textarea
                                            rows={3}
                                            className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm focus:ring-2 focus:ring-navy-primary outline-none transition-all resize-none pr-14"
                                            placeholder="返信内容を入力してください..."
                                            value={replyText}
                                            onChange={(e) => setReplyText(e.target.value)}
                                        ></textarea>
                                        <button
                                            onClick={() => handleSendReply(inquiry.id)}
                                            disabled={isSubmittingReply || !replyText.trim()}
                                            className="absolute right-3 bottom-3 p-3 bg-navy-primary text-white rounded-xl hover:bg-navy-secondary transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
                                        >
                                            {isSubmittingReply ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                                        </button>
                                    </div>
                                    <p className="text-[10px] text-slate-400 mt-2 px-1">
                                        ※返信内容はシステムに記録され、今後の対応履歴として確認できます。
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
            ))}
        </div>
    )
}
