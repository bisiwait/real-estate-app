"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { ChevronLeft, Loader2, User, Phone } from "lucide-react";

type InitialProfile = {
    full_name: string;
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
            phone: norm(initial.phone),
        }),
        [initial]
    );

    const [nickname, setNickname] = useState(snapshot.full_name);
    const [phone, setPhone] = useState(snapshot.phone);
    const [saving, setSaving] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (saving) return;

        const next = {
            full_name: norm(nickname),
            phone: norm(phone),
        };

        const updates: Record<string, string | null> = {};
        if (next.full_name !== snapshot.full_name) {
            updates.full_name = next.full_name || null;
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
                    suppressHydrationWarning
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
        </div>
    );
}
