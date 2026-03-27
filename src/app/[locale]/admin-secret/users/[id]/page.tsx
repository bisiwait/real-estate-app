import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { UserCircle, ArrowLeft, Mail, Phone, Calendar, Hash } from "lucide-react";
import { isAdmin } from "@/lib/admin";
import { createClient } from "@/lib/supabase/server";

export default async function AdminUserDetailPage({
    params,
}: {
    params: Promise<{ locale: string; id: string }>;
}) {
    const { locale, id } = await params;

    if (!(await isAdmin())) {
        redirect(`/${locale}`);
    }

    const supabase = await createClient();
    const { data: profile, error } = await supabase.from("profiles").select("*").eq("id", id).maybeSingle();

    if (error || !profile) {
        notFound();
    }

    if (profile.user_role === "admin" || profile.is_admin === true) {
        notFound();
    }

    const { count: favoritesCount } = await supabase
        .from("favorites")
        .select("id", { count: "exact", head: true })
        .eq("user_id", id);

    const format = (v: unknown) => (v === null || v === undefined || v === "" ? "—" : String(v));

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
                            <Mail className="w-5 h-5 text-slate-300 flex-shrink-0 mt-0.5" />
                            <div>
                                <dt className="text-[10px] font-black text-slate-400 uppercase tracking-widest">メール</dt>
                                <dd className="text-sm font-bold text-navy-secondary break-all mt-1">{format(profile.email)}</dd>
                            </div>
                        </div>
                        <div className="flex gap-3">
                            <Phone className="w-5 h-5 text-slate-300 flex-shrink-0 mt-0.5" />
                            <div>
                                <dt className="text-[10px] font-black text-slate-400 uppercase tracking-widest">電話</dt>
                                <dd className="text-sm font-bold text-navy-secondary mt-1">{format(profile.phone)}</dd>
                            </div>
                        </div>
                        <div className="flex gap-3">
                            <Hash className="w-5 h-5 text-slate-300 flex-shrink-0 mt-0.5" />
                            <div>
                                <dt className="text-[10px] font-black text-slate-400 uppercase tracking-widest">ユーザーID</dt>
                                <dd className="text-xs font-mono text-slate-600 break-all mt-1">{id}</dd>
                            </div>
                        </div>
                        <div className="flex gap-3">
                            <Calendar className="w-5 h-5 text-slate-300 flex-shrink-0 mt-0.5" />
                            <div>
                                <dt className="text-[10px] font-black text-slate-400 uppercase tracking-widest">登録情報</dt>
                                <dd className="text-sm font-bold text-navy-secondary mt-1 space-y-1">
                                    <p>
                                        役割:{" "}
                                        <span className="text-navy-primary">{format(profile.user_role)}</span>
                                    </p>
                                    <p>
                                        プラン:{" "}
                                        <span className="text-navy-primary">{format(profile.plan ?? profile.plan_type)}</span>
                                    </p>
                                    <p>お気に入り物件数: {favoritesCount ?? 0}</p>
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
                </div>
            </div>
        </div>
    );
}
