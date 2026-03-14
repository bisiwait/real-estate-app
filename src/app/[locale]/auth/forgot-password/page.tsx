'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Mail, Loader2, ArrowLeft, Send, CheckCircle2 } from 'lucide-react'
import Link from 'next/link'
import { getErrorMessage } from '@/lib/utils/errors'
import { motion } from 'framer-motion'

export default function ForgotPasswordPage() {
    const [email, setEmail] = useState('')
    const [loading, setLoading] = useState(false)
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)

    const supabase = createClient()

    const handleResetRequest = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setMessage(null)

        try {
            const { error } = await supabase.auth.resetPasswordForEmail(email, {
                redirectTo: `${window.location.origin}/auth/callback?next=/auth/reset-password`,
            })
            if (error) throw error
            setMessage({ type: 'success', text: 'パスワード再設定用のメールを送信しました。' })
        } catch (error: any) {
            setMessage({ type: 'error', text: getErrorMessage(error) })
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center py-20 px-4 mt-10">
            <div className="bg-white w-full max-w-md rounded-[40px] shadow-2xl overflow-hidden border border-slate-100 p-8 md:p-12">
                <div className="mb-10 text-center">
                    <div className="w-16 h-16 bg-navy-primary/5 rounded-2xl flex items-center justify-center mx-auto mb-6">
                        <Mail className="w-8 h-8 text-navy-primary" />
                    </div>
                    <h1 className="text-3xl font-black text-navy-secondary mb-3">
                        パスワードをお忘れですか？
                    </h1>
                    <p className="text-slate-400 font-medium">登録済みのメールアドレスを入力してください。再設定用のリンクをお送りします。</p>
                </div>

                {message && (
                    <div className={`mb-8 p-4 rounded-2xl text-sm font-bold flex items-center ${message.type === 'success' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-red-50 text-red-600 border border-red-100'}`}>
                        {message.type === 'success' ? <CheckCircle2 className="w-4 h-4 mr-3 shrink-0" /> : <Mail className="w-4 h-4 mr-3 shrink-0" />}
                        {message.text}
                    </div>
                )}

                {message?.type !== 'success' ? (
                    <form onSubmit={handleResetRequest} className="space-y-6">
                        <div>
                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">メールアドレス</label>
                            <div className="relative">
                                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="name@example.com"
                                    className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm focus:ring-4 focus:ring-navy-primary/5 focus:border-navy-primary outline-none transition-all font-medium"
                                    required
                                />
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-navy-primary text-white py-5 rounded-2xl font-black flex items-center justify-center space-x-3 hover:bg-navy-secondary transition-all shadow-xl shadow-navy-primary/20"
                        >
                            {loading ? (
                                <Loader2 className="w-5 h-5 animate-spin" />
                            ) : (
                                <>
                                    <span>送信する</span>
                                    <Send className="w-5 h-5" />
                                </>
                            )}
                        </button>
                    </form>
                ) : (
                    <div className="text-center">
                        <p className="text-slate-500 mb-8 font-medium">メールが届かない場合は、迷惑メールフォルダを確認するか、時間をおいて再度お試しください。</p>
                        <Link
                            href="/login"
                            className="inline-flex items-center space-x-2 text-navy-primary font-black hover:text-navy-secondary transition-colors"
                        >
                            <ArrowLeft className="w-4 h-4" />
                            <span>ログイン画面に戻る</span>
                        </Link>
                    </div>
                )}

                <div className="mt-10 pt-8 border-t border-slate-50 text-center font-bold">
                    <Link
                        href="/login"
                        className="text-sm text-slate-400 hover:text-navy-primary transition-colors flex items-center justify-center space-x-2"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        <span>ログインに戻る</span>
                    </Link>
                </div>
            </div>
        </div>
    )
}
