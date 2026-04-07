import { NextResponse, type NextRequest } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'

const locales = ['jp', 'en', 'th']
const defaultLocale = 'jp'

/** Supabase の signOut が更新した Cookie をリダイレクト応答へ載せる */
function redirectWithAuthCookies(from: NextResponse, url: URL) {
    const to = NextResponse.redirect(url)
    from.cookies.getAll().forEach((c) => {
        to.cookies.set(c)
    })
    return to
}

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

    // 友だち追加オプション付き LINE リダイレクト等。Supabase の code と混同しない。
    if (request.nextUrl.searchParams.has('friendship_status_changed')) return null

    // ロケールトップ（/jp 等）への ?code= は想定外のコールバックであり得る
    const isLocaleHomeOnly = locales.some(
        (locale) => pathname === `/${locale}` || pathname === `/${locale}/`
    )
    if (isLocaleHomeOnly) return null

    if (pathname.includes('/properties/')) return null

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
    if (!url.searchParams.has('next')) {
        const returnPath = pathname === '/' ? `/${targetLocale}` : pathname
        url.searchParams.set('next', returnPath)
    }
    return NextResponse.redirect(url)
}

export default async function middleware(request: NextRequest) {
    const pathname = request.nextUrl.pathname

    // ISO の ja はルートに無い（日本語は jp）
    if (pathname === '/ja' || pathname === '/ja/') {
        const url = request.nextUrl.clone()
        url.pathname = '/jp'
        return NextResponse.redirect(url)
    }
    if (pathname.startsWith('/ja/')) {
        const url = request.nextUrl.clone()
        url.pathname = `/jp${pathname.slice(3)}`
        return NextResponse.redirect(url)
    }

    // /JP/ /EN/ /TH/ など大文字ロケールは Next の [locale] と一致せず 404
    if (pathname.length > 1 && pathname.startsWith('/')) {
        const slash2 = pathname.indexOf('/', 1)
        const seg = slash2 === -1 ? pathname.slice(1) : pathname.slice(1, slash2)
        const rest = slash2 === -1 ? '' : pathname.slice(slash2)
        if (seg && !seg.includes('.')) {
            const lower = seg.toLowerCase()
            if (locales.includes(lower) && seg !== lower) {
                const url = request.nextUrl.clone()
                url.pathname = `/${lower}${rest}`
                return NextResponse.redirect(url)
            }
        }
    }

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
                .select('user_role, is_admin, status, deleted_at')
                .eq('id', user.id)
                .single()

            if (profileError) {
                const { data: fallbackProfile } = await supabase
                    .from('profiles')
                    .select('is_admin, user_role, status, deleted_at')
                    .eq('id', user.id)
                    .single()
                profile = fallbackProfile as any
            }

            const isAdmin = profile?.is_admin === true || profile?.user_role === 'admin';
            const isAgent = profile?.user_role === 'agent';
            const agentBlocked =
                isAgent &&
                (profile?.status === 'suspended' || profile?.deleted_at != null);

            if (pathWithoutLocale.startsWith('/admin-secret') && !isAdmin) {
                return NextResponse.redirect(new URL(`/${currentLocale}`, request.url))
            }

            if (pathWithoutLocale.startsWith('/dashboard')) {
                if (agentBlocked) {
                    await supabase.auth.signOut()
                    return redirectWithAuthCookies(
                        response,
                        new URL(
                            `/${currentLocale}/login?error=account_unavailable`,
                            request.url
                        )
                    )
                }
                if (!isAdmin && !isAgent) {
                    return NextResponse.redirect(new URL(`/${currentLocale}/mypage`, request.url))
                }
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
                .select('user_role, is_admin, status, deleted_at')
                .eq('id', user.id)
                .single()

            if (profileError) {
                const { data: fallbackProfile } = await supabase
                    .from('profiles')
                    .select('is_admin, user_role, status, deleted_at')
                    .eq('id', user.id)
                    .single()
                profile = fallbackProfile as any
            }

            const isAdmin = profile?.is_admin === true || profile?.user_role === 'admin';
            const isAgent = profile?.user_role === 'agent';
            const agentBlocked =
                isAgent &&
                (profile?.status === 'suspended' || profile?.deleted_at != null);

            if (isAdmin) {
                return NextResponse.redirect(new URL(`/${currentLocale}/admin-secret`, request.url))
            }
            if (isAgent) {
                if (agentBlocked) {
                    await supabase.auth.signOut()
                    return redirectWithAuthCookies(
                        response,
                        new URL(
                            `/${currentLocale}/login?error=account_unavailable`,
                            request.url
                        )
                    )
                }
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
