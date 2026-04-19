import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient, createRouteHandlerSupabaseClient } from '@/lib/supabase/server'
import { ADMIN_IMPERSONATION_REVERT_COOKIE } from '@/lib/auth/admin-impersonation'

const LOCALES = new Set(['jp', 'en', 'th'])

function clearRevertCookie(res: NextResponse) {
    res.cookies.set(ADMIN_IMPERSONATION_REVERT_COOKIE, '', {
        path: '/',
        maxAge: 0,
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
    })
}

/**
 * エージェント代行終了: Server Action 経由だと Set-Cookie が redirect に乗らないことがあるため、
 * auth/callback と同様に Route Handler で NextResponse にセッション Cookie を載せる。
 */
export async function GET(
    request: NextRequest,
    context: { params: Promise<{ locale: string }> }
) {
    const { locale: localeParam } = await context.params
    const locale = LOCALES.has(localeParam) ? localeParam : 'jp'
    const origin = request.nextUrl.origin

    const revertId = request.cookies.get(ADMIN_IMPERSONATION_REVERT_COOKIE)?.value
    if (!revertId) {
        return NextResponse.redirect(new URL(`/${locale}/login`, origin))
    }

    const adminSb = await createAdminClient()
    const { data: row, error: selErr } = await adminSb
        .from('admin_impersonation_revert_tokens')
        .select('id, expires_at, admin_access_token, admin_refresh_token, return_locale, target_user_id')
        .eq('id', revertId)
        .maybeSingle()

    if (selErr || !row) {
        const res = NextResponse.redirect(new URL(`/${locale}/login`, origin))
        clearRevertCookie(res)
        return res
    }

    if (new Date(row.expires_at).getTime() < Date.now()) {
        await adminSb.from('admin_impersonation_revert_tokens').delete().eq('id', revertId)
        const res = NextResponse.redirect(new URL(`/${locale}/login?error=impersonation_expired`, origin))
        clearRevertCookie(res)
        return res
    }

    const destLocale = LOCALES.has(row.return_locale) ? row.return_locale : 'jp'
    const redirectUrl = new URL(`/${destLocale}/admin-secret`, origin)
    const response = NextResponse.redirect(redirectUrl)

    const supabase = createRouteHandlerSupabaseClient(request, response)
    const {
        data: { user: caller },
    } = await supabase.auth.getUser()
    if (!caller || caller.id !== row.target_user_id) {
        await adminSb.from('admin_impersonation_revert_tokens').delete().eq('id', revertId)
        const bad = NextResponse.redirect(new URL(`/${locale}/login?error=impersonation_mismatch`, origin))
        clearRevertCookie(bad)
        return bad
    }

    const { error: setErr } = await supabase.auth.setSession({
        access_token: row.admin_access_token,
        refresh_token: row.admin_refresh_token,
    })

    if (setErr) {
        console.error('[auth/end-impersonation] setSession:', setErr)
        // 退避 Cookie と DB 行は残す（リロードや再試行で復旧しやすくする）
        return NextResponse.redirect(new URL(`/${locale}/login?error=impersonation_restore`, origin))
    }

    clearRevertCookie(response)
    await adminSb.from('admin_impersonation_revert_tokens').delete().eq('id', revertId)

    return response
}
