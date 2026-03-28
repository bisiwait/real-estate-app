"use client";

import { useCallback, useMemo, useState } from "react";
import type { Provider, User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import Switch from "@/components/ui/Switch";
import { Loader2 } from "lucide-react";
import { getAuthSiteOrigin } from "@/lib/auth/site-origin";
import { buildOAuthSignInRedirectUrl } from "@/lib/auth/auth-callback-url";
import { setAuthReturnToCookie } from "@/lib/auth/auth-return-cookie";
import { getLineOAuthProviderId } from "@/lib/auth/line-oauth-provider";

type ProfileRow = {
    id: string;
    line_user_id?: string | null;
    notify_new_matching?: boolean | null;
    notify_price_drop?: boolean | null;
    notify_via_line?: boolean | null;
    notify_via_email?: boolean | null;
};

function isLineLinked(user: User | null, profile: ProfileRow | null, lineProviderId: string): boolean {
    if (profile?.line_user_id && String(profile.line_user_id).trim() !== "") return true;
    const ids = user?.identities ?? [];
    return ids.some((i) => i.provider === lineProviderId || i.provider === "line");
}

/** マイページ設定アコーディオン内用（見出しは親のボタン側） */
export default function NotificationSettingsSection({
    user,
    profile,
    onProfilePatch,
    dict,
    locale,
}: {
    user: User | null;
    profile: ProfileRow | null;
    onProfilePatch: (patch: Partial<ProfileRow>) => void;
    dict: any;
    locale: string;
}) {
    const l = dict.labels;
    const supabase = useMemo(() => createClient(), []);
    const lineProviderId = useMemo(() => getLineOAuthProviderId(), []);
    const [savingKey, setSavingKey] = useState<string | null>(null);
    const [lineLoading, setLineLoading] = useState(false);

    const lineLinked = isLineLinked(user, profile, lineProviderId);

    const notifyNewMatching = profile?.notify_new_matching === true;
    const notifyPriceDrop = profile?.notify_price_drop === true;
    const notifyViaLine = profile?.notify_via_line === true;

    const persist = useCallback(
        async (updates: Record<string, boolean>, key: string) => {
            if (!user?.id) return;
            setSavingKey(key);
            try {
                const { error } = await supabase.from("profiles").update(updates).eq("id", user.id);
                if (error) {
                    console.error(error);
                    toast.error(l.notify_prefs_save_error);
                    return;
                }
                onProfilePatch(updates as Partial<ProfileRow>);
                toast.success(l.notify_prefs_saved);
            } finally {
                setSavingKey(null);
            }
        },
        [user?.id, supabase, onProfilePatch, l.notify_prefs_save_error, l.notify_prefs_saved]
    );

    const handleLineLink = async () => {
        const origin = getAuthSiteOrigin();
        if (!origin) {
            toast.error(l.notify_line_oauth_missing_origin);
            return;
        }
        setLineLoading(true);
        try {
            setAuthReturnToCookie(`/${locale}/mypage?tab=settings`);
            const { error } = await supabase.auth.linkIdentity({
                provider: lineProviderId as Provider,
                options: { redirectTo: buildOAuthSignInRedirectUrl(origin, locale) },
            });
            if (error) throw error;
        } catch (e: any) {
            console.error(e);
            toast.error(e?.message || l.notify_line_oauth_error);
            setLineLoading(false);
        }
    };

    return (
        <div className="space-y-6 pt-1">
            <p className="text-xs font-bold text-slate-500">{l.notify_prefs_subtitle}</p>

            <div className="divide-y divide-slate-100 border-t border-slate-100">
                <div className="flex items-start justify-between gap-4 py-4">
                    <div className="min-w-0 flex-1">
                        <p className="font-bold text-navy-secondary">{l.notify_new_matching_title}</p>
                        <p className="mt-1 text-sm font-medium text-slate-500">{l.notify_new_matching_desc}</p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2 pt-1">
                        {savingKey === "matching" ? <Loader2 className="h-5 w-5 animate-spin text-navy-primary" /> : null}
                        <Switch
                            checked={notifyNewMatching}
                            onCheckedChange={(v) => void persist({ notify_new_matching: v }, "matching")}
                            disabled={!!savingKey}
                        />
                    </div>
                </div>

                <div className="flex items-start justify-between gap-4 py-4">
                    <div className="min-w-0 flex-1">
                        <p className="font-bold text-navy-secondary">{l.notify_price_drop_title}</p>
                        <p className="mt-1 text-sm font-medium text-slate-500">{l.notify_price_drop_desc}</p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2 pt-1">
                        {savingKey === "price" ? <Loader2 className="h-5 w-5 animate-spin text-navy-primary" /> : null}
                        <Switch
                            checked={notifyPriceDrop}
                            onCheckedChange={(v) => void persist({ notify_price_drop: v }, "price")}
                            disabled={!!savingKey}
                        />
                    </div>
                </div>
            </div>

            <div>
                <p className="mb-3 text-xs font-black uppercase tracking-widest text-slate-400">{l.notify_channel_heading}</p>

                {!lineLinked ? (
                    <div className="mb-4 rounded-2xl border border-[#06C755]/25 bg-[#06C755]/5 p-4">
                        <p className="mb-3 text-sm font-bold text-navy-secondary">{l.notify_line_unlinked_hint}</p>
                        <p className="mb-3 text-xs font-medium leading-relaxed text-slate-600">{l.notify_line_custom_provider_hint}</p>
                        <button
                            type="button"
                            onClick={() => void handleLineLink()}
                            disabled={lineLoading}
                            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#06C755] px-4 py-3.5 text-sm font-black text-white shadow-md transition hover:bg-[#05b34c] disabled:opacity-60 sm:w-auto"
                        >
                            {lineLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                            {l.notify_line_link_cta}
                        </button>
                    </div>
                ) : (
                    <p className="mb-3 text-sm font-bold text-emerald-700">{l.notify_line_linked_badge}</p>
                )}

                <div className="rounded-2xl border border-slate-100 bg-slate-50/80 p-4">
                    <div className="flex items-center justify-between gap-4 py-1">
                        <span className="text-sm font-bold text-navy-secondary">{l.notify_via_line_label}</span>
                        <div className="flex items-center gap-2">
                            {savingKey === "via_line" ? <Loader2 className="h-5 w-5 animate-spin text-navy-primary" /> : null}
                            <Switch
                                checked={notifyViaLine && lineLinked}
                                onCheckedChange={(v) => {
                                    if (!lineLinked && v) return;
                                    void persist({ notify_via_line: v }, "via_line");
                                }}
                                disabled={!!savingKey || !lineLinked}
                            />
                        </div>
                    </div>
                </div>
                <p className="mt-3 text-xs font-medium leading-relaxed text-slate-400">{l.notify_prefs_footer_note}</p>
            </div>
        </div>
    );
}
