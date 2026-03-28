"use client";

import { motion, AnimatePresence } from "framer-motion";
import PropertyCard from "@/components/property/PropertyCard";
import { Heart, Search, Trash2, GitCompareArrows } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { clsx } from "clsx";

type FavoriteTab = "rent" | "sell" | "presale";

function favoriteListingCategory(p: any): FavoriteTab {
    if (p?.is_presale) return "presale";
    if (p?.is_for_rent && !p?.is_for_sale) return "rent";
    if (p?.is_for_sale && !p?.is_for_rent) return "sell";
    if (p?.is_for_rent) return "rent";
    if (p?.is_for_sale) return "sell";
    return "rent";
}

interface FavoritesSectionProps {
    favorites: any[];
}

export default function FavoritesSection({ favorites: initialFavorites, dict, locale }: FavoritesSectionProps & { dict: any, locale: string }) {
    const [favorites, setFavorites] = useState(initialFavorites);
    const [compareIds, setCompareIds] = useState<string[]>([]);
    const [activeTab, setActiveTab] = useState<FavoriteTab>("rent");
    const supabase = createClient();
    const router = useRouter();
    const cmp = dict.compare;

    const favoritesByTab = useMemo(() => {
        const rent: any[] = [];
        const sell: any[] = [];
        const presale: any[] = [];
        for (const p of favorites) {
            const c = favoriteListingCategory(p);
            if (c === "presale") presale.push(p);
            else if (c === "rent") rent.push(p);
            else sell.push(p);
        }
        return { rent, sell, presale };
    }, [favorites]);

    const tabList = favoritesByTab[activeTab];

    const favSig = useMemo(() => favorites.map((f: any) => f.id).sort().join("|"), [favorites]);

    useEffect(() => {
        if (favorites.length === 0) return;
        setActiveTab((current) => {
            const rent = favorites.filter((p) => favoriteListingCategory(p) === "rent");
            const sell = favorites.filter((p) => favoriteListingCategory(p) === "sell");
            const presale = favorites.filter((p) => favoriteListingCategory(p) === "presale");
            const by = { rent, sell, presale };
            if (by[current].length > 0) return current;
            if (rent.length) return "rent";
            if (sell.length) return "sell";
            if (presale.length) return "presale";
            return current;
        });
    }, [favSig, favorites]);

    const handleRemove = async (propertyId: string) => {
        if (!confirm(dict.labels.remove_confirm)) return;

        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { error } = await supabase
            .from("favorites")
            .delete()
            .eq("user_id", user.id)
            .eq("property_id", propertyId);

        if (!error) {
            setFavorites(prev => prev.filter(f => f.id !== propertyId));
            setCompareIds((prev) => prev.filter((id) => id !== propertyId));
        }
    };

    const toggleCompare = (id: string) => {
        setCompareIds((prev) => {
            if (prev.includes(id)) return prev.filter((x) => x !== id);
            if (prev.length >= 3) {
                toast.error(cmp.max_selected);
                return prev;
            }
            return [...prev, id];
        });
    };

    const goCompare = () => {
        if (compareIds.length === 0) {
            toast.message(cmp.select_at_least_one);
            return;
        }
        const slice = compareIds.slice(0, 3);
        try {
            localStorage.setItem("cc_compare_property_ids", JSON.stringify(slice));
        } catch {
            /* ignore */
        }
        router.push(`/${locale}/compare?ids=${slice.join(",")}`);
    };

    if (!favorites || favorites.length === 0) {
        return <EmptyState dict={dict} locale={locale} />;
    }

    const tabButtons: { id: FavoriteTab; label: string }[] = [
        { id: "rent", label: dict.labels.rent },
        { id: "sell", label: dict.labels.sell },
        { id: "presale", label: dict.labels.presale },
    ];

    return (
        <div className="p-8">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-6 p-4 md:p-5 rounded-2xl bg-slate-50 border border-slate-100">
                <p className="text-sm font-bold text-navy-secondary">{cmp.select_hint}</p>
                <button
                    type="button"
                    onClick={goCompare}
                    disabled={compareIds.length === 0}
                    className={clsx(
                        "inline-flex items-center justify-center gap-2 rounded-xl bg-navy-primary px-6 py-3.5 font-black text-white shadow-lg shadow-navy-primary/20 transition-all duration-100",
                        "hover:bg-navy-secondary hover:shadow-md",
                        "active:scale-[0.97] active:translate-y-px active:shadow-inner active:brightness-95",
                        "disabled:pointer-events-none disabled:opacity-40 disabled:active:scale-100 disabled:active:shadow-lg disabled:active:brightness-100"
                    )}
                >
                    <GitCompareArrows className="w-5 h-5" />
                    {cmp.compare_btn}
                    {compareIds.length > 0 ? (
                        <span className="text-xs font-black bg-white/20 px-2 py-0.5 rounded-md">{compareIds.length}/3</span>
                    ) : null}
                </button>
            </div>

            <div className="grid w-full grid-cols-3 gap-1 rounded-2xl border border-slate-200 bg-white/90 p-1 shadow-sm mb-8 sm:flex sm:w-fit sm:gap-2 sm:p-1.5">
                {tabButtons.map(({ id, label }) => {
                    const count = favoritesByTab[id].length;
                    const active = activeTab === id;
                    return (
                        <button
                            key={id}
                            type="button"
                            onClick={() => setActiveTab(id)}
                            className={clsx(
                                "flex min-w-0 w-full items-center justify-center gap-0.5 whitespace-nowrap rounded-xl px-1 py-2.5 text-center text-[11px] font-black transition-all sm:w-auto sm:flex-none sm:gap-0 sm:px-6 sm:text-sm",
                                active && id === "presale" && "bg-amber-500 text-white shadow-lg",
                                active && id !== "presale" && "bg-navy-primary text-white shadow-lg",
                                !active && id === "presale" && "text-slate-400 hover:text-amber-500 hover:bg-amber-50",
                                !active && id !== "presale" && "text-slate-400 hover:text-navy-primary hover:bg-slate-50"
                            )}
                        >
                            {label}
                            <span className={clsx("ml-1.5 tabular-nums opacity-80", active ? "text-white/90" : "")}>
                                ({count})
                            </span>
                        </button>
                    );
                })}
            </div>

            {tabList.length === 0 ? (
                <p className="text-center text-sm font-bold text-slate-500 py-16 rounded-2xl border border-dashed border-slate-200 bg-slate-50/50">
                    {dict.labels.favorites_tab_empty}
                </p>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
                    <AnimatePresence initial={false}>
                        {tabList.map((property) => (
                            <motion.div
                                key={property.id}
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                transition={{ duration: 0.15 }}
                                className="relative"
                            >
                                <PropertyCard
                                    property={property}
                                    dict={dict}
                                    hideFavoriteButton
                                    openDetailInNewTab
                                    imageOverlay={
                                        <label
                                            className="absolute bottom-3 left-3 z-20 flex cursor-pointer items-center gap-1.5 rounded-lg border border-slate-100 bg-white/95 px-2.5 py-1.5 shadow-md backdrop-blur-sm"
                                            onPointerDown={(e) => e.stopPropagation()}
                                            onClick={(e) => e.stopPropagation()}
                                        >
                                            <input
                                                type="checkbox"
                                                checked={compareIds.includes(property.id)}
                                                onChange={() => toggleCompare(property.id)}
                                                onClick={(e) => e.stopPropagation()}
                                                className="h-4 w-4 rounded border-slate-300 text-navy-primary focus:ring-navy-primary"
                                            />
                                            <span className="text-[10px] font-black uppercase tracking-wide text-navy-secondary">
                                                {cmp.compare_toggle}
                                            </span>
                                        </label>
                                    }
                                />
                                <button
                                    type="button"
                                    onClick={(e) => {
                                        e.preventDefault();
                                        handleRemove(property.id);
                                    }}
                                    className="absolute top-4 right-4 z-30 p-2 bg-white/90 backdrop-blur-sm text-slate-400 hover:text-red-500 rounded-full shadow-lg transition-all"
                                >
                                    <Trash2 size={16} />
                                </button>
                            </motion.div>
                        ))}
                    </AnimatePresence>
                </div>
            )}
        </div>
    );
}

function EmptyState({ dict, locale }: { dict: any, locale: string }) {
    return (
        <div className="p-20 text-center">
            <div className="w-24 h-24 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-8">
                <Heart className="w-12 h-12 text-red-200" />
            </div>
            <h3 className="text-2xl font-black text-navy-secondary mb-4">{dict.labels.no_favorites}</h3>
            <p className="text-slate-500 mb-10 text-lg">
                {dict.labels.no_favorites_desc}
            </p>
            <Link
                href={`/${locale}/properties`}
                className="inline-flex items-center bg-navy-primary text-white px-10 py-4 rounded-2xl font-black hover:bg-navy-secondary transition-all shadow-xl shadow-navy-primary/20"
            >
                <Search className="w-5 h-5 mr-3" />
                {dict.labels.go_find_properties}
            </Link>
        </div>
    );
}
