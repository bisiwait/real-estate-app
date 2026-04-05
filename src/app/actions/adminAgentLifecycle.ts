'use server'

import { createAdminClient, createClient } from '@/lib/supabase/server'
import { isAdmin } from '@/lib/admin'
import { revalidatePath } from 'next/cache'
import { getErrorMessage } from '@/lib/utils/errors'

export type AdminAgentLifecycleAction = 'suspend' | 'resume' | 'delete'
export type PropertyHandling = 'unpublish' | 'keep'

export type AdminAgentLifecycleInput = {
    action: AdminAgentLifecycleAction
    targetUserId: string
    property_handling?: PropertyHandling
}

export type AdminAgentLifecycleResult = {
    ok?: true
    error?: string
    /** 再開時に status を復元した物件件数 */
    restoredPropertyCount?: number
    /** 停止時に下書きへ退避した物件件数（新規にスナップショットした行） */
    draftedPropertyCount?: number
}

/**
 * エージェントの利用停止・再開・削除（論理削除＋Auth 削除）。
 */
export async function adminAgentLifecycle(
    input: AdminAgentLifecycleInput
): Promise<AdminAgentLifecycleResult> {
    const action = input.action
    const targetUserId = input.targetUserId?.trim()
    const property_handling = input.property_handling ?? 'unpublish'

    if (!targetUserId || !['suspend', 'resume', 'delete'].includes(action)) {
        return { error: '無効なリクエストです。' }
    }

    const allowed = await isAdmin()
    if (!allowed) {
        return { error: 'この操作には管理者権限が必要です。' }
    }

    const supabaseUser = await createClient()
    const {
        data: { user: caller },
    } = await supabaseUser.auth.getUser()
    if (!caller) {
        return { error: 'ログインセッションがありません。' }
    }
    if (targetUserId === caller.id) {
        return { error: '自分自身には実行できません。' }
    }

    try {
        const adminSb = await createAdminClient()

        const { data: targetProfile, error: targetErr } = await adminSb
            .from('profiles')
            .select('user_role, deleted_at')
            .eq('id', targetUserId)
            .maybeSingle()

        if (targetErr || !targetProfile) {
            return { error: '対象ユーザーが見つかりません。' }
        }
        if (targetProfile.user_role === 'admin') {
            return { error: '管理者アカウントは変更できません。' }
        }
        if (targetProfile.user_role !== 'agent') {
            return { error: 'エージェント以外は対象にできません。' }
        }
        if (targetProfile.deleted_at) {
            return { error: '削除済みエージェントは操作できません。' }
        }

        const mergeAppMeta = async (uid: string, patch: Record<string, unknown>) => {
            const { data: existing, error: getErr } = await adminSb.auth.admin.getUserById(uid)
            if (getErr) throw getErr
            const prev = (existing?.user?.app_metadata ?? {}) as Record<string, unknown>
            return { ...prev, ...patch }
        }

        let restoredPropertyCount: number | undefined
        let draftedPropertyCount: number | undefined

        if (action === 'suspend') {
            if (property_handling !== 'keep') {
                const { data: drafted, error: rpcErr } = await adminSb.rpc(
                    'backup_and_draft_properties_for_agent_suspend',
                    { p_user_id: targetUserId }
                )
                if (rpcErr) throw rpcErr
                draftedPropertyCount =
                    typeof drafted === 'number' ? drafted : Number(drafted) || 0
            }

            const { error: upErr } = await adminSb
                .from('profiles')
                .update({
                    status: 'suspended',
                    is_suspended: true,
                    updated_at: new Date().toISOString(),
                })
                .eq('id', targetUserId)
            if (upErr) throw upErr

            const app_metadata = await mergeAppMeta(targetUserId, { agent_suspended: true })
            const { error: banErr } = await adminSb.auth.admin.updateUserById(targetUserId, {
                ban_duration: '876000h',
                app_metadata,
            })
            if (banErr) throw banErr
        } else if (action === 'resume') {
            const { data: restored, error: rpcErr } = await adminSb.rpc(
                'restore_properties_after_agent_resume',
                { p_user_id: targetUserId }
            )
            if (rpcErr) throw rpcErr
            restoredPropertyCount =
                typeof restored === 'number' ? restored : Number(restored) || 0

            const { error: upErr } = await adminSb
                .from('profiles')
                .update({
                    status: 'active',
                    is_suspended: false,
                    updated_at: new Date().toISOString(),
                })
                .eq('id', targetUserId)
            if (upErr) throw upErr

            const app_metadata = await mergeAppMeta(targetUserId, { agent_suspended: false })
            const { error: unbanErr } = await adminSb.auth.admin.updateUserById(targetUserId, {
                ban_duration: 'none',
                app_metadata,
            })
            if (unbanErr) throw unbanErr
        } else {
            if (property_handling !== 'keep') {
                const { data: drafted, error: rpcErr } = await adminSb.rpc(
                    'backup_and_draft_properties_for_agent_suspend',
                    { p_user_id: targetUserId }
                )
                if (rpcErr) throw rpcErr
                draftedPropertyCount =
                    typeof drafted === 'number' ? drafted : Number(drafted) || 0
            }

            const now = new Date().toISOString()
            const { error: delProfErr } = await adminSb
                .from('profiles')
                .update({
                    deleted_at: now,
                    status: 'suspended',
                    is_suspended: true,
                    updated_at: now,
                })
                .eq('id', targetUserId)
            if (delProfErr) throw delProfErr

            const { error: delAuthErr } = await adminSb.auth.admin.deleteUser(targetUserId)
            if (delAuthErr) throw delAuthErr
        }

        for (const loc of ['jp', 'en', 'th'] as const) {
            revalidatePath(`/${loc}/admin-secret`, 'layout')
        }

        return {
            ok: true,
            restoredPropertyCount,
            draftedPropertyCount,
        }
    } catch (e: unknown) {
        const msg = getErrorMessage(e)
        console.error('[adminAgentLifecycle]', e)
        return { error: msg || '操作に失敗しました。' }
    }
}
