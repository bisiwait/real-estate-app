import { NextResponse, type NextRequest } from 'next/server'
import { createRouteHandlerSupabaseClient, createAdminClient } from '@/lib/supabase/server'
import { syncAgentProfileFromAuthUser } from '@/lib/auth/syncAgentProfile'
import { safeNextPath } from '@/lib/auth/safe-next-path'
import { AUTH_RETURN_TO_COOKIE } from '@/lib/auth/auth-return-cookie'
import { profileAccessFromRow } from '@/lib/supabase/fetch-profile-access'

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
        const supabase = createRouteHandlerSupabaseClient(request, redirectOk)
        const { data, error } = await supabase.auth.exchangeCodeForSession(code)
        if (!error && data.user) {
            await syncAgentProfileFromAuthUser(data.user)
            const admin = await createAdminClient()
            const { data: prof } = await admin
                .from('profiles')
                .select('user_role, is_admin, status, deleted_at')
                .eq('id', data.user.id)
                .maybeSingle()
            const { isAdmin, isAgent, agentBlocked } = profileAccessFromRow(prof)
            if (isAgent && agentBlocked) {
                await supabase.auth.signOut()
                const blocked = NextResponse.redirect(
                    `${url.origin}/${locale}/login?error=account_unavailable`
                )
                redirectOk.cookies.getAll().forEach((c) => blocked.cookies.set(c))
                return blocked
            }
            if (isAdmin && next === `/${locale}/dashboard`) {
                return NextResponse.redirect(`${url.origin}/${locale}/admin-secret`)
            }
            return redirectOk
        }
        const failExchange = NextResponse.redirect(`${url.origin}/${locale}/login?error=auth_callback`)
        clearAuthReturnCookie(failExchange)
        return failExchange
    }

    const fail = NextResponse.redirect(`${url.origin}/${locale}/login?error=auth_callback`)
    clearAuthReturnCookie(fail)
    return fail
}
