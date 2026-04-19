'use server'

import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { createAdminClient, createClient } from '@/lib/supabase/server'
import { isAdmin } from '@/lib/admin'
import { ADMIN_IMPERSONATION_REVERT_COOKIE } from '@/lib/auth/admin-impersonation'

const REVERT_TTL_SEC = 60 * 60

const LOCALE_SET = new Set(['jp', 'en', 'th'])

export type BeginAdminAgentImpersonationResult =
    | { ok: true; token_hash: string }
    | { ok: false; error: string }

function cookieBaseOptions() {
    return {
        path: '/' as const,
        sameSite: 'lax' as const,
        secure: process.env.NODE_ENV === 'production',
        maxAge: REVERT_TTL_SEC,
    }
}

async function clearRevertCookieAndRow(adminSb: Awaited<ReturnType<typeof createAdminClient>>, revertId: string) {
    const jar = await cookies()
    await adminSb.from('admin_impersonation_revert_tokens').delete().eq('id', revertId)
    jar.set(ADMIN_IMPERSONATION_REVERT_COOKIE, '', { ...cookieBaseOptions(), maxAge: 0 })
}

/**
 * 管理者がエージェントとしてログインするためのワンタイム token_hash を発行し、
 * 元の管理者セッションを service_role のみ読めるテーブルに退避する。
 */
export async function beginAdminAgentImpersonation(
    targetUserId: string,
    locale: string
): Promise<BeginAdminAgentImpersonationResult> {
    const target = targetUserId?.trim()
    const loc = LOCALE_SET.has(locale) ? locale : 'jp'

    if (!target) {
        return { ok: false, error: '対象ユーザーが無効です。' }
    }

    const allowed = await isAdmin()
    if (!allowed) {
        return { ok: false, error: 'この操作には管理者権限が必要です。' }
    }

    const supabaseUser = await createClient()
    const {
        data: { user: caller },
    } = await supabaseUser.auth.getUser()
    if (!caller) {
        return { ok: false, error: 'ログインセッションがありません。' }
    }
    if (target === caller.id) {
        return { ok: false, error: '自分自身には実行できません。' }
    }

    const {
        data: { session: adminSession },
    } = await supabaseUser.auth.getSession()
    if (!adminSession?.access_token || !adminSession.refresh_token) {
        return { ok: false, error: 'セッション情報を取得できませんでした。再度ログインしてからお試しください。' }
    }

    const jar = await cookies()
    const existingRid = jar.get(ADMIN_IMPERSONATION_REVERT_COOKIE)?.value
    const adminSb = await createAdminClient()

    if (existingRid) {
        const { data: existingRow } = await adminSb
            .from('admin_impersonation_revert_tokens')
            .select('id, admin_user_id, target_user_id')
            .eq('id', existingRid)
            .maybeSingle()

        if (!existingRow) {
            jar.set(ADMIN_IMPERSONATION_REVERT_COOKIE, '', { ...cookieBaseOptions(), maxAge: 0 })
        } else if (existingRow.target_user_id === caller.id) {
            return { ok: false, error: 'エージェント代行中です。先に画面上部の「管理者に戻る」で元のセッションに戻してください。' }
        } else if (existingRow.admin_user_id === caller.id) {
            await clearRevertCookieAndRow(adminSb, existingRid)
        } else {
            return { ok: false, error: 'セッション状態が不整合です。一度ログアウトしてから再度お試しください。' }
        }
    }

    const { data: targetProfile, error: targetErr } = await adminSb
        .from('profiles')
        .select('user_role, deleted_at, status, is_suspended, is_admin')
        .eq('id', target)
        .maybeSingle()

    if (targetErr || !targetProfile) {
        return { ok: false, error: '対象ユーザーが見つかりません。' }
    }
    if (targetProfile.user_role === 'admin' || targetProfile.is_admin === true) {
        return { ok: false, error: '管理者アカウントは対象にできません。' }
    }
    if (targetProfile.user_role !== 'agent') {
        return { ok: false, error: 'エージェント以外は対象にできません。' }
    }
    if (targetProfile.deleted_at) {
        return { ok: false, error: '削除済みエージェントは対象にできません。' }
    }
    if (targetProfile.status === 'suspended' || targetProfile.is_suspended === true) {
        return { ok: false, error: '一時停止中のエージェントは対象にできません。' }
    }

    const { data: authUser, error: authErr } = await adminSb.auth.admin.getUserById(target)
    if (authErr || !authUser.user?.email) {
        return { ok: false, error: '対象ユーザーのメールアドレスが取得できません（ソーシャルログインのみ等）。' }
    }

    const { data: linkData, error: linkErr } = await adminSb.auth.admin.generateLink({
        type: 'magiclink',
        email: authUser.user.email,
    })

    if (linkErr || !linkData?.properties?.hashed_token) {
        console.error('[beginAdminAgentImpersonation] generateLink:', linkErr)
        return { ok: false, error: '代行ログイン用リンクの生成に失敗しました。' }
    }

    const expiresAt = new Date(Date.now() + REVERT_TTL_SEC * 1000).toISOString()
    const { data: inserted, error: insErr } = await adminSb
        .from('admin_impersonation_revert_tokens')
        .insert({
            expires_at: expiresAt,
            admin_user_id: caller.id,
            target_user_id: target,
            return_locale: loc,
            admin_access_token: adminSession.access_token,
            admin_refresh_token: adminSession.refresh_token,
        })
        .select('id')
        .single()

    if (insErr || !inserted?.id) {
        console.error('[beginAdminAgentImpersonation] insert revert:', insErr)
        return { ok: false, error: 'セッション退避の保存に失敗しました。' }
    }

    jar.set(ADMIN_IMPERSONATION_REVERT_COOKIE, inserted.id, {
        ...cookieBaseOptions(),
        httpOnly: true,
    })

    return { ok: true, token_hash: linkData.properties.hashed_token as string }
}

/**
 * エージェント代行を終了し、退避していた管理者セッションに戻す。
 */
export async function endAdminAgentImpersonation() {
    const jar = await cookies()
    const revertId = jar.get(ADMIN_IMPERSONATION_REVERT_COOKIE)?.value
    if (!revertId) {
        redirect('/jp/login')
    }

    const adminSb = await createAdminClient()
    const { data: row, error: selErr } = await adminSb
        .from('admin_impersonation_revert_tokens')
        .select('id, expires_at, admin_access_token, admin_refresh_token, return_locale, target_user_id')
        .eq('id', revertId)
        .maybeSingle()

    if (selErr || !row) {
        jar.set(ADMIN_IMPERSONATION_REVERT_COOKIE, '', { ...cookieBaseOptions(), maxAge: 0 })
        redirect('/jp/login')
    }

    if (new Date(row.expires_at).getTime() < Date.now()) {
        await adminSb.from('admin_impersonation_revert_tokens').delete().eq('id', revertId)
        jar.set(ADMIN_IMPERSONATION_REVERT_COOKIE, '', { ...cookieBaseOptions(), maxAge: 0 })
        redirect('/jp/login?error=impersonation_expired')
    }

    const supabaseUser = await createClient()
    const {
        data: { user: caller },
    } = await supabaseUser.auth.getUser()
    if (!caller || caller.id !== row.target_user_id) {
        redirect('/jp/login?error=impersonation_mismatch')
    }

    const { error: setErr } = await supabaseUser.auth.setSession({
        access_token: row.admin_access_token,
        refresh_token: row.admin_refresh_token,
    })

    await adminSb.from('admin_impersonation_revert_tokens').delete().eq('id', revertId)
    jar.set(ADMIN_IMPERSONATION_REVERT_COOKIE, '', { ...cookieBaseOptions(), maxAge: 0 })

    if (setErr) {
        console.error('[endAdminAgentImpersonation] setSession:', setErr)
        redirect('/jp/login?error=impersonation_restore')
    }

    const loc = LOCALE_SET.has(row.return_locale) ? row.return_locale : 'jp'
    revalidatePath('/', 'layout')
    redirect(`/${loc}/admin-secret`)
}

/**
 * verifyOtp 失敗時など、退避データだけ残った状態を管理者が掃除する。
 */
export async function discardAdminImpersonationRevert(): Promise<{ ok: true } | { ok: false; error: string }> {
    const allowed = await isAdmin()
    if (!allowed) {
        return { ok: false, error: 'この操作には管理者権限が必要です。' }
    }

    const jar = await cookies()
    const revertId = jar.get(ADMIN_IMPERSONATION_REVERT_COOKIE)?.value
    if (!revertId) {
        return { ok: true }
    }

    const supabaseUser = await createClient()
    const {
        data: { user: caller },
    } = await supabaseUser.auth.getUser()
    if (!caller) {
        return { ok: false, error: 'ログインセッションがありません。' }
    }

    const adminSb = await createAdminClient()
    const { data: row } = await adminSb
        .from('admin_impersonation_revert_tokens')
        .select('admin_user_id')
        .eq('id', revertId)
        .maybeSingle()

    if (!row) {
        jar.set(ADMIN_IMPERSONATION_REVERT_COOKIE, '', { ...cookieBaseOptions(), maxAge: 0 })
        return { ok: true }
    }

    if (row.admin_user_id !== caller.id) {
        return { ok: false, error: 'この退避データはあなたのセッションではありません。' }
    }

    await clearRevertCookieAndRow(adminSb, revertId)
    return { ok: true }
}
