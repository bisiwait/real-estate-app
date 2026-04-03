'use server'

import type { SupabaseClient } from '@supabase/supabase-js'
import { createAdminClient, createClient } from '@/lib/supabase/server'
import { isAdmin } from '@/lib/admin'
import { revalidatePath } from 'next/cache'

export type AdminAgentLifecycleAction = 'suspend' | 'resume' | 'delete'
export type PropertyHandling = 'unpublish' | 'keep'

export type AdminAgentLifecycleInput = {
    action: AdminAgentLifecycleAction
    targetUserId: string
    property_handling?: PropertyHandling
}

async function unpublishAgentProperties(admin: SupabaseClient, agentId: string) {
    await admin
        .from('properties')
        .update({ status: 'draft', updated_at: new Date().toISOString() })
        .eq('user_id', agentId)
        .eq('status', 'published')
}

/**
 * エージェントの利用停止・再開・削除（論理削除＋Auth 削除）。
 * Edge Function の代わりに Server Action で実行し、デプロイ漏れなく動作させる。
 */
export async function adminAgentLifecycle(
    input: AdminAgentLifecycleInput
): Promise<{ ok?: true; error?: string }> {
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

        if (action === 'suspend') {
            if (property_handling === 'unpublish') {
                await unpublishAgentProperties(adminSb, targetUserId)
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
            if (property_handling === 'unpublish') {
                await unpublishAgentProperties(adminSb, targetUserId)
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
            revalidatePath(`/${loc}/admin-secret/agents`, 'page')
        }

        return { ok: true }
    } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e)
        console.error('[adminAgentLifecycle]', msg)
        return { error: msg || '操作に失敗しました。' }
    }
}
