import { NextResponse, type NextRequest } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'
import { LINE_INQUIRY_RETURN_PATH_COOKIE } from '@/lib/inquiry-line-return-cookie'

const locales = ['jp', 'en', 'th']
const PROPERTY_UUID_IN_PATH =
    /^\/(jp|en|th)\/properties\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/i
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

    // LINE Login のリダイレクトにだけ付くことがある（友だち追加オプション有効時）。Supabase の code と混同しない。
    if (request.nextUrl.searchParams.has('friendship_status_changed')) return null

    // ロケールトップ（/jp 等）への ?code= は LINE コールバックであり得る。auth/callback に寄せると交換失敗→トップへ戻り問い合わせが死ぬ。
    const isLocaleHomeOnly = locales.some(
        (locale) => pathname === `/${locale}` || pathname === `/${locale}/`
    )
    if (isLocaleHomeOnly) return null

    // LINE Login / LIFF も ?code= を付ける。Supabase PKCE へ寄せると exchange 失敗→/login になり問い合わせが完了しない。
    if (pathname.includes('/line/')) return null
    // liff.login() のリダイレクト先が物件 URL のとき、ここで auth/callback に飛ばさない。
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
    // LINE の code を誤って渡したときの復帰先（auth/callback が next へ戻せるようにする）
    if (!url.searchParams.has('next')) {
        const returnPath = pathname === '/' ? `/${targetLocale}` : pathname
        url.searchParams.set('next', returnPath)
    }
    return NextResponse.redirect(url)
}

/**
 * liff.login() 後のコールバックで URL から liff.state が消え、?code= だけになることがある。
 * 問い合わせフローで事前に保存した httpOnly Cookie（物件ページパス）から locale:uuid を復元する。
 */
function injectLiffStateOnLineInquiryBridgeOAuth(request: NextRequest): NextResponse | null {
    const pathname = request.nextUrl.pathname.replace(/\/$/, '') || '/'
    if (!/^\/(jp|en|th)\/line\/inquiry-bridge$/i.test(pathname)) return null

    const code = request.nextUrl.searchParams.get('code')
    if (!code) return null

    const existing = request.nextUrl.searchParams.get('liff.state')?.trim()
    if (existing) return null

    const raw = request.cookies.get(LINE_INQUIRY_RETURN_PATH_COOKIE)?.value
    if (!raw) return null

    let pathDecoded: string
    try {
        pathDecoded = decodeURIComponent(raw)
    } catch {
        return null
    }
    const m = pathDecoded.match(PROPERTY_UUID_IN_PATH)
    if (!m) return null

    const loc = m[1].toLowerCase()
    const uuid = m[2].toLowerCase()
    const url = request.nextUrl.clone()
    url.searchParams.set('liff.state', `${loc}:${uuid}`)
    return NextResponse.redirect(url)
}

export default async function middleware(request: NextRequest) {
    const pathname = request.nextUrl.pathname

    // ISO の ja はルートに無い（日本語は jp）。未処理だと下の「ロケール付与」で /jp/ja/... となり 404（LIFF 誤設定で多い）
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

    // LINE 公式: liff.line.me/{liffId}/追加パス はエンドポイント URL に結合される。
    // ?liff.state= が liff.line.me 上で /jp:UUID のように見えると、実リクエストが
    // /{locale}/line/inquiry-bridge/jp:UUID となりルートが無く 404。クエリへ戻す。
    const liffBridgeExtra = pathname.match(/^\/(jp|en|th)\/line\/inquiry-bridge\/(.+)$/)
    if (liffBridgeExtra) {
        const loc = liffBridgeExtra[1]
        let payload = liffBridgeExtra[2]
        try {
            payload = decodeURIComponent(payload)
        } catch {
            /* そのまま */
        }
        const url = request.nextUrl.clone()
        url.pathname = `/${loc}/line/inquiry-bridge`
        url.searchParams.set('liff.state', payload)
        return NextResponse.redirect(url)
    }

    // /jp/Line/inquiry-bridge 等（line セグメントの大文字）。パスは区別され 404 になりやすい
    const lineBridgeTypo = pathname.match(/^\/(jp|en|th)\/([^/]+)\/(inquiry-bridge)\/?$/)
    if (
        lineBridgeTypo &&
        lineBridgeTypo[2] !== 'line' &&
        lineBridgeTypo[2].toLowerCase() === 'line'
    ) {
        const url = request.nextUrl.clone()
        url.pathname = `/${lineBridgeTypo[1]}/line/${lineBridgeTypo[3]}`
        return NextResponse.redirect(url)
    }

    const liffOAuthBridge = injectLiffStateOnLineInquiryBridgeOAuth(request)
    if (liffOAuthBridge) return liffOAuthBridge

    // /JP/ /EN/ /TH/ など大文字ロケールは Next の [locale] と一致せず 404。LINE コンソールのコピペで起きやすい
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
