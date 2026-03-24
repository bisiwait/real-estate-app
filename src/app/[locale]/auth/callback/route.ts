import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { syncAgentProfileFromAuthUser } from '@/lib/auth/syncAgentProfile'
import { safeNextPath } from '@/lib/auth/safe-next-path'

const LOCALES = ['jp', 'en', 'th'] as const

function localeFromPath(pathname: string): string {
    const seg = pathname.split('/').filter(Boolean)[0]
    return LOCALES.includes(seg as (typeof LOCALES)[number]) ? seg : 'jp'
}

function safeNext(nextParam: string | null, locale: string): string {
    const p = safeNextPath(nextParam)
    if (p) return p
    return `/${locale}/dashboard`
}

export async function GET(request: Request) {
    const url = new URL(request.url)
    const code = url.searchParams.get('code')
    const locale = localeFromPath(url.pathname)
    const next = safeNext(url.searchParams.get('next'), locale)

    if (code) {
        const supabase = await createClient()
        const { data, error } = await supabase.auth.exchangeCodeForSession(code)
        if (!error && data.user) {
            await syncAgentProfileFromAuthUser(data.user)
            return NextResponse.redirect(`${url.origin}${next}`)
        }
    }

    return NextResponse.redirect(`${url.origin}/${locale}/login?error=auth_callback`)
}
