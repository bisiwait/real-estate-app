"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { Heart, AlertCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";

interface FavoriteButtonProps {
    propertyId: string;
    initialIsFavorite?: boolean;
    /** 未ログイン時トースト（locale の辞書から渡す） */
    loginRequiredMessage: string;
    favoriteAddAria: string;
    favoriteRemoveAria: string;
}

export default function FavoriteButton({
    propertyId,
    initialIsFavorite = false,
    loginRequiredMessage,
    favoriteAddAria,
    favoriteRemoveAria,
}: FavoriteButtonProps) {
    const [isFavorite, setIsFavorite] = useState(initialIsFavorite);
    const [loading, setLoading] = useState(false);
    const [isRestricted, setIsRestricted] = useState(false);
    const [showToast, setShowToast] = useState(false);
    const supabase = createClient();
    const { user, userData, isLoading } = useAuth();

    useEffect(() => {
        async function checkStatus() {
            if (!user) return;

            // Check if user is restricted (Admin or Agent)
            if (userData.role === 'admin' || userData.role === 'agent') {
                setIsRestricted(true);
                return;
            }

            const { data } = await supabase
                .from("favorites")
                .select("id")
                .eq("user_id", user.id)
                .eq("property_id", propertyId)
                .single();

            if (data) setIsFavorite(true);
        }

        if (!isLoading) {
            checkStatus();
        }
    }, [propertyId, supabase, initialIsFavorite, user, userData, isLoading]);

    if (isRestricted || isLoading) return null;

    const toggleFavorite = async (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();

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
                aria-label={isFavorite ? favoriteRemoveAria : favoriteAddAria}
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
                        className="fixed bottom-24 left-1/2 z-[200] flex max-w-[min(22rem,calc(100vw-2rem))] items-center bg-navy-secondary text-white px-6 py-3 rounded-2xl shadow-2xl border border-white/10"
                    >
                        <AlertCircle className="w-4 h-4 mr-3 shrink-0 text-amber-400" />
                        <span className="text-xs font-bold text-left">{loginRequiredMessage}</span>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
