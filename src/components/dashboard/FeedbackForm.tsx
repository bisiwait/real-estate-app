'use client'

import React, { useState } from 'react'
import { Lightbulb, X, Loader2, Send } from 'lucide-react'
import { toast } from 'sonner'
import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs))
}

export default function FeedbackForm() {
    const [isOpen, setIsOpen] = useState(false)
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [formData, setFormData] = useState({
        title: '',
        content: ''
    })

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!formData.title || !formData.content) {
            toast.error('タイトルと内容を入力してください。')
            return
        }

        setIsSubmitting(true)
        try {
            const res = await fetch('/api/feedback', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...formData,
                    priority: 'medium' // 内部的にデフォルト値を送信
                })
            })

            if (!res.ok) throw new Error('送信に失敗しました')

            toast.success('貴重なご意見ありがとうございます！開発チームで検討いたします')
            setFormData({ title: '', content: '' })
            setIsOpen(false)
        } catch (error) {
            console.error(error)
            toast.error('エラーが発生しました。時間をおいて再度お試しください。')
        } finally {
            setIsSubmitting(false)
        }
    }

    return (
        <>
            <button
                onClick={() => setIsOpen(true)}
                className="w-full flex items-center justify-center gap-2 px-6 py-3.5 rounded-2xl bg-amber-50 text-amber-600 border border-amber-100 font-bold hover:bg-amber-100 transition-all active:scale-95 shadow-sm"
            >
                <Lightbulb className="w-5 h-5" />
                <span>要望を送る</span>
            </button>

            {isOpen && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-navy-primary/60 backdrop-blur-sm animate-in fade-in duration-200">
                    <div 
                        className="bg-white rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200"
                        onClick={e => e.stopPropagation()}
                    >
                        <div className="px-6 py-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <Lightbulb className="w-5 h-5 text-amber-500" />
                                <h2 className="text-lg font-black text-navy-secondary">要望・改善提案</h2>
                            </div>
                            <button onClick={() => setIsOpen(false)} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
                                <X className="w-5 h-5 text-slate-400" />
                            </button>
                        </div>

                        <div className="px-4 sm:px-6 pt-4">
                            <div className="rounded-lg bg-blue-50 border border-blue-100/80 p-4 text-sm text-slate-700 leading-relaxed space-y-3 shadow-sm">
                                <h3 className="font-black text-navy-secondary flex items-start gap-2 text-base leading-snug">
                                    <span className="text-xl leading-none shrink-0" aria-hidden>
                                        💡
                                    </span>
                                    <span>システム改善へのご協力のお願い</span>
                                </h3>
                                <p>
                                    日頃より当サイトをご利用いただき、誠にありがとうございます。
                                    私たちは、パタヤ・シラチャで活動するエージェントの皆様にとって「最も使いやすく、成約に近い管理画面」を目指し、日々アップデートを行っております。
                                </p>
                                <p>
                                    「この項目を増やしてほしい」「スマホでの操作を楽にしてほしい」など、現場ならではの気づきやご不満をぜひお聞かせください。
                                    いただいたご要望は開発チームがすべて目を通し、順次機能改善に役立てさせていただきます。
                                </p>
                                <p className="text-xs text-slate-600 border-t border-blue-100/80 pt-3">
                                    ※すべての要望の採用をお約束するものではありませんが、皆様と共に最高のプラットフォームを創り上げたいと考えております。必ず真摯に検討いたします。
                                </p>
                            </div>
                        </div>

                        <form onSubmit={handleSubmit} className="p-4 sm:p-6 pt-4 space-y-5">
                            <div>
                                <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">タイトル</label>
                                <input
                                    type="text"
                                    value={formData.title}
                                    onChange={e => setFormData({ ...formData, title: e.target.value })}
                                    placeholder="例：物件一覧の並び替え機能について"
                                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-amber-400 focus:outline-none font-medium text-sm transition-all"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">内容</label>
                                <textarea
                                    value={formData.content}
                                    onChange={e => setFormData({ ...formData, content: e.target.value })}
                                    placeholder="具体的な改善案や、困っていることを教えてください。"
                                    rows={5}
                                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-amber-400 focus:outline-none font-medium text-sm transition-all resize-none"
                                />
                            </div>

                            <button
                                type="submit"
                                disabled={isSubmitting}
                                className="w-full py-4 bg-navy-primary text-white rounded-2xl font-black shadow-xl shadow-navy-primary/20 hover:bg-navy-secondary transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2"
                            >
                                {isSubmitting ? (
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                ) : (
                                    <>
                                        <Send className="w-4 h-4" />
                                        <span>送信する</span>
                                    </>
                                )}
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </>
    )
}
