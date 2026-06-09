import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { UserCircle, ArrowLeft, Mail, Phone, Calendar, Hash, MessageCircle, Heart, Search, ExternalLink } from "lucide-react";
import { isAdmin } from "@/lib/admin";
import { createAdminClient } from "@/lib/supabase/server";
import { buildLineContactUrl } from "@/lib/line-contact-url";

function savedSearchPropertiesHref(locale: string, filters: unknown): string {
    const base = `/${locale}/properties`;
    if (!filters || typeof filters !== "object" || Array.isArray(filters)) return base;
    const qs = new URLSearchParams();
    for (const [k, v] of Object.entries(filters as Record<string, unknown>)) {
        if (v === null || v === undefined) continue;
        const s = String(v).trim();
        if (s === "") continue;
        qs.set(k, s);
    }
    const q = qs.toString();
    return q ? `${base}?${q}` : base;
}

export default async function AdminUserDetailPage({
    params,
}: {
    params: Promise<{ locale: string; id: string }>;
}) {
    const { locale, id } = await params;

    if (!(await isAdmin())) {
        redirect(`/${locale}`);
    }

    const supabase = await createAdminClient();
    const { data: profile, error } = await supabase.from("profiles").select("*").eq("id", id).maybeSingle();

    if (error || !profile) {
        notFound();
    }

    if (profile.user_role === "admin" || profile.is_admin === true) {
        notFound();
    }

    const [{ count: favoritesCount }, { count: savedSearchesCount }, { data: favoriteRows }, { data: savedSearchRows }] =
        await Promise.all([
            supabase.from("favorites").select("id", { count: "exact", head: true }).eq("user_id", id),
            supabase.from("saved_searches").select("id", { count: "exact", head: true }).eq("user_id", id),
            supabase
                .from("favorites")
                .select("id, property_id, properties(id, title)")
                .eq("user_id", id)
                .order("created_at", { ascending: false }),
            supabase
                .from("saved_searches")
                .select("id, name, filters, created_at")
                .eq("user_id", id)
                .order("created_at", { ascending: false }),
        ]);

    const lineHref = buildLineContactUrl(profile.line_id as string | null | undefined);
    const lineRaw = formatLineRaw(profile.line_id);

    const format = (v: unknown) => (v === null || v === undefined || v === "" ? "—" : String(v));

    const favList =
        (favoriteRows ?? []).map((row: { id: string; property_id?: string; properties?: { id?: string; title?: string } | null }) => {
            const p = row.properties;
            const pid = p?.id ?? row.property_id;
            const title = p?.title?.trim() || "（タイトルなし）";
            return { id: row.id, propertyId: pid, title };
        }) ?? [];

    const searchList = savedSearchRows ?? [];

    return (
        <div className="bg-slate-50 min-h-screen pb-20 pt-24">
            <div className="container mx-auto px-4 max-w-3xl">
                <Link
                    href={`/${locale}/admin-secret`}
                    className="inline-flex items-center gap-2 mb-8 text-xs font-black text-navy-primary hover:text-blue-600 transition-colors uppercase tracking-widest"
                >
                    <ArrowLeft size={16} />
                    管理者ダッシュボードに戻る
                </Link>

                <div className="bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden">
                    <div className="bg-slate-50 border-b border-slate-100 p-8">
                        <div className="flex items-start gap-4">
                            <div className="w-16 h-16 rounded-2xl bg-navy-primary/5 flex items-center justify-center flex-shrink-0">
                                <UserCircle className="w-9 h-9 text-navy-primary/50" />
                            </div>
                            <div className="min-w-0">
                                <h1 className="text-2xl font-black text-navy-secondary truncate">
                                    {format(profile.full_name) === "—" ? "（名前未設定）" : profile.full_name}
                                </h1>
                                <p className="text-xs font-bold text-slate-400 mt-1 uppercase tracking-widest">
                                    一般ユーザー詳細
                                </p>
                            </div>
                        </div>
                    </div>

                    <dl className="p-8 space-y-6">
                        <div className="flex gap-3">
                            <Hash className="w-5 h-5 text-slate-300 flex-shrink-0 mt-0.5" />
                            <div className="min-w-0 flex-1">
                                <dt className="text-[10px] font-black text-slate-400 uppercase tracking-widest">ユーザーID</dt>
                                <dd className="text-xs font-mono text-slate-600 break-all mt-1">{id}</dd>
                            </div>
                        </div>
                        <div className="flex gap-3">
                            <Mail className="w-5 h-5 text-slate-300 flex-shrink-0 mt-0.5" />
                            <div className="min-w-0 flex-1">
                                <dt className="text-[10px] font-black text-slate-400 uppercase tracking-widest">メール</dt>
                                <dd className="text-sm font-bold text-navy-secondary break-all mt-1">{format(profile.email)}</dd>
                            </div>
                        </div>
                        <div className="flex gap-3">
                            <Phone className="w-5 h-5 text-slate-300 flex-shrink-0 mt-0.5" />
                            <div className="min-w-0 flex-1">
                                <dt className="text-[10px] font-black text-slate-400 uppercase tracking-widest">電話</dt>
                                <dd className="text-sm font-bold text-navy-secondary mt-1">{format(profile.phone)}</dd>
                            </div>
                        </div>
                        <div className="flex gap-3">
                            <MessageCircle className="w-5 h-5 text-slate-300 flex-shrink-0 mt-0.5" />
                            <div className="min-w-0 flex-1">
                                <dt className="text-[10px] font-black text-slate-400 uppercase tracking-widest">LINEリンク</dt>
                                <dd className="text-sm font-bold text-navy-secondary mt-1 space-y-2">
                                    {lineHref ? (
                                        <>
                                            <a
                                                href={lineHref}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="inline-flex items-center gap-1.5 text-navy-primary font-black underline-offset-2 hover:underline"
                                            >
                                                LINEで開く
                                                <ExternalLink className="w-3.5 h-3.5 shrink-0 opacity-70" />
                                            </a>
                                            <p className="text-xs font-mono text-slate-500 break-all font-medium">{lineRaw}</p>
                                        </>
                                    ) : (
                                        <span className="text-slate-400 font-medium">—</span>
                                    )}
                                </dd>
                            </div>
                        </div>
                        <div className="flex gap-3">
                            <Calendar className="w-5 h-5 text-slate-300 flex-shrink-0 mt-0.5" />
                            <div className="min-w-0 flex-1">
                                <dt className="text-[10px] font-black text-slate-400 uppercase tracking-widest">登録情報</dt>
                                <dd className="text-sm font-bold text-navy-secondary mt-1 space-y-2">
                                    <p>
                                        <Link
                                            href="#admin-user-favorites"
                                            className="text-navy-primary underline-offset-2 hover:underline font-black"
                                        >
                                            お気に入り物件数: {favoritesCount ?? 0} 件
                                        </Link>
                                    </p>
                                    <p>
                                        <Link
                                            href="#admin-user-saved-searches"
                                            className="text-navy-primary underline-offset-2 hover:underline font-black"
                                        >
                                            検索条件数: {savedSearchesCount ?? 0} 件
                                        </Link>
                                    </p>
                                    {profile.created_at && (
                                        <p className="text-xs font-medium text-slate-500">
                                            作成: {new Date(profile.created_at as string).toLocaleString("ja-JP")}
                                        </p>
                                    )}
                                    {profile.updated_at && (
                                        <p className="text-xs font-medium text-slate-500">
                                            更新: {new Date(profile.updated_at as string).toLocaleString("ja-JP")}
                                        </p>
                                    )}
                                </dd>
                            </div>
                        </div>
                    </dl>

                    <div className="border-t border-slate-100 bg-slate-50/80 px-8 py-10 space-y-12">
                        <section id="admin-user-favorites" className="scroll-mt-28">
                            <div className="flex items-center gap-2 mb-4">
                                <Heart className="w-5 h-5 text-rose-400" />
                                <h2 className="text-lg font-black text-navy-secondary">お気に入り物件</h2>
                                <span className="text-xs font-bold text-slate-400">（{favoritesCount ?? 0} 件）</span>
                            </div>
                            {favList.length === 0 ? (
                                <p className="text-sm text-slate-500 font-medium">登録はありません。</p>
                            ) : (
                                <ul className="space-y-2">
                                    {favList.map((f) =>
                                        f.propertyId ? (
                                            <li key={f.id}>
                                                <Link
                                                    href={`/${locale}/properties/${f.propertyId}`}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="group flex items-center justify-between gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-navy-secondary transition-colors hover:border-navy-primary/30 hover:bg-navy-primary/5"
                                                >
                                                    <span className="min-w-0 truncate">{f.title}</span>
                                                    <ExternalLink className="w-4 h-4 shrink-0 text-slate-400 group-hover:text-navy-primary" />
                                                </Link>
                                            </li>
                                        ) : (
                                            <li
                                                key={f.id}
                                                className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-500"
                                            >
                                                {f.title}（物件IDなし）
                                            </li>
                                        )
                                    )}
                                </ul>
                            )}
                        </section>

                        <section id="admin-user-saved-searches" className="scroll-mt-28">
                            <div className="flex items-center gap-2 mb-4">
                                <Search className="w-5 h-5 text-navy-primary/60" />
                                <h2 className="text-lg font-black text-navy-secondary">保存した検索条件</h2>
                                <span className="text-xs font-bold text-slate-400">（{savedSearchesCount ?? 0} 件）</span>
                            </div>
                            {searchList.length === 0 ? (
                                <p className="text-sm text-slate-500 font-medium">登録はありません。</p>
                            ) : (
                                <ul className="space-y-2">
                                    {searchList.map((s: { id: string; name?: string | null; filters?: unknown; created_at?: string }) => {
                                        const href = savedSearchPropertiesHref(locale, s.filters);
                                        const label = (s.name && String(s.name).trim()) || "（名称なし）";
                                        return (
                                            <li key={s.id}>
                                                <Link
                                                    href={href}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="group flex items-center justify-between gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-navy-secondary transition-colors hover:border-navy-primary/30 hover:bg-navy-primary/5"
                                                >
                                                    <span className="min-w-0 flex-1">
                                                        <span className="block truncate">{label}</span>
                                                        {s.created_at && (
                                                            <span className="mt-0.5 block text-[10px] font-medium text-slate-400">
                                                                保存日: {new Date(s.created_at).toLocaleString("ja-JP")}
                                                            </span>
                                                        )}
                                                    </span>
                                                    <span className="flex shrink-0 items-center gap-1 text-xs font-black text-navy-primary">
                                                        物件一覧
                                                        <ExternalLink className="w-4 h-4 opacity-70" />
                                                    </span>
                                                </Link>
                                            </li>
                                        );
                                    })}
                                </ul>
                            )}
                        </section>
                    </div>
                </div>
            </div>
        </div>
    );
}

function formatLineRaw(raw: unknown): string {
    if (raw === null || raw === undefined) return "";
    const s = String(raw).trim();
    return s;
}
