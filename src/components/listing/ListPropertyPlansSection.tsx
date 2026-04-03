'use client'

import Link from 'next/link'
import { useParams } from 'next/navigation'
import { Mail, MessageCircle, Sparkles, Crown, TrendingUp } from 'lucide-react'
import { getListPropertyPlansCopy } from '@/lib/i18n/locale-plans-copy'

/**
 * 物件掲載（集客）ページ用：スタンダード / プレミアムの比較（locale ごとに1言語）
 */
export default function ListPropertyPlansSection() {
  const params = useParams()
  const locale = (params?.locale as string) || 'jp'
  const pricingHref = `/${locale}/pricing`
  const t = getListPropertyPlansCopy(locale)

  return (
    <section className="mb-14 rounded-[2rem] border border-slate-100 bg-white p-6 shadow-xl sm:p-10">
      <div className="mb-8 text-center">
        <p className="text-[10px] font-black uppercase tracking-[0.25em] text-[#06C755]">{t.tagline}</p>
        <h2 className="mt-2 text-2xl font-black text-navy-secondary sm:text-3xl">{t.heading}</h2>
        <p className="mx-auto mt-3 max-w-2xl whitespace-pre-line text-sm font-medium leading-relaxed text-slate-600">
          {t.intro}
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="flex flex-col rounded-2xl border border-slate-200 bg-slate-50/80 p-6">
          <div className="mb-4 flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-slate-400" />
            <h3 className="text-lg font-black text-navy-secondary">{t.standard_title}</h3>
          </div>
          <p className="mb-4 text-2xl font-black tabular-nums text-navy-secondary">{t.standard_price}</p>
          <ul className="mb-6 flex-1 space-y-3 text-sm font-medium text-slate-600">
            <li className="flex gap-2">
              <Mail className="mt-0.5 h-4 w-4 shrink-0 text-sky-500" />
              <span>{t.standard_bullet1}</span>
            </li>
            <li className="flex gap-2">
              <TrendingUp className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
              <span>{t.standard_bullet2}</span>
            </li>
          </ul>
          <p className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-xs font-bold text-slate-500">
            {t.standard_footer}
          </p>
        </div>

        <div className="relative flex flex-col overflow-hidden rounded-2xl border-2 border-[#06C755]/35 bg-gradient-to-b from-[#06C755]/8 to-white p-6 shadow-lg">
          <div className="absolute right-4 top-4 rounded-full bg-[#06C755] px-2.5 py-0.5 text-[9px] font-black uppercase tracking-wider text-white">
            {t.premium_badge}
          </div>
          <div className="mb-4 flex items-center gap-2">
            <Crown className="h-5 w-5 text-amber-500" />
            <h3 className="text-lg font-black text-navy-secondary">{t.premium_title}</h3>
          </div>
          <p className="mb-4 text-sm font-bold text-[#047c3d]">{t.premium_tagline}</p>
          <ul className="mb-6 flex-1 space-y-3 text-sm font-medium text-slate-700">
            <li className="flex gap-2">
              <MessageCircle className="mt-0.5 h-4 w-4 shrink-0 text-[#06C755]" />
              <span>{t.premium_bullet1}</span>
            </li>
            <li className="flex gap-2">
              <Mail className="mt-0.5 h-4 w-4 shrink-0 text-sky-500" />
              <span>{t.premium_bullet2}</span>
            </li>
            <li className="flex gap-2">
              <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
              <span>{t.premium_bullet3}</span>
            </li>
          </ul>
          <Link
            href={pricingHref}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-navy-primary py-3.5 text-sm font-black text-white transition hover:bg-navy-secondary"
          >
            {t.premium_cta}
          </Link>
        </div>
      </div>
    </section>
  )
}
