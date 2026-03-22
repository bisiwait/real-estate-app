import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'
import { redirect } from 'next/navigation'
import { getDictionary } from '@/lib/i18n/get-dictionary'
import Link from 'next/link'
import { Gift, Sparkles } from 'lucide-react'

/** パタヤ沿岸のイメージ（薄い背景用・Unsplash） */
const BEACH_BG =
    'https://images.unsplash.com/photo-1559827260-dc66d52bef19?auto=format&fit=crop&w=1920&q=75'

export default async function SignupSuccessPage({
    params,
}: {
    params: Promise<{ locale: string }>
}) {
    const { locale } = await params
    const supabase = await createClient()
    const {
        data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
        redirect(`/${locale}`)
    }

    const { data: profile } = await supabase
        .from('profiles')
        .select('user_role, is_admin')
        .eq('id', user.id)
        .single()

    const isAdmin = profile?.is_admin === true || profile?.user_role === 'admin'
    const isAgent = profile?.user_role === 'agent'

    if (isAdmin) {
        redirect(`/${locale}/admin-secret`)
    }
    if (isAgent) {
        redirect(`/${locale}/dashboard`)
    }

    const dict = await getDictionary(locale)
    const copy =
        (dict as { signup_success_page?: Record<string, string> }).signup_success_page || {}

    const title = copy.title || '登録が完了しました！'
    const welcomeBrand = copy.welcome_brand || 'Welcome to Chonburi Connect!'
    const subtitle =
        copy.subtitle || 'ご登録ありがとうございます。理想の物件探しをお手伝いします。'
    const ctaProperties = copy.cta_properties || '物件を探しに行く'
    const ctaProfile = copy.cta_profile || 'プロフィールを設定する'

    return (
        <div className="relative min-h-[calc(100vh-80px)] overflow-hidden bg-slate-50">
            <div
                className="pointer-events-none absolute inset-0 bg-cover bg-center opacity-[0.18]"
                style={{ backgroundImage: `url('${BEACH_BG}')` }}
            />
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-white/80 via-sky-50/90 to-emerald-50/80" />

            <div className="relative z-10 mx-auto flex min-h-[calc(100vh-80px)] max-w-lg flex-col justify-center px-4 py-12 sm:max-w-xl sm:px-6 sm:py-16">
                <div className="rounded-3xl border border-white/60 bg-white/90 p-8 shadow-xl backdrop-blur-md sm:p-10 md:p-12">
                    <div className="mb-8 flex flex-col items-center text-center">
                        <div className="relative mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-sky-400 to-emerald-500 shadow-lg shadow-sky-500/30">
                            <Gift className="h-10 w-10 text-white" strokeWidth={2} />
                            <Sparkles className="absolute -right-1 -top-1 h-7 w-7 text-amber-400 drop-shadow-md" />
                        </div>

                        <h1 className="text-balance text-2xl font-black tracking-tight text-navy-secondary sm:text-3xl md:text-4xl">
                            {title}
                        </h1>
                        <p className="mt-3 text-lg font-bold text-navy-primary sm:text-xl">{welcomeBrand}</p>
                        <p className="mt-5 max-w-md text-pretty text-sm leading-relaxed text-slate-600 sm:text-base">
                            {subtitle}
                        </p>
                    </div>

                    <div className="flex w-full flex-col gap-3 sm:flex-row sm:gap-4">
                        <Link
                            href={`/${locale}/properties`}
                            className="flex min-h-[52px] flex-1 items-center justify-center rounded-2xl bg-navy-primary px-6 py-3.5 text-center text-base font-black text-white shadow-lg transition-all hover:bg-navy-secondary hover:shadow-xl active:scale-[0.98]"
                        >
                            {ctaProperties}
                        </Link>
                        <Link
                            href={`/${locale}/profile`}
                            className="flex min-h-[52px] flex-1 items-center justify-center rounded-2xl border-2 border-slate-200 bg-white/80 px-6 py-3.5 text-center text-base font-bold text-slate-700 transition-all hover:border-navy-primary/30 hover:bg-slate-50 active:scale-[0.98]"
                        >
                            {ctaProfile}
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    )
}
