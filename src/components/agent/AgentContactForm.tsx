'use client'

import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { toast } from 'sonner'
import { Loader2, Send, LogIn, Settings } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { createClient } from '@/lib/supabase/client'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

type AgentContactFormProps = {
    agentId: string
    locale: string
}

type ProfileRow = {
    full_name: string | null
    email: string | null
    phone: string | null
}

export default function AgentContactForm({ agentId, locale }: AgentContactFormProps) {
    const pathname = usePathname()
    const { user, userData, isLoading: authLoading } = useAuth()
    const [profile, setProfile] = useState<ProfileRow | null>(null)
    const [profileLoading, setProfileLoading] = useState(false)
    const [message, setMessage] = useState('')
    const [submitting, setSubmitting] = useState(false)

    const loginHref = `/${locale}/login?redirect=${encodeURIComponent(pathname || `/${locale}/agents/${agentId}`)}`
    const profileEditHref = `/${locale}/profile/edit`

    useEffect(() => {
        if (!user?.id) {
            setProfile(null)
            return
        }
        let cancelled = false
        const run = async () => {
            setProfileLoading(true)
            const supabase = createClient()
            const { data, error } = await supabase
                .from('profiles')
                .select('full_name, email, phone')
                .eq('id', user.id)
                .maybeSingle()
            if (!cancelled) {
                if (error) {
                    console.warn('[AgentContactForm] profile fetch', error.message)
                    setProfile(null)
                } else {
                    setProfile(data as ProfileRow)
                }
                setProfileLoading(false)
            }
        }
        void run()
        return () => {
            cancelled = true
        }
    }, [user?.id])

    const metaName =
        (typeof user?.user_metadata?.full_name === 'string' && user.user_metadata.full_name) ||
        (typeof user?.user_metadata?.name === 'string' && user.user_metadata.name) ||
        ''

    const contactName = useMemo(() => {
        const fromProfile = profile?.full_name?.trim()
        if (fromProfile) return fromProfile
        return (userData.fullName || metaName || '').trim()
    }, [profile?.full_name, userData.fullName, metaName])

    const contactEmail = useMemo(() => {
        const fromProfile = profile?.email?.trim()
        if (fromProfile) return fromProfile
        return (user?.email || '').trim()
    }, [profile?.email, user?.email])

    const contactPhone = useMemo(() => (profile?.phone || '').trim(), [profile?.phone])

    const profileComplete = Boolean(
        contactName && contactEmail && EMAIL_RE.test(contactEmail) && contactPhone
    )

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (submitting) return
        if (!user) {
            toast.error('ログインが必要です。')
            return
        }
        if (!profileComplete) {
            toast.error('プロフィールの氏名・メール・電話を設定してください。')
            return
        }

        const msg = message.trim()
        if (!msg) {
            toast.error('お問い合わせ内容を入力してください。')
            return
        }

        setSubmitting(true)
        try {
            const res = await fetch('/api/contact', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'same-origin',
                body: JSON.stringify({
                    agentId,
                    name: contactName,
                    email: contactEmail,
                    phone: contactPhone,
                    message: msg,
                }),
            })
            const data = (await res.json().catch(() => ({}))) as { error?: string }

            if (res.status === 401) {
                toast.error(data.error || 'ログインの有効期限が切れました。再度ログインしてください。')
                return
            }
            if (!res.ok) {
                toast.error(data.error || '送信に失敗しました。')
                return
            }

            toast.success('送信しました')
            setMessage('')
        } catch {
            toast.error('送信に失敗しました。時間をおいて再度お試しください。')
        } finally {
            setSubmitting(false)
        }
    }

    if (authLoading) {
        return (
            <div className="mt-8 flex min-h-[200px] items-center justify-center border-t border-slate-100 pt-8">
                <Loader2 className="h-8 w-8 animate-spin text-navy-primary" aria-hidden />
            </div>
        )
    }

    if (!user) {
        return (
            <div className="mt-8 space-y-4 border-t border-slate-100 pt-8">
                <h3 className="text-sm font-normal text-navy-secondary">お問い合わせフォーム</h3>
                <div className="rounded-2xl border border-amber-100 bg-amber-50/80 px-5 py-6 text-center">
                    <p className="text-sm font-bold text-navy-secondary leading-relaxed">
                        お問い合わせにはログインが必要です
                    </p>
                    <p className="mt-2 text-xs text-slate-600 leading-relaxed">
                        ログイン後、フォームからエージェントへメッセージを送信できます。
                    </p>
                    <Link
                        href={loginHref}
                        className="mt-5 inline-flex items-center justify-center gap-2 rounded-xl bg-navy-primary px-6 py-3 text-sm font-bold text-white shadow-md shadow-navy-primary/20 transition hover:bg-navy-secondary"
                    >
                        <LogIn className="h-4 w-4 shrink-0" aria-hidden />
                        ログインページへ
                    </Link>
                </div>
            </div>
        )
    }

    return (
        <form onSubmit={handleSubmit} className="mt-8 space-y-4 border-t border-slate-100 pt-8">
            <input type="hidden" name="agentId" value={agentId} readOnly aria-hidden />
            <h3 className="text-sm font-normal text-navy-secondary mb-2">お問い合わせフォーム</h3>
            <p className="text-xs text-slate-500 leading-relaxed mb-4">
                氏名・メール・電話は
                <Link href={profileEditHref} className="mx-0.5 font-bold text-navy-primary underline underline-offset-2 hover:text-navy-secondary">
                    プロフィール設定
                </Link>
                の内容がそのまま送信されます。本文のみここで入力してください。
            </p>

            {profileLoading ? (
                <div className="flex justify-center py-6">
                    <Loader2 className="h-6 w-6 animate-spin text-navy-primary" aria-hidden />
                </div>
            ) : (
                <>
                    <div className="rounded-xl border border-slate-200 bg-slate-50/90 p-4 space-y-3">
                        <div className="flex items-center justify-between gap-2">
                            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                                連絡先（プロフィール）
                            </span>
                            <Link
                                href={profileEditHref}
                                className="inline-flex items-center gap-1 text-[10px] font-black text-navy-primary hover:underline"
                            >
                                <Settings className="h-3 w-3" aria-hidden />
                                変更
                            </Link>
                        </div>
                        <div>
                            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">氏名</div>
                            <div className="text-sm font-medium text-navy-secondary">{contactName || '— 未設定'}</div>
                        </div>
                        <div>
                            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">メール</div>
                            <div className="text-sm font-medium text-navy-secondary break-all">{contactEmail || '— 未設定'}</div>
                        </div>
                        <div>
                            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">電話</div>
                            <div className="text-sm font-medium text-navy-secondary">{contactPhone || '— 未設定'}</div>
                        </div>
                    </div>

                    {!profileComplete && (
                        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs font-bold text-amber-900 leading-relaxed">
                            送信にはプロフィールに<strong className="font-black">氏名・有効なメール・電話番号</strong>が必要です。
                            <Link href={profileEditHref} className="mt-2 block font-black text-navy-primary underline">
                                プロフィールを編集する
                            </Link>
                        </div>
                    )}
                </>
            )}

            <div>
                <label htmlFor="agent-contact-message" className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                    お問い合わせ内容 <span className="text-red-500">*</span>
                </label>
                <textarea
                    id="agent-contact-message"
                    rows={5}
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    disabled={submitting || profileLoading || !profileComplete}
                    className="w-full resize-y rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-navy-secondary outline-none transition focus:border-navy-primary focus:ring-2 focus:ring-navy-primary/15 disabled:cursor-not-allowed disabled:opacity-60"
                    required
                    placeholder="ご質問・ご希望をご記入ください"
                />
            </div>
            <button
                type="submit"
                disabled={submitting || profileLoading || !profileComplete}
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-navy-primary px-5 py-3.5 text-sm font-bold text-white shadow-md shadow-navy-primary/20 transition hover:bg-navy-secondary disabled:pointer-events-none disabled:opacity-50"
            >
                {submitting ? <Loader2 className="h-4 w-4 animate-spin shrink-0" aria-hidden /> : <Send className="h-4 w-4 shrink-0" aria-hidden />}
                {submitting ? '送信中…' : '送信する'}
            </button>
        </form>
    )
}
