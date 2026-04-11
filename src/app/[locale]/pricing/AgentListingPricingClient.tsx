"use client";

import React, { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
    Crown,
    Check,
    Zap,
    Building2,
    Sparkles,
    FileText,
    ArrowRight,
    Search,
    ChevronDown,
    ChevronUp,
    HelpCircle,
    X,
    Loader2,
    MessageCircle,
    Globe2,
    Smartphone,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { addDays } from "date-fns";
import Switch from "@/components/ui/Switch";
import { isPremiumActive } from "@/lib/utils/plan";

const STRIPE_PRICE_ID_MONTHLY = process.env.NEXT_PUBLIC_STRIPE_PRICE_ID_MONTHLY ?? "";
const STRIPE_PRICE_ID_YEARLY = process.env.NEXT_PUBLIC_STRIPE_PRICE_ID_YEARLY ?? "";

function stripePriceIdsReady() {
    return (
        typeof STRIPE_PRICE_ID_MONTHLY === "string" &&
        STRIPE_PRICE_ID_MONTHLY.trim().length > 0 &&
        typeof STRIPE_PRICE_ID_YEARLY === "string" &&
        STRIPE_PRICE_ID_YEARLY.trim().length > 0
    );
}

type Dict = { agent_plan: Record<string, string> };

function localeToDateLocale(locale: string) {
    if (locale === "jp") return "ja-JP";
    if (locale === "th") return "th-TH";
    return "en-US";
}

export default function AgentListingPricingClient({
    dict,
    locale,
    stripeCheckoutReady: stripeFromServer,
}: {
    dict: Dict;
    locale: string;
    /** サーバーで STRIPE_PRICE_ID_* を読んだ結果（Vercel 本番向け） */
    stripeCheckoutReady?: boolean;
}) {
    const p = dict.agent_plan;
    const router = useRouter();
    const supabase = createClient();

    const [loading, setLoading] = useState(false);
    const [user, setUser] = useState<{ id: string } | null>(null);
    const [isAgent, setIsAgent] = useState(false);
    const [isAnnual, setIsAnnual] = useState(false);
    const [isConfirmOpen, setIsConfirmOpen] = useState(false);
    const [confirmError, setConfirmError] = useState<string | null>(null);
    const [authResolved, setAuthResolved] = useState(false);
    const [planProfile, setPlanProfile] = useState<{
        plan?: string | null;
        plan_type?: string | null;
        current_period_end?: string | null;
        stripe_trial_consumed_at?: string | null;
        is_admin?: boolean | null;
    } | null>(null);

    const isPremium = isPremiumActive(planProfile);
    const trialConsumed = Boolean(planProfile?.stripe_trial_consumed_at);

    const stripeCheckoutReady = Boolean(stripeFromServer) || stripePriceIdsReady();
    const trialDisabledForUser = authResolved && !!user && (!stripeCheckoutReady || isPremium);

    const ctaProLabel =
        trialDisabledForUser ? (isPremium ? p.trial_disabled_premium : p.trial_disabled_stripe) : trialConsumed ? p.subscribe_pro_btn : p.trial_btn;

    const showTrialBillingInModal =
        authResolved &&
        !!user &&
        !trialConsumed &&
        !isPremium &&
        stripeCheckoutReady &&
        !trialDisabledForUser;
    const showPayImmediateInModal =
        authResolved &&
        !!user &&
        trialConsumed &&
        !isPremium &&
        stripeCheckoutReady &&
        !trialDisabledForUser;

    const pricingPath = `/${locale}/pricing`;
    const signupWithReturn = `/${locale}/agent/signup?redirect=${encodeURIComponent(pricingPath)}`;
    const loginWithReturn = `/${locale}/login?redirect=${encodeURIComponent(pricingPath)}`;

    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                const { data: { user: u } } = await supabase.auth.getUser();
                if (cancelled) return;
                if (!u) {
                    setUser(null);
                    setIsAgent(false);
                    setPlanProfile(null);
                    return;
                }
                setUser({ id: u.id });
                const { data: profile } = await supabase
                    .from("profiles")
                    .select("user_role, is_admin, plan_type, plan, current_period_end, stripe_trial_consumed_at")
                    .eq("id", u.id)
                    .maybeSingle();
                const agent =
                    profile?.user_role === "agent" ||
                    profile?.user_role === "admin" ||
                    profile?.is_admin === true;
                setIsAgent(!!agent);
                setPlanProfile(profile ?? null);
            } finally {
                if (!cancelled) setAuthResolved(true);
            }
        })();
        return () => {
            cancelled = true;
        };
    }, [supabase]);

    const billingStartDate = addDays(new Date(), 30);
    const billingStartDateLabel = billingStartDate.toLocaleDateString(localeToDateLocale(locale), {
        year: "numeric",
        month: "long",
        day: "numeric",
    });

    const premiumPriceLabel = isAnnual
        ? `${p.plan_pro_price_year} ${p.plan_pro_currency} ${p.plan_pro_per_year}`
        : `${p.plan_pro_price_month} ${p.plan_pro_currency} ${p.plan_pro_per_month}`;

    const trialBillingNote = p.trial_note_billing.replace("{date}", billingStartDateLabel);

    const scrollToPlanCompare = useCallback(() => {
        document.getElementById("plan-compare")?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, []);

    const openConfirm = () => {
        setConfirmError(null);
        setIsConfirmOpen(true);
    };

    const closeConfirm = () => {
        setConfirmError(null);
        setIsConfirmOpen(false);
    };

    const handleCheckout = async () => {
        if (!user) {
            closeConfirm();
            router.push(signupWithReturn);
            return;
        }

        setLoading(true);
        setConfirmError(null);
        try {
            const res = await fetch("/api/checkout", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    billingInterval: isAnnual ? "year" : "month",
                }),
            });

            const data = (await res.json()) as { url?: string; error?: string };

            if (!res.ok) {
                throw new Error(data.error || `Request failed (${res.status})`);
            }
            if (!data.url) {
                throw new Error(data.error || p.error_checkout);
            }

            window.location.href = data.url;
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : p.error_checkout;
            setConfirmError(msg);
        } finally {
            setLoading(false);
        }
    };

    const handleConfirmCheckout = () => {
        if (trialDisabledForUser) return;
        handleCheckout();
    };

    const reasons = [
        {
            icon: MessageCircle,
            title: p.reason_1_title,
            desc: p.reason_1_desc,
            accent: "bg-navy-primary",
        },
        {
            icon: Globe2,
            title: p.reason_2_title,
            desc: p.reason_2_desc,
            accent: "bg-slate-600",
        },
        {
            icon: Smartphone,
            title: p.reason_3_title,
            desc: p.reason_3_desc,
            accent: "bg-emerald-600",
        },
    ] as const;

    const proHighlights = [
        { icon: Building2, title: p.pro_benefit_presale_title, desc: p.pro_benefit_presale_desc },
        { icon: Sparkles, title: p.pro_benefit_ai_title, desc: p.pro_benefit_ai_desc },
        { icon: FileText, title: p.pro_benefit_pdf_title, desc: p.pro_benefit_pdf_desc },
        { icon: Search, title: p.pro_benefit_search_title, desc: p.pro_benefit_search_desc },
    ];

    return (
        <div className="min-h-screen overflow-x-hidden bg-slate-50 pb-24 font-sans text-slate-900">
            <style jsx global>{`
                @keyframes agent-plan-shimmer {
                    0% { transform: translateX(-100%); }
                    100% { transform: translateX(100%); }
                }
                .agent-plan-shimmer {
                    position: relative;
                    overflow: hidden;
                }
                .agent-plan-shimmer::after {
                    content: "";
                    position: absolute;
                    inset: 0;
                    background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.45), transparent);
                    animation: agent-plan-shimmer 2.2s infinite;
                }
            `}</style>

            {/* Hero */}
            <section className="relative border-b border-slate-200/80 bg-gradient-to-b from-white via-slate-50 to-slate-50">
                <div className="container relative z-10 mx-auto px-4 pb-14 pt-20 md:pt-24">
                    <div className="mx-auto max-w-4xl text-center">
                        <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-black uppercase tracking-[0.2em] text-navy-secondary shadow-sm">
                            <Building2 className="h-4 w-4 text-navy-primary" />
                            {p.hero_badge}
                        </div>
                        <h1 className="text-3xl font-black leading-tight tracking-tight text-navy-secondary md:text-5xl lg:text-6xl">
                            {p.hero_title}
                        </h1>
                        <p className="mx-auto mt-6 max-w-3xl text-base font-medium leading-relaxed text-slate-600 md:text-xl">
                            {p.hero_subtitle}
                        </p>
                        <p className="mx-auto mt-4 max-w-2xl text-sm font-medium leading-relaxed text-slate-500 md:text-base">
                            {p.partner_intro}
                        </p>

                        <div className="mt-10 flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:items-center">
                            {isAgent ? (
                                <Link
                                    href={`/${locale}/dashboard`}
                                    className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-navy-primary px-8 py-4 text-lg font-black text-white shadow-lg shadow-navy-primary/20 transition-all hover:bg-navy-secondary sm:w-auto"
                                >
                                    {p.cta_dashboard}
                                    <ArrowRight className="h-5 w-5" />
                                </Link>
                            ) : (
                                <>
                                    <Link
                                        href={signupWithReturn}
                                        className="agent-plan-shimmer inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-navy-primary px-8 py-4 text-lg font-black text-white shadow-lg shadow-navy-primary/20 transition-all hover:bg-navy-secondary sm:w-auto"
                                    >
                                        {p.cta_register_free}
                                        <ArrowRight className="h-5 w-5" />
                                    </Link>
                                    <Link
                                        href={`/${locale}/login?redirect=${encodeURIComponent(`/${locale}/pricing`)}`}
                                        className="inline-flex w-full items-center justify-center rounded-2xl border border-slate-200 bg-white px-8 py-4 text-lg font-black text-navy-secondary shadow-sm transition-all hover:bg-slate-50 sm:w-auto"
                                    >
                                        {p.cta_agent_login}
                                    </Link>
                                </>
                            )}
                        </div>

                        <button
                            type="button"
                            onClick={scrollToPlanCompare}
                            className="mx-auto mt-10 flex flex-col items-center gap-2 text-slate-400 transition-colors hover:text-navy-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-navy-primary/30 focus-visible:ring-offset-2 rounded-lg"
                            aria-label={p.compare_title}
                        >
                            <span className="text-[10px] font-bold uppercase tracking-widest">{p.scroll_hint}</span>
                            <ChevronDown className="h-5 w-5" aria-hidden />
                        </button>
                    </div>
                </div>
            </section>

            {/* Reasons */}
            <section className="container mx-auto px-4 py-16 md:py-20">
                <h2 className="mb-12 text-center text-2xl font-black text-navy-secondary md:text-4xl">{p.reasons_title}</h2>
                <div className="mx-auto grid max-w-6xl grid-cols-1 gap-6 md:grid-cols-3 md:gap-8">
                    {reasons.map((r) => (
                        <div
                            key={r.title}
                            className="rounded-[28px] border border-slate-100 bg-white p-8 shadow-lg shadow-slate-200/40 transition-all hover:border-navy-primary/15"
                        >
                            <div
                                className={`${r.accent} mb-6 flex h-14 w-14 items-center justify-center rounded-2xl text-white shadow-md`}
                            >
                                <r.icon className="h-7 w-7" />
                            </div>
                            <h3 className="mb-3 text-xl font-black text-navy-secondary">{r.title}</h3>
                            <p className="text-sm font-medium leading-relaxed text-slate-600 md:text-base">{r.desc}</p>
                        </div>
                    ))}
                </div>
            </section>

            {/* Plans */}
            <section className="border-y border-slate-200/80 bg-white py-16 md:py-20">
                <div className="container mx-auto px-4">
                    <div className="mx-auto mb-10 max-w-3xl text-center">
                        <h2 className="text-2xl font-black text-navy-secondary md:text-4xl">{p.plans_section_title}</h2>
                        <p className="mt-4 text-sm font-medium text-slate-600 md:text-base">{p.plans_section_subtitle}</p>
                    </div>

                    {/* デスクトップ: プラン全体の上に表示。スマホは Pro カード内のみ */}
                    <div className="mx-auto mb-8 hidden max-w-6xl flex-col items-stretch justify-between gap-4 xl:flex xl:flex-row xl:items-center">
                        <div className="text-sm font-black text-navy-secondary">
                            {p.billing_label}
                            <span className="ml-2 font-bold text-slate-500">（{p.billing_monthly} / {p.billing_yearly}）</span>
                        </div>
                        <div className="flex w-full items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 shadow-sm sm:w-auto">
                            <span className={`text-sm font-black ${!isAnnual ? "text-navy-secondary" : "text-slate-500"}`}>
                                {p.billing_monthly}
                            </span>
                            <Switch checked={isAnnual} onCheckedChange={setIsAnnual} />
                            <span className={`text-sm font-black ${isAnnual ? "text-navy-secondary" : "text-slate-500"}`}>
                                {p.billing_yearly}
                                <span className="ml-2 inline-flex items-center rounded-full border border-navy-primary/20 bg-navy-primary/5 px-2 py-0.5 text-[10px] font-black uppercase tracking-widest text-navy-primary">
                                    {p.billing_yearly_badge}
                                </span>
                            </span>
                        </div>
                    </div>

                    <div className="mx-auto grid max-w-6xl grid-cols-1 gap-6 xl:grid-cols-3">
                        {/* Free */}
                        <div className="flex flex-col rounded-3xl border border-slate-200 bg-slate-50/50 p-8 shadow-md">
                            <div className="mb-8">
                                <h3 className="mb-2 text-xl font-black text-navy-secondary">{p.plan_free_name}</h3>
                                <p className="text-sm font-medium text-slate-600">{p.plan_free_tagline}</p>
                            </div>
                            <div className="mb-8 flex items-baseline gap-2">
                                <span className="text-5xl font-black text-navy-secondary">{p.plan_free_price}</span>
                                <span className="font-bold text-slate-500">（{p.plan_free_price_note}）</span>
                            </div>
                            <div className="mb-6 rounded-2xl border border-[#06C755]/25 bg-emerald-500/[0.08] p-4 shadow-sm">
                                <div className="flex gap-3">
                                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#06C755] text-white shadow-sm">
                                        <MessageCircle className="h-5 w-5" aria-hidden />
                                    </div>
                                    <div className="min-w-0">
                                        <h4 className="text-sm font-black text-navy-secondary">{p.free_benefit_line_title}</h4>
                                        <p className="mt-1 text-[12px] font-medium leading-relaxed text-slate-600 md:text-[13px]">
                                            {p.free_benefit_line_desc}
                                        </p>
                                    </div>
                                </div>
                            </div>
                            <div className="mb-10 flex-1 space-y-4">
                                <FeatureRow label={p.feat_unlimited_listings} value={p.feat_unlimited_listings_free} />
                                <FeatureRow label={p.feat_priority} value={p.feat_priority_free} muted />
                                <FeatureRow label={p.feat_inquiry} value={p.feat_included} />
                                <FeatureRow label={p.feat_profile} value={p.feat_included} />
                                <FeatureRow label={p.feat_line} value={p.feat_included} />
                                <FeatureRow label={p.feat_ai} value={p.feat_not_included} muted />
                                <FeatureRow label={p.feat_presale} value={p.feat_not_included} muted />
                                <FeatureRow label={p.feat_pdf} value={p.feat_not_included} muted />
                            </div>
                            {isAgent ? (
                                <div
                                    className="w-full cursor-default select-none rounded-2xl border border-slate-200 bg-slate-100 py-4 text-center text-sm font-black text-slate-500"
                                    role="status"
                                    aria-label={p.plan_cta_current}
                                >
                                    {p.plan_cta_current}
                                </div>
                            ) : (
                                <Link
                                    href={signupWithReturn}
                                    className="block w-full rounded-2xl border border-slate-200 bg-white py-4 text-center text-sm font-black text-navy-secondary shadow-sm transition-all hover:bg-slate-50 active:scale-[0.98]"
                                >
                                    {p.plan_cta_start_free}
                                </Link>
                            )}
                        </div>

                        {/* Pro */}
                        <div className="relative flex flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white p-8 shadow-lg xl:col-span-2">
                            <div className="absolute inset-x-0 top-0 h-1 bg-navy-primary" />
                            <div className="absolute right-6 top-6">
                                <span className="inline-flex items-center gap-1.5 rounded-full border border-navy-primary/20 bg-navy-primary/5 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-navy-primary">
                                    <Zap className="h-3.5 w-3.5" />
                                    Pro
                                </span>
                            </div>
                            <div className="mb-6">
                                <div className="mb-2 flex items-center gap-3">
                                    <h3 className="text-2xl font-black text-navy-secondary">{p.plan_pro_name}</h3>
                                    <Crown className="h-6 w-6 text-navy-primary" />
                                </div>
                                <p className="text-sm font-medium text-slate-600">{p.plan_pro_tagline}</p>
                            </div>
                            <div className="mb-4">
                                <div className="flex flex-wrap items-baseline gap-2">
                                    <span className="text-5xl font-black text-navy-secondary md:text-6xl">
                                        {isAnnual ? p.plan_pro_price_year : p.plan_pro_price_month}
                                    </span>
                                    <span className="text-xl font-black uppercase text-navy-secondary">{p.plan_pro_currency}</span>
                                    <span className="text-lg text-slate-500">{isAnnual ? p.plan_pro_per_year : p.plan_pro_per_month}</span>
                                </div>
                                <p className="mt-2 flex items-center gap-2 text-sm font-bold text-slate-600">
                                    <Zap className="h-4 w-4 text-navy-primary" />
                                    {p.plan_pro_roi_note}
                                </p>
                            </div>

                            <div className="mb-8 mt-2 rounded-2xl border border-slate-200 bg-slate-50/80 p-4 xl:hidden">
                                <div className="mb-3 text-xs font-black text-navy-secondary">
                                    {p.billing_label}
                                    <span className="ml-1.5 font-bold text-slate-500">（{p.billing_monthly} / {p.billing_yearly}）</span>
                                </div>
                                <div className="flex w-full items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-3 py-2.5 shadow-sm">
                                    <span className={`text-xs font-black ${!isAnnual ? "text-navy-secondary" : "text-slate-500"}`}>
                                        {p.billing_monthly}
                                    </span>
                                    <Switch checked={isAnnual} onCheckedChange={setIsAnnual} />
                                    <span className={`text-right text-xs font-black ${isAnnual ? "text-navy-secondary" : "text-slate-500"}`}>
                                        <span className="block sm:inline">{p.billing_yearly}</span>
                                        <span className="mt-0.5 inline-flex items-center rounded-full border border-navy-primary/20 bg-navy-primary/5 px-1.5 py-0.5 text-[9px] font-black uppercase tracking-widest text-navy-primary sm:ml-2">
                                            {p.billing_yearly_badge}
                                        </span>
                                    </span>
                                </div>
                            </div>

                            <div className="mb-10 mt-6 flex-1 space-y-5">
                                {proHighlights.map((h) => (
                                    <div key={h.title} className="flex gap-4">
                                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-navy-primary/15 bg-navy-primary/5 text-navy-primary shadow-sm">
                                            <h.icon className="h-4 w-4" />
                                        </div>
                                        <div>
                                            <h4 className="font-black text-navy-secondary">{h.title}</h4>
                                            <p className="mt-1 text-[13px] font-medium leading-relaxed text-slate-600">{h.desc}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                            {authResolved && user && trialConsumed && !isPremium && stripeCheckoutReady ? (
                                <div className="mb-4 rounded-2xl border border-amber-200 bg-amber-50/90 p-3 text-[11px] font-medium leading-relaxed text-amber-950">
                                    {p.trial_consumed_banner}
                                </div>
                            ) : null}
                            <button
                                type="button"
                                onClick={openConfirm}
                                disabled={loading || trialDisabledForUser}
                                title={
                                    trialDisabledForUser
                                        ? isPremium
                                            ? p.trial_disabled_premium
                                            : p.trial_disabled_stripe
                                        : undefined
                                }
                                className="agent-plan-shimmer flex w-full items-center justify-center gap-2 rounded-2xl bg-navy-primary py-4 text-lg font-black text-white shadow-md transition-all hover:bg-navy-secondary disabled:pointer-events-auto disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                {loading ? <Loader2 className="h-6 w-6 animate-spin" /> : null}
                                {ctaProLabel}
                                {!trialDisabledForUser ? <ArrowRight className="h-6 w-6" /> : null}
                            </button>
                            <p className="mt-4 text-center text-[10px] font-bold text-slate-500">
                                {trialDisabledForUser
                                    ? isPremium
                                        ? null
                                        : p.stripe_not_configured_notice
                                    : trialConsumed
                                      ? p.trial_note_repeat
                                      : p.trial_note}
                            </p>
                        </div>
                    </div>
                </div>
            </section>

            {/* FAQ */}
            <section className="container mx-auto px-4 py-16 md:py-24">
                <div className="mx-auto mb-12 max-w-3xl text-center">
                    <HelpCircle className="mx-auto mb-4 h-12 w-12 text-navy-primary opacity-80" />
                    <h2 className="text-3xl font-black text-navy-secondary md:text-5xl">{p.faq_title}</h2>
                    <p className="mt-2 font-medium text-slate-500">{p.faq_subtitle}</p>
                </div>
                <div className="mx-auto max-w-3xl space-y-4">
                    <FaqItem question={p.faq_1_q} answer={p.faq_1_a} />
                    <FaqItem question={p.faq_2_q} answer={p.faq_2_a} />
                    <FaqItem question={p.faq_3_q} answer={p.faq_3_a} />
                    <FaqItem question={p.faq_4_q} answer={p.faq_4_a} />
                    <FaqItem question={p.faq_5_q} answer={p.faq_5_a} />
                </div>
            </section>

            {/* Comparison table — horizontal scroll on narrow screens */}
            <section
                id="plan-compare"
                className="scroll-mt-20 container mx-auto flex flex-col items-center px-4 pb-16 md:scroll-mt-24 md:pb-24"
            >
                <div className="mb-10 w-full max-w-5xl text-center">
                    <h2 className="text-center text-3xl font-black text-navy-secondary md:text-5xl">{p.compare_title}</h2>
                    <p className="mt-3 text-center text-sm font-medium text-slate-600 md:text-base">{p.compare_subtitle}</p>
                    <div className="mx-auto mt-6 h-1 w-24 bg-gradient-to-r from-transparent via-navy-primary to-transparent" />
                </div>

                <div className="w-full min-w-0 max-w-5xl">
                    <div className="overflow-hidden rounded-none border border-slate-200 bg-white shadow-md md:rounded-3xl">
                        <table className="w-full min-w-0 table-fixed border-collapse text-left">
                            <thead>
                                <tr className="bg-slate-50">
                                    <th className="w-[30%] min-w-0 px-1 py-2 text-left text-[8px] font-bold uppercase leading-tight tracking-tight text-slate-500 sm:px-2 sm:text-[9px] md:w-[28%] md:px-4 md:py-4 md:text-xs md:tracking-widest lg:px-6 lg:py-5">
                                        {p.table_feature}
                                    </th>
                                    <th className="w-[35%] min-w-0 border-l border-slate-200 px-1 py-2 text-center text-[10px] font-black leading-tight text-navy-secondary sm:text-[11px] md:w-[36%] md:px-4 md:py-4 md:text-sm lg:px-6 lg:py-5">
                                        {p.table_free}
                                    </th>
                                    <th className="w-[35%] min-w-0 border-l border-slate-200 bg-navy-primary/5 px-1 py-2 text-center text-[10px] font-black leading-tight text-navy-primary sm:text-[11px] md:w-[36%] md:px-4 md:py-4 md:text-sm lg:px-6 lg:py-5">
                                        {p.table_pro}
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-200">
                                <CmpRow label={p.row_listings} free={p.feat_unlimited_listings_free} premium={p.feat_unlimited_listings_pro} />
                                <CmpRow
                                    label={p.row_priority}
                                    labelDesktop={p.row_priority_desktop}
                                    free={false}
                                    premium={true}
                                    labelMultiline
                                />
                                <CmpRow label={p.row_inquiry} free={true} premium={true} />
                                <CmpRow label={p.row_profile} free={true} premium={true} />
                                <CmpRow label={p.row_line} free={true} premium={true} />
                                <CmpRow
                                    label={p.row_ai}
                                    labelDesktop={p.row_ai_desktop}
                                    free={false}
                                    premium={true}
                                    labelMultiline
                                />
                                <CmpRow
                                    label={p.row_presale}
                                    labelDesktop={p.row_presale_desktop}
                                    free={false}
                                    premium={true}
                                    labelMultiline
                                />
                                <CmpRow label={p.row_pdf} free={false} premium={true} />
                                <CmpRow label={p.row_badge} free={false} premium={true} />
                            </tbody>
                        </table>
                    </div>
                </div>
            </section>

            {/* Final CTA */}
            <section className="container mx-auto px-4 pb-20 text-center">
                <h2 className="mx-auto max-w-4xl text-3xl font-black text-navy-secondary md:text-5xl">
                    {p.cta_final_title}
                </h2>
                <p className="mx-auto mt-4 max-w-xl text-slate-600">{p.cta_final_sub}</p>
                <div className="mt-10 flex flex-col items-stretch justify-center gap-4 sm:flex-row sm:items-center">
                    {isAgent ? (
                        <Link
                            href={`/${locale}/dashboard`}
                            className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-10 py-4 text-lg font-black text-navy-secondary shadow-md transition-all hover:bg-slate-50"
                        >
                            {p.cta_dashboard}
                        </Link>
                    ) : (
                        <Link
                            href={signupWithReturn}
                            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-navy-primary px-10 py-4 text-lg font-black text-white shadow-lg shadow-navy-primary/25 transition-all hover:bg-navy-secondary"
                        >
                            {p.cta_register_free}
                            <ArrowRight className="h-5 w-5" />
                        </Link>
                    )}
                    <button
                        type="button"
                        onClick={openConfirm}
                        disabled={loading || trialDisabledForUser}
                        title={
                            trialDisabledForUser
                                ? isPremium
                                    ? p.trial_disabled_premium
                                    : p.trial_disabled_stripe
                                : undefined
                        }
                        className="inline-flex items-center justify-center gap-2 rounded-2xl border border-navy-primary/30 bg-navy-primary/5 px-10 py-4 text-lg font-black text-navy-primary transition-all hover:bg-navy-primary/10 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : null}
                        {ctaProLabel}
                    </button>
                </div>
            </section>

            {isConfirmOpen && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
                    <button type="button" className="absolute inset-0 bg-navy-secondary/40 backdrop-blur-sm" onClick={closeConfirm} aria-label="Close" />
                    <div
                        role="dialog"
                        aria-modal="true"
                        className="relative w-full max-w-lg rounded-3xl border border-slate-200 bg-white p-6 shadow-xl sm:p-8"
                    >
                        <div className="flex items-start justify-between gap-4">
                            <div>
                                <div className="inline-flex items-center gap-2 rounded-full border border-navy-primary/20 bg-navy-primary/5 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-navy-primary">
                                    <Zap className="h-3.5 w-3.5" />
                                    {p.modal_confirm_badge}
                                </div>
                                <h3 className="mt-3 text-2xl font-black text-navy-secondary">{p.modal_title}</h3>
                                <p className="mt-2 text-sm font-medium text-slate-500">{p.modal_subtitle}</p>
                            </div>
                            <button
                                type="button"
                                onClick={closeConfirm}
                                className="rounded-xl p-2 text-slate-500 transition-colors hover:bg-slate-50"
                                aria-label="Close modal"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        <div className="mt-6 space-y-4">
                            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                                <div className="flex items-center justify-between gap-3">
                                    <div>
                                        <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">{p.modal_plan}</div>
                                        <div className="text-lg font-black text-navy-secondary">{p.plan_pro_name}</div>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">{p.modal_price}</div>
                                        <div className="text-lg font-black tabular-nums text-navy-secondary">{premiumPriceLabel}</div>
                                    </div>
                                </div>
                                {isAnnual && (
                                    <div className="mt-3">
                                        <span className="inline-flex items-center rounded-full border border-navy-primary/20 bg-navy-primary/5 px-2 py-0.5 text-[10px] font-black uppercase tracking-widest text-navy-primary">
                                            {p.billing_yearly_badge}
                                        </span>
                                    </div>
                                )}
                            </div>

                            {showTrialBillingInModal ? (
                                <div className="rounded-2xl border border-navy-primary/25 bg-navy-primary/5 p-4">
                                    <div className="text-xl font-black text-navy-primary">{p.modal_today_title}</div>
                                    <p className="mt-2 text-sm font-medium text-slate-600">{trialBillingNote}</p>
                                </div>
                            ) : null}
                            {showPayImmediateInModal ? (
                                <div className="rounded-2xl border border-amber-100 bg-amber-50/90 p-4">
                                    <div className="text-xl font-black text-amber-950">{p.modal_pay_start_title}</div>
                                    <p className="mt-2 text-sm font-medium text-amber-950/90">{p.trial_note_pay_immediate}</p>
                                </div>
                            ) : null}

                            {authResolved && !user ? (
                                <div className="rounded-2xl border border-amber-100 bg-amber-50/90 p-4 text-sm font-medium leading-relaxed text-amber-950">
                                    {p.checkout_guest_hint}
                                </div>
                            ) : null}

                            {authResolved && user && trialDisabledForUser ? (
                                <div className="rounded-2xl border border-amber-100 bg-amber-50/90 p-4 text-sm font-medium leading-relaxed text-amber-950">
                                    {isPremium ? p.trial_disabled_premium : p.stripe_not_configured_notice}
                                </div>
                            ) : null}

                            {confirmError && (
                                <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-700">{confirmError}</div>
                            )}
                        </div>

                        <div className="mt-6 flex flex-col gap-3">
                            {!authResolved ? (
                                <div className="flex justify-center py-6">
                                    <Loader2 className="h-8 w-8 animate-spin text-navy-primary" />
                                </div>
                            ) : !user ? (
                                <>
                                    <Link
                                        href={signupWithReturn}
                                        onClick={closeConfirm}
                                        className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-navy-primary py-3.5 font-black text-white shadow-md transition-colors hover:bg-navy-secondary"
                                    >
                                        {p.checkout_go_register}
                                        <ArrowRight className="h-5 w-5" />
                                    </Link>
                                    <Link
                                        href={loginWithReturn}
                                        onClick={closeConfirm}
                                        className="inline-flex w-full items-center justify-center rounded-2xl border border-slate-200 bg-white py-3.5 font-black text-navy-secondary transition-colors hover:bg-slate-50"
                                    >
                                        {p.checkout_go_login}
                                    </Link>
                                    <button
                                        type="button"
                                        onClick={closeConfirm}
                                        className="py-2 text-center text-sm font-bold text-slate-500 transition-colors hover:text-navy-secondary"
                                    >
                                        {p.modal_back}
                                    </button>
                                </>
                            ) : trialDisabledForUser ? (
                                <button
                                    type="button"
                                    onClick={closeConfirm}
                                    className="w-full rounded-2xl border border-slate-200 bg-white py-3.5 font-black text-navy-secondary transition-colors hover:bg-slate-50"
                                >
                                    {p.modal_back}
                                </button>
                            ) : (
                                <div className="flex flex-col gap-3 sm:flex-row">
                                    <button
                                        type="button"
                                        onClick={closeConfirm}
                                        className="flex-1 rounded-2xl border border-slate-200 bg-white py-3.5 font-black text-navy-secondary transition-colors hover:bg-slate-50 disabled:opacity-60"
                                        disabled={loading}
                                    >
                                        {p.modal_back}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={handleConfirmCheckout}
                                        className="flex-1 inline-flex items-center justify-center gap-2 rounded-2xl bg-navy-primary py-3.5 font-black text-white shadow-md transition-colors hover:bg-navy-secondary disabled:opacity-70"
                                        disabled={loading}
                                    >
                                        {loading ? (
                                            <>
                                                <Loader2 className="h-5 w-5 animate-spin" />
                                                {p.modal_processing}
                                            </>
                                        ) : (
                                            p.modal_agree
                                        )}
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

function FeatureRow({ label, value, muted }: { label: string; value: string; muted?: boolean }) {
    return (
        <div className={`flex items-start justify-between gap-3 text-sm ${muted ? "text-slate-400" : "text-navy-secondary"}`}>
            <span className="font-bold">{label}</span>
            <span className="shrink-0 text-right font-medium">{value}</span>
        </div>
    );
}

function CmpRow({
    label,
    labelDesktop,
    free,
    premium,
    labelMultiline,
}: {
    label: string;
    /** md 以上で1行表示するラベル（改行入り label 用）。未指定時は改行を除去 */
    labelDesktop?: string;
    free: boolean | string;
    premium: boolean | string;
    labelMultiline?: boolean;
}) {
    const cell = (val: boolean | string, highlight?: boolean) => {
        const base = `min-w-0 border-l border-slate-200 px-1 py-1.5 text-center align-middle sm:px-2 sm:py-2 md:px-4 md:py-4 lg:p-5 ${highlight ? "bg-navy-primary/5" : ""}`;
        if (typeof val === "string") {
            return (
                <td className={base}>
                    <span className="inline-block max-w-full break-words text-[9px] font-bold leading-snug text-navy-secondary sm:text-[10px] md:text-sm">
                        {val}
                    </span>
                </td>
            );
        }
        return (
            <td className={base}>
                {val ? (
                    <div className="mx-auto flex h-6 w-6 items-center justify-center rounded-full border border-emerald-100 bg-emerald-50 sm:h-7 sm:w-7 md:h-9 md:w-9">
                        <Check className="h-3.5 w-3.5 text-emerald-600 sm:h-4 sm:w-4 md:h-5 md:w-5" />
                    </div>
                ) : (
                    <div className="mx-auto flex h-6 w-6 items-center justify-center rounded-full border border-slate-200 bg-slate-100 sm:h-7 sm:w-7 md:h-9 md:w-9">
                        <X className="h-3 w-3 text-slate-400 sm:h-3.5 sm:w-3.5 md:h-4 md:w-4" />
                    </div>
                )}
            </td>
        );
    };

    const labelIsMultiline = labelMultiline || label.includes("\n");
    const mdLabel = labelDesktop ?? label.replace(/\n/g, "");

    return (
        <tr className="transition-colors hover:bg-slate-50/80">
            <td
                className={`min-w-0 break-words px-1 py-1.5 text-[9px] font-bold leading-snug text-navy-secondary sm:px-2 sm:py-2 sm:text-[10px] md:px-4 md:py-4 md:text-sm md:leading-normal lg:p-5 ${labelIsMultiline ? "" : "whitespace-normal md:whitespace-nowrap"}`}
            >
                {labelIsMultiline ? (
                    <>
                        <span className="whitespace-pre-line md:hidden">{label}</span>
                        <span className="hidden md:inline md:whitespace-nowrap">{mdLabel}</span>
                    </>
                ) : (
                    label
                )}
            </td>
            {cell(free, false)}
            {cell(premium, true)}
        </tr>
    );
}

function FaqItem({ question, answer }: { question: string; answer: string }) {
    const [open, setOpen] = useState(false);
    return (
        <div
            className={`overflow-hidden rounded-2xl border shadow-sm transition-all ${open ? "border-navy-primary/25" : "border-slate-200"}`}
        >
            <button
                type="button"
                onClick={() => setOpen(!open)}
                className="flex w-full items-center justify-between p-5 text-left transition-colors hover:bg-slate-50 md:p-6"
            >
                <span className="pr-6 font-black text-navy-secondary md:text-lg">{question}</span>
                {open ? <ChevronUp className="h-5 w-5 shrink-0 text-navy-primary" /> : <ChevronDown className="h-5 w-5 shrink-0 text-slate-400" />}
            </button>
            {open ? (
                <div className="border-t border-slate-200 p-5 pt-4 font-medium leading-relaxed text-slate-600 md:p-6 md:pt-5">{answer}</div>
            ) : null}
        </div>
    );
}
