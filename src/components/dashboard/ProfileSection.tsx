"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { User, Mail, Phone, Pencil } from "lucide-react";

interface ProfileSectionProps {
    user: any;
    profile: any;
    locale: string;
}

export default function ProfileSection({ user, profile, dict, locale }: ProfileSectionProps & { dict: any }) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-8 p-8"
        >
            <div className="flex flex-col md:flex-row items-center gap-10">
                <div className="w-32 h-32 bg-slate-100 rounded-3xl flex items-center justify-center border-4 border-white shadow-xl overflow-hidden shrink-0">
                    {profile?.avatar_url ? (
                        <img src={profile.avatar_url} alt={profile.full_name} className="w-full h-full object-cover" />
                    ) : (
                        <User className="w-16 h-16 text-slate-300" />
                    )}
                </div>
                <div className="text-center md:text-left">
                    <h2 className="text-3xl font-black text-navy-secondary mb-2">
                        {profile?.full_name || dict.labels.name_not_set}
                    </h2>
                    <p className="text-slate-400 font-bold uppercase tracking-widest text-xs mb-4">
                        {user?.email}
                    </p>
                    <div className="flex flex-col sm:flex-row flex-wrap justify-center md:justify-start gap-3">
                        <Link
                            href={`/${locale}/profile/edit`}
                            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-navy-primary text-white text-sm font-black shadow-md shadow-navy-primary/25 transition-colors hover:bg-navy-secondary"
                        >
                            <Pencil className="h-4 w-4 shrink-0 text-white" aria-hidden />
                            <span className="text-white">{dict.labels.edit_profile_cta}</span>
                        </Link>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-8 border-t border-slate-50">
                <InfoCard icon={Mail} label={dict.labels.email_label} value={user?.email} />
                <InfoCard icon={Phone} label={dict.labels.phone_label} value={profile?.phone || dict.labels.not_registered} />
            </div>
        </motion.div>
    );
}

function InfoCard({ icon: Icon, label, value }: { icon: any, label: string, value: string }) {
    return (
        <div className="flex items-center p-4 bg-white rounded-2xl border border-slate-100 shadow-sm">
            <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center mr-4 text-slate-400">
                <Icon size={18} />
            </div>
            <div>
                <dt className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{label}</dt>
                <dd className="text-sm font-bold text-navy-secondary">{value}</dd>
            </div>
        </div>
    );
}
