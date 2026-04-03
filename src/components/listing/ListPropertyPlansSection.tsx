'use client'

import Link from 'next/link'
import { useParams } from 'next/navigation'
import { Mail, MessageCircle, Sparkles, Crown, TrendingUp } from 'lucide-react'

/**
 * 物件掲載（集客）ページ用：スタンダード / プレミアムの比較と LINE の価値訴求
 */
export default function ListPropertyPlansSection() {
  const params = useParams()
  const locale = (params?.locale as string) || 'jp'
  const pricingHref = `/${locale}/pricing`

  return (
    <section className="mb-14 rounded-[2rem] border border-slate-100 bg-white p-6 shadow-xl sm:p-10">
      <div className="mb-8 text-center">
        <p className="text-[10px] font-black uppercase tracking-[0.25em] text-[#06C755]">
          Key to Success in Thailand
        </p>
        <h2 className="mt-2 text-2xl font-black text-navy-secondary sm:text-3xl">選べる2つのプラン</h2>
        <p className="mx-auto mt-3 max-w-2xl text-sm font-medium leading-relaxed text-slate-600">
          日本人・タイ人・欧米のお客様すべてに届く掲載。特にタイでは{' '}
          <span className="font-black text-navy-secondary">LINE が成約の鍵（Key to Success in Thailand）</span>
          です。プレミアムで公式 LINE 経由の直接問い合わせに対応できます。
        </p>
        <p className="mx-auto mt-2 max-w-2xl text-xs font-medium text-slate-500">
          EN: LINE is the default messaging layer for buyers in Thailand — unlock it with Premium. / TH:
          ในประเทศไทย LINE เป็นช่องทางหลัก — แพ็กเกียมพรีเมียมช่วยให้คุณรับข้อความจากลูกค้าได้เต็มประสิทธิภาพ
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="flex flex-col rounded-2xl border border-slate-200 bg-slate-50/80 p-6">
          <div className="mb-4 flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-slate-400" />
            <h3 className="text-lg font-black text-navy-secondary">スタンダード</h3>
          </div>
          <p className="mb-4 text-2xl font-black tabular-nums text-navy-secondary">無料で掲載開始</p>
          <ul className="mb-6 flex-1 space-y-3 text-sm font-medium text-slate-600">
            <li className="flex gap-2">
              <Mail className="mt-0.5 h-4 w-4 shrink-0 text-sky-500" />
              <span>お問い合わせは<strong className="text-navy-secondary">メール</strong>で受け取り・返信</span>
            </li>
            <li className="flex gap-2">
              <TrendingUp className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
              <span>物件の公開・管理に必要な基本機能</span>
            </li>
          </ul>
          <p className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-xs font-bold text-slate-500">
            物件ページの「LINEで返信を受け取る」オプションはプレミアム掲載エージェントのみ表示されます。
          </p>
        </div>

        <div className="relative flex flex-col overflow-hidden rounded-2xl border-2 border-[#06C755]/35 bg-gradient-to-b from-[#06C755]/8 to-white p-6 shadow-lg">
          <div className="absolute right-4 top-4 rounded-full bg-[#06C755] px-2.5 py-0.5 text-[9px] font-black uppercase tracking-wider text-white">
            Recommended
          </div>
          <div className="mb-4 flex items-center gap-2">
            <Crown className="h-5 w-5 text-amber-500" />
            <h3 className="text-lg font-black text-navy-secondary">プレミアム</h3>
          </div>
          <p className="mb-4 text-sm font-bold text-[#047c3d]">成約率向上に直結する LINE 連携</p>
          <ul className="mb-6 flex-1 space-y-3 text-sm font-medium text-slate-700">
            <li className="flex gap-2">
              <MessageCircle className="mt-0.5 h-4 w-4 shrink-0 text-[#06C755]" />
              <span>
                <strong className="text-navy-secondary">LINE での直接問い合わせ</strong>
                に対応。顧客の LINE ユーザーID を取得し、公式アカウントから即時に返信の土台が整います。
              </span>
            </li>
            <li className="flex gap-2">
              <Mail className="mt-0.5 h-4 w-4 shrink-0 text-sky-500" />
              <span>メール返信と併用可能</span>
            </li>
            <li className="flex gap-2">
              <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
              <span>PDFチラシ・SNSシェアなど上位プラン特典（料金ページで詳細）</span>
            </li>
          </ul>
          <Link
            href={pricingHref}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-navy-primary py-3.5 text-sm font-black text-white transition hover:bg-navy-secondary"
          >
            料金・プレミアムの詳細を見る
          </Link>
        </div>
      </div>
    </section>
  )
}
