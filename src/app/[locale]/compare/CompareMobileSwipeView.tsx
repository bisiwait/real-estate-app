"use client";

import type { ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import { X } from "lucide-react";
import LineContactButton from "@/components/property/LineContactButton";
import { clsx } from "clsx";
import {
    facilityMatches,
    getMergedFacilities,
    type CompareFacilityRow,
} from "@/lib/compare/facilityMatch";

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

type FacilityRow = CompareFacilityRow & { label: string };

function mobileCompareRowClass(rowIndex: number, facilityCount: number): string {
    const lineIdx = 8 + facilityCount;
    const base = "flex border-b border-slate-200/90 px-2.5 py-2";
    if (rowIndex === lineIdx) return clsx(base, "min-h-[72px] items-center");
    if (rowIndex === 0) return clsx(base, "min-h-[84px] items-start");
    if (rowIndex === 3) return clsx(base, "min-h-[92px] items-start");
    return clsx(base, "min-h-[52px] items-center");
}

function mobileFacilityLabel(c: Record<string, string>, row: FacilityRow): string {
    if (row.id === "gym") return c.facility_gym_short || row.label;
    return row.label;
}

type CompareMobileSwipeViewProps = {
    properties: any[];
    locale: string;
    dict: any;
    c: any;
    facilityRows: FacilityRow[];
    origin: string;
    user: any;
    removeId: (id: string) => void;
    onRequireAuth: () => void;
};

/** スマホ専用: 左ラベル固定 + 物件カラム横スナップ（md 未満のみ表示） */
export default function CompareMobileSwipeView({
    properties,
    locale,
    dict,
    c,
    facilityRows,
    origin,
    user,
    removeId,
    onRequireAuth,
}: CompareMobileSwipeViewProps) {
    const LABEL_W = "w-[5.75rem] min-w-[5.75rem] max-w-[5.75rem]";

    return (
        <div className="flex min-w-0">
            <aside
                className={clsx(
                    LABEL_W,
                    "sticky left-0 z-30 shrink-0 self-start border-r border-navy-primary/20 bg-gradient-to-b from-slate-50 via-white to-slate-50/90 shadow-[6px_0_20px_-10px_rgba(30,58,138,0.25)]"
                )}
            >
                <div
                    className="flex flex-col gap-2 border-b border-cyan-500/25 bg-gradient-to-br from-navy-primary/[0.06] to-cyan-500/[0.06] px-2.5 pb-3 pt-2"
                    aria-hidden
                >
                    <div className="min-h-[2.5rem] shrink-0" />
                    <div className="h-32 shrink-0 rounded-xl bg-white/50 ring-1 ring-navy-primary/10" />
                    <div className="flex min-h-[2.25rem] shrink-0 items-end">
                        <span className="text-[9px] font-black uppercase tracking-widest text-navy-primary/70">
                            {c.row_item}
                        </span>
                    </div>
                </div>
                <LabelRows c={c} facilityRows={facilityRows} />
            </aside>

            <div
                className={clsx(
                    "flex min-w-0 flex-1 flex-row snap-x snap-mandatory overflow-x-auto overscroll-x-contain pb-1",
                    "[-webkit-overflow-scrolling:touch]"
                )}
            >
                {properties.map((p) => (
                    <PropertySwipeColumn
                        key={p.id}
                        property={p}
                        locale={locale}
                        dict={dict}
                        c={c}
                        facilityRows={facilityRows}
                        origin={origin}
                        user={user}
                        removeId={removeId}
                        onRequireAuth={onRequireAuth}
                    />
                ))}
            </div>
        </div>
    );
}

function LabelRows({ c, facilityRows }: { c: any; facilityRows: FacilityRow[] }) {
    const ck = c as Record<string, string>;
    const items: { label: string; emphasize?: boolean }[] = [
        { label: ck.row_price_short || c.row_price, emphasize: true },
        { label: c.row_sqm },
        { label: c.row_view },
        { label: ck.row_price_sqm_short || c.row_price_sqm },
        { label: c.row_layout },
        { label: c.row_floor },
        { label: c.row_pet },
        { label: c.row_bathtub },
        ...facilityRows.map((r) => ({ label: mobileFacilityLabel(ck, r) })),
        { label: ck.row_line_short || c.row_line },
    ];

    return (
        <ul className="list-none">
            {items.map((item, i) => (
                <li
                    key={`${item.label}-${i}`}
                    className={clsx(
                        mobileCompareRowClass(i, facilityRows.length),
                        "text-left text-[10px] font-black leading-snug text-navy-secondary",
                        i % 2 === 1 ? "bg-slate-50/95" : "bg-white/90",
                        item.emphasize && "border-l-2 border-l-rose-400/80 pl-[6px]"
                    )}
                >
                    {item.label}
                </li>
            ))}
        </ul>
    );
}

function PropertySwipeColumn({
    property: p,
    locale,
    dict,
    c,
    facilityRows,
    origin,
    user,
    removeId,
    onRequireAuth,
}: {
    property: any;
    locale: string;
    dict: any;
    c: any;
    facilityRows: FacilityRow[];
    origin: string;
    user: any;
    removeId: (id: string) => void;
    onRequireAuth: () => void;
}) {
    const title = getTitle(p, locale);
    const priceStr =
        p.is_for_rent && p.rent_price != null
            ? `${c.rent_label} ${Number(p.rent_price).toLocaleString()} THB/月`
            : p.is_for_sale && p.sale_price != null
              ? `${c.sale_label} ${Number(p.sale_price).toLocaleString()} THB`
              : "—";
    const url =
        origin && p.id ? `${origin}/${locale}/properties/${p.id}` : `/${locale}/properties/${p.id}`;

    return (
        <div
            className={clsx(
                "snap-center shrink-0",
                "w-[calc(100vw-5.75rem-1rem)] max-w-[360px]",
                "border-l border-cyan-500/15 bg-white"
            )}
        >
            <header
                className={clsx(
                    "sticky top-0 z-20 flex flex-col gap-2 border-b-2 border-navy-primary/10 bg-white/95 px-2.5 pb-3 pt-2",
                    "backdrop-blur-md supports-[backdrop-filter]:bg-white/85"
                )}
            >
                <div className="flex min-h-[2.5rem] shrink-0 items-start justify-between gap-2">
                    <Link
                        href={`/${locale}/properties/${p.id}`}
                        className="line-clamp-2 min-h-[2.5rem] min-w-0 flex-1 text-left text-sm font-black leading-snug text-navy-secondary hover:text-cyan-700"
                    >
                        {title}
                    </Link>
                    <button
                        type="button"
                        onClick={() => removeId(p.id)}
                        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 shadow-sm transition-colors hover:border-red-200 hover:bg-red-50 hover:text-red-600"
                        aria-label={c.remove_column}
                        title={c.remove_column}
                    >
                        <X className="h-4 w-4" />
                    </button>
                </div>
                <Link
                    href={`/${locale}/properties/${p.id}`}
                    className="relative block h-32 w-full shrink-0 overflow-hidden rounded-xl bg-slate-100 ring-1 ring-navy-primary/10"
                >
                    <Image
                        src={p.images?.[0] || "/images/placeholder-property.jpg"}
                        alt=""
                        fill
                        className="object-cover"
                        sizes="(max-width: 768px) 85vw, 320px"
                    />
                </Link>
                <p className="line-clamp-2 min-h-[2.25rem] shrink-0 text-[11px] font-bold leading-snug text-slate-600">
                    {regionName(p) ? `${regionName(p)} ・ ` : ""}
                    {areaName(p, dict)}
                </p>
            </header>

            <ul className="list-none">
                <ValueRow index={0} facilityCount={facilityRows.length}>
                    <div className="space-y-1">
                        {p.is_for_rent && p.rent_price != null && (
                            <div className="text-base font-black text-rose-600">
                                {c.rent_label} {Number(p.rent_price).toLocaleString()}{" "}
                                <span className="text-[10px] font-bold text-slate-500">THB/月</span>
                            </div>
                        )}
                        {p.is_for_sale && p.sale_price != null && (
                            <div className="text-base font-black text-navy-secondary">
                                {c.sale_label} {Number(p.sale_price).toLocaleString()}{" "}
                                <span className="text-[10px] font-bold text-slate-500">THB</span>
                            </div>
                        )}
                        {!p.is_for_rent && !p.is_for_sale && <span className="text-slate-400">—</span>}
                    </div>
                </ValueRow>
                <ValueRow index={1} facilityCount={facilityRows.length}>
                    <span className="font-black tabular-nums text-navy-secondary">
                        {p.sqm != null && p.sqm !== "" && Number(p.sqm) > 0
                            ? `${Number(p.sqm).toLocaleString()} ㎡`
                            : "—"}
                    </span>
                </ValueRow>
                <ValueRow index={2} facilityCount={facilityRows.length}>
                    <span className="text-sm text-slate-700">{getViewLabel(p, c as Record<string, string>)}</span>
                </ValueRow>
                <ValueRow index={3} facilityCount={facilityRows.length}>
                    {(() => {
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
                        if (val == null) return <span className="text-slate-500">—</span>;
                        return (
                            <>
                                <span className="font-bold tabular-nums text-navy-secondary">{val.toLocaleString()}</span>
                                <span className="text-[10px] text-slate-500">{suffix}</span>
                                <p className="mt-1 text-[9px] text-slate-400">{c.per_sqm_note}</p>
                            </>
                        );
                    })()}
                </ValueRow>
                <ValueRow index={4} facilityCount={facilityRows.length}>
                    <span className="text-sm text-slate-800">
                        {Number(p.bedrooms) === 0
                            ? c.studio
                            : c.bedrooms.replace("{n}", String(p.bedrooms ?? "—"))}
                    </span>
                </ValueRow>
                <ValueRow index={5} facilityCount={facilityRows.length}>
                    <span className="text-sm">
                        {p.floor != null && p.floor !== "" ? c.floor_value.replace("{n}", String(p.floor)) : "—"}
                    </span>
                </ValueRow>
                <ValueRow index={6} facilityCount={facilityRows.length}>
                    <span className="text-sm font-bold">
                        {p.allows_pets ? (
                            <span className="text-emerald-600">{c.pet_ok}</span>
                        ) : (
                            <span className="text-slate-400">{c.pet_ng}</span>
                        )}
                    </span>
                </ValueRow>
                <ValueRow index={7} facilityCount={facilityRows.length}>
                    <span className="text-sm font-bold">
                        {p.has_bathtub ? (
                            <span className="text-emerald-600">{c.bathtub_yes}</span>
                        ) : (
                            <span className="text-slate-400">{c.bathtub_no}</span>
                        )}
                    </span>
                </ValueRow>
                {facilityRows.map((row, fi) => {
                    const list = getMergedFacilities(p);
                    const ok = facilityMatches(list, row.matchers);
                    return (
                        <ValueRow key={row.id} index={8 + fi} facilityCount={facilityRows.length}>
                            <span className="text-center text-lg font-black">
                                {ok ? <span className="text-emerald-600">{c.yes}</span> : <span className="text-slate-300">{c.no}</span>}
                            </span>
                        </ValueRow>
                    );
                })}
                <ValueRow index={8 + facilityRows.length} facilityCount={facilityRows.length}>
                    <LineContactButton
                        dict={{
                            ...dict,
                            property: {
                                ...(dict.property || {}),
                                line_inquiry_btn: c.line_inquiry,
                            },
                        }}
                        variant="full"
                        className="w-full !py-3 !text-sm"
                        property={{
                            id: p.id,
                            title,
                            price: priceStr,
                            url,
                            refId: p.reference_id || p.id?.slice(0, 8),
                            agentId: p.user_id,
                        }}
                        isLoggedIn={!!user}
                        onRequireAuth={onRequireAuth}
                    />
                </ValueRow>
            </ul>
        </div>
    );
}

function ValueRow({
    index,
    facilityCount,
    children,
}: {
    index: number;
    facilityCount: number;
    children: ReactNode;
}) {
    return (
        <li
            className={clsx(
                mobileCompareRowClass(index, facilityCount),
                index % 2 === 1 ? "bg-slate-50/95" : "bg-white/90",
                index === 0 && "border-l-2 border-l-cyan-500/35"
            )}
        >
            <div className="min-w-0 flex-1">{children}</div>
        </li>
    );
}
