"use client";

import { useState, useMemo, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { Bell, Loader2, Search, Info } from "lucide-react";
import { useSearchParams, useRouter } from "next/navigation";
import Sheet from "@/components/ui/Sheet";
import Switch from "@/components/ui/Switch";

interface SaveSearchButtonProps {
    variant?: "default" | "outline";
    fullWidth?: boolean;
}

export default function SaveSearchButton({ variant = "default", fullWidth = false }: SaveSearchButtonProps) {
    const [isSheetOpen, setIsSheetOpen] = useState(false);
    const [isLoginSheetOpen, setIsLoginSheetOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [saved, setSaved] = useState(false);
    const [isRestricted, setIsRestricted] = useState(false);

    // Form states
    const [searchName, setSearchName] = useState("");
    const [notificationsEnabled, setNotificationsEnabled] = useState(false);

    const searchParams = useSearchParams();
    const router = useRouter();
    const supabase = createClient();

    // Current filters as object for comparison and saving
    // Normalize filters to ensure consistent comparison regardless of URL param order or extra metadata
    const currentFilters = useMemo(() => {
        const filters: Record<string, string> = {};
        // Use a stable set of keys for search criteria
        const essentialKeys = ["region", "area", "price", "type", "property_type", "q"];
        essentialKeys.sort().forEach(key => {
            const value = searchParams.get(key);
            if (value && value !== "all") {
                filters[key] = value.trim();
            }
        });
        return filters;
    }, [searchParams]);

    // Consolidated check for restrictions and saved status
    useEffect(() => {
        let isMounted = true;
        const timer = setTimeout(async () => {
            try {
                const { data: { user } } = await supabase.auth.getUser();
                if (!isMounted || !user) {
                    if (!user) {
                        setSaved(false);
                        setIsRestricted(false);
                    }
                    return;
                }

                // 1. Check Restrictions
                const { data: profile } = await supabase
                    .from("profiles")
                    .select("user_role, is_admin, available_credits")
                    .eq("id", user.id)
                    .single();

                if (profile && isMounted) {
                    const isAdmin = profile.is_admin === true || profile.user_role === 'admin';
                    const hasCredits = (profile.available_credits || 0) > 0;
                    const isAgent = profile.user_role === 'agent' || hasCredits || (profile.user_role === undefined && !isAdmin);

                    if (isAdmin || isAgent) {
                        setIsRestricted(true);
                    }
                }

                // 2. Check if Saved
                const filterCount = Object.keys(currentFilters).length;
                if (filterCount === 0) {
                    setSaved(false);
                } else {
                    const { data, error } = await supabase
                        .from("saved_searches")
                        .select("id, filters")
                        .eq("user_id", user.id);

                    if (error) throw error;

                    if (isMounted) {
                        const isAlreadySaved = data?.some(item => {
                            const dbFilters = item.filters || {};
                            const dbKeys = Object.keys(dbFilters);
                            const currentKeys = Object.keys(currentFilters);
                            if (dbKeys.length !== currentKeys.length) return false;
                            return currentKeys.every(key => dbFilters[key] === currentFilters[key]);
                        });
                        setSaved(!!isAlreadySaved);
                    }
                }
            } catch (error) {
                console.error("SaveSearchButton sync error:", error);
            }
        }, 500); // 500ms debounce

        return () => {
            isMounted = false;
            clearTimeout(timer);
        };
    }, [currentFilters, supabase]);

    // Generate default name and filter list for preview
    const activeFilters = useMemo(() => {
        const filters: { label: string; value: string }[] = [];
        const region = searchParams.get("region");
        const area = searchParams.get("area");
        const price = searchParams.get("price");
        const type = searchParams.get("type");
        const propType = searchParams.get("property_type");
        const q = searchParams.get("q");

        if (region) filters.push({ label: "都市", value: region });
        if (area) filters.push({ label: "エリア", value: area });
        if (type && type !== "all") {
            const typeLabels: Record<string, string> = { rent: "賃貸", sell: "売買", presale: "プレセール" };
            filters.push({ label: "種別", value: typeLabels[type] || type });
        }
        if (propType) {
            const propLabels: Record<string, string> = {
                Condo: "コンドミニアム",
                House: "一軒家・ヴィラ",
                Townhouse: "タウンハウス"
            };
            filters.push({ label: "タイプ", value: propLabels[propType] || propType });
        }
        if (price) {
            const [min, max] = price.split("-");
            filters.push({ label: "予算", value: `${min.toLocaleString()}〜${max.toLocaleString()} ฿` });
        }
        if (q) filters.push({ label: "検索", value: q });

        return filters;
    }, [searchParams]);

    const defaultName = useMemo(() => {
        if (activeFilters.length === 0) return "すべての物件";
        return activeFilters.map(f => f.value).join(" / ");
    }, [activeFilters]);

    if (isRestricted) return null;

    const handleOpenSheet = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            setIsLoginSheetOpen(true);
            return;
        }

        if (activeFilters.length === 0) {
            alert("検索条件が設定されていません。フィルターを適用してから保存してください。");
            return;
        }

        if (saved) {
            alert("この検索条件は既に保存されています。");
            return;
        }

        setSearchName(defaultName);
        setIsSheetOpen(true);
    };

    const handleSaveSearch = async () => {
        if (loading) return;
        setLoading(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            // Final check to prevent race condition
            const { data: existing } = await supabase
                .from("saved_searches")
                .select("id, filters")
                .eq("user_id", user.id);

            const isDuplicate = existing?.some(item => {
                const dbFilters = item.filters || {};
                const dbKeys = Object.keys(dbFilters);
                const currentKeys = Object.keys(currentFilters);
                if (dbKeys.length !== currentKeys.length) return false;
                return currentKeys.every(key => dbFilters[key] === currentFilters[key]);
            });

            if (isDuplicate) {
                alert("この検索条件は既に保存されています。");
                setIsSheetOpen(false);
                setSaved(true);
                return;
            }

            const { error } = await supabase
                .from("saved_searches")
                .insert({
                    user_id: user.id,
                    name: searchName || defaultName,
                    filters: currentFilters,
                    notifications_enabled: notificationsEnabled
                });

            if (error) throw error;

            setSaved(true);
            setIsSheetOpen(false);

            alert("検索条件をマイページに保存しました！");
        } catch (error) {
            console.error("Save search error:", error);
            alert("保存に失敗しました。");
        } finally {
            setLoading(false);
        }
    };

    return (
        <>
            <button
                type="button"
                suppressHydrationWarning
                onClick={handleOpenSheet}
                disabled={loading || saved}
                className={`flex items-center justify-center space-x-2 px-6 py-2.5 rounded-full text-sm font-black transition-all border shadow-lg ${fullWidth ? "w-full py-4 rounded-2xl" : ""} ${saved
                    ? "bg-emerald-500 border-emerald-500 text-white cursor-default"
                    : variant === "outline"
                        ? "bg-white border-navy-primary/10 text-navy-primary hover:bg-navy-primary/5 active:scale-95"
                        : "bg-white border-white/20 text-navy-secondary hover:bg-navy-primary hover:text-white hover:border-navy-primary active:scale-95"
                    }`}
            >
                {loading ? (
                    <Loader2 size={16} className="animate-spin" />
                ) : (
                    <Bell size={16} className={saved ? "animate-bounce" : ""} />
                )}
                <span>{saved ? "条件保存済み" : "検索条件を保存"}</span>
            </button>

            {/* Save Search Panel */}
            <Sheet
                isOpen={isSheetOpen}
                onClose={() => setIsSheetOpen(false)}
                title="検索条件を保存"
                description="この条件に一致する新しい物件が掲載された際にお知らせします。"
            >
                <div className="space-y-8 pb-32">
                    {/* Filter Preview */}
                    <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100">
                        <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center">
                            <Search size={14} className="mr-2" />
                            現在のフィルター
                        </h4>
                        <div className="flex flex-wrap gap-2">
                            {activeFilters.length > 0 ? activeFilters.map((filter, i) => (
                                <div key={i} className="flex items-center bg-white px-3 py-2 rounded-xl border border-slate-200 shadow-sm">
                                    <span className="text-[10px] font-bold text-slate-400 mr-2">{filter.label}:</span>
                                    <span className="text-xs font-black text-navy-secondary">{filter.value}</span>
                                </div>
                            )) : (
                                <p className="text-xs text-slate-400 font-bold">フィルターなし</p>
                            )}
                        </div>
                    </div>

                    {/* Name Input */}
                    <div className="space-y-3">
                        <label className="text-xs font-black text-navy-secondary uppercase tracking-widest ml-1">保存する名前</label>
                        <input
                            type="text"
                            value={searchName}
                            onChange={(e) => setSearchName(e.target.value)}
                            placeholder="例: パタヤ 500万バーツ以下"
                            className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold focus:ring-2 focus:ring-navy-primary focus:bg-white outline-none transition-all"
                        />
                    </div>

                    {/* Notification Toggle */}
                    <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
                        <Switch
                            checked={notificationsEnabled}
                            onCheckedChange={setNotificationsEnabled}
                            label="新着物件の通知を受け取る"
                        />
                        <p className="text-[11px] text-slate-400 font-bold mt-3 leading-relaxed">
                            ※ 条件にマッチする物件が新しく追加された際、登録済みのメールアドレスへ通知を送信します。
                        </p>
                    </div>

                    {/* Actions */}
                    <div className="flex flex-col space-y-3 pt-6">
                        <button
                            type="button"
                            onClick={handleSaveSearch}
                            disabled={loading}
                            className="w-full py-5 bg-navy-primary text-white rounded-2xl font-black text-sm hover:bg-navy-secondary transition-all shadow-xl shadow-navy-primary/20 flex items-center justify-center space-x-2"
                        >
                            {loading && <Loader2 size={18} className="animate-spin" />}
                            <span>この条件で保存する</span>
                        </button>
                        <button
                            type="button"
                            onClick={() => setIsSheetOpen(false)}
                            className="w-full py-5 bg-white text-slate-400 border border-slate-100 rounded-2xl font-black text-sm hover:bg-slate-50 transition-all"
                        >
                            キャンセル
                        </button>
                    </div>
                </div>
            </Sheet>

            {/* Login Required Panel */}
            <Sheet
                isOpen={isLoginSheetOpen}
                onClose={() => setIsLoginSheetOpen(false)}
                title="ログインが必要です"
            >
                <div className="text-center py-10">
                    <div className="w-24 h-24 bg-amber-50 rounded-full flex items-center justify-center mx-auto mb-8 text-amber-500">
                        <Info size={48} />
                    </div>
                    <p className="text-slate-600 font-bold text-lg mb-10 leading-relaxed">
                        検索条件を保存して新着通知を受け取るには、<br />
                        アカウントへのログインが必要です。
                    </p>
                    <div className="flex flex-col space-y-4">
                        <button
                            type="button"
                            onClick={() => router.push("/login")}
                            className="w-full py-5 bg-navy-primary text-white rounded-2xl font-black text-sm hover:bg-navy-secondary transition-all shadow-xl shadow-navy-primary/20"
                        >
                            ログイン・新規登録画面へ
                        </button>
                        <button
                            type="button"
                            onClick={() => setIsLoginSheetOpen(false)}
                            className="w-full py-5 bg-white text-slate-400 border border-slate-100 rounded-2xl font-black text-sm hover:bg-slate-50 transition-all"
                        >
                            閉じる
                        </button>
                    </div>
                </div>
            </Sheet>
        </>
    );
}
