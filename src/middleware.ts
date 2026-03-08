import { NextResponse, type NextRequest } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'

export default async function proxy(request: NextRequest) {
    const { supabase, response } = await updateSession(request)

    const { data: { user } } = await supabase.auth.getUser()

    // ロールベースのアクセス制御
    if (user) {
        const url = request.nextUrl.clone()
        const path = url.pathname

        // /admin-secret または /dashboard へのアクセスをチェック
        if (path.startsWith('/admin-secret') || path.startsWith('/dashboard')) {
            let { data: profile, error: profileError } = await supabase
                .from('profiles')
                .select('user_role, is_admin, available_credits')
                .eq('id', user.id)
                .single()

            // フォールバック: ロールカラムがない場合
            if (profileError) {
                const { data: fallbackProfile } = await supabase
                    .from('profiles')
                    .select('is_admin, available_credits')
                    .eq('id', user.id)
                    .single()
                profile = fallbackProfile as any
            }

            const isAdmin = profile?.is_admin === true || profile?.user_role === 'admin';
            const hasCredits = (profile?.available_credits || 0) > 0;
            const isAgent = profile?.user_role === 'agent' || hasCredits || (profile?.user_role === undefined && !isAdmin);

            // 管理者でないのに /admin-secret にアクセス
            if (path.startsWith('/admin-secret') && !isAdmin) {
                return NextResponse.redirect(new URL('/', request.url))
            }

            // エージェント以上でないのに /dashboard にアクセス
            if (path.startsWith('/dashboard') && !isAdmin && !isAgent) {
                return NextResponse.redirect(new URL('/mypage', request.url))
            }

            // 管理者やエージェントが一般マイページやお気に入りにアクセスした場合のリダイレクト
            if (path.startsWith('/mypage') || path.startsWith('/favorites')) {
                if (isAdmin) {
                    return NextResponse.redirect(new URL('/admin-secret', request.url))
                }
                if (isAgent) {
                    return NextResponse.redirect(new URL('/dashboard', request.url))
                }
            }
        } else if (path.startsWith('/mypage') || path.startsWith('/favorites')) {
            // /mypage や /favorites へのリダイレクト判定（パスのみでチェック）
            let { data: profile, error: profileError } = await supabase
                .from('profiles')
                .select('user_role, is_admin, available_credits')
                .eq('id', user.id)
                .single()

            if (profileError) {
                const { data: fallbackProfile } = await supabase
                    .from('profiles')
                    .select('is_admin, available_credits')
                    .eq('id', user.id)
                    .single()
                profile = fallbackProfile as any
            }

            const isAdmin = profile?.is_admin === true || profile?.user_role === 'admin';
            const hasCredits = (profile?.available_credits || 0) > 0;
            const isAgent = profile?.user_role === 'agent' || hasCredits || (profile?.user_role === undefined && !isAdmin);

            if (isAdmin) {
                return NextResponse.redirect(new URL('/admin-secret', request.url))
            }
            if (isAgent) {
                return NextResponse.redirect(new URL('/dashboard', request.url))
            }
        }
    }

    return response
}

export const config = {
    matcher: [
        '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
    ],
}
