import { NextResponse, type NextRequest } from 'next/server'
import { createRouteHandlerSupabaseClient } from '@/lib/supabase/server'
import { syncAgentProfileFromAuthUser } from '@/lib/auth/syncAgentProfile'
import { safeNextPath } from '@/lib/auth/safe-next-path'
import { AUTH_RETURN_TO_COOKIE } from '@/lib/auth/auth-return-cookie'
import { LINE_INQUIRY_RETURN_PATH_COOKIE } from '@/lib/inquiry-line-return-cookie'

const LOCALES = ['jp', 'en', 'th'] as const

function localeFromPath(pathname: string): string {
    const seg = pathname.split('/').filter(Boolean)[0]
    return LOCALES.includes(seg as (typeof LOCALES)[number]) ? seg : 'jp'
}

function safeNext(queryNext: string | null, request: NextRequest, locale: string): string {
    const fromQuery = safeNextPath(queryNext)
    if (fromQuery) return fromQuery

    const raw = request.cookies.get(AUTH_RETURN_TO_COOKIE)?.value
    if (raw) {
        try {
            const fromCookie = safeNextPath(decodeURIComponent(raw))
            if (fromCookie) return fromCookie
        } catch {
            /* 無視 */
        }
    }

    return `/${locale}/dashboard`
}

function clearAuthReturnCookie(response: NextResponse) {
    response.cookies.set(AUTH_RETURN_TO_COOKIE, '', { path: '/', maxAge: 0 })
}

export async function GET(request: NextRequest) {
    const url = new URL(request.url)
    const code = url.searchParams.get('code')
    const locale = localeFromPath(url.pathname)
    const next = safeNext(url.searchParams.get('next'), request, locale)

    if (code) {
        const redirectOk = NextResponse.redirect(`${url.origin}${next}`)
        clearAuthReturnCookie(redirectOk)
        redirectOk.cookies.set(LINE_INQUIRY_RETURN_PATH_COOKIE, '', { path: '/', maxAge: 0 })
        const supabase = createRouteHandlerSupabaseClient(request, redirectOk)
        const { data, error } = await supabase.auth.exchangeCodeForSession(code)
        if (!error && data.user) {
            await syncAgentProfileFromAuthUser(data.user)
            const { data: prof } = await supabase
                .from('profiles')
                .select('user_role, status, deleted_at')
                .eq('id', data.user.id)
                .maybeSingle()
            if (
                prof?.user_role === 'agent' &&
                (prof.deleted_at != null || prof.status === 'suspended')
            ) {
                await supabase.auth.signOut()
                const blocked = NextResponse.redirect(
                    `${url.origin}/${locale}/login?error=account_unavailable`
                )
                redirectOk.cookies.getAll().forEach((c) => blocked.cookies.set(c))
                return blocked
            }
            return redirectOk
        }
        // LINE の code を Supabase に渡した場合など: 物件ページ Cookie があれば code/state を付けて戻し LIFF を継続
        const rawReturn = request.cookies.get(LINE_INQUIRY_RETURN_PATH_COOKIE)?.value
        let safeReturn: string | null = null
        if (rawReturn) {
            try {
                safeReturn = safeNextPath(decodeURIComponent(rawReturn))
            } catch {
                /* */
            }
        }
        const sp = new URLSearchParams(url.searchParams.toString())
        sp.delete('next')
        const qs = sp.toString()
        const recoveryTarget =
            safeReturn && url.searchParams.get('code')
                ? `${url.origin}${safeReturn}${qs ? `?${qs}` : ''}`
                : `${url.origin}${next}`
        const recovery = NextResponse.redirect(recoveryTarget)
        clearAuthReturnCookie(recovery)
        recovery.cookies.set(LINE_INQUIRY_RETURN_PATH_COOKIE, '', { path: '/', maxAge: 0 })
        return recovery
    }

    const fail = NextResponse.redirect(`${url.origin}/${locale}/login?error=auth_callback`)
    clearAuthReturnCookie(fail)
    return fail
}
