"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { Loader2, Lock } from "lucide-react";

const MIN_PASSWORD_LEN = 8;

type Props = {
    dict: { labels: Record<string, string>; auth: { forgot_password: string } };
    locale: string;
    /** 設定メニュー内など、見出し行の下に置くときは true */
    embedded?: boolean;
};

export default function UserPasswordChangeForm({ dict, locale, embedded = false }: Props) {
    const supabase = useMemo(() => createClient(), []);
    const l = dict.labels;

    const [email, setEmail] = useState<string | null>(null);
    const [oauthOnly, setOauthOnly] = useState(false);
    const [ready, setReady] = useState(false);
    const [current, setCurrent] = useState("");
    const [nextPass, setNextPass] = useState("");
    const [confirm, setConfirm] = useState("");
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        let cancelled = false;
        (async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (cancelled) return;
            setEmail(user?.email ?? null);
            const idents = user?.identities ?? [];
            const hasEmail = idents.some((i) => i.provider === "email");
            setOauthOnly(idents.length > 0 && !hasEmail);
            setReady(true);
        })();
        return () => {
            cancelled = true;
        };
    }, [supabase]);

    const onSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!email || oauthOnly || submitting) return;

        if (nextPass !== confirm) {
            toast.error(l.settings_password_error_mismatch);
            return;
        }
        if (nextPass.length < MIN_PASSWORD_LEN) {
            toast.error(l.settings_password_error_weak);
            return;
        }

        setSubmitting(true);
        try {
            const { error: signErr } = await supabase.auth.signInWithPassword({
                email,
                password: current,
            });
            if (signErr) {
                toast.error(l.settings_password_error_wrong_current);
                return;
            }

            const { error: upErr } = await supabase.auth.updateUser({ password: nextPass });
            if (upErr) {
                toast.error(upErr.message || l.settings_password_error_generic);
                return;
            }

            toast.success(l.settings_password_success);
            setCurrent("");
            setNextPass("");
            setConfirm("");
        } finally {
            setSubmitting(false);
        }
    };

    if (!ready) {
        return (
            <div
                className={
                    embedded
                        ? "flex items-center justify-center py-10"
                        : "flex items-center justify-center rounded-2xl border border-slate-100 bg-slate-50 py-12"
                }
            >
                <Loader2 className="h-8 w-8 animate-spin text-navy-primary" />
            </div>
        );
    }

    if (oauthOnly) {
        return (
            <div
                className={
                    embedded
                        ? "rounded-xl bg-slate-100/80 p-4 text-sm leading-relaxed text-slate-600"
                        : "rounded-2xl border border-slate-100 bg-slate-50 p-6 text-sm leading-relaxed text-slate-600"
                }
            >
                {l.settings_password_oauth_only}
            </div>
        );
    }

    const shell = embedded
        ? "space-y-4 pt-1"
        : "rounded-2xl border border-slate-100 bg-white p-6 shadow-sm";

    return (
        <div className={shell}>
            {!embedded && (
                <div className="mb-6 flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-navy-primary/10 text-navy-primary">
                        <Lock className="h-5 w-5" />
                    </div>
                    <h4 className="text-lg font-black text-navy-secondary">{l.settings_password_section_title}</h4>
                </div>
            )}

            <form onSubmit={onSubmit} className="space-y-4">
                <div>
                    <label htmlFor="settings-current-password" className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-500">
                        {l.settings_password_current}
                    </label>
                    <input
                        id="settings-current-password"
                        type="password"
                        autoComplete="current-password"
                        value={current}
                        onChange={(e) => setCurrent(e.target.value)}
                        className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-navy-secondary outline-none transition focus:border-navy-primary focus:bg-white"
                        required
                    />
                </div>
                <div>
                    <label htmlFor="settings-new-password" className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-500">
                        {l.settings_password_new}
                    </label>
                    <input
                        id="settings-new-password"
                        type="password"
                        autoComplete="new-password"
                        value={nextPass}
                        onChange={(e) => setNextPass(e.target.value)}
                        className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-navy-secondary outline-none transition focus:border-navy-primary focus:bg-white"
                        required
                        minLength={MIN_PASSWORD_LEN}
                    />
                </div>
                <div>
                    <label htmlFor="settings-confirm-password" className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-500">
                        {l.settings_password_confirm}
                    </label>
                    <input
                        id="settings-confirm-password"
                        type="password"
                        autoComplete="new-password"
                        value={confirm}
                        onChange={(e) => setConfirm(e.target.value)}
                        className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-navy-secondary outline-none transition focus:border-navy-primary focus:bg-white"
                        required
                        minLength={MIN_PASSWORD_LEN}
                    />
                </div>

                <p className="text-xs text-slate-400">{l.settings_password_hint}</p>

                <button
                    type="submit"
                    disabled={submitting}
                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-navy-primary py-3.5 text-sm font-black text-white transition hover:bg-navy-secondary disabled:opacity-60"
                >
                    {submitting ? <Loader2 className="h-5 w-5 animate-spin" /> : null}
                    {l.settings_password_submit}
                </button>
            </form>

            <p className="mt-4 text-center text-sm">
                <Link href={`/${locale}/auth/forgot-password`} className="font-bold text-navy-primary underline-offset-4 hover:underline">
                    {dict.auth.forgot_password}
                </Link>
            </p>
        </div>
    );
}
