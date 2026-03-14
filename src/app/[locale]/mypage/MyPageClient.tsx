"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter, useSearchParams } from "next/navigation";
import { LayoutDashboard, LogOut, ChevronLeft, Loader2, Settings as SettingsIcon, ChevronRight, User, Heart, MessageSquare, Building2, Globe, Mail, Phone, Trash2, Calendar, Bell, Search } from "lucide-react";
import Link from "next/link";
import DashboardTabs from "@/components/dashboard/DashboardTabs";
import ProfileSection from "@/components/dashboard/ProfileSection";
import FavoritesSection from "@/components/dashboard/FavoritesSection";
import SavedSearchesSection from "@/components/dashboard/SavedSearchesSection";
import { motion, AnimatePresence } from "framer-motion";

export default function MyPageClient({ dict, locale }: { dict: any, locale: string }) {
    const [activeTab, setActiveTab] = useState("profile");
    const [user, setUser] = useState<any>(null);
    const [profile, setProfile] = useState<any>(null);
    const [favorites, setFavorites] = useState<any[]>([]);
    const [searches, setSearches] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const supabase = createClient();
    const router = useRouter();
    const searchParams = useSearchParams();

    useEffect(() => {
        const tab = searchParams.get("tab");
        if (tab) setActiveTab(tab);
    }, [searchParams]);

    useEffect(() => {
        async function fetchData() {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                router.push(`/${locale}/login`);
                return;
            }
            setUser(user);

            // Parallel data fetching
            const [profileRes, favoritesRes, searchesRes] = await Promise.all([
                supabase.from("profiles").select("*").eq("id", user.id).single(),
                supabase.from("favorites").select("*, properties(*, areas(name))").eq("user_id", user.id),
                supabase.from("saved_searches").select("*").eq("user_id", user.id).order("created_at", { ascending: false })
            ]);

            if (profileRes.data) {
                const profile = profileRes.data;
                setProfile(profile);

                // Redirect Admins and Agents to dashboard
                const isAgent = profile.user_role === 'agent' || profile.user_role === 'admin' || profile.is_admin;
                if (isAgent) {
                    router.push(`/${locale}/dashboard`);
                    return;
                }
            }

            if (favoritesRes.data) {
                // Flatten the data for easier use in PropertyCard
                const betterFlattened = favoritesRes.data
                    .filter(f => f.properties)
                    .map(f => {
                        const p = Array.isArray(f.properties) ? f.properties[0] : f.properties;
                        return { ...p, is_favorite: true };
                    });
                setFavorites(betterFlattened);
            }

            if (searchesRes.data) setSearches(searchesRes.data);

            setLoading(false);
        }

        fetchData();
    }, [supabase, router, locale]);

    const handleLogout = async () => {
        await supabase.auth.signOut();
        router.push(`/${locale}`);
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
                <Loader2 className="w-10 h-10 text-navy-primary animate-spin mb-6" />
                <p className="text-slate-400 font-black uppercase tracking-widest text-xs">{dict.labels.loading}</p>
            </div>
        );
    }

    return (
        <div className="bg-slate-50 min-h-screen">
            {/* Dynamic Header Background */}
            <div className="bg-navy-secondary h-48 md:h-64 relative overflow-hidden">
                <div className="absolute inset-0 opacity-10">
                    <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_20%_30%,#ffffff_0%,transparent_50%)]" />
                </div>
                <div className="container mx-auto px-4 pt-10 relative z-10">
                    <Link href={`/${locale}`} className="inline-flex items-center text-white/80 hover:text-white mb-8 transition-all hover:-translate-x-1 underline-offset-4 hover:underline text-sm font-bold">
                        <ChevronLeft size={16} className="mr-1" />
                        {dict.labels.back_to_top}
                    </Link>
                    <div className="flex items-center space-x-4">
                        <div className="w-12 h-12 bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 flex items-center justify-center">
                            <LayoutDashboard className="text-white w-6 h-6" />
                        </div>
                        <div>
                            <h1 className="text-3xl font-black text-white tracking-tight">{dict.labels.mypage}</h1>
                            <p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.2em] mt-1">{dict.common.dashboard}</p>
                        </div>
                    </div>
                </div>
            </div>

            <div className="container mx-auto px-4 -mt-16 pb-24">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                    {/* Sidebar / Top Nav for Mobile */}
                    <div className="lg:col-span-12">
                        <DashboardTabs activeTab={activeTab} onTabChange={setActiveTab} dict={dict} />
                    </div>

                    {/* Main Content Card */}
                    <div className="lg:col-span-12 bg-white rounded-[32px] shadow-2xl shadow-navy-primary/5 border border-slate-100 overflow-hidden min-h-[600px]">
                        {activeTab === "profile" && <ProfileSection user={user} profile={profile} dict={dict} />}
                        {activeTab === "favorites" && <FavoritesSection favorites={favorites} dict={dict} locale={locale} />}
                        {activeTab === "searches" && <SavedSearchesSection searches={searches} dict={dict} locale={locale} />}
                        {activeTab === "settings" && <SettingsSection handleLogout={handleLogout} dict={dict} locale={locale} />}
                    </div>
                </div>
            </div>
        </div>
    );
}

function SettingsSection({ handleLogout, dict, locale }: { handleLogout: () => void, dict: any, locale: string }) {
    return (
        <div className="p-12 max-w-2xl mx-auto space-y-10">
            <div className="text-center mb-12">
                <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6 text-navy-primary">
                    <SettingsIcon size={32} />
                </div>
                <h3 className="text-2xl font-black text-navy-secondary">{dict.labels.settings}</h3>
                <p className="text-slate-400 font-bold mt-2">{dict.labels.notification_settings}</p>
            </div>

            <div className="space-y-4">
                <SettingsLink label={dict.labels.edit_profile} href={`/${locale}/dashboard/settings`} />
                <SettingsLink label={dict.labels.change_email_pass} href={`/${locale}/dashboard/settings`} />
                <SettingsLink label={dict.labels.notification_settings} href="#" />
            </div>

            <div className="pt-10 border-t border-slate-100">
                <button
                    onClick={handleLogout}
                    className="w-full flex items-center justify-center space-x-3 bg-red-50 text-red-500 py-5 rounded-3xl font-black hover:bg-red-500 hover:text-white transition-all group"
                >
                    <LogOut size={20} className="group-hover:-translate-x-1 transition-transform" />
                    <span>{dict.labels.logout}</span>
                </button>
            </div>
        </div>
    );
}

function SettingsLink({ label, href }: { label: string, href: string }) {
    return (
        <Link
            href={href}
            className="flex items-center justify-between p-6 bg-slate-50 rounded-2xl hover:bg-navy-primary/5 hover:border-navy-primary/20 border border-transparent transition-all group"
        >
            <span className="font-bold text-navy-secondary">{label}</span>
            <ChevronRight size={18} className="text-slate-300 group-hover:text-navy-primary group-hover:translate-x-1 transition-all" />
        </Link>
    );
}
