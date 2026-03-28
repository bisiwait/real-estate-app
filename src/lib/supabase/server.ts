import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'
import type { NextRequest, NextResponse } from 'next/server'
import { createClient as createBaseClient } from '@supabase/supabase-js'

/**
 * Route Handler 用。exchangeCodeForSession が Set-Cookie する先を NextResponse に載せる（cookies() だけだとリダイレクトに乗らないことがある）。
 */
export function createRouteHandlerSupabaseClient(request: NextRequest, response: NextResponse) {
    return createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
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

    return createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
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
    return createBaseClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
}
