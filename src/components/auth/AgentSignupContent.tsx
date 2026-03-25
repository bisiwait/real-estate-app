'use client'

import { useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter, useSearchParams } from 'next/navigation'
import { Mail, Lock, Loader2, ArrowRight, Building2, User, Phone, MessageCircle, MapPin, CheckCircle2 } from 'lucide-react'
import Link from 'next/link'
import { getErrorMessage } from '@/lib/utils/errors'
import { motion } from 'framer-motion'

interface AgentSignupContentProps {
    dict: any
    locale: string
}

/** オープンリダイレクト防止: 同一ロケールのパスのみ許可 */
function safeInternalPath(locale: string, raw: string | null): string | null {
    if (!raw || typeof raw !== 'string') return null
    let s = raw
    try {
        s = decodeURIComponent(raw)
    } catch {
        return null
    }
    if (!s.startsWith(`/${locale}/`) || s.includes('//') || s.includes('://')) return null
    return s
}

export default function AgentSignupContent({ dict, locale }: AgentSignupContentProps) {
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [confirmPassword, setConfirmPassword] = useState('')
    const [companyName, setCompanyName] = useState('')
    const [agentName, setAgentName] = useState('')
    const [phone, setPhone] = useState('')
    const [lineId, setLineId] = useState('')
    const [targetArea, setTargetArea] = useState('both')
    const [agreeTerms, setAgreeTerms] = useState(false)
    const [loading, setLoading] = useState(false)
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)

    const router = useRouter()
    const searchParams = useSearchParams()
    const supabase = createClient()

    const redirectAfter = useMemo(
        () => safeInternalPath(locale, searchParams.get('redirect')),
        [locale, searchParams]
    )
    /** 新規登録完了後は常にダッシュボードへ（有料プランはそこから /pricing へ） */
    const dashboardPath = `/${locale}/dashboard`
    const showPricingReturnHint = Boolean(redirectAfter?.includes('/pricing'))

    const handleSignup = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setMessage(null)

        try {
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
                    emailRedirectTo: `${window.location.origin}/${locale}/auth/callback?next=${encodeURIComponent(dashboardPath)}`,
                    data: {
                        full_name: agentName.trim(),
                        company_name: companyName.trim() || null,
                        phone: phone.trim() || null,
                        phone_number: phone.trim() || null,
                        line_id: lineId.trim() || null,
                        target_area: targetArea,
                        user_role: 'agent',
                    },
                },
            })

            if (error) throw error

            // メール確認オフの場合は即セッション付与 → 同期してダッシュボードへ
            if (signUpResult.session?.user) {
                await fetch('/api/auth/sync-agent-profile', {
                    method: 'POST',
                    credentials: 'same-origin',
                }).catch(() => {})
                router.push(dashboardPath)
                router.refresh()
                return
            }

            router.push(`/${locale}/login?redirect=${encodeURIComponent(dashboardPath)}`)
        } catch (error: any) {
            setMessage({ type: 'error', text: getErrorMessage(error) })
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center py-20 px-4">
            <div className="bg-white w-full max-w-2xl rounded-[40px] shadow-2xl overflow-hidden border border-slate-100 p-8 md:p-16">
                <div className="max-w-md mx-auto w-full">
                    <div className="mb-12 text-center">
                        <Link
                            href={redirectAfter ?? `/${locale}/pricing`}
                            className="inline-flex items-center space-x-2 text-navy-primary font-black mb-6 hover:opacity-70 transition-opacity"
                        >
                            <Building2 className="w-5 h-5" />
                            <span>For Agents</span>
                        </Link>
                        <h1 className="text-3xl font-black text-navy-secondary mb-3">
                            {dict.auth.agent_signup_title}
                        </h1>
                        <p className="text-slate-400 font-medium">必要事項を入力してエージェント登録を開始してください</p>
                        {showPricingReturnHint && dict.agent_plan?.signup_after_pricing_hint ? (
                            <p className="mt-4 rounded-2xl border border-navy-primary/15 bg-navy-primary/5 px-4 py-3 text-left text-sm font-bold leading-relaxed text-navy-secondary">
                                {dict.agent_plan.signup_after_pricing_hint}
                            </p>
                        ) : null}
                    </div>

                    {message && (
                        <motion.div 
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className={`mb-8 p-4 rounded-2xl text-sm font-bold flex items-center ${message.type === 'success' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-red-50 text-red-600 border border-red-100'}`}
                        >
                            <CheckCircle2 className="w-4 h-4 mr-3 shrink-0" />
                            {message.text}
                        </motion.div>
                    )}

                    <form onSubmit={handleSignup} className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">{dict.auth.company_name}</label>
                                <div className="relative">
                                    <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                                    <input
                                        type="text"
                                        value={companyName}
                                        onChange={(e) => setCompanyName(e.target.value)}
                                        placeholder="Company Co., Ltd."
                                        className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm focus:ring-4 focus:ring-navy-primary/5 focus:border-navy-primary outline-none transition-all font-medium"
                                        required
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">{dict.auth.agent_name}</label>
                                <div className="relative">
                                    <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                                    <input
                                        type="text"
                                        value={agentName}
                                        onChange={(e) => setAgentName(e.target.value)}
                                        placeholder="山田 太郎"
                                        className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm focus:ring-4 focus:ring-navy-primary/5 focus:border-navy-primary outline-none transition-all font-medium"
                                        required
                                    />
                                </div>
                            </div>
                        </div>

                        <div>
                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">{dict.labels.email_label}</label>
                            <div className="relative">
                                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="agent@example.com"
                                    className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm focus:ring-4 focus:ring-navy-primary/5 focus:border-navy-primary outline-none transition-all font-medium"
                                    required
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">
                                    {dict.auth.phone_number}
                                    <span className="text-slate-300 font-medium normal-case tracking-normal ml-1">({dict.common.optional || '任意'})</span>
                                </label>
                                <div className="relative">
                                    <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                                    <input
                                        type="tel"
                                        value={phone}
                                        onChange={(e) => setPhone(e.target.value)}
                                        placeholder="080-1234-5678"
                                        className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm focus:ring-4 focus:ring-navy-primary/5 focus:border-navy-primary outline-none transition-all font-medium"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">
                                    {dict.auth.line_id}
                                    <span className="text-slate-300 font-medium normal-case tracking-normal ml-1">({dict.common.optional || '任意'})</span>
                                </label>
                                <div className="relative">
                                    <MessageCircle className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                                    <input
                                        type="text"
                                        value={lineId}
                                        onChange={(e) => setLineId(e.target.value)}
                                        placeholder="line_id_123"
                                        className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm focus:ring-4 focus:ring-navy-primary/5 focus:border-navy-primary outline-none transition-all font-medium"
                                    />
                                </div>
                            </div>
                        </div>

                        <div>
                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">{dict.auth.target_area}</label>
                            <div className="relative">
                                <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                                <select
                                    value={targetArea}
                                    onChange={(e) => setTargetArea(e.target.value)}
                                    className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm focus:ring-4 focus:ring-navy-primary/5 focus:border-navy-primary outline-none transition-all font-medium appearance-none"
                                    required
                                >
                                    <option value="pattaya">{dict.auth.area_pattaya}</option>
                                    <option value="sriracha">{dict.auth.area_sriracha}</option>
                                    <option value="both">{dict.auth.area_both}</option>
                                </select>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">{dict.common.password}</label>
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
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">{dict.auth.password_confirm}</label>
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
                                <Link href={`/${locale}/terms`} target="_blank" rel="noopener noreferrer" className="text-navy-primary hover:underline">{dict.auth.agree_to_terms_link}</Link>
                                {dict.auth.agree_to_terms_suffix}
                            </label>
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
                                    <span>無料でエージェント登録する</span>
                                    <ArrowRight className="w-5 h-5" />
                                </>
                            )}
                        </button>
                    </form>

                    <div className="mt-12 text-center">
                        <Link
                            href={`/${locale}/login?redirect=${encodeURIComponent(redirectAfter ?? dashboardPath)}`}
                            className="text-sm font-black text-navy-primary hover:text-navy-secondary transition-colors underline underline-offset-8 decoration-navy-primary/20"
                        >
                            {dict.auth.already_have_account}
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    )
}
