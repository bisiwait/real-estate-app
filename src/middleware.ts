import { NextResponse, type NextRequest } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'
const locales = ['jp', 'en', 'th']
const defaultLocale = 'jp'

function getLocale(request: NextRequest): string {
    // 1. Cookie check (NEXT_LOCALE)
    const cookieLocale = request.cookies.get('NEXT_LOCALE')?.value
    if (cookieLocale && locales.includes(cookieLocale)) {
        return cookieLocale
    }

    // 2. Simple Accept-Language header parsing
    const acceptLanguage = request.headers.get('accept-language')
    if (acceptLanguage) {
        if (acceptLanguage.includes('en')) return 'en'
        if (acceptLanguage.includes('th')) return 'th'
        if (acceptLanguage.includes('ja')) return 'jp'
    }

    return defaultLocale
}

/**
 * Supabase の Site URL がオリジンだけ（例: http://localhost:3000）のとき、
 * OAuth 後に `/?code=...` や `/jp/?code=...` に戻ることがある。
 * そのままでは /[locale]/auth/callback の exchangeCodeForSession に届かないため、ここで寄せる。
 */
function redirectOAuthPkceCodeToAuthCallback(request: NextRequest): NextResponse | null {
    const code = request.nextUrl.searchParams.get('code')
    if (!code) return null

    const pathname = request.nextUrl.pathname

    const alreadyOnCallback = locales.some((locale) => {
        const base = `/${locale}/auth/callback`
        return pathname === base || pathname.startsWith(`${base}/`)
    })
    if (alreadyOnCallback) return null

    let targetLocale: string | null = null
    if (pathname === '/') {
        targetLocale = getLocale(request)
    } else if (pathname === '/auth/callback' || pathname === '/auth/callback/') {
        // Supabase に登録しやすいロケールなし URL から、[locale]/auth/callback へ寄せる
        targetLocale = getLocale(request)
    } else {
        const root = locales.find((locale) => pathname === `/${locale}` || pathname === `/${locale}/`)
        if (root) targetLocale = root
    }

    if (!targetLocale) return null

    const url = request.nextUrl.clone()
    url.pathname = `/${targetLocale}/auth/callback`
    return NextResponse.redirect(url)
}

export default async function middleware(request: NextRequest) {
    const pathname = request.nextUrl.pathname

    // Skip redirection for API and internal Next.js paths
    if (
        pathname.startsWith('/api') ||
        pathname.startsWith('/_next') ||
        pathname.includes('favicon.ico') ||
        pathname.match(/\.(svg|png|jpg|jpeg|gif|webp|ttf|woff|woff2|webmanifest|ico)$/)
    ) {
        return (await updateSession(request)).response
    }

    const oauthRedirect = redirectOAuthPkceCodeToAuthCallback(request)
    if (oauthRedirect) return oauthRedirect

    // Check if there is any supported locale in the pathname
    const pathnameHasLocale = locales.some(
        (locale) => pathname.startsWith(`/${locale}/`) || pathname === `/${locale}`
    )

    if (!pathnameHasLocale) {
        const locale = getLocale(request)
        const url = request.nextUrl.clone()
        url.pathname = `/${locale}${pathname}`
        return NextResponse.redirect(url)
    }

    // Extract current locale from pathname
    const currentLocale = locales.find(
        (locale) => pathname.startsWith(`/${locale}/`) || pathname === `/${locale}`
    ) || defaultLocale

    const { supabase, response } = await updateSession(request)

    const { data: { user } } = await supabase.auth.getUser()

    // Role-based access control (Locale Aware)
    if (user) {
        const url = request.nextUrl.clone()
        const pathWithoutLocale = pathname.replace(`/${currentLocale}`, '') || '/'

        // /admin-secret または /dashboard へのアクセスをチェック
        if (pathWithoutLocale.startsWith('/admin-secret') || pathWithoutLocale.startsWith('/dashboard')) {
            let { data: profile, error: profileError } = await supabase
                .from('profiles')
                .select('user_role, is_admin')
                .eq('id', user.id)
                .single()

            if (profileError) {
                const { data: fallbackProfile } = await supabase
                    .from('profiles')
                    .select('is_admin, user_role')
                    .eq('id', user.id)
                    .single()
                profile = fallbackProfile as any
            }

            const isAdmin = profile?.is_admin === true || profile?.user_role === 'admin';
            const isAgent = profile?.user_role === 'agent';

            if (pathWithoutLocale.startsWith('/admin-secret') && !isAdmin) {
                return NextResponse.redirect(new URL(`/${currentLocale}`, request.url))
            }

            if (pathWithoutLocale.startsWith('/dashboard') && !isAdmin && !isAgent) {
                return NextResponse.redirect(new URL(`/${currentLocale}/mypage`, request.url))
            }

            if (pathWithoutLocale.startsWith('/mypage') || pathWithoutLocale.startsWith('/favorites')) {
                if (isAdmin) {
                    return NextResponse.redirect(new URL(`/${currentLocale}/admin-secret`, request.url))
                }
                if (isAgent) {
                    return NextResponse.redirect(new URL(`/${currentLocale}/dashboard`, request.url))
                }
            }
        } else if (pathWithoutLocale.startsWith('/mypage') || pathWithoutLocale.startsWith('/favorites')) {
            let { data: profile, error: profileError } = await supabase
                .from('profiles')
                .select('user_role, is_admin')
                .eq('id', user.id)
                .single()

            if (profileError) {
                const { data: fallbackProfile } = await supabase
                    .from('profiles')
                    .select('is_admin, user_role')
                    .eq('id', user.id)
                    .single()
                profile = fallbackProfile as any
            }

            const isAdmin = profile?.is_admin === true || profile?.user_role === 'admin';
            const isAgent = profile?.user_role === 'agent';

            if (isAdmin) {
                return NextResponse.redirect(new URL(`/${currentLocale}/admin-secret`, request.url))
            }
            if (isAgent) {
                return NextResponse.redirect(new URL(`/${currentLocale}/dashboard`, request.url))
            }
        }
    }

    return response
}

export const config = {
    matcher: [
        // 単独の「/」は次のパターンにマッチしない環境があるため明示する（/?code= の OAuth 戻り用）
        '/',
        '/((?!api|_next/static|_next/image|favicon.ico|site.webmanifest|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ttf|woff|woff2|webmanifest|ico)$).*)',
    ],
}
