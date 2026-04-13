'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { toast } from 'sonner'
import { Loader2, Send, LogIn } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

type AgentContactFormProps = {
    agentId: string
    locale: string
}

export default function AgentContactForm({ agentId, locale }: AgentContactFormProps) {
    const pathname = usePathname()
    const { user, userData, isLoading: authLoading } = useAuth()
    const [name, setName] = useState('')
    const [email, setEmail] = useState('')
    const [phone, setPhone] = useState('')
    const [message, setMessage] = useState('')
    const [submitting, setSubmitting] = useState(false)

    const loginHref = `/${locale}/login?redirect=${encodeURIComponent(pathname || `/${locale}/agents/${agentId}`)}`

    useEffect(() => {
        if (!user) return
        setEmail((prev) => prev || user.email || '')
        const metaName =
            (typeof user.user_metadata?.full_name === 'string' && user.user_metadata.full_name) ||
            (typeof user.user_metadata?.name === 'string' && user.user_metadata.name) ||
            ''
        setName((prev) => prev || userData.fullName || metaName || '')
    }, [user, userData.fullName])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (submitting) return
        if (!user) {
            toast.error('ログインが必要です。')
            return
        }

        const n = name.trim()
        const em = email.trim()
        const ph = phone.trim()
        const msg = message.trim()

        if (!n) {
            toast.error('氏名を入力してください。')
            return
        }
        if (!em || !EMAIL_RE.test(em)) {
            toast.error('有効なメールアドレスを入力してください。')
            return
        }
        if (!ph) {
            toast.error('電話番号を入力してください。')
            return
        }
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
                    name: n,
                    email: em,
                    phone: ph,
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
            setPhone('')
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
            <h3 className="text-sm font-normal text-navy-secondary mb-4">お問い合わせフォーム</h3>
            <p className="text-xs text-slate-500 leading-relaxed mb-4">
                このエージェントへのご質問・ご相談はこちらからお送りください。担当よりご連絡いたします。
            </p>
            <div>
                <label htmlFor="agent-contact-name" className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                    氏名 <span className="text-red-500">*</span>
                </label>
                <input
                    id="agent-contact-name"
                    type="text"
                    autoComplete="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    disabled={submitting}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50/80 px-4 py-3 text-sm text-navy-secondary outline-none transition focus:border-navy-primary focus:ring-2 focus:ring-navy-primary/15 disabled:opacity-60"
                    required
                />
            </div>
            <div>
                <label htmlFor="agent-contact-email" className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                    メールアドレス <span className="text-red-500">*</span>
                </label>
                <input
                    id="agent-contact-email"
                    type="email"
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={submitting}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50/80 px-4 py-3 text-sm text-navy-secondary outline-none transition focus:border-navy-primary focus:ring-2 focus:ring-navy-primary/15 disabled:opacity-60"
                    required
                />
            </div>
            <div>
                <label htmlFor="agent-contact-phone" className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                    電話番号 <span className="text-red-500">*</span>
                </label>
                <input
                    id="agent-contact-phone"
                    type="tel"
                    autoComplete="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    disabled={submitting}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50/80 px-4 py-3 text-sm text-navy-secondary outline-none transition focus:border-navy-primary focus:ring-2 focus:ring-navy-primary/15 disabled:opacity-60"
                    required
                />
            </div>
            <div>
                <label htmlFor="agent-contact-message" className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                    お問い合わせ内容 <span className="text-red-500">*</span>
                </label>
                <textarea
                    id="agent-contact-message"
                    rows={5}
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    disabled={submitting}
                    className="w-full resize-y rounded-xl border border-slate-200 bg-slate-50/80 px-4 py-3 text-sm text-navy-secondary outline-none transition focus:border-navy-primary focus:ring-2 focus:ring-navy-primary/15 disabled:opacity-60"
                    required
                />
            </div>
            <button
                type="submit"
                disabled={submitting}
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-navy-primary px-5 py-3.5 text-sm font-bold text-white shadow-md shadow-navy-primary/20 transition hover:bg-navy-secondary disabled:pointer-events-none disabled:opacity-70"
            >
                {submitting ? <Loader2 className="h-4 w-4 animate-spin shrink-0" aria-hidden /> : <Send className="h-4 w-4 shrink-0" aria-hidden />}
                {submitting ? '送信中…' : '送信する'}
            </button>
        </form>
    )
}
