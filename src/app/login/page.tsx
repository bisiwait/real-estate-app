'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter, useSearchParams } from 'next/navigation'
import { Mail, Lock, Loader2, ArrowRight, Chrome, MessageSquare, CheckCircle2, ShieldCheck, Heart, Search } from 'lucide-react'
import Link from 'next/link'
import { getErrorMessage } from '@/lib/utils/errors'
import { motion, AnimatePresence } from 'framer-motion'

export default function LoginPage() {
    const searchParams = useSearchParams()
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [loading, setLoading] = useState(false)
    const [isSignUp, setIsSignUp] = useState(searchParams.get('signup') === 'true')
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
                    // プロフィール取得（ロールとクレジットを含む）
                    let { data: profile, error: profileError } = await supabase
                        .from('profiles')
                        .select('user_role, is_admin, available_credits')
                        .eq('id', user.id)
                        .single()

                    // もし user_role カラムがない等のエラーが出た場合のフォールバック
                    if (profileError) {
                        console.warn('Profile fetch with role failed, falling back to basic data:', profileError)
                        const { data: fallbackProfile } = await supabase
                            .from('profiles')
                            .select('is_admin, available_credits')
                            .eq('id', user.id)
                            .single()
                        profile = fallbackProfile as any
                    }

                    router.refresh()

                    console.log('LoginPage: Profile Data:', profile)

                    const isAdmin = profile?.is_admin === true || profile?.user_role === 'admin';
                    const hasCredits = (profile?.available_credits || 0) > 0;

                    console.log('LoginPage: Auth Info:', { isAdmin, role: profile?.user_role, credits: profile?.available_credits })

                    // リダイレクト先の判定
                    if (isAdmin) {
                        console.log('LoginPage: Redirecting to Admin Panel')
                        router.push('/admin-secret')
                    } else if (profile?.user_role === 'agent' || hasCredits || profile?.user_role === undefined) {
                        // 明示的にエージェントである、またはクレジットを持っている（既存ユーザー）、またはカラムがない場合
                        console.log('LoginPage: Redirecting to Agent Dashboard')
                        router.push('/dashboard')
                    } else {
                        // user_role === 'general' かつ クレジットを持っていない場合のみマイページへ
                        console.log('LoginPage: Redirecting to My Page')
                        router.push('/mypage')
                    }
                }
            }
        } catch (error: any) {
            setMessage({ type: 'error', text: getErrorMessage(error) })
        } finally {
            setLoading(false)
        }
    }

    const handleSocialLogin = async (provider: 'google' | 'line') => {
        try {
            const { error } = await supabase.auth.signInWithOAuth({
                provider: provider as any,
                options: {
                    redirectTo: `${window.location.origin}/auth/callback`,
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
                        <Link href="/" className="inline-block text-white/60 hover:text-white mb-12 font-black tracking-tighter text-xl">
                            Chonburi<span className="text-white">Connect</span>
                        </Link>

                        <h2 className="text-4xl font-black text-white leading-tight mb-8">
                            理想の住まいを、<br />もっとスマートに。
                        </h2>

                        <div className="space-y-6">
                            <BenefitItem icon={Heart} label="お気に入り保存" description="気になる物件をいつでもチェック可能" />
                            <BenefitItem icon={Search} label="検索条件の保存" description="希望条件に合う新着物件を逃さない" />
                            <BenefitItem icon={ShieldCheck} label="安心のサポート" description="エージェントとの円滑なチャット相談" />
                        </div>
                    </div>

                    <div className="relative z-10 pt-10">
                        <p className="text-white/40 text-xs font-bold uppercase tracking-widest">Premium Search Experience</p>
                    </div>
                </div>

                {/* Right Side: Auth Form */}
                <div className="w-full md:w-7/12 p-8 md:p-16 flex flex-col justify-center">
                    <div className="max-w-md mx-auto w-full">
                        <div className="mb-10 text-center md:text-left">
                            <h1 className="text-3xl font-black text-navy-secondary mb-3">
                                {isSignUp ? 'まずはアカウント作成' : 'おかえりなさい！'}
                            </h1>
                            <p className="text-slate-400 font-medium">SNS 連携で数秒で完了します</p>
                        </div>

                        {/* Social Buttons */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-10">
                            <button
                                onClick={() => handleSocialLogin('line')}
                                className="flex items-center justify-center space-x-3 bg-[#06C755] text-white py-4 rounded-2xl font-black hover:opacity-90 transition-all shadow-lg shadow-[#06C755]/20 animate-in fade-in slide-in-from-bottom-2 duration-500"
                            >
                                <MessageSquare className="w-5 h-5 fill-white" />
                                <span>LINE で続ける</span>
                            </button>
                            <button
                                onClick={() => handleSocialLogin('google')}
                                className="flex items-center justify-center space-x-3 bg-white text-slate-700 py-4 rounded-2xl font-black border border-slate-200 hover:bg-slate-50 transition-all shadow-lg shadow-slate-200/50 animate-in fade-in slide-in-from-bottom-2 duration-700"
                            >
                                <Chrome className="w-5 h-5 text-red-500" />
                                <span>Google で進む</span>
                            </button>
                        </div>

                        <div className="relative mb-10">
                            <div className="absolute inset-0 flex items-center">
                                <div className="w-full border-t border-slate-100"></div>
                            </div>
                            <div className="relative flex justify-center text-xs uppercase font-black tracking-widest">
                                <span className="bg-white px-4 text-slate-300">またはメールアドレスで</span>
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

                                    <div>
                                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">パスワード</label>
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
                                        <div className="flex justify-end mt-2">
                                            <Link href="/auth/forgot-password" className="text-xs font-bold text-navy-primary hover:text-navy-secondary transition-colors">
                                                パスワードをお忘れですか？
                                            </Link>
                                        </div>
                                    </div>

                                    <button
                                        type="submit"
                                        disabled={loading}
                                        className="w-full bg-navy-primary text-white py-5 rounded-2xl font-black flex items-center justify-center space-x-3 hover:bg-navy-secondary transition-all shadow-xl shadow-navy-primary/20 mt-10"
                                    >
                                        {loading ? (
                                            <Loader2 className="w-5 h-5 animate-spin" />
                                        ) : (
                                            <>
                                                <span>{isSignUp ? 'アカウントを作成' : 'ログイン'}</span>
                                                <ArrowRight className="w-5 h-5" />
                                            </>
                                        )}
                                    </button>
                                </form>
                            </motion.div>
                        </AnimatePresence>

                        <div className="mt-12 text-center">
                            <button
                                onClick={() => setIsSignUp(!isSignUp)}
                                className="text-sm font-black text-navy-primary hover:text-navy-secondary transition-colors underline underline-offset-8 decoration-navy-primary/20"
                            >
                                {isSignUp ? '登録済みの方はこちら' : 'まだ会員でない方はこちら'}
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
                <h4 className="text-white font-black text-sm">{label}</h4>
                <p className="text-white/50 text-xs font-medium leading-relaxed">{description}</p>
            </div>
        </div>
    )
}
