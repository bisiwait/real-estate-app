"use client";

import { motion, AnimatePresence } from "framer-motion";
import PropertyCard from "@/components/property/PropertyCard";
import { Heart, Search, Trash2 } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

interface FavoritesSectionProps {
    favorites: any[];
}

export default function FavoritesSection({ favorites: initialFavorites, dict, locale }: FavoritesSectionProps & { dict: any, locale: string }) {
    const [favorites, setFavorites] = useState(initialFavorites);
    const supabase = createClient();

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
        }
    };

    if (!favorites || favorites.length === 0) {
        return <EmptyState dict={dict} locale={locale} />;
    }

    return (
        <div className="p-8">
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
