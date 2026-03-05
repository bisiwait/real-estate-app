"use client";

import { motion } from "framer-motion";
import { User, Mail, Phone, MessageSquare, Globe, Building2, Trash2 } from "lucide-react";

interface ProfileSectionProps {
    user: any;
    profile: any;
}

export default function ProfileSection({ user, profile }: ProfileSectionProps) {
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
                        {profile?.full_name || "お名前未設定"}
                    </h2>
                    <p className="text-slate-400 font-bold uppercase tracking-widest text-xs mb-4">
                        {user?.email}
                    </p>
                    <div className="flex flex-wrap justify-center md:justify-start gap-4">
                        {profile?.line_id && (
                            <span className="px-3 py-1 bg-green-50 text-green-600 text-[10px] font-black rounded-full border border-green-100">
                                LINE 連携済み
                            </span>
                        )}
                        <span className="px-3 py-1 bg-navy-primary/5 text-navy-primary text-[10px] font-black rounded-full border border-navy-primary/10">
                            一般会員
                        </span>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-8 border-t border-slate-50">
                <InfoCard icon={Mail} label="メールアドレス" value={user?.email} />
                <InfoCard icon={Phone} label="電話番号" value={profile?.phone || "未登録"} />
                <InfoCard icon={MessageSquare} label="LINE ID" value={profile?.line_id || "未登録"} />
                <InfoCard icon={Building2} label="会社名" value={profile?.company_name || "未登録"} />
            </div>

            <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100">
                <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center">
                    <Globe size={12} className="mr-2" />
                    自己紹介 / 自己PR
                </h3>
                <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-wrap">
                    {profile?.bio || "自己紹介が登録されていません。設定＞プロフィール編集から登録可能です。"}
                </p>
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
