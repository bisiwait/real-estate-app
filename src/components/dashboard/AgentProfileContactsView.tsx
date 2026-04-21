'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
    Mail,
    Calendar,
    User,
    Phone,
    CheckCircle,
    ChevronDown,
    ChevronUp,
    Reply,
    Send,
    Loader2,
    Sparkles,
    Eraser,
} from 'lucide-react'
import { getInquiryReplyTemplates } from '@/lib/inquiry-reply-templates'
import type {
    AgentProfileContactReply,
    AgentProfileContactRow,
} from '@/lib/supabase/fetch-agent-profile-contacts'

type ContactRow = AgentProfileContactRow & { replies: AgentProfileContactReply[] }

type Props = {
    initialRows: AgentProfileContactRow[]
    fetchError?: string | null
    agentDisplayName?: string | null
    dict: any
    locale: string
}

export default function AgentProfileContactsView({
    initialRows,
    fetchError,
    agentDisplayName,
    dict,
    locale,
}: Props) {
    const [contacts, setContacts] = useState<ContactRow[]>(
        initialRows.map((r) => ({ ...r, replies: r.replies ?? [] }))
    )
    const replyTemplates = useMemo(
        () => getInquiryReplyTemplates(agentDisplayName ?? ''),
        [agentDisplayName]
    )
    const [expandedId, setExpandedId] = useState<string | null>(null)
    const [replyText, setReplyText] = useState('')
    const [isSubmittingReply, setIsSubmittingReply] = useState(false)
    const [replyFilter, setReplyFilter] = useState<'all' | 'pending' | 'replied'>('all')
    const [handledUpdatingId, setHandledUpdatingId] = useState<string | null>(null)
    const supabase = createClient()

    useEffect(() => {
        setContacts(initialRows.map((r) => ({ ...r, replies: r.replies ?? [] })))
    }, [initialRows])

    const filteredContacts = useMemo(() => {
        return contacts.filter((c) => {
            const hasReplies = (c.replies?.length ?? 0) > 0
            if (replyFilter === 'pending' && hasReplies) return false
            if (replyFilter === 'replied' && !hasReplies) return false
            return true
        })
    }, [contacts, replyFilter])

    const markReadIfNeeded = useCallback(
        async (id: string, alreadyRead: boolean) => {
            if (alreadyRead) return
            try {
                const { error } = await supabase
                    .from('agent_contacts')
                    .update({ read_by_agent_at: new Date().toISOString() })
                    .eq('id', id)
                    .is('read_by_agent_at', null)
                if (error) throw error
                setContacts((prev) =>
                    prev.map((c) =>
                        c.id === id ? { ...c, read_by_agent_at: new Date().toISOString() } : c
                    )
                )
            } catch (err) {
                console.error('[AgentProfileContactsView] mark read:', err)
            }
        },
        [supabase]
    )

    const toggleExpand = (id: string, isRead: boolean) => {
        if (expandedId === id) {
            setExpandedId(null)
            setReplyText('')
        } else {
            setExpandedId(id)
            setReplyText('')
            if (!isRead) {
                void markReadIfNeeded(id, isRead)
            }
        }
    }

    const toggleHandled = useCallback(
        async (id: string, next: boolean) => {
            let prevHandled = false
            setContacts((list) => {
                const cur = list.find((r) => r.id === id)
                prevHandled = cur?.is_handled ?? false
                return list.map((r) => (r.id === id ? { ...r, is_handled: next } : r))
            })
            setHandledUpdatingId(id)
            const { error } = await supabase.from('agent_contacts').update({ is_handled: next }).eq('id', id)
            setHandledUpdatingId(null)
            if (error) {
                setContacts((list) => list.map((r) => (r.id === id ? { ...r, is_handled: prevHandled } : r)))
                alert(error.message || dict.profile_contacts_update_failed)
            }
        },
        [supabase]
    )

    const handleSendReply = async (contact: ContactRow) => {
        if (!replyText.trim()) return

        setIsSubmittingReply(true)
        try {
            const {
                data: { user },
            } = await supabase.auth.getUser()
            if (!user) throw new Error('Not authenticated')

            const replyId = crypto.randomUUID()
            const { error } = await supabase.from('agent_contact_replies').insert({
                id: replyId,
                agent_contact_id: contact.id,
                sender_id: user.id,
                message: replyText.trim(),
            })

            if (error) throw error

            const messageToNotify = replyText.trim()

            try {
                const notifyRes = await fetch('/api/agent-contacts/notify-reply', {
                    method: 'POST',
                    credentials: 'include',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        agent_contact_id: contact.id,
                        message: messageToNotify,
                        agent_contact_reply_id: replyId,
                    }),
                })
                const payload = (await notifyRes.json().catch(() => ({}))) as {
                    error?: string
                    hint?: string
                    sent?: boolean
                }

                if (!notifyRes.ok) {
                    const detail = payload.error || notifyRes.statusText
                    console.warn('[AgentProfileContactsView] notify-reply:', notifyRes.status, detail)

                    if (notifyRes.status === 401) {
                        alert(
                            dict.profile_contacts_notify_session_error
                        )
                    } else if (notifyRes.status === 502 || notifyRes.status === 503) {
                        const hint = payload.hint ? `\n\n${payload.hint}` : ''
                        alert(`${dict.profile_contacts_notify_failed}: ${detail}${hint}`)
                    } else if (notifyRes.status === 422) {
                        alert(`${detail}`)
                    } else {
                        alert(`${dict.profile_contacts_send_failed}: ${detail}`)
                    }
                }
            } catch (notifyErr) {
                console.warn('[AgentProfileContactsView] notify-reply fetch failed:', notifyErr)
            }

            await supabase.from('agent_contacts').update({ is_handled: true }).eq('id', contact.id)

            const newReply: AgentProfileContactReply = {
                id: replyId,
                message: messageToNotify,
                created_at: new Date().toISOString(),
            }

            setContacts((prev) =>
                prev.map((c) => {
                    if (c.id !== contact.id) return c
                    return {
                        ...c,
                        is_handled: true,
                        replies: [...(c.replies || []), newReply],
                    }
                })
            )
            setReplyText('')
        } catch (err) {
            console.error('Error sending profile contact reply:', err)
            alert(dict.profile_contacts_reply_save_failed)
        } finally {
            setIsSubmittingReply(false)
        }
    }

    if (fetchError) {
        return (
            <div className="p-6 text-sm font-bold leading-relaxed text-red-800 bg-red-50">
                {dict.profile_contacts_fetch_error}
                <span className="mt-2 block font-mono text-xs font-normal opacity-90">{fetchError}</span>
            </div>
        )
    }

    if (contacts.length === 0) {
        return (
            <div className="p-20 text-center">
                <p className="text-slate-400 font-medium">{dict.profile_contacts_empty}</p>
            </div>
        )
    }

    const filterChip = (active: boolean) =>
        `whitespace-nowrap px-3 py-2 text-[10px] sm:text-xs font-bold rounded-lg transition-all ${
            active ? 'bg-white shadow-sm text-navy-primary' : 'text-slate-500 hover:text-navy-primary'
        }`

    return (
        <div>
            <div className="border-b border-slate-100 bg-slate-50/80 px-4 py-4 sm:px-6 space-y-3">
                <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 shrink-0">
                        {dict.inquiries_handling}
                    </span>
                    <div className="flex min-w-0 bg-slate-100 p-1 rounded-xl border border-slate-200 gap-0.5">
                        <button type="button" onClick={() => setReplyFilter('all')} className={filterChip(replyFilter === 'all')}>
                            {dict.filter_all}
                        </button>
                        <button
                            type="button"
                            onClick={() => setReplyFilter('pending')}
                            className={filterChip(replyFilter === 'pending')}
                        >
                            {dict.inquiries_pending}
                        </button>
                        <button
                            type="button"
                            onClick={() => setReplyFilter('replied')}
                            className={filterChip(replyFilter === 'replied')}
                        >
                            {dict.inquiries_replied}
                        </button>
                    </div>
                </div>
                <p className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-[11px] font-medium leading-relaxed text-slate-600">
                    {dict.profile_contacts_intro}
                </p>
                <p className="text-[10px] font-bold text-slate-400">
                    {dict.display_count_compact.replace('{shown}', String(filteredContacts.length)).replace('{total}', String(contacts.length))}
                </p>
            </div>

            {filteredContacts.length === 0 ? (
                <div className="p-16 text-center space-y-3">
                    <p className="text-slate-500 font-medium text-sm">{dict.inquiries_no_match}</p>
                    <button
                        type="button"
                        onClick={() => setReplyFilter('all')}
                        className="text-xs font-black text-navy-primary underline decoration-navy-primary/30 hover:text-navy-secondary"
                    >
                        {dict.filter_reset}
                    </button>
                </div>
            ) : null}

            <div className={`divide-y divide-slate-50 ${filteredContacts.length === 0 ? 'hidden' : ''}`}>
                {filteredContacts.map((contact) => {
                    const expanded = expandedId === contact.id
                    const isRead = Boolean(contact.read_by_agent_at)
                    const hasReplies = (contact.replies?.length ?? 0) > 0

                    return (
                        <div
                            key={contact.id}
                            className={`p-6 transition-all ${!isRead ? 'bg-navy-primary/[0.02]' : ''}`}
                        >
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                <div className="flex items-center space-x-4">
                                    <div
                                        className={`w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 ${
                                            !isRead
                                                ? 'bg-navy-primary text-white shadow-lg shadow-navy-primary/20'
                                                : 'bg-slate-100 text-slate-400'
                                        }`}
                                    >
                                        <Mail className="w-6 h-6" />
                                    </div>
                                    <div>
                                        <div className="flex flex-wrap items-center gap-2 mb-1">
                                            {!isRead && (
                                                <span className="bg-navy-primary text-white px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider">
                                                    New
                                                </span>
                                            )}
                                            {hasReplies ? (
                                                <span className="bg-emerald-100 text-emerald-600 px-2 py-0.5 rounded text-[10px] font-bold">
                                                    {dict.inquiries_replied}
                                                </span>
                                            ) : (
                                                <span className="bg-slate-100 text-slate-500 px-2 py-0.5 rounded text-[10px] font-bold">
                                                    {dict.inquiries_pending}
                                                </span>
                                            )}
                                            {contact.is_handled ? (
                                                <span className="bg-amber-50 text-amber-700 px-2 py-0.5 rounded text-[10px] font-bold">
                                                    {dict.profile_contacts_handled}
                                                </span>
                                            ) : null}
                                            <span className="text-xs text-slate-400 font-bold uppercase tracking-widest flex items-center">
                                                <Calendar className="w-3 h-3 mr-1" />
                                                {new Date(contact.created_at).toLocaleString(locale === 'th' ? 'th-TH' : locale === 'en' ? 'en-US' : 'ja-JP', {
                                                    timeZone: 'Asia/Bangkok',
                                                    year: 'numeric',
                                                    month: '2-digit',
                                                    day: '2-digit',
                                                    hour: '2-digit',
                                                    minute: '2-digit',
                                                })}
                                            </span>
                                        </div>
                                        <h4 className="text-lg font-bold text-navy-secondary">
                                            {contact.customer_name}{' '}
                                            <span className="text-sm font-normal text-slate-400 ml-1">{dict.inquiries_from}</span>
                                        </h4>
                                        <p className="text-xs text-navy-primary font-bold mt-1">{dict.profile_contacts_target}</p>
                                    </div>
                                </div>

                                <button
                                    type="button"
                                    onClick={() => toggleExpand(contact.id, isRead)}
                                    className={`flex items-center space-x-2 px-6 py-2.5 rounded-xl text-sm font-bold transition-all border ${
                                        expanded
                                            ? 'bg-navy-secondary text-white border-navy-secondary shadow-lg'
                                            : 'bg-white text-navy-primary border-navy-primary/10 hover:border-navy-primary/30 hover:shadow-md'
                                    }`}
                                >
                                    <span>{expanded ? dict.inquiries_close : dict.inquiries_view_details}</span>
                                    {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                                </button>
                            </div>

                            {expanded && (
                                <div className="mt-8 pt-8 border-t border-slate-100 animate-in slide-in-from-top-4 duration-300">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
                                        <div className="space-y-4">
                                            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 flex items-center">
                                                    <User className="w-3 h-3 mr-1.5" /> {dict.inquiries_name}
                                                </p>
                                                <p className="text-sm font-bold text-navy-secondary">{contact.customer_name}</p>
                                            </div>
                                            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 flex items-center">
                                                    <Mail className="w-3 h-3 mr-1.5" /> {dict.inquiries_email}
                                                </p>
                                                <p className="text-sm font-bold text-navy-secondary select-all break-all">
                                                    {contact.customer_email}
                                                </p>
                                            </div>
                                            {contact.customer_phone ? (
                                                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 flex items-center">
                                                        <Phone className="w-3 h-3 mr-1.5" /> {dict.inquiries_phone}
                                                    </p>
                                                    <p className="text-sm font-bold text-navy-secondary select-all">
                                                        {contact.customer_phone}
                                                    </p>
                                                </div>
                                            ) : null}
                                        </div>
                                        <div className="bg-navy-primary/[0.03] p-6 rounded-3xl border border-navy-primary/5">
                                            <p className="text-[10px] font-black text-navy-primary/60 uppercase tracking-widest mb-4">
                                                {dict.inquiries_message}
                                            </p>
                                            <div className="text-slate-600 text-sm leading-relaxed whitespace-pre-wrap italic">
                                                &ldquo;{contact.message}&rdquo;
                                            </div>
                                        </div>
                                    </div>

                                    <div className="space-y-6">
                                        <div>
                                            <h5 className="text-sm font-black text-navy-secondary mb-4 flex items-center">
                                                <Reply className="w-4 h-4 mr-2" />
                                                {dict.inquiries_reply_history}
                                            </h5>

                                            {contact.replies && contact.replies.length > 0 ? (
                                                <div className="space-y-4 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                                                    {contact.replies.map((reply) => (
                                                        <div
                                                            key={reply.id}
                                                            className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm ml-4 relative"
                                                        >
                                                            <div className="absolute top-4 -left-2 w-4 h-4 bg-white border-l border-t border-slate-100 rotate-45" />
                                                            <p className="text-xs text-slate-400 mb-2 font-bold">
                                                                {new Date(reply.created_at).toLocaleString(locale === 'th' ? 'th-TH' : locale === 'en' ? 'en-US' : 'ja-JP', {
                                                                    timeZone: 'Asia/Bangkok',
                                                                    year: 'numeric',
                                                                    month: '2-digit',
                                                                    day: '2-digit',
                                                                    hour: '2-digit',
                                                                    minute: '2-digit',
                                                                })}
                                                            </p>
                                                            <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap break-words">
                                                                {reply.message}
                                                            </p>
                                                        </div>
                                                    ))}
                                                </div>
                                            ) : (
                                                <p className="text-xs text-slate-400 italic">{dict.inquiries_no_replies}</p>
                                            )}
                                        </div>

                                        <hr className="my-8 border-0 border-t-2 border-slate-200" />

                                        <div>
                                            <h5 className="text-sm font-black text-navy-secondary mb-3 flex items-center">
                                                <Send className="w-4 h-4 mr-2" />
                                                {dict.inquiries_reply_body}
                                            </h5>
                                            <label className="sr-only" htmlFor={`profile-contact-reply-${contact.id}`}>
                                                {dict.inquiries_reply_body}
                                            </label>
                                            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                                                <div className="flex flex-wrap items-center gap-2">
                                                    <span className="flex items-center gap-1 text-[10px] font-black uppercase tracking-wider text-slate-400">
                                                        <Sparkles className="h-3 w-3" />
                                                        {dict.inquiries_templates}
                                                    </span>
                                                    {replyTemplates.map((t) => (
                                                        <button
                                                            key={t.label}
                                                            type="button"
                                                            onClick={() => setReplyText(t.text)}
                                                            className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-[10px] font-black text-navy-secondary transition hover:border-navy-primary/40 hover:bg-slate-50"
                                                        >
                                                            {t.label}
                                                        </button>
                                                    ))}
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={() => setReplyText('')}
                                                    disabled={!replyText}
                                                    className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-[10px] font-black text-slate-500 transition hover:border-slate-300 hover:bg-slate-50 hover:text-navy-secondary disabled:cursor-not-allowed disabled:opacity-40"
                                                    title={dict.inquiries_clear_body_title}
                                                >
                                                    <Eraser className="h-3 w-3" />
                                                    {dict.inquiries_clear_body}
                                                </button>
                                            </div>
                                            <div className="relative min-w-0">
                                                <textarea
                                                    id={`profile-contact-reply-${contact.id}`}
                                                    rows={6}
                                                    className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm focus:ring-2 focus:ring-navy-primary outline-none transition-all resize-none pr-14"
                                                    placeholder={dict.inquiries_reply_placeholder}
                                                    value={replyText}
                                                    onChange={(e) => setReplyText(e.target.value)}
                                                    aria-label={dict.inquiries_reply_body}
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => void handleSendReply(contact)}
                                                    disabled={isSubmittingReply || !replyText.trim()}
                                                    className="absolute right-3 bottom-3 p-3 bg-navy-primary text-white rounded-xl hover:bg-navy-secondary transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
                                                    title={dict.inquiries_send}
                                                >
                                                    {isSubmittingReply ? (
                                                        <Loader2 className="w-5 h-5 animate-spin" />
                                                    ) : (
                                                        <Send className="w-5 h-5" />
                                                    )}
                                                </button>
                                            </div>
                                            <p className="text-[10px] text-slate-500 mt-2 px-1 font-bold">
                                                {dict.profile_contacts_send_note}
                                            </p>
                                        </div>

                                        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-t border-slate-100 pt-6">
                                            <label className="inline-flex cursor-pointer items-center gap-2 text-sm font-bold text-slate-600">
                                                <input
                                                    type="checkbox"
                                                    checked={contact.is_handled}
                                                    disabled={handledUpdatingId === contact.id}
                                                    onChange={(e) => void toggleHandled(contact.id, e.target.checked)}
                                                    className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                                                />
                                                {dict.profile_contacts_mark_handled}
                                            </label>
                                            {!isRead ? (
                                                <div className="flex items-center text-emerald-600 bg-emerald-50 px-4 py-2 rounded-lg text-xs font-bold w-fit">
                                                    <CheckCircle className="w-4 h-4 mr-2" />
                                                    {dict.inquiries_marked_read}
                                                </div>
                                            ) : null}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    )
                })}
            </div>
        </div>
    )
}
