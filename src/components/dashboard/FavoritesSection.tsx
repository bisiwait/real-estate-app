"use client";

import { motion, AnimatePresence } from "framer-motion";
import PropertyCard from "@/components/property/PropertyCard";
import { Heart, Search, Trash2, GitCompareArrows } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";

interface FavoritesSectionProps {
    favorites: any[];
}

export default function FavoritesSection({ favorites: initialFavorites, dict, locale }: FavoritesSectionProps & { dict: any, locale: string }) {
    const [favorites, setFavorites] = useState(initialFavorites);
    const [compareIds, setCompareIds] = useState<string[]>([]);
    const supabase = createClient();
    const router = useRouter();
    const cmp = dict.compare;

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

    return (
        <div className="p-8">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-8 p-4 md:p-5 rounded-2xl bg-slate-50 border border-slate-100">
                <p className="text-sm font-bold text-navy-secondary">{cmp.select_hint}</p>
                <button
                    type="button"
                    onClick={goCompare}
                    disabled={compareIds.length === 0}
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-navy-primary text-white font-black px-6 py-3.5 shadow-lg shadow-navy-primary/20 hover:bg-navy-secondary transition-colors disabled:opacity-40 disabled:pointer-events-none"
                >
                    <GitCompareArrows className="w-5 h-5" />
                    {cmp.compare_btn}
                    {compareIds.length > 0 ? (
                        <span className="text-xs font-black bg-white/20 px-2 py-0.5 rounded-md">{compareIds.length}/3</span>
                    ) : null}
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
                <AnimatePresence>
                    {favorites.map((property) => (
                        <motion.div
                            key={property.id}
                            layout
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.9 }}
                            className="relative"
                        >
                            <label className="absolute bottom-16 left-4 z-30 flex cursor-pointer items-center gap-2 rounded-lg bg-white/95 px-3 py-2 shadow-md border border-slate-100 backdrop-blur-sm md:bottom-[4.5rem]">
                                <input
                                    type="checkbox"
                                    checked={compareIds.includes(property.id)}
                                    onChange={() => toggleCompare(property.id)}
                                    className="h-4 w-4 rounded border-slate-300 text-navy-primary focus:ring-navy-primary"
                                />
                                <span className="text-[10px] font-black uppercase tracking-wide text-navy-secondary">
                                    {cmp.compare_toggle}
                                </span>
                            </label>
                            <PropertyCard property={property} dict={dict} />
                            {/* Overlaid remove button for Dashboard view specifically */}
                            <button
                                onClick={(e) => {
                                    e.preventDefault();
                                    handleRemove(property.id);
                                }}
                                className="absolute top-4 right-14 z-30 p-2 bg-white/90 backdrop-blur-sm text-slate-400 hover:text-red-500 rounded-full shadow-lg transition-all"
                            >
                                <Trash2 size={16} />
                            </button>
                        </motion.div>
                    ))}
                </AnimatePresence>
            </div>
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
