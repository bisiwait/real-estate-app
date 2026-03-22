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

export default async function middleware(request: NextRequest) {
    const pathname = request.nextUrl.pathname

    // Skip redirection for API and internal Next.js paths
    if (
        pathname.startsWith('/api') ||
        pathname.startsWith('/_next') ||
        pathname.includes('favicon.ico') ||
        pathname.match(/\.(svg|png|jpg|jpeg|gif|webp|ttf|woff|woff2)$/)
    ) {
        return (await updateSession(request)).response
    }

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
        '/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ttf|woff|woff2)$).*)',
    ],
}
