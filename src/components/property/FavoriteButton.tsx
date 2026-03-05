"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { Heart, AlertCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface FavoriteButtonProps {
    propertyId: string;
    initialIsFavorite?: boolean;
}

export default function FavoriteButton({
    propertyId,
    initialIsFavorite = false,
}: FavoriteButtonProps) {
    const [isFavorite, setIsFavorite] = useState(initialIsFavorite);
    const [loading, setLoading] = useState(false);
    const [isRestricted, setIsRestricted] = useState(false);
    const [showToast, setShowToast] = useState(false);
    const supabase = createClient();

    useEffect(() => {
        async function checkStatus() {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            // Check if user is restricted (Admin or Agent)
            const { data: profile } = await supabase
                .from("profiles")
                .select("user_role, is_admin, available_credits")
                .eq("id", user.id)
                .single();

            if (profile) {
                const isAdmin = profile.is_admin === true || profile.user_role === 'admin';
                const hasCredits = (profile.available_credits || 0) > 0;
                const isAgent = profile.user_role === 'agent' || hasCredits || (profile.user_role === undefined && !isAdmin);

                if (isAdmin || isAgent) {
                    setIsRestricted(true);
                    return;
                }
            }

            const { data } = await supabase
                .from("favorites")
                .select("id")
                .eq("user_id", user.id)
                .eq("property_id", propertyId)
                .single();

            if (data) setIsFavorite(true);
        }

        checkStatus();
    }, [propertyId, supabase, initialIsFavorite]);

    if (isRestricted) return null;

    const toggleFavorite = async (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();

        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            setShowToast(true);
            setTimeout(() => setShowToast(false), 3000);
            return;
        }

        setLoading(true);
        try {
            if (isFavorite) {
                const { error } = await supabase
                    .from("favorites")
                    .delete()
                    .eq("user_id", user.id)
                    .eq("property_id", propertyId);

                if (!error) setIsFavorite(false);
            } else {
                const { error } = await supabase
                    .from("favorites")
                    .insert({
                        user_id: user.id,
                        property_id: propertyId,
                    });

                if (!error) setIsFavorite(true);
            }
        } catch (error) {
            console.error("Favorite toggle error:", error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="relative">
            <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={toggleFavorite}
                disabled={loading}
                className={`p-2 rounded-full transition-all duration-300 shadow-md backdrop-blur-sm ${isFavorite
                    ? "bg-red-500 text-white"
                    : "bg-white/90 text-slate-400 hover:text-red-500"
                    }`}
                aria-label={isFavorite ? "お気に入りから削除" : "お気に入りに追加"}
            >
                <motion.div
                    animate={isFavorite ? { scale: [1, 1.3, 1] } : {}}
                    transition={{ duration: 0.3 }}
                >
                    <Heart
                        size={20}
                        fill={isFavorite ? "currentColor" : "none"}
                        className={loading ? "animate-pulse" : ""}
                    />
                </motion.div>
            </motion.button>

            <AnimatePresence>
                {showToast && (
                    <motion.div
                        initial={{ opacity: 0, y: 10, x: "-50%" }}
                        animate={{ opacity: 1, y: 0, x: "-50%" }}
                        exit={{ opacity: 0, y: 10, x: "-50%" }}
                        className="fixed bottom-24 left-1/2 z-[200] flex items-center bg-navy-secondary text-white px-6 py-3 rounded-2xl shadow-2xl whitespace-nowrap border border-white/10"
                    >
                        <AlertCircle className="w-4 h-4 mr-3 text-amber-400" />
                        <span className="text-xs font-bold">お気に入り機能を利用するにはログインが必要です</span>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
