'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Mail, Lock, Loader2, ArrowRight } from 'lucide-react'
import { getErrorMessage } from '@/lib/utils/errors'

export default function RegisterPage() {
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [loading, setLoading] = useState(false)
    const [isSignUp, setIsSignUp] = useState(true)
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)

    const router = useRouter()
    const supabase = createClient()

    const handleAuth = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setMessage(null)

        try {
            if (isSignUp) {
                const { error } = await supabase.auth.signUp({
                    email,
                    password,
                    options: {
                        emailRedirectTo: `${window.location.origin}/auth/callback`,
                    },
                })
                if (error) throw error
                setMessage({ type: 'success', text: '確認メールを送信しました。メールボックスを確認してください。' })
            } else {
                const { data: { user }, error: signInError } = await supabase.auth.signInWithPassword({
                    email,
                    password,
                })
                if (signInError) throw signInError

                if (user) {
                    const { data: profile } = await supabase
                        .from('profiles')
                        .select('is_admin')
                        .eq('id', user.id)
                        .single()

                    router.refresh()

                    if (profile?.is_admin) {
                        router.push('/admin-secret')
                    } else {
                        router.push('/dashboard')
                    }
                }

            }
        } catch (error: any) {
            setMessage({ type: 'error', text: getErrorMessage(error) })
        } finally {
            setLoading(false)
        }
    }


    return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center py-20 px-4">
            <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden border border-slate-100">
                <div className="bg-navy-primary p-8 text-center">
                    <h1 className="text-2xl font-black text-white mb-2">
                        {isSignUp ? 'アカウント作成' : 'ログイン'}
                    </h1>
                    <p className="text-navy-secondary text-sm font-medium">Chonburi Connect</p>
                </div>

                <div className="p-8">
                    {message && (
                        <div className={`mb-6 p-4 rounded-xl text-sm font-medium ${message.type === 'success' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-red-50 text-red-600 border border-red-100'}`}>
                            {message.text}
                        </div>
                    )}

                    <form onSubmit={handleAuth} className="space-y-4">
                        <div>
                            <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1 ml-1">メールアドレス</label>
                            <div className="relative">
                                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="name@example.com"
                                    className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-sm focus:ring-2 focus:ring-navy-primary outline-none transition-all"
                                    required
                                    onInvalid={e => (e.target as HTMLInputElement).setCustomValidity('メールアドレスを入力してください')}
                                    onInput={e => (e.target as HTMLInputElement).setCustomValidity('')}
                                />

                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1 ml-1">パスワード</label>
                            <div className="relative">
                                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                <input
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="••••••••"
                                    className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-sm focus:ring-2 focus:ring-navy-primary outline-none transition-all"
                                    required
                                    onInvalid={e => (e.target as HTMLInputElement).setCustomValidity('パスワードを入力してください')}
                                    onInput={e => (e.target as HTMLInputElement).setCustomValidity('')}
                                />

                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-navy-primary text-white py-4 rounded-xl font-bold flex items-center justify-center space-x-2 hover:bg-navy-secondary transition-all shadow-lg hover:shadow-xl mt-8"
                        >
                            {loading ? (
                                <Loader2 className="w-5 h-5 animate-spin" />
                            ) : (
                                <>
                                    <span>{isSignUp ? '新規登録' : 'ログインする'}</span>
                                    <ArrowRight className="w-4 h-4" />
                                </>
                            )}
                        </button>
                    </form>

                    <div className="mt-8 pt-6 border-t border-slate-50 text-center">
                        <button
                            onClick={() => setIsSignUp(!isSignUp)}
                            className="text-sm font-bold text-navy-primary hover:text-navy-secondary transition-colors"
                        >
                            {isSignUp ? 'すでにアカウントをお持ちの方（ログイン）' : '新しくアカウントを作成する'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}
