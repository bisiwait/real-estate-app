"use client";

import { motion } from "framer-motion";
import { User, Heart, Search, Settings, type LucideIcon } from "lucide-react";

interface TabDef {
    id: string;
    label: string;
    labelMobile?: string;
    icon: LucideIcon;
}

interface DashboardTabsProps {
    activeTab: string;
    onTabChange: (tab: string) => void;
}

export default function DashboardTabs({ activeTab, onTabChange, dict }: DashboardTabsProps & { dict: any }) {
    const savedShort = dict.labels.saved_searches_tab_short ?? dict.labels.saved_searches;
    const tabs: TabDef[] = [
        { id: "profile", label: dict.labels.profile, icon: User },
        { id: "favorites", label: dict.labels.favorites, icon: Heart },
        { id: "searches", label: dict.labels.saved_searches, labelMobile: savedShort, icon: Search },
        { id: "settings", label: dict.common.settings, icon: Settings },
    ];

    return (
        <div className="grid w-full grid-cols-4 gap-1 rounded-2xl border border-slate-200 bg-white/90 p-1 shadow-lg shadow-navy-primary/5 backdrop-blur-md sm:gap-1.5 sm:p-1.5">
            {tabs.map((tab) => (
                <button
                    key={tab.id}
                    type="button"
                    onClick={() => onTabChange(tab.id)}
                    className={`relative flex min-w-0 flex-col items-center justify-center gap-0.5 rounded-xl px-1 py-2 text-center text-[10px] font-black leading-tight transition-all sm:flex-row sm:gap-2 sm:px-3 sm:py-3 sm:text-xs ${activeTab === tab.id
                        ? "text-white"
                        : "text-slate-500 hover:bg-navy-primary/5 hover:text-navy-primary"
                        }`}
                >
                    {activeTab === tab.id && (
                        <motion.div
                            layoutId="activeTab"
                            className="absolute inset-0 rounded-xl bg-navy-primary shadow-lg shadow-navy-primary/20"
                            transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                        />
                    )}
                    <tab.icon className="relative z-10 h-3.5 w-3.5 shrink-0 sm:h-3.5 sm:w-3.5" strokeWidth={2.25} aria-hidden />
                    <span className="relative z-10 w-full break-words [overflow-wrap:anywhere] sm:line-clamp-none">
                        {tab.labelMobile ? (
                            <>
                                <span className="line-clamp-2 sm:hidden">{tab.labelMobile}</span>
                                <span className="hidden sm:inline">{tab.label}</span>
                            </>
                        ) : (
                            <span className="line-clamp-2 sm:line-clamp-none">{tab.label}</span>
                        )}
                    </span>
                </button>
            ))}
        </div>
    );
}
