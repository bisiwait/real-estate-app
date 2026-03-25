'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter, useParams, useSearchParams } from 'next/navigation'
import { safeNextPath } from '@/lib/auth/safe-next-path'
import { Mail, Lock, Loader2, ArrowRight } from 'lucide-react'
import { getErrorMessage } from '@/lib/utils/errors'
import { setSignupWelcomeCookie } from '@/lib/auth/signupWelcomeCookie'
import { getAuthSiteOrigin } from '@/lib/auth/site-origin'
import { buildAuthCallbackRedirectUrl } from '@/lib/auth/auth-callback-url'

export default function RegisterPageClient() {
    const params = useParams()
    const searchParams = useSearchParams()
    const locale = (params?.locale as string) || 'jp'
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [loading, setLoading] = useState(false)
    const [isSignUp, setIsSignUp] = useState(true)
    const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

    const router = useRouter()
    const supabase = createClient()

    const handleAuth = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setMessage(null)

        try {
            if (isSignUp) {
                const { data: signUpResult, error } = await supabase.auth.signUp({
                    email,
                    password,
                    options: {
                        emailRedirectTo: buildAuthCallbackRedirectUrl(
                            getAuthSiteOrigin(),
                            locale,
                            `/${locale}/signup/success?new=1`
                        ),
                    },
                })
                if (error) throw error
                if (signUpResult.session) {
                    void fetch('/api/auth/sync-agent-profile', {
                        method: 'POST',
                        credentials: 'same-origin',
                    }).catch(() => {})
                    setSignupWelcomeCookie()
                    const after = safeNextPath(searchParams.get('redirect') || searchParams.get('next'))
                    router.replace(after ?? `/${locale}/signup/success?new=1`)
                    return
                }
                setIsSignUp(false)
            } else {
                const {
                    data: { user },
                    error: signInError,
                } = await supabase.auth.signInWithPassword({
                    email,
                    password,
                })
                if (signInError) throw signInError

                if (user) {
                    await fetch('/api/auth/sync-agent-profile', {
                        method: 'POST',
                        credentials: 'same-origin',
                    }).catch(() => {})

                    let { data: profile, error: profileError } = await supabase
                        .from('profiles')
                        .select('user_role, is_admin')
                        .eq('id', user.id)
                        .single()

                    if (profileError) {
                        const { data: fallbackProfile } = await supabase
                            .from('profiles')
                            .select('is_admin, user_role')
                            .eq('id', user.id)
                            .single()
                        profile = fallbackProfile as typeof profile
                    }

                    router.refresh()

                    const isAdmin = profile?.is_admin === true || profile?.user_role === 'admin'
                    const isAgent = profile?.user_role === 'agent'

                    if (isAdmin) {
                        router.push(`/${locale}/admin-secret`)
                    } else if (isAgent) {
                        router.push(`/${locale}/dashboard`)
                    } else {
                        const returnTo = safeNextPath(
                            searchParams.get('redirect') || searchParams.get('next')
                        )
                        router.push(returnTo ?? `/${locale}/mypage`)
                    }
                }
            }
        } catch (error: unknown) {
            setMessage({ type: 'error', text: getErrorMessage(error) })
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-20">
            <div className="w-full max-w-md overflow-hidden rounded-3xl border border-slate-100 bg-white shadow-2xl">
                <div className="bg-navy-primary p-8 text-center">
                    <h1 className="mb-2 text-2xl font-black text-white">
                        {isSignUp ? 'アカウント作成' : 'ログイン'}
                    </h1>
                    <p className="text-sm font-medium text-navy-secondary">Chonburi Connect</p>
                </div>

                <div className="p-8">
                    {message && (
                        <div
                            className={`mb-6 rounded-xl p-4 text-sm font-medium ${
                                message.type === 'success'
                                    ? 'border border-emerald-100 bg-emerald-50 text-emerald-600'
                                    : 'border border-red-100 bg-red-50 text-red-600'
                            }`}
                        >
                            {message.text}
                        </div>
                    )}

                    <form onSubmit={handleAuth} className="space-y-4">
                        <div>
                            <label className="mb-1 ml-1 block text-xs font-bold uppercase tracking-widest text-slate-400">
                                メールアドレス
                            </label>
                            <div className="relative">
                                <Mail className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="name@example.com"
                                    className="w-full rounded-xl border border-slate-100 bg-slate-50 py-3 pl-11 pr-4 text-sm outline-none transition-all focus:ring-2 focus:ring-navy-primary"
                                    required
                                    onInvalid={(e) =>
                                        (e.target as HTMLInputElement).setCustomValidity(
                                            'メールアドレスを入力してください'
                                        )
                                    }
                                    onInput={(e) => (e.target as HTMLInputElement).setCustomValidity('')}
                                />
                            </div>
                        </div>

                        <div>
                            <label className="mb-1 ml-1 block text-xs font-bold uppercase tracking-widest text-slate-400">
                                パスワード
                            </label>
                            <div className="relative">
                                <Lock className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                                <input
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="••••••••"
                                    className="w-full rounded-xl border border-slate-100 bg-slate-50 py-3 pl-11 pr-4 text-sm outline-none transition-all focus:ring-2 focus:ring-navy-primary"
                                    required
                                    onInvalid={(e) =>
                                        (e.target as HTMLInputElement).setCustomValidity('パスワードを入力してください')
                                    }
                                    onInput={(e) => (e.target as HTMLInputElement).setCustomValidity('')}
                                />
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="mt-8 flex w-full items-center justify-center space-x-2 rounded-xl bg-navy-primary py-4 font-bold text-white shadow-lg transition-all hover:bg-navy-secondary hover:shadow-xl"
                        >
                            {loading ? (
                                <Loader2 className="h-5 w-5 animate-spin" />
                            ) : (
                                <>
                                    <span>{isSignUp ? '新規登録' : 'ログインする'}</span>
                                    <ArrowRight className="h-4 w-4" />
                                </>
                            )}
                        </button>
                    </form>

                    <div className="mt-8 border-t border-slate-50 pt-6 text-center">
                        <button
                            type="button"
                            onClick={() => setIsSignUp(!isSignUp)}
                            className="text-sm font-bold text-navy-primary transition-colors hover:text-navy-secondary"
                        >
                            {isSignUp ? 'すでにアカウントをお持ちの方（ログイン）' : '新しくアカウントを作成する'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}
