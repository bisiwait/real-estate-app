import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { getDictionary } from '@/lib/i18n/get-dictionary'
import { SIGNUP_WELCOME_COOKIE_NAME } from '@/lib/auth/signupWelcomeCookie'
import { getSessionProfileAccess } from '@/lib/admin'
import Link from 'next/link'
import { Gift, Sparkles, Heart } from 'lucide-react'

export const dynamic = 'force-dynamic'

/** パタヤ沿岸のイメージ（薄い背景用・Unsplash） */
const BEACH_BG =
    'https://images.unsplash.com/photo-1559827260-dc66d52bef19?auto=format&fit=crop&w=1920&q=75'

export default async function SignupSuccessPage({
    params,
    searchParams,
}: {
    params: Promise<{ locale: string }>
    searchParams: Promise<{ new?: string }>
}) {
    const { locale } = await params
    const sp = await searchParams
    const cookieStore = await cookies()
    const hasWelcomeCookie = cookieStore.get(SIGNUP_WELCOME_COOKIE_NAME)?.value === '1'
    const fromRegistration = sp.new === '1' || hasWelcomeCookie

    const supabase = await createClient()
    const {
        data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
        redirect(`/${locale}`)
    }

    const { isAdmin, isAgent } = await getSessionProfileAccess()

    if (isAdmin) {
        redirect(`/${locale}/admin-secret`)
    }
    if (isAgent) {
        redirect(`/${locale}/dashboard`)
    }

    // 一般ユーザー: 登録フローからの遷移（?new=1 または短命クッキー）のみ表示
    if (!fromRegistration) {
        redirect(`/${locale}/mypage`)
    }

    const dict = await getDictionary(locale)
    const copy =
        (dict as { signup_success_page?: Record<string, string> }).signup_success_page || {}

    const mainHeadline =
        copy.main_headline || '登録が完了しました！ Welcome to Chonburi Home!'
    const subtitle =
        copy.subtitle || 'ご登録ありがとうございます。理想の物件探しをお手伝いします。'
    const favoritesTitle = copy.favorites_card_title || 'お気に入り機能'
    const favoritesBody =
        copy.favorites_card_body ||
        '気になる物件は ❤️ マークを押して保存できます。自分だけのリストを作ってじっくり比較しましょう！'
    const ctaProperties = copy.cta_properties || '物件を探しに行く'
    const ctaProfile = copy.cta_profile || 'プロフィール設定'

    return (
        <div className="relative min-h-[calc(100vh-80px)] overflow-hidden bg-slate-50">
            <div
                className="pointer-events-none absolute inset-0 bg-cover bg-center opacity-[0.16]"
                style={{ backgroundImage: `url('${BEACH_BG}')` }}
            />
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-white/85 via-sky-50/92 to-emerald-50/85" />

            <div className="relative z-10 mx-auto max-w-lg px-4 py-10 sm:max-w-xl sm:px-6 sm:py-14">
                <div className="rounded-3xl border border-slate-200/80 bg-white/95 p-6 shadow-xl backdrop-blur-md sm:p-8 md:p-10">
                    <div className="mb-8 flex flex-col items-center text-center">
                        <div className="relative mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-sky-500 to-emerald-500 shadow-lg shadow-sky-500/25 sm:h-20 sm:w-20">
                            <Gift className="h-8 w-8 text-white sm:h-10 sm:w-10" strokeWidth={2} />
                            <Sparkles className="absolute -right-0.5 -top-0.5 h-6 w-6 text-amber-400 drop-shadow-md sm:h-7 sm:w-7" />
                        </div>

                        <h1 className="text-balance text-xl font-black leading-snug tracking-tight text-navy-secondary sm:text-2xl md:text-3xl">
                            {mainHeadline}
                        </h1>
                        <p className="mt-4 max-w-md text-pretty text-sm leading-relaxed text-slate-600 sm:text-base">
                            {subtitle}
                        </p>
                    </div>

                    <div className="flex flex-col gap-4">
                        {/* お気に入り紹介カード（再訪率） */}
                        <div className="flex gap-3 rounded-2xl border border-rose-100 bg-gradient-to-br from-rose-50/90 to-white p-4 shadow-sm ring-1 ring-rose-100/60 sm:p-5">
                            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white shadow-sm ring-1 ring-rose-100">
                                <Heart
                                    className="h-5 w-5 fill-red-500 text-red-500"
                                    strokeWidth={1.5}
                                    aria-hidden
                                />
                            </div>
                            <div className="min-w-0 text-left">
                                <p className="text-xs font-black uppercase tracking-wider text-rose-600/90">
                                    {favoritesTitle}
                                </p>
                                <p className="mt-1.5 text-sm font-medium leading-relaxed text-slate-700">
                                    {favoritesBody}
                                </p>
                            </div>
                        </div>

                        {/* メインCTA */}
                        <div className="mt-2 flex flex-col gap-3 border-t border-slate-100 pt-6">
                            <Link
                                href={`/${locale}/properties`}
                                className="flex min-h-[52px] w-full items-center justify-center rounded-2xl bg-navy-primary px-6 py-3.5 text-center text-base font-black text-white shadow-lg transition-all hover:bg-navy-secondary hover:shadow-xl active:scale-[0.98]"
                            >
                                {ctaProperties}
                            </Link>
                            <Link
                                href={`/${locale}/profile`}
                                className="flex min-h-[48px] w-full items-center justify-center rounded-2xl border-2 border-slate-200 bg-white px-6 py-3 text-center text-sm font-bold text-slate-700 transition-all hover:border-navy-primary/25 hover:bg-slate-50 active:scale-[0.98]"
                            >
                                {ctaProfile}
                            </Link>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
