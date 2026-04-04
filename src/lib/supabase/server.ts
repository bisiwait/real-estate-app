import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies, headers } from 'next/headers'
import type { NextRequest, NextResponse } from 'next/server'
import { createClient as createBaseClient } from '@supabase/supabase-js'
import { hostHeaderFromHeaders, hostHeaderFromRequest } from '@/lib/env/deployment-target'
import { getSupabasePublicConfig, getSupabaseServiceRoleConfig } from '@/lib/env/supabase-data-plane'

async function supabasePublicFromHeaders() {
    const h = await headers()
    return getSupabasePublicConfig(hostHeaderFromHeaders(h))
}

/**
 * Route Handler 用。exchangeCodeForSession が Set-Cookie する先を NextResponse に載せる（cookies() だけだとリダイレクトに乗らないことがある）。
 */
export function createRouteHandlerSupabaseClient(request: NextRequest, response: NextResponse) {
    const { url, anonKey } = getSupabasePublicConfig(hostHeaderFromRequest(request))
    return createServerClient(url, anonKey, {
        cookies: {
            getAll() {
                return request.cookies.getAll()
            },
            setAll(cookiesToSet) {
                cookiesToSet.forEach(({ name, value, options }) => {
                    response.cookies.set(name, value, options)
                })
            },
        },
    })
}

/**
 * Server Component / Route Handler 共通。
 * Next.js App Router では getAll/setAll が推奨（チャンク Cookie 対応）。get のみだと API Route でセッションが読めないことがある。
 */
export async function createClient() {
    const cookieStore = await cookies()
    const { url, anonKey } = await supabasePublicFromHeaders()

    return createServerClient(
        url,
        anonKey,
        {
            cookies: {
                getAll() {
                    return cookieStore.getAll()
                },
                setAll(cookiesToSet) {
                    try {
                        cookiesToSet.forEach(({ name, value, options }) =>
                            cookieStore.set(name, value, options as CookieOptions)
                        )
                    } catch {
                        // Server Component 等で set できない場合は無視（middleware が更新する）
                    }
                },
            },
        }
    )
}

/**
 * Creates a Supabase client that uses the SERVICE_ROLE_KEY.
 * Use this only in server-side contexts where you need to bypass RLS.
 */
export async function createAdminClient() {
    const h = await headers()
    const { url, serviceRoleKey } = getSupabaseServiceRoleConfig(hostHeaderFromHeaders(h))
    return createBaseClient(url, serviceRoleKey)
}
