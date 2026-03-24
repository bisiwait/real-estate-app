"use client";

import { useState, useMemo, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { Bell, Loader2, Search, Info } from "lucide-react";
import { useSearchParams, useRouter, useParams } from "next/navigation";
import Sheet from "@/components/ui/Sheet";
import Switch from "@/components/ui/Switch";
import { useAuth } from "@/contexts/AuthContext";

interface SaveSearchButtonProps {
    dict: any;
    variant?: "default" | "outline";
    fullWidth?: boolean;
}

export default function SaveSearchButton({ dict, variant = "default", fullWidth = false }: SaveSearchButtonProps) {
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
    const params = useParams();
    const locale = (params?.locale as string) || "jp";
    const supabase = createClient();
    const { user, userData, isLoading } = useAuth();

    // Current filters as object for comparison and saving
    // Normalize filters to ensure consistent comparison regardless of URL param order or extra metadata
    const currentFilters = useMemo(() => {
        const filters: Record<string, string> = {};
        // Use a stable set of keys for search criteria
        const essentialKeys = ["region", "area", "price", "type", "property_type", "tags", "bathtub", "pets", "sort"];
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
        
        if (isLoading) return;

        const timer = setTimeout(async () => {
            try {
                if (!user) {
                    if (isMounted) {
                        setSaved(false);
                        setIsRestricted(false);
                    }
                    return;
                }

                // 1. Check Restrictions safely
                if (userData && (userData.role === 'admin' || userData.role === 'agent')) {
                    if (isMounted) setIsRestricted(true);
                }

                // 2. Check if Saved safely
                const safeCurrentFilters = currentFilters || {};
                const filterCount = Object.keys(safeCurrentFilters).length;
                
                if (filterCount === 0) {
                    if (isMounted) setSaved(false);
                } else {
                    const { data, error } = await supabase
                        .from("saved_searches")
                        .select("id, filters")
                        .eq("user_id", user.id);

                    if (error) {
                        // Silently handle fetch failures instead of throwing and crashing the sync loop
                        return;
                    }

                    if (isMounted && data) {
                        const isAlreadySaved = data.some(item => {
                            try {
                                const dbFilters = item?.filters;
                                if (!dbFilters || typeof dbFilters !== 'object') return false;
                                
                                const dbKeys = Object.keys(dbFilters);
                                const currentKeys = Object.keys(safeCurrentFilters);
                                if (dbKeys.length !== currentKeys.length) return false;
                                return currentKeys.every(key => dbFilters[key] === safeCurrentFilters[key]);
                            } catch (e) {
                                return false; // Ignore corrupted JSON records
                            }
                        });
                        setSaved(!!isAlreadySaved);
                    }
                }
            } catch (error) {
                // Completely swallow unhandled sync errors so it NEVER affects PropertiesClient rendering
            }
        }, 500); // 500ms debounce

        return () => {
            isMounted = false;
            clearTimeout(timer);
        };
    }, [currentFilters, supabase, user, userData, isLoading]);

    // Generate default name and filter list for preview
    const activeFilters = useMemo(() => {
        const filters: { label: string; value: string }[] = [];
        const region = searchParams.get("region");
        const area = searchParams.get("area");
        const price = searchParams.get("price");
        const type = searchParams.get("type");
        const propType = searchParams.get("property_type");
        const tagsParam = searchParams.get("tags");
        const bathtub = searchParams.get("bathtub");
        const pets = searchParams.get("pets");

        if (region) filters.push({ label: dict.labels.filters.region, value: region });
        if (area) filters.push({ label: dict.labels.filters.area, value: area });
        if (type && type !== "all") {
            const typeLabels: Record<string, string> = { 
                rent: dict.labels.rent, 
                sell: dict.labels.sell, 
                presale: dict.labels.presale 
            };
            filters.push({ label: dict.labels.filters.type, value: typeLabels[type] || type });
        }
        if (propType) {
            const propLabels: Record<string, string> = {
                Condo: dict.property.condo,
                House: dict.property.house,
                Townhouse: dict.property.townhouse,
                Commercial: dict.property.shop,
            };
            filters.push({ label: dict.labels.filters.property_type, value: propLabels[propType] || propType });
        }
        if (price) {
            const [min, max] = price.split("-");
            filters.push({ label: dict.labels.filters.price, value: `${Number(min).toLocaleString()}〜${Number(max).toLocaleString()} ฿` });
        }
        if (bathtub === "true") {
            filters.push({ label: dict.labels.filters.bathtub, value: dict.property.bathtub });
        }
        if (pets === "true") {
            filters.push({ label: dict.labels.filters.pets, value: dict.property.pets });
        }
        if (tagsParam) {
            tagsParam.split(",").filter(Boolean).forEach((tag) => {
                const display = dict.property.tags?.[tag] || tag;
                filters.push({ label: dict.labels.filters.tags, value: display });
            });
        }

        return filters;
    }, [searchParams, dict]);

    const defaultName = useMemo(() => {
        if (activeFilters.length === 0) return dict.labels.all;
        return activeFilters.map(f => f.value).join(" / ");
    }, [activeFilters, dict]);

    if (isRestricted || isLoading) return null;

    const handleOpenSheet = async () => {
        if (!user) {
            setIsLoginSheetOpen(true);
            return;
        }

        if (activeFilters.length === 0) {
            alert(dict.labels.no_results_desc);
            return;
        }

        if (saved) {
            return;
        }

        setSearchName(defaultName);
        setIsSheetOpen(true);
    };

    const handleSaveSearch = async () => {
        if (loading) return;
        setLoading(true);
        try {
            if (!user) return;

            // Final check to prevent race condition
            const { data: existing } = await supabase
                .from("saved_searches")
                .select("id, filters")
                .eq("user_id", user.id);

            const isDuplicate = existing?.some(item => {
                try {
                    const dbFilters = item?.filters;
                    if (!dbFilters || typeof dbFilters !== 'object') return false;
                    
                    const safeCurrentFilters = currentFilters || {};
                    const dbKeys = Object.keys(dbFilters);
                    const currentKeys = Object.keys(safeCurrentFilters);
                    if (dbKeys.length !== currentKeys.length) return false;
                    return currentKeys.every(key => dbFilters[key] === safeCurrentFilters[key]);
                } catch (e) {
                    return false;
                }
            });

            if (isDuplicate) {
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

        } catch (error) {
            console.error("Save search error:", error);
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
                <span>{saved ? dict.labels.saved_date : dict.auth.benefit_search_label}</span>
            </button>

            {/* Save Search Panel */}
            <Sheet
                isOpen={isSheetOpen}
                onClose={() => setIsSheetOpen(false)}
                title={dict.auth.benefit_search_label}
                description={dict.auth.benefit_search_desc}
            >
                <div className="space-y-8 pb-32">
                    {/* Filter Preview */}
                    <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100">
                        <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center">
                            <Search size={14} className="mr-2" />
                            {dict.property.active_filters_title}
                        </h4>
                        <div className="flex flex-wrap gap-2">
                            {activeFilters.length > 0 ? activeFilters.map((filter, i) => (
                                <div key={i} className="flex items-center bg-white px-3 py-2 rounded-xl border border-slate-200 shadow-sm">
                                    <span className="text-[10px] font-bold text-slate-400 mr-2">{filter.label}:</span>
                                    <span className="text-xs font-black text-navy-secondary">{filter.value}</span>
                                </div>
                            )) : (
                                <p className="text-xs text-slate-400 font-bold">{dict.labels.no_results}</p>
                            )}
                        </div>
                    </div>

                    {/* Name Input */}
                    <div className="space-y-3">
                        <label className="text-xs font-black text-navy-secondary uppercase tracking-widest ml-1">{dict.labels.name_label}</label>
                        <input
                            type="text"
                            suppressHydrationWarning
                            value={searchName}
                            onChange={(e) => setSearchName(e.target.value)}
                            placeholder={dict.header.search_placeholder}
                            className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold focus:ring-2 focus:ring-navy-primary focus:bg-white outline-none transition-all"
                        />
                    </div>

                    {/* Notification Toggle */}
                    <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
                        <Switch
                            checked={notificationsEnabled}
                            onCheckedChange={setNotificationsEnabled}
                            label={dict.labels.notifications_on}
                        />
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
                            <span>{dict.auth.benefit_search_label}</span>
                        </button>
                        <button
                            type="button"
                            onClick={() => setIsSheetOpen(false)}
                            className="w-full py-5 bg-white text-slate-400 border border-slate-100 rounded-2xl font-black text-sm hover:bg-slate-50 transition-all"
                        >
                            {dict.labels.back_to_top}
                        </button>
                    </div>
                </div>
            </Sheet>

            {/* Login Required Panel */}
            <Sheet
                isOpen={isLoginSheetOpen}
                onClose={() => setIsLoginSheetOpen(false)}
                title={dict.common.login}
            >
                <div className="text-center py-10">
                    <div className="w-24 h-24 bg-amber-50 rounded-full flex items-center justify-center mx-auto mb-8 text-amber-500">
                        <Info size={48} />
                    </div>
                    <p className="text-slate-600 font-bold text-lg mb-10 leading-relaxed">
                        {dict.auth.benefit_search_desc}
                    </p>
                    <div className="flex flex-col space-y-4">
                        <button
                            type="button"
                            onClick={() => router.push(`/${locale}/login`)}
                            className="w-full py-5 bg-navy-primary text-white rounded-2xl font-black text-sm hover:bg-navy-secondary transition-all shadow-xl shadow-navy-primary/20"
                        >
                            {dict.common.login}
                        </button>
                        <button
                            type="button"
                            onClick={() => setIsLoginSheetOpen(false)}
                            className="w-full py-5 bg-white text-slate-400 border border-slate-100 rounded-2xl font-black text-sm hover:bg-slate-50 transition-all"
                        >
                            {dict.labels.back_to_top}
                        </button>
                    </div>
                </div>
            </Sheet>
        </>
    );
}
