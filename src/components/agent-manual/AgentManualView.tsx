import Image from 'next/image'
import Link from 'next/link'
import { MessageCircle, Sparkles, Home, Inbox } from 'lucide-react'

type AgentManualViewProps = {
  locale: string
  officialLineAddFriendUrl: string
}

/**
 * エージェント向け「使い方」縦スクロールマニュアル（日本語コピー固定）。
 * 画像は `/public/images/manual/step{1,2,3}.png` を後から配置する想定。
 */
export default function AgentManualView({ locale, officialLineAddFriendUrl }: AgentManualViewProps) {
  const registerHref = `/${locale}/register`
  const listHref = `/${locale}/list-property`
  const dashboardHref = `/${locale}/dashboard`

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-50 pb-20 pt-6 sm:pt-10">
      <div className="mx-auto max-w-lg px-4 sm:max-w-xl sm:px-5 md:max-w-2xl">
        {/* ヒーロー */}
        <section
          id="manual-hero"
          className="scroll-mt-24 rounded-3xl border border-slate-100 bg-white px-5 py-10 text-center shadow-sm sm:px-8 sm:py-12"
        >
          <p className="text-xs font-black uppercase tracking-[0.2em] text-navy-primary sm:text-sm">
            エージェントの皆さまへ
          </p>
          <h1 className="mt-4 text-balance text-2xl font-black leading-snug text-navy-secondary sm:text-3xl md:text-4xl">
            Chonburi Homeで
            <br />
            物件を世界に届けましょう
          </h1>
          <p className="mx-auto mt-5 max-w-md text-left text-base font-medium leading-relaxed text-slate-600 sm:text-center sm:text-lg">
            パタヤ・シラチャで日々頑張る不動産のプロのみなさん向けの、かんたんガイドです。
            難しい操作はありません。このページを上から順にスクロールするだけで、流れがつかめます。
          </p>
        </section>

        {/* Step 1：テキスト → 画像 */}
        <section
          id="step-1-register"
          className="scroll-mt-24 mt-12 space-y-6 rounded-3xl border border-slate-100 bg-white p-5 shadow-sm sm:p-8"
        >
          <div className="flex items-start gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-navy-primary/10 text-sm font-black text-navy-primary">
              1
            </span>
            <div>
              <h2 className="text-xl font-black text-navy-secondary sm:text-2xl">登録：アカウントとプロフィール</h2>
              <p className="mt-1 text-xs font-bold uppercase tracking-wider text-slate-400">まずはここから</p>
            </div>
          </div>
          <div className="space-y-4 text-base font-medium leading-relaxed text-slate-600 sm:text-lg">
            <p>
              まずは無料の会員登録から。お店やご自身の名前がわかるようにプロフィールを整えると、お客様に安心して見てもらえます。
            </p>
            <p>電話番号や紹介文など、ご連絡しやすい内容を入れておくと反応がよくなりますよ。</p>
            <Link
              href={registerHref}
              className="inline-flex items-center gap-2 rounded-2xl bg-navy-primary px-5 py-3 text-sm font-black text-white shadow-md transition hover:bg-navy-secondary active:scale-[0.98]"
            >
              <Sparkles className="h-4 w-4" aria-hidden />
              登録ページを開く
            </Link>
          </div>
          <figure className="overflow-hidden rounded-2xl border border-slate-100 bg-slate-100 shadow-inner">
            <Image
              src="/images/manual/step1.png"
              alt="ステップ1：登録とプロフィール入力の画面イメージ"
              width={1200}
              height={900}
              className="h-auto w-full object-cover"
              sizes="(max-width: 768px) 100vw, 672px"
              priority
            />
          </figure>
        </section>

        {/* Step 2：画像 → テキスト（ステップ1と視線のリズムを変える） */}
        <section
          id="step-2-listing"
          className="scroll-mt-24 mt-12 space-y-6 rounded-3xl border border-slate-100 bg-white p-5 shadow-sm sm:p-8"
        >
          <div className="flex items-start gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-navy-primary/10 text-sm font-black text-navy-primary">
              2
            </span>
            <div>
              <h2 className="text-xl font-black text-navy-secondary sm:text-2xl">掲載：物件情報の入力と公開</h2>
              <p className="mt-1 text-xs font-bold uppercase tracking-wider text-slate-400">写真が命です</p>
            </div>
          </div>
          <figure className="overflow-hidden rounded-2xl border border-slate-100 bg-slate-100 shadow-inner">
            <Image
              src="/images/manual/step2.png"
              alt="ステップ2：物件を掲載する画面イメージ"
              width={1200}
              height={900}
              className="h-auto w-full object-cover"
              sizes="(max-width: 768px) 100vw, 672px"
            />
          </figure>
          <div className="space-y-4 text-base font-medium leading-relaxed text-slate-600 sm:text-lg">
            <p>
              間取りや家賃、設備など、画面に出てくる項目に沿って入力していくだけです。きれいな写真を多めに載せると、海外のお客様の目に留まりやすくなります。
            </p>
            <p>入力が終わったら公開。あとはChonburi Homeを見ている方からのお問い合わせを待ちましょう。</p>
            <Link
              href={listHref}
              className="inline-flex items-center gap-2 rounded-2xl border-2 border-navy-primary bg-white px-5 py-3 text-sm font-black text-navy-primary transition hover:bg-slate-50 active:scale-[0.98]"
            >
              <Home className="h-4 w-4" aria-hidden />
              物件を掲載する
            </Link>
          </div>
        </section>

        {/* Step 3：テキスト → 画像 */}
        <section
          id="step-3-inquiries"
          className="scroll-mt-24 mt-12 space-y-6 rounded-3xl border border-slate-100 bg-white p-5 shadow-sm sm:p-8"
        >
          <div className="flex items-start gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-navy-primary/10 text-sm font-black text-navy-primary">
              3
            </span>
            <div>
              <h2 className="text-xl font-black text-navy-secondary sm:text-2xl">管理：お問い合わせの確認</h2>
              <p className="mt-1 text-xs font-bold uppercase tracking-wider text-slate-400">見逃さないために</p>
            </div>
          </div>
          <div className="space-y-4 text-base font-medium leading-relaxed text-slate-600 sm:text-lg">
            <p>
              お問い合わせが届くと、専用の管理画面に一覧で表示されます。こまめにチェックして、お客様へ早めのご返信を心がけてみてください。
            </p>
            <p>スマホのブラウザからも開けます。行き交いの合間にサッと確認するのにおすすめです。</p>
            <Link
              href={dashboardHref}
              className="inline-flex items-center gap-2 rounded-2xl bg-navy-primary px-5 py-3 text-sm font-black text-white shadow-md transition hover:bg-navy-secondary active:scale-[0.98]"
            >
              <Inbox className="h-4 w-4" aria-hidden />
              管理画面を開く
            </Link>
          </div>
          <figure className="overflow-hidden rounded-2xl border border-slate-100 bg-slate-100 shadow-inner">
            <Image
              src="/images/manual/step3.png"
              alt="ステップ3：お問い合わせを確認する画面イメージ"
              width={1200}
              height={900}
              className="h-auto w-full object-cover"
              sizes="(max-width: 768px) 100vw, 672px"
            />
          </figure>
        </section>

        {/* サポート：LINE */}
        <section
          id="support-line"
          className="scroll-mt-24 mt-12 overflow-hidden rounded-3xl border border-emerald-100 bg-gradient-to-br from-emerald-50/80 to-white p-6 shadow-sm sm:p-10"
        >
          <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-xl font-black text-navy-secondary sm:text-2xl">わからないことはLINEで</h2>
              <p className="mt-3 text-base font-medium leading-relaxed text-slate-600 sm:text-lg">
                操作で迷ったときや、掲載の相談があれば、公式LINEへ気軽にご連絡ください。スタッフがやさしくお手伝いします。
              </p>
            </div>
            <Link
              href={officialLineAddFriendUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex shrink-0 items-center justify-center gap-2 rounded-2xl bg-[#06C755] px-6 py-4 text-base font-black text-white shadow-lg transition hover:brightness-110 active:scale-[0.98]"
            >
              <MessageCircle className="h-5 w-5" aria-hidden />
              公式LINEを開く
            </Link>
          </div>
        </section>
      </div>
    </div>
  )
}
