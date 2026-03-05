"use client";

import { motion } from "framer-motion";
import { Search, MapPin, ChevronRight, Trash2, Calendar, Bell } from "lucide-react";
import Link from "next/link";
import { useState, useMemo, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

interface SavedSearchesSectionProps {
    searches: any[];
}

export default function SavedSearchesSection({ searches: initialSearches }: SavedSearchesSectionProps) {
    const supabase = createClient();

    // Filter duplicates on the client side to ensure a clean display
    const uniqueSearches = useMemo(() => {
        if (!initialSearches) return [];
        const seen = new Set();
        return initialSearches.filter(search => {
            // Create a stable string representation of filters for comparison
            const filterString = JSON.stringify(
                Object.keys(search.filters).sort().reduce((obj: any, key: string) => {
                    obj[key] = search.filters[key];
                    return obj;
                }, {})
            );
            if (seen.has(filterString)) return false;
            seen.add(filterString);
            return true;
        });
    }, [initialSearches]);

    const [searches, setSearches] = useState(uniqueSearches);

    // Update internal state when initialSearches changes
    useEffect(() => {
        setSearches(uniqueSearches);
    }, [uniqueSearches]);

    const handleRemove = async (id: string) => {
        if (!confirm('この検索条件を削除しますか？')) return;

        const { error } = await supabase
            .from("saved_searches")
            .delete()
            .eq("id", id);

        if (!error) {
            setSearches(prev => prev.filter(s => s.id !== id));
        }
    };

    if (!searches || searches.length === 0) {
        return (
            <div className="p-20 text-center">
                <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6 text-slate-200">
                    <Search size={40} />
                </div>
                <p className="text-slate-500 font-bold mb-8">保存された検索条件はありません。</p>
                <Link href="/properties" className="text-navy-primary font-black hover:underline">
                    探しに行く →
                </Link>
            </div>
        );
    }

    return (
        <div className="p-8 space-y-4">
            {searches.map((search, idx) => {
                const queryParams = new URLSearchParams(search.filters).toString();
                return (
                    <motion.div
                        key={search.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: idx * 0.1 }}
                        className="group flex flex-col md:flex-row md:items-center justify-between p-6 bg-white rounded-3xl border border-slate-100 shadow-sm hover:shadow-xl hover:border-navy-primary/20 transition-all gap-4"
                    >
                        <div className="flex items-start space-x-6">
                            <div className="w-12 h-12 bg-navy-primary/5 rounded-2xl flex items-center justify-center shrink-0 text-navy-primary group-hover:bg-navy-primary group-hover:text-white transition-all">
                                <Search size={20} />
                            </div>
                            <div>
                                <h4 className="text-lg font-black text-navy-secondary mb-1">
                                    {search.name}
                                </h4>
                                <div className="flex flex-wrap gap-2">
                                    {Object.entries(search.filters).map(([key, value]: [string, any]) => (
                                        <span key={key} className="text-[10px] font-bold text-slate-500 bg-slate-50 px-2 py-0.5 rounded border border-slate-100">
                                            {key}: {String(value)}
                                        </span>
                                    ))}
                                </div>
                                <div className="flex items-center mt-3 space-x-4 text-[10px] font-bold text-slate-400">
                                    <div className="flex items-center">
                                        <Calendar size={12} className="mr-1" />
                                        保存日: {new Date(search.created_at).toLocaleDateString()}
                                    </div>
                                    {search.notifications_enabled && (
                                        <div className="flex items-center text-emerald-500 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100">
                                            <Bell size={10} className="mr-1" />
                                            通知 ON
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center space-x-3 ml-12 md:ml-0">
                            <button
                                onClick={() => handleRemove(search.id)}
                                className="p-3 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                                title="削除"
                            >
                                <Trash2 size={18} />
                            </button>
                            <Link
                                href={`/properties?${queryParams}`}
                                className="flex items-center space-x-2 bg-navy-primary/5 text-navy-primary px-6 py-3 rounded-xl font-black hover:bg-navy-primary hover:text-white transition-all group/btn"
                            >
                                <span>検索を実行</span>
                                <ChevronRight size={14} className="group-hover/btn:translate-x-1 transition-transform" />
                            </Link>
                        </div>
                    </motion.div>
                );
            })}
        </div>
    );
}
