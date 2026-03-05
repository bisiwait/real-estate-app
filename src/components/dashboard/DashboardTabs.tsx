"use client";

import { motion } from "framer-motion";
import { User, Heart, Search, Settings } from "lucide-react";

interface DashboardTabsProps {
    activeTab: string;
    onTabChange: (tab: string) => void;
}

export default function DashboardTabs({ activeTab, onTabChange }: DashboardTabsProps) {
    const tabs = [
        { id: "profile", label: "プロフィール", icon: User },
        { id: "favorites", label: "お気に入り", icon: Heart },
        { id: "searches", label: "保存条件", icon: Search },
        { id: "settings", label: "設定", icon: Settings },
    ];

    return (
        <div className="flex bg-white/90 backdrop-blur-md p-1.5 rounded-2xl border border-slate-200 overflow-x-auto no-scrollbar scroll-smooth shadow-lg shadow-navy-primary/5">
            {tabs.map((tab) => (
                <button
                    key={tab.id}
                    onClick={() => onTabChange(tab.id)}
                    className={`relative flex items-center justify-center space-x-2 px-6 py-3 rounded-xl text-xs font-black transition-all shrink-0 ${activeTab === tab.id
                        ? "text-white"
                        : "text-slate-500 hover:text-navy-primary hover:bg-navy-primary/5"
                        }`}
                >
                    {activeTab === tab.id && (
                        <motion.div
                            layoutId="activeTab"
                            className="absolute inset-0 bg-navy-primary rounded-xl shadow-lg shadow-navy-primary/20"
                            transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                        />
                    )}
                    <tab.icon size={14} className="relative z-10" />
                    <span className="relative z-10">{tab.label}</span>
                </button>
            ))}
        </div>
    );
}
