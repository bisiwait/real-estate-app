import { NextResponse } from 'next/server'
export const runtime = 'edge';
import { createClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
    const { searchParams, origin } = new URL(request.url)
    const code = searchParams.get('code')
    const type = searchParams.get('type')
    const next = searchParams.get('next') ?? '/list-property'

    if (code) {
        const supabase = await createClient()
        const { error } = await supabase.auth.exchangeCodeForSession(code)

        if (!error) {
            // パスワード再設定の場合はリセット画面へ
            if (type === 'recovery') {
                return NextResponse.redirect(`${origin}/auth/reset-password`)
            }

            // next が指定されている場合はそちらを優先（物件投稿など）
            if (searchParams.get('next')) {
                return NextResponse.redirect(`${origin}${searchParams.get('next')}`)
            }

            // 指定がない場合はロールに基づいて振り分け
            const { data: { user } } = await supabase.auth.getUser()
            if (user) {
                const { data: profile } = await supabase
                    .from('profiles')
                    .select('user_role, is_admin')
                    .eq('id', user.id)
                    .single()

                if (profile?.user_role === 'admin' || profile?.is_admin) {
                    return NextResponse.redirect(`${origin}/admin-secret`)
                } else if (profile?.user_role === 'agent') {
                    return NextResponse.redirect(`${origin}/dashboard`)
                } else {
                    return NextResponse.redirect(`${origin}/mypage`)
                }
            }

            return NextResponse.redirect(`${origin}/mypage`)
        }
    }

    // Return the user to an error page with instructions
    return NextResponse.redirect(`${origin}/login?error=Auth code exchange failed`)
}
