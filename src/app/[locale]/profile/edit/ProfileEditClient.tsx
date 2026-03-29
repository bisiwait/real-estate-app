"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { ChevronLeft, Loader2, User, MessageCircle, Phone, CircleHelp, X } from "lucide-react";
import { normalizeStoredLineContact } from "@/lib/line-contact-url";

type InitialProfile = {
    full_name: string;
    line_id: string;
    phone: string;
};

function norm(s: string | null | undefined) {
    return (s ?? "").trim();
}

export default function ProfileEditClient({
    locale,
    dict,
    userId,
    userEmail,
    initial,
}: {
    locale: string;
    dict: any;
    userId: string;
    userEmail: string;
    initial: InitialProfile;
}) {
    const supabase = useMemo(() => createClient(), []);
    const l = dict.labels;

    const snapshot = useMemo(
        () => ({
            full_name: norm(initial.full_name),
            line_id: normalizeStoredLineContact(initial.line_id ?? ""),
            phone: norm(initial.phone),
        }),
        [initial]
    );

    const [nickname, setNickname] = useState(snapshot.full_name);
    const [lineContact, setLineContact] = useState(() => normalizeStoredLineContact(initial.line_id ?? ""));
    const [phone, setPhone] = useState(snapshot.phone);
    const [saving, setSaving] = useState(false);
    const [lineGuide, setLineGuide] = useState<"iphone" | "android" | null>(null);

    useEffect(() => {
        if (!lineGuide) return;
        const onKey = (e: KeyboardEvent) => {
            if (e.key === "Escape") setLineGuide(null);
        };
        document.addEventListener("keydown", onKey);
        const prev = document.body.style.overflow;
        document.body.style.overflow = "hidden";
        return () => {
            document.removeEventListener("keydown", onKey);
            document.body.style.overflow = prev;
        };
    }, [lineGuide]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (saving) return;

        const next = {
            full_name: norm(nickname),
            line_id: normalizeStoredLineContact(lineContact),
            phone: norm(phone),
        };

        const updates: Record<string, string | null> = {};
        if (next.full_name !== snapshot.full_name) {
            updates.full_name = next.full_name || null;
        }
        if (next.line_id !== snapshot.line_id) {
            updates.line_id = next.line_id || null;
        }
        if (next.phone !== snapshot.phone) {
            updates.phone = next.phone || null;
        }

        if (Object.keys(updates).length === 0) {
            toast.message(l.profile_no_changes);
            return;
        }

        setSaving(true);
        try {
            const { error } = await supabase.from("profiles").update(updates).eq("id", userId);

            if (error) {
                console.error(error);
                toast.error(l.profile_update_error);
                return;
            }

            toast.success(l.profile_updated_toast);
            window.location.assign(`/${locale}/mypage?tab=profile`);
        } catch (err) {
            console.error(err);
            toast.error(l.profile_update_error);
        } finally {
            setSaving(false);
        }
    };

    const lineContactLabel = l.line_contact_label ?? l.line_id_label;
    const lineContactHelp = l.line_contact_help ?? l.line_id_highlight_hint;
    const lineContactHint = l.line_contact_url_hint ?? l.line_friend_url_guide;
    const lineContactPlaceholder = l.line_contact_placeholder ?? l.line_id_placeholder;

    return (
        <div className="min-h-screen bg-slate-50 pb-20">
            <div className="bg-navy-secondary text-white pt-8 pb-12 md:pb-16 relative overflow-hidden z-0">
                <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_30%_20%,#fff_0%,transparent_45%)]" />
                <div className="container mx-auto px-4 relative z-10 max-w-2xl">
                    <Link
                        href={`/${locale}/mypage`}
                        className="inline-flex items-center text-white/80 hover:text-white text-sm font-bold mb-6 transition-colors"
                    >
                        <ChevronLeft className="w-4 h-4 mr-1" />
                        {l.back_to_mypage}
                    </Link>
                    <h1 className="text-2xl md:text-3xl font-black tracking-tight !text-white">{l.profile_edit_title}</h1>
                    <p className="mt-2 text-sm font-medium text-white/75">{l.profile_edit_subtitle}</p>
                </div>
            </div>

            <div className="container mx-auto px-4 max-w-2xl relative z-10 max-md:mt-4 md:-mt-10">
                <form
                    onSubmit={handleSubmit}
                    className="bg-white rounded-3xl shadow-xl border border-slate-100 p-6 md:p-10 space-y-8"
                >
                    <div className="rounded-2xl bg-slate-50 border border-slate-100 px-4 py-3.5 text-sm text-slate-600">
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1">
                            {l.email_label}
                        </span>
                        <span className="font-medium text-navy-secondary break-all">{userEmail}</span>
                        <p className="text-xs text-slate-400 mt-2">{l.profile_edit_email_readonly}</p>
                    </div>

                    <div>
                        <label htmlFor="nickname" className="flex items-center gap-2 text-sm font-bold text-navy-secondary mb-1">
                            <User className="w-4 h-4 text-slate-400" />
                            {l.nickname_label}
                        </label>
                        <p className="text-xs text-slate-500 mb-2">{l.nickname_help}</p>
                        <input
                            id="nickname"
                            type="text"
                            autoComplete="nickname"
                            placeholder={l.nickname_placeholder}
                            value={nickname}
                            onChange={(e) => setNickname(e.target.value)}
                            className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-3 text-navy-secondary placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-navy-primary/25 focus:border-navy-primary/40 transition-shadow"
                        />
                    </div>

                    <div className="rounded-2xl border-2 border-emerald-200/80 bg-gradient-to-br from-emerald-50/90 to-white p-5 md:p-6 shadow-sm">
                        <label
                            htmlFor="line_contact"
                            className="flex flex-wrap items-center gap-2 text-sm font-black text-emerald-800 mb-1"
                        >
                            <MessageCircle className="w-4 h-4 shrink-0" />
                            {lineContactLabel}
                            <span className="text-[10px] font-bold text-emerald-600 bg-emerald-100/80 px-2 py-0.5 rounded-full">
                                {l.line_id_recommended_badge}
                            </span>
                            <span
                                className="inline-flex items-center gap-1 text-emerald-700/90"
                                title={lineContactHint}
                            >
                                <CircleHelp className="h-4 w-4 shrink-0" aria-hidden />
                                <span className="sr-only">{lineContactHint}</span>
                            </span>
                        </label>
                        <p className="text-xs text-emerald-800/90 mb-2 font-medium leading-relaxed">{lineContactHelp}</p>
                        <p className="mb-3 rounded-lg border border-emerald-100/80 bg-white/80 px-3 py-2.5 text-[11px] leading-relaxed text-slate-600">
                            {lineContactHint}
                        </p>
                        <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
                            <span className="text-[11px] font-bold text-emerald-800/90">
                                {l.line_profile_link_guide_intro ?? ""}
                            </span>
                            <div className="flex flex-wrap gap-2">
                                <button
                                    type="button"
                                    onClick={() => setLineGuide("iphone")}
                                    className="inline-flex items-center justify-center rounded-lg border border-emerald-300 bg-white px-3 py-2 text-xs font-black text-emerald-800 shadow-sm transition hover:bg-emerald-50"
                                >
                                    {l.line_profile_link_guide_iphone ?? "iPhone"}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setLineGuide("android")}
                                    className="inline-flex items-center justify-center rounded-lg border border-emerald-300 bg-white px-3 py-2 text-xs font-black text-emerald-800 shadow-sm transition hover:bg-emerald-50"
                                >
                                    {l.line_profile_link_guide_android ?? "Android"}
                                </button>
                            </div>
                        </div>
                        <input
                            id="line_contact"
                            type="text"
                            autoComplete="off"
                            placeholder={lineContactPlaceholder}
                            value={lineContact}
                            onChange={(e) => setLineContact(e.target.value)}
                            className="w-full rounded-xl border border-emerald-200 bg-white px-4 py-3.5 text-navy-secondary placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-400 transition-shadow"
                        />
                    </div>

                    <div>
                        <label htmlFor="phone" className="flex items-center gap-2 text-sm font-bold text-navy-secondary mb-1">
                            <Phone className="w-4 h-4 text-slate-400" />
                            {l.phone_label}
                        </label>
                        <p className="text-xs text-slate-500 mb-2">{l.phone_help}</p>
                        <input
                            id="phone"
                            type="tel"
                            autoComplete="tel"
                            placeholder={l.phone_placeholder}
                            value={phone}
                            onChange={(e) => setPhone(e.target.value)}
                            className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-3 text-navy-secondary placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-navy-primary/25 focus:border-navy-primary/40 transition-shadow"
                        />
                    </div>

                    <p className="text-xs text-slate-500 leading-relaxed bg-slate-50 border border-slate-100 rounded-xl px-4 py-3">
                        {l.profile_edit_contact_privacy_note}
                    </p>

                    <div className="flex flex-col sm:flex-row gap-3 pt-2">
                        <button
                            type="submit"
                            disabled={saving}
                            className="flex-1 inline-flex items-center justify-center gap-2 rounded-2xl bg-rose-600 hover:bg-rose-700 disabled:opacity-70 disabled:pointer-events-none text-white font-black py-4 px-6 shadow-lg shadow-rose-600/25 transition-colors"
                        >
                            {saving ? (
                                <>
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                    {l.saving_profile}
                                </>
                            ) : (
                                l.save_profile
                            )}
                        </button>
                        <Link
                            href={`/${locale}/mypage`}
                            className="sm:flex-none inline-flex items-center justify-center rounded-2xl border-2 border-slate-200 bg-white text-navy-secondary font-bold py-4 px-6 hover:bg-slate-50 transition-colors text-center"
                        >
                            {l.cancel}
                        </Link>
                    </div>
                </form>
            </div>

            {lineGuide &&
                typeof document !== "undefined" &&
                createPortal(
                    <div
                        className="fixed inset-0 z-[240] flex items-end justify-center p-0 sm:items-center sm:p-4"
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="line-guide-modal-title"
                    >
                        <button
                            type="button"
                            className="absolute inset-0 bg-black/55 backdrop-blur-[2px]"
                            aria-label={l.line_profile_link_guide_close_aria ?? "Close"}
                            onClick={() => setLineGuide(null)}
                        />
                        <div className="relative z-10 flex max-h-[min(92vh,900px)] w-full max-w-3xl flex-col overflow-hidden rounded-t-2xl border border-slate-200/90 bg-white shadow-2xl sm:max-h-[90vh] sm:rounded-2xl">
                            <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-4 py-3 sm:px-5">
                                <h2
                                    id="line-guide-modal-title"
                                    className="text-sm font-black text-navy-secondary sm:text-base"
                                >
                                    {lineGuide === "iphone"
                                        ? (l.line_profile_link_guide_modal_title_iphone ?? "")
                                        : (l.line_profile_link_guide_modal_title_android ?? "")}
                                </h2>
                                <button
                                    type="button"
                                    onClick={() => setLineGuide(null)}
                                    className="rounded-full p-2 text-slate-500 transition-colors hover:bg-slate-100"
                                    aria-label={l.line_profile_link_guide_close_aria ?? "Close"}
                                >
                                    <X className="h-5 w-5" />
                                </button>
                            </div>
                            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain bg-slate-50/80 p-2 sm:p-4">
                                {/* 767px 以下は縦長スマホ用、それ以上は横長PC用（picture の media で切替） */}
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <picture>
                                    <source
                                        media="(max-width: 767px)"
                                        srcSet={
                                            lineGuide === "iphone"
                                                ? "/images/line-profile-link-guide/iphone-mobile.png"
                                                : "/images/line-profile-link-guide/android-mobile.png"
                                        }
                                    />
                                    <img
                                        src={
                                            lineGuide === "iphone"
                                                ? "/images/line-profile-link-guide/iphone.png"
                                                : "/images/line-profile-link-guide/android.png"
                                        }
                                        alt=""
                                        className="mx-auto w-full max-w-full object-contain object-top"
                                    />
                                </picture>
                            </div>
                            <div className="border-t border-slate-100 bg-white px-4 py-3 sm:px-5">
                                <button
                                    type="button"
                                    onClick={() => setLineGuide(null)}
                                    className="w-full rounded-xl bg-emerald-600 py-3 text-sm font-black text-white shadow-md transition hover:bg-emerald-700"
                                >
                                    {l.line_profile_link_guide_close ?? "閉じる"}
                                </button>
                            </div>
                        </div>
                    </div>,
                    document.body
                )}
        </div>
    );
}
