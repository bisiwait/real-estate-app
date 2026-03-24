'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter, useSearchParams } from 'next/navigation'
import { Mail, Lock, Loader2, ArrowRight, Chrome, ShieldCheck, Heart, Search, CheckCircle2 } from 'lucide-react'
import Link from 'next/link'
import { getErrorMessage } from '@/lib/utils/errors'
import { setSignupWelcomeCookie } from '@/lib/auth/signupWelcomeCookie'
import { safeNextPath } from '@/lib/auth/safe-next-path'
import { motion, AnimatePresence } from 'framer-motion'

interface LoginContentProps {
    dict: any
    locale: string
}

export default function LoginContent({ dict, locale }: LoginContentProps) {
    const searchParams = useSearchParams()
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [confirmPassword, setConfirmPassword] = useState('')
    const [agreeTerms, setAgreeTerms] = useState(false)
    const [loading, setLoading] = useState(false)
    const [isSignUp, setIsSignUp] = useState(searchParams.get('signup') === 'true')
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)

    const router = useRouter()
    const supabase = createClient()

    const handleTabChange = (signUp: boolean) => {
        setIsSignUp(signUp)
        setMessage(null)
        const params = new URLSearchParams(searchParams.toString())
        if (signUp) {
            params.set('signup', 'true')
        } else {
            params.delete('signup')
        }
        router.push(`/${locale}/login?${params.toString()}`)
    }

    const handleAuth = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setMessage(null)

        try {
            if (isSignUp) {
                if (password !== confirmPassword) {
                    throw new Error(dict.auth.password_mismatch || "Passwords do not match.")
                }
                if (!agreeTerms) {
                    throw new Error(dict.auth.agree_terms_required || "Please agree to the terms of service.")
                }
                const { data: signUpResult, error } = await supabase.auth.signUp({
                    email,
                    password,
                    options: {
                        emailRedirectTo: `${window.location.origin}/${locale}/auth/callback?next=${encodeURIComponent(`/${locale}/signup/success?new=1`)}`,
                    },
                })
                if (error) throw error

                // メール確認OFFのときはセッション付与 → 一般ユーザーはそのままサンクスページへ（replace で戻れないように）
                if (signUpResult.session?.user) {
                    const user = signUpResult.session.user
                    const signedUpAsAgent = user.user_metadata?.user_role === 'agent'

                    if (signedUpAsAgent) {
                        await fetch('/api/auth/sync-agent-profile', {
                            method: 'POST',
                            credentials: 'same-origin',
                        }).catch(() => {})
                        router.refresh()
                        router.replace(`/${locale}/dashboard`)
                        return
                    }

                    void fetch('/api/auth/sync-agent-profile', {
                        method: 'POST',
                        credentials: 'same-origin',
                    }).catch(() => {})
                    setSignupWelcomeCookie()
                    router.replace(`/${locale}/signup/success?new=1`)
                    return
                }

                // メール確認ONの環境: 緑の成功文は出さず、ログインタブへ誘導
                handleTabChange(false)
            } else {
                const { data: { user }, error: signInError } = await supabase.auth.signInWithPassword({
                    email,
                    password,
                })
                if (signInError) throw signInError

                if (user) {
                    // エージェント登録メタデータを profiles に同期（RLS で弾かれた場合の救済）
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
                        profile = fallbackProfile as any
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
                        if (returnTo) {
                            router.push(returnTo)
                        } else {
                            router.push(`/${locale}/mypage`)
                        }
                    }
                }
            }
        } catch (error: any) {
            setMessage({ type: 'error', text: getErrorMessage(error) })
        } finally {
            setLoading(false)
        }
    }

    const handleSocialLogin = async (provider: 'google') => {
        try {
            const nextAfterAuth = isSignUp
                ? `/${locale}/signup/success?new=1`
                : `/${locale}/mypage`
            const { error } = await supabase.auth.signInWithOAuth({
                provider,
                options: {
                    redirectTo: `${window.location.origin}/${locale}/auth/callback?next=${encodeURIComponent(nextAfterAuth)}`,
                },
            })
            if (error) throw error
        } catch (error: any) {
            setMessage({ type: 'error', text: getErrorMessage(error) })
        }
    }

    return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center py-20 px-4 mt-10">
            <div className="bg-white w-full max-w-5xl rounded-[40px] shadow-2xl overflow-hidden border border-slate-100 flex flex-col md:flex-row min-h-[700px]">

                {/* Left Side: Benefit Banner */}
                <div className="hidden md:flex md:w-5/12 bg-navy-primary p-12 flex-col justify-between relative overflow-hidden">
                    <div className="absolute inset-0 opacity-10">
                        <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_20%_30%,#ffffff_0%,transparent_50%)]" />
                    </div>

                    <div className="relative z-10">
                        <Link href={`/${locale}`} className="inline-block text-white/60 hover:text-white mb-12 font-black tracking-tighter text-xl">
                            Chonburi<span className="text-white">Connect</span>
                        </Link>

                        <h2 className="text-4xl font-black !text-white leading-tight mb-8 whitespace-pre-line">
                            {dict.auth.benefit_title}
                        </h2>

                        <div className="space-y-6">
                            <BenefitItem icon={Heart} label={dict.auth.benefit_fav_label} description={dict.auth.benefit_fav_desc} />
                            <BenefitItem icon={Search} label={dict.auth.benefit_search_label} description={dict.auth.benefit_search_desc} />
                            <BenefitItem icon={ShieldCheck} label={dict.auth.benefit_support_label} description={dict.auth.benefit_support_desc} />
                        </div>
                    </div>

                    <div className="relative z-10 pt-10">
                        <p className="text-white/40 text-xs font-bold uppercase tracking-widest">Premium Search Experience</p>
                    </div>
                </div>

                {/* Right Side: Auth Form */}
                <div className="w-full md:w-7/12 p-8 md:p-16 flex flex-col justify-center">
                    <div className="max-w-md mx-auto w-full">
                        {/* Segmented Control Tabs */}
                        <div className="mb-10 p-1 bg-slate-100 rounded-2xl flex relative overflow-hidden">
                            <motion.div
                                className="absolute top-1 bottom-1 left-1 bg-white rounded-xl shadow-sm z-0"
                                initial={false}
                                animate={{
                                    x: isSignUp ? '100%' : '0%',
                                    width: 'calc(50% - 4px)'
                                }}
                                transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                            />
                            <button
                                onClick={() => handleTabChange(false)}
                                className={`flex-1 py-3 text-sm font-black relative z-10 transition-colors ${!isSignUp ? 'text-navy-primary' : 'text-slate-400'}`}
                            >
                                {dict.common.login}
                            </button>
                            <button
                                onClick={() => handleTabChange(true)}
                                className={`flex-1 py-3 text-sm font-black relative z-10 transition-colors ${isSignUp ? 'text-navy-primary' : 'text-slate-400'}`}
                            >
                                {dict.common.register}
                            </button>
                        </div>

                        <div className="mb-10 text-center md:text-left">
                            <h1 className="text-3xl font-black text-navy-secondary mb-3">
                                {isSignUp ? (dict.auth.get_started || "アカウント作成") : (dict.auth.welcome_back || "ログイン")}
                            </h1>
                            <p className="text-slate-400 font-medium">{dict.auth.sns_desc}</p>
                        </div>

                        {/* Social Buttons */}
                        <div className="flex justify-center mb-10">
                            <button
                                onClick={() => handleSocialLogin('google')}
                                className="w-full flex items-center justify-center space-x-3 bg-white text-slate-700 py-4 rounded-2xl font-black border border-slate-200 hover:bg-slate-50 transition-all shadow-lg shadow-slate-200/50"
                            >
                                <Chrome className="w-5 h-5 text-red-500" />
                                <span>{dict.auth.google_btn}</span>
                            </button>
                        </div>

                        <div className="relative mb-10">
                            <div className="absolute inset-0 flex items-center">
                                <div className="w-full border-t border-slate-100"></div>
                            </div>
                            <div className="relative flex justify-center text-xs uppercase font-black tracking-widest">
                                <span className="bg-white px-4 text-slate-300">{dict.auth.email_or}</span>
                            </div>
                        </div>

                        <AnimatePresence mode="wait">
                            <motion.div
                                key={isSignUp ? 'signup' : 'login'}
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                transition={{ duration: 0.2 }}
                            >
                                {message && (
                                    <div className={`mb-6 p-4 rounded-2xl text-sm font-bold flex items-center ${message.type === 'success' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-red-50 text-red-600 border border-red-100'}`}>
                                        <CheckCircle2 className="w-4 h-4 mr-3 shrink-0" />
                                        {message.text}
                                    </div>
                                )}

                                <form onSubmit={handleAuth} className="space-y-5">
                                    <div>
                                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">{dict.labels.email_label}</label>
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

                                    <div>
                                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">{dict.common.password || "Password"}</label>
                                        <div className="relative">
                                            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                                            <input
                                                type="password"
                                                value={password}
                                                onChange={(e) => setPassword(e.target.value)}
                                                placeholder="••••••••"
                                                className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm focus:ring-4 focus:ring-navy-primary/5 focus:border-navy-primary outline-none transition-all font-medium"
                                                required
                                            />
                                        </div>
                                        {!isSignUp && (
                                            <div className="flex justify-end mt-2">
                                                <Link href={`/${locale}/auth/forgot-password`} className="text-xs font-bold text-navy-primary hover:text-navy-secondary transition-colors">
                                                    {dict.auth.forgot_password}
                                                </Link>
                                            </div>
                                        )}
                                    </div>

                                    {isSignUp && (
                                        <>
                                            <div>
                                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">{dict.auth.confirm_password || "パスワード（確認用）"}</label>
                                                <div className="relative">
                                                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                                                    <input
                                                        type="password"
                                                        value={confirmPassword}
                                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                                        placeholder="••••••••"
                                                        className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm focus:ring-4 focus:ring-navy-primary/5 focus:border-navy-primary outline-none transition-all font-medium"
                                                        required
                                                    />
                                                </div>
                                            </div>

                                            <div className="flex items-start space-x-3 pt-2">
                                                <input
                                                    type="checkbox"
                                                    id="agreeTerms"
                                                    checked={agreeTerms}
                                                    onChange={(e) => setAgreeTerms(e.target.checked)}
                                                    className="mt-1 w-4 h-4 text-navy-primary border-slate-200 rounded focus:ring-navy-primary transition-all"
                                                    required
                                                />
                                                <label htmlFor="agreeTerms" className="text-xs font-medium text-slate-500 leading-relaxed">
                                                    <Link href={`/${locale}/terms`} target="_blank" rel="noopener noreferrer" className="text-navy-primary hover:underline">{dict.common.terms_of_service || "利用規約"}</Link>
                                                    {dict.auth.agree_to_terms || "に同意します。"}
                                                </label>
                                            </div>
                                        </>
                                    )}

                                    <button
                                        type="submit"
                                        disabled={loading}
                                        className="w-full bg-navy-primary text-white py-5 rounded-2xl font-black flex items-center justify-center space-x-3 hover:bg-navy-secondary transition-all shadow-xl shadow-navy-primary/20 mt-10"
                                    >
                                        {loading ? (
                                            <Loader2 className="w-5 h-5 animate-spin" />
                                        ) : (
                                            <>
                                                <span>{isSignUp ? (dict.auth.register_btn || "無料で登録する") : (dict.auth.login_btn || "ログインする")}</span>
                                                <ArrowRight className="w-5 h-5" />
                                            </>
                                        )}
                                    </button>
                                </form>
                            </motion.div>
                        </AnimatePresence>

                        <div className="mt-12 text-center">
                            <button
                                onClick={() => handleTabChange(!isSignUp)}
                                className="text-sm font-black text-navy-primary hover:text-navy-secondary transition-colors underline underline-offset-8 decoration-navy-primary/20"
                            >
                                {isSignUp ? dict.auth.already_have_account : dict.auth.dont_have_account}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}

function BenefitItem({ icon: Icon, label, description }: { icon: any, label: string, description: string }) {
    return (
        <div className="flex items-start space-x-4">
            <div className="bg-white/10 p-2.5 rounded-xl border border-white/10 mt-1">
                <Icon className="w-5 h-5 text-white" />
            </div>
            <div>
                <h4 className="!text-white font-black text-sm">{label}</h4>
                <p className="text-white/50 text-xs font-medium leading-relaxed">{description}</p>
            </div>
        </div>
    )
}
