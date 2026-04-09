"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import PropertyThumbnail from "@/components/property/PropertyThumbnail";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Loader2, X } from "lucide-react";
import ContactAuthRequiredModal from "@/components/property/ContactAuthRequiredModal";
import { useAuth } from "@/contexts/AuthContext";
import {
    COMPARE_FACILITY_ROWS,
    facilityMatches,
    getMergedFacilities,
} from "@/lib/compare/facilityMatch";
import CompareMobileSwipeView from "./CompareMobileSwipeView";

const STORAGE_KEY = "cc_compare_property_ids";

function isUuid(id: string) {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id);
}

function parseIdsParam(raw: string | null): string[] {
    if (!raw?.trim()) return [];
    return raw
        .split(",")
        .map((s) => s.trim())
        .filter(isUuid)
        .slice(0, 3);
}

function getTitle(p: any, locale: string) {
    if (locale === "en" && p.title_en) return p.title_en;
    if (locale === "th" && p.title_th) return p.title_th;
    return p.title_ja || p.title || "—";
}

function regionName(p: any) {
    return p.area?.region?.name || p.city_name || "";
}

function areaName(p: any, dict: any) {
    const raw = p.area?.name || p.area_name || "";
    return (dict.property?.db_locations as Record<string, string>)?.[raw] || raw || "—";
}

/** タグからシービュー／シティービューを判定 */
function getViewLabel(p: any, c: Record<string, string>) {
    const tags: string[] = Array.isArray(p.tags) ? p.tags.map((t: unknown) => String(t)) : [];
    let ocean = false;
    let city = false;
    for (const t of tags) {
        const lower = t.toLowerCase();
        if (
            t.includes("オーシャン") ||
            lower.includes("ocean") ||
            lower.includes("sea view") ||
            lower.includes("seaview")
        ) {
            ocean = true;
        }
        if (
            t.includes("シティー") ||
            lower.includes("city view") ||
            lower.includes("cityview") ||
            (lower.includes("city") && lower.includes("view"))
        ) {
            city = true;
        }
    }
    if (ocean && city) return c.view_both;
    if (ocean) return c.view_ocean;
    if (city) return c.view_city;
    return "—";
}

export default function CompareClient({ locale, dict }: { locale: string; dict: any }) {
    const c = dict.compare;
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const supabase = createClient();
    const { user } = useAuth();

    const [ids, setIds] = useState<string[]>([]);
    const [properties, setProperties] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [authChecked, setAuthChecked] = useState(false);
    const [contactAuthOpen, setContactAuthOpen] = useState(false);

    const returnPath = `${pathname || `/${locale}/compare`}${searchParams?.toString() ? `?${searchParams}` : ""}`;

    const syncStorage = useCallback((next: string[]) => {
        try {
            if (next.length) localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
            else localStorage.removeItem(STORAGE_KEY);
        } catch {
            /* ignore */
        }
    }, []);

    const replaceUrlIds = useCallback(
        (next: string[]) => {
            const q = next.length ? `?ids=${next.join(",")}` : "";
            router.replace(`${pathname}${q}`, { scroll: false });
        },
        [router, pathname]
    );

    // URL ↔ ids ↔ localStorage
    useEffect(() => {
        const fromUrl = parseIdsParam(searchParams.get("ids"));

        if (fromUrl.length > 0) {
            setIds(fromUrl);
            syncStorage(fromUrl);
            return;
        }

        if (typeof window !== "undefined") {
            try {
                const raw = localStorage.getItem(STORAGE_KEY);
                if (raw) {
                    const parsed = JSON.parse(raw);
                    if (Array.isArray(parsed)) {
                        const capped = parsed.filter((x) => typeof x === "string" && isUuid(x)).slice(0, 3);
                        if (capped.length > 0) {
                            setIds(capped);
                            replaceUrlIds(capped);
                            return;
                        }
                    }
                }
            } catch {
                /* ignore */
            }
        }

        setIds([]);
    }, [searchParams, syncStorage, replaceUrlIds]);

    useEffect(() => {
        let cancelled = false;
        (async () => {
            const {
                data: { user },
            } = await supabase.auth.getUser();
            if (!user) {
                router.replace(`/${locale}/login?next=${encodeURIComponent(`/${locale}/compare`)}`);
                return;
            }
            const { data: profile } = await supabase.from("profiles").select("user_role,is_admin").eq("id", user.id).single();
            const isAgent =
                profile?.user_role === "agent" || profile?.user_role === "admin" || profile?.is_admin === true;
            if (isAgent) {
                router.replace(`/${locale}/dashboard`);
                return;
            }
            if (!cancelled) setAuthChecked(true);
        })();
        return () => {
            cancelled = true;
        };
    }, [supabase, router, locale]);

    useEffect(() => {
        if (!authChecked) return;
        let cancelled = false;

        (async () => {
            if (ids.length === 0) {
                setProperties([]);
                setLoading(false);
                return;
            }

            setLoading(true);
            const { data, error } = await supabase
                .from("properties")
                .select(
                    `
          *,
          area:areas(name, region:regions(name)),
          project:projects(facilities),
          developers(name)
        `
                )
                .in("id", ids)
                .in("status", ["published", "under_negotiation", "contracted"]);

            if (cancelled) return;

            if (error || !data) {
                console.error(error);
                setProperties([]);
                setLoading(false);
                return;
            }

            const orderMap = new Map(ids.map((id, i) => [id, i]));
            const sorted = [...data].sort((a, b) => (orderMap.get(a.id) ?? 0) - (orderMap.get(b.id) ?? 0));

            setProperties(sorted);
            setLoading(false);
        })();

        return () => {
            cancelled = true;
        };
    }, [authChecked, ids.join(","), supabase]);

    const removeId = (id: string) => {
        const next = ids.filter((x) => x !== id);
        setIds(next);
        setProperties((prev) => prev.filter((p) => p.id !== id));
        syncStorage(next);
        replaceUrlIds(next);
    };

    const rows = useMemo(
        () =>
            COMPARE_FACILITY_ROWS.map((row) => ({
                ...row,
                label: (c[`facility_${row.id}` as keyof typeof c] as string) || row.id,
            })),
        [c]
    );

    if (!authChecked) {
        return (
            <div className="min-h-[50vh] flex items-center justify-center bg-slate-50">
                <Loader2 className="w-10 h-10 text-navy-primary animate-spin" />
            </div>
        );
    }

    if (!loading && ids.length === 0) {
        return (
            <div className="min-h-screen bg-slate-50 pb-20">
                <div className="bg-navy-secondary text-white pt-8 pb-12">
                    <div className="container mx-auto px-4 max-w-3xl">
                        <h1 className="text-2xl font-black !text-white md:text-3xl">{c.title}</h1>
                    </div>
                </div>
                <div className="container mx-auto px-4 max-w-lg text-center py-20">
                    <p className="text-navy-secondary font-bold text-lg mb-2">{c.empty_title}</p>
                    <p className="text-slate-500 mb-8">{c.empty_desc}</p>
                    <Link
                        href={`/${locale}/mypage?tab=favorites`}
                        className="inline-flex items-center justify-center rounded-2xl bg-navy-primary text-white font-black px-8 py-4 shadow-lg"
                    >
                        {c.go_favorites}
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50 pb-20">
            <ContactAuthRequiredModal
                open={contactAuthOpen}
                onClose={() => setContactAuthOpen(false)}
                locale={locale}
                dictProperty={dict.property || {}}
                returnPath={returnPath}
            />
            <div className="bg-navy-secondary text-white pt-8 pb-10">
                <div className="container mx-auto px-4 max-w-6xl">
                    <h1 className="text-2xl font-black !text-white md:text-3xl">{c.title}</h1>
                    <p className="mt-2 text-sm text-slate-400">{c.subtitle}</p>
                    {!loading && properties.length > 1 && c.swipe_hint ? (
                        <p className="mt-1.5 text-xs font-medium text-slate-400/90 md:hidden">
                            {c.swipe_hint}
                        </p>
                    ) : null}
                </div>
            </div>

            <div className="container mx-auto px-2 sm:px-4 max-w-6xl -mt-4">
                {loading ? (
                    <div className="flex justify-center py-24">
                        <Loader2 className="w-10 h-10 text-navy-primary animate-spin" />
                    </div>
                ) : properties.length === 0 ? (
                    <p className="text-center text-slate-500 py-16">{c.not_found}</p>
                ) : (
                    <>
                        <div className="md:hidden rounded-2xl border border-slate-200 bg-white shadow-xl overflow-hidden">
                            <CompareMobileSwipeView
                                properties={properties}
                                locale={locale}
                                dict={dict}
                                c={c}
                                facilityRows={rows}
                                user={user}
                                removeId={removeId}
                                onRequireAuth={() => setContactAuthOpen(true)}
                            />
                        </div>
                        <div className="hidden md:block rounded-2xl border border-slate-200 bg-white shadow-xl overflow-hidden">
                        <div className="overflow-x-auto overscroll-x-contain">
                            <table className="w-full min-w-[640px] border-collapse text-sm">
                                <thead>
                                    <tr className="border-b border-slate-200 bg-slate-50">
                                        <th
                                            className="sticky left-0 z-20 bg-slate-50 border-r border-slate-200 p-3 text-left text-[10px] font-black uppercase tracking-wider text-slate-400 w-[120px] sm:w-40 min-w-[120px] sm:min-w-[160px] shadow-[4px_0_12px_-6px_rgba(15,23,42,0.15)]"
                                            scope="col"
                                        >
                                            {c.row_item}
                                        </th>
                                        {properties.map((p) => (
                                            <th
                                                key={p.id}
                                                scope="col"
                                                className="p-3 align-top min-w-[200px] max-w-[260px] w-[220px] border-l border-slate-100"
                                            >
                                                <div className="flex items-start justify-between gap-2 mb-2">
                                                    <Link
                                                        href={`/${locale}/properties/${p.id}`}
                                                        className="font-bold text-navy-secondary hover:text-rose-600 line-clamp-2 text-left text-sm flex-1 min-w-0"
                                                    >
                                                        {getTitle(p, locale)}
                                                    </Link>
                                                    <button
                                                        type="button"
                                                        onClick={() => removeId(p.id)}
                                                        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-colors"
                                                        aria-label={c.remove_column}
                                                        title={c.remove_column}
                                                    >
                                                        <X className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    <CompareRow label={c.row_image}>
                                        {properties.map((p) => (
                                            <td
                                                key={p.id}
                                                className="border-l border-slate-100 p-3 align-top min-w-[200px] w-[220px]"
                                            >
                                                <Link
                                                    href={`/${locale}/properties/${p.id}`}
                                                    className="relative block aspect-[4/3] w-full overflow-hidden rounded-xl bg-slate-100"
                                                >
                                                    <PropertyThumbnail
                                                        src={p.images?.[0]}
                                                        alt=""
                                                        fill
                                                        className="object-cover"
                                                        sizes="240px"
                                                    />
                                                </Link>
                                            </td>
                                        ))}
                                    </CompareRow>
                                    <CompareRow label={c.row_name_area}>
                                        {properties.map((p) => (
                                            <td key={p.id} className="border-l border-t border-slate-100 p-3 align-top">
                                                <div className="font-bold text-navy-secondary">{getTitle(p, locale)}</div>
                                                <div className="text-xs text-slate-500 mt-1">
                                                    {regionName(p) ? `${regionName(p)} ・ ` : ""}
                                                    {areaName(p, dict)}
                                                </div>
                                            </td>
                                        ))}
                                    </CompareRow>
                                    <CompareRow label={c.row_price} emphasize>
                                        {properties.map((p) => (
                                            <td key={p.id} className="border-l border-t border-slate-100 p-3 align-top">
                                                {p.is_for_rent && p.rent_price != null && (
                                                    <div className="text-rose-600 font-black text-lg">
                                                        {c.rent_label} {Number(p.rent_price).toLocaleString()}{" "}
                                                        <span className="text-xs font-bold text-slate-500">THB/月</span>
                                                    </div>
                                                )}
                                                {p.is_for_sale && p.sale_price != null && (
                                                    <div className="text-navy-secondary font-black text-lg mt-1">
                                                        {c.sale_label} {Number(p.sale_price).toLocaleString()}{" "}
                                                        <span className="text-xs font-bold text-slate-500">THB</span>
                                                    </div>
                                                )}
                                                {!p.is_for_rent && !p.is_for_sale && (
                                                    <span className="text-slate-400">—</span>
                                                )}
                                            </td>
                                        ))}
                                    </CompareRow>
                                    <CompareRow label={c.row_sqm}>
                                        {properties.map((p) => (
                                            <td key={p.id} className="border-l border-t border-slate-100 p-3 align-top font-bold tabular-nums text-navy-secondary">
                                                {p.sqm != null && p.sqm !== "" && Number(p.sqm) > 0
                                                    ? `${Number(p.sqm).toLocaleString()} ㎡`
                                                    : "—"}
                                            </td>
                                        ))}
                                    </CompareRow>
                                    <CompareRow label={c.row_view}>
                                        {properties.map((p) => (
                                            <td key={p.id} className="border-l border-t border-slate-100 p-3 align-top text-slate-700">
                                                {getViewLabel(p, c as Record<string, string>)}
                                            </td>
                                        ))}
                                    </CompareRow>
                                    <CompareRow label={c.row_price_sqm}>
                                        {properties.map((p) => {
                                            const sqm = Number(p.sqm) || 0;
                                            let val: number | null = null;
                                            let suffix = "";
                                            if (sqm > 0) {
                                                if (p.is_for_rent && p.rent_price != null) {
                                                    val = Math.round(Number(p.rent_price) / sqm);
                                                    suffix = ` THB/㎡・月`;
                                                } else if (p.is_for_sale && p.sale_price != null) {
                                                    val = Math.round(Number(p.sale_price) / sqm);
                                                    suffix = ` THB/㎡`;
                                                }
                                            }
                                            return (
                                                <td key={p.id} className="border-l border-t border-slate-100 p-3 align-top text-slate-700">
                                                    {val != null ? (
                                                        <>
                                                            <span className="font-bold tabular-nums">{val.toLocaleString()}</span>
                                                            <span className="text-xs text-slate-500">{suffix}</span>
                                                            <p className="text-[10px] text-slate-400 mt-1">{c.per_sqm_note}</p>
                                                        </>
                                                    ) : (
                                                        "—"
                                                    )}
                                                </td>
                                            );
                                        })}
                                    </CompareRow>
                                    <CompareRow label={c.row_layout}>
                                        {properties.map((p) => (
                                            <td key={p.id} className="border-l border-t border-slate-100 p-3 align-top">
                                                {Number(p.bedrooms) === 0
                                                    ? c.studio
                                                    : c.bedrooms.replace("{n}", String(p.bedrooms ?? "—"))}
                                            </td>
                                        ))}
                                    </CompareRow>
                                    <CompareRow label={c.row_floor}>
                                        {properties.map((p) => (
                                            <td key={p.id} className="border-l border-t border-slate-100 p-3 align-top">
                                                {p.floor != null && p.floor !== ""
                                                    ? c.floor_value.replace("{n}", String(p.floor))
                                                    : "—"}
                                            </td>
                                        ))}
                                    </CompareRow>
                                    <CompareRow label={c.row_pet}>
                                        {properties.map((p) => (
                                            <td key={p.id} className="border-l border-t border-slate-100 p-3 align-top font-bold">
                                                {p.allows_pets ? (
                                                    <span className="text-emerald-600">{c.pet_ok}</span>
                                                ) : (
                                                    <span className="text-slate-400">{c.pet_ng}</span>
                                                )}
                                            </td>
                                        ))}
                                    </CompareRow>
                                    <CompareRow label={c.row_bathtub}>
                                        {properties.map((p) => (
                                            <td key={p.id} className="border-l border-t border-slate-100 p-3 align-top font-bold">
                                                {p.has_bathtub ? (
                                                    <span className="text-emerald-600">{c.bathtub_yes}</span>
                                                ) : (
                                                    <span className="text-slate-400">{c.bathtub_no}</span>
                                                )}
                                            </td>
                                        ))}
                                    </CompareRow>
                                    {rows.map((row) => (
                                        <CompareRow key={row.id} label={row.label}>
                                            {properties.map((p) => {
                                                const list = getMergedFacilities(p);
                                                const ok = facilityMatches(list, row.matchers);
                                                return (
                                                    <td
                                                        key={p.id}
                                                        className="border-l border-t border-slate-100 p-3 align-middle text-center"
                                                    >
                                                        {ok ? (
                                                            <span className="text-lg font-black text-emerald-600">{c.yes}</span>
                                                        ) : (
                                                            <span className="text-lg text-slate-300">{c.no}</span>
                                                        )}
                                                    </td>
                                                );
                                            })}
                                        </CompareRow>
                                    ))}
                                    <CompareRow label={c.row_line}>
                                        {properties.map((p) => {
                                            return (
                                                <td key={p.id} className="border-l border-t border-slate-200 p-4 align-top bg-slate-50/80">
                                                    <Link
                                                        href={`/${locale}/properties/${p.id}#inquiry-form-section`}
                                                        className="inline-flex w-full min-h-11 items-center justify-center rounded-xl bg-navy-primary px-4 py-3 text-center text-sm font-black text-white shadow-md transition hover:bg-navy-secondary"
                                                    >
                                                        {c.inquiry_form_cta ?? c.line_inquiry}
                                                    </Link>
                                                </td>
                                            );
                                        })}
                                    </CompareRow>
                                </tbody>
                            </table>
                        </div>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}

function CompareRow({
    label,
    emphasize,
    children,
}: {
    label: string;
    emphasize?: boolean;
    children: import("react").ReactNode;
}) {
    return (
        <tr className="bg-white hover:bg-slate-50/50">
            <th
                scope="row"
                className={`sticky left-0 z-10 border-r border-slate-200 p-3 text-left align-top shadow-[4px_0_12px_-6px_rgba(15,23,42,0.12)] ${
                    emphasize ? "bg-rose-50" : "bg-white"
                } text-xs font-black text-slate-600 min-w-[120px] sm:min-w-[160px] w-[120px] sm:w-40`}
            >
                {label}
            </th>
            {children}
        </tr>
    );
}
