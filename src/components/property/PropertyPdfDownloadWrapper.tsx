'use client';

import dynamic from 'next/dynamic';
import Link from 'next/link';
import { Lock, UserPlus, Crown, ArrowRight } from 'lucide-react';
import { isPremium } from '@/lib/utils/plan';

const PropertyPdfDownload = dynamic(
    () => import('./PropertyPdfDownload'),
    {
        loading: () => <div className="h-10 w-full bg-slate-100 animate-pulse rounded-xl" />,
        ssr: false
    }
);

interface WrapperProps {
    property: any;
    agent: any;
    dict: any;
    currentUser: any;
    currentUserProfile: any;
    locale: string;
}

export default function PropertyPdfDownloadWrapper({
    property,
    agent,
    dict,
    currentUser,
    currentUserProfile,
    locale
}: WrapperProps) {
    // Only allow the owner of the property or an admin to see the download section
    const isOwner = currentUser?.id === property.user_id;
    const isAdmin = currentUserProfile?.role === 'admin';

    if (!isOwner && !isAdmin) {
        return null;
    }

    const hasPremium = isPremium(currentUserProfile);

    // If owner but not premium, show upsell
    if (isOwner && !hasPremium && !isAdmin) {
        return (
            <div className="mt-6 p-6 bg-gradient-to-br from-amber-50 to-orange-50 rounded-2xl border border-amber-100 flex flex-col items-center text-center gap-3 shadow-sm">
                <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-sm text-amber-500">
                    <Crown className="w-5 h-5" />
                </div>
                <div>
                    <h4 className="text-sm font-bold text-amber-900 mb-1">
                        プレミアム機能
                    </h4>
                    <p className="text-[10px] text-amber-700 leading-relaxed px-4">
                        プレミアム会員限定で、この物件の<br />
                        高品質なPDFチラシを作成・保存できます。
                    </p>
                </div>
                <Link
                    href={`/${locale}/pricing`}
                    className="mt-2 w-full bg-amber-500 hover:bg-amber-600 text-white py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all shadow-md active:scale-95"
                >
                    プランを確認する
                    <ArrowRight className="w-3.5 h-3.5" />
                </Link>
            </div>
        );
    }

    return (
        <PropertyPdfDownload
            property={property}
            agent={agent}
            dict={dict}
        />
    );
}
