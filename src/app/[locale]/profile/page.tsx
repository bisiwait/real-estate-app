import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'
import { redirect } from 'next/navigation'

/**
 * 一般ユーザー向けプロフィール設定のエイリアス（マイページのプロフィールタブへ）
 */
export default async function ProfilePage({
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
        redirect(`/${locale}/login?next=${encodeURIComponent(`/${locale}/mypage?tab=profile`)}`)
    }

    redirect(`/${locale}/mypage?tab=profile`)
}
