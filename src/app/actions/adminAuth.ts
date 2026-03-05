'use server'

import { createAdminClient } from '@/lib/supabase/server'
import { isAdmin } from '@/lib/admin'
import { revalidatePath } from 'next/cache'

/**
 * 管理者が指定したユーザーのパスワードを強制的に変更する
 */
export async function adminResetPassword(userId: string, newPassword: string) {
    // 1. 管理者権限チェック
    const isUserAdmin = await isAdmin()
    if (!isUserAdmin) {
        throw new Error('この操作には管理者権限が必要です。')
    }

    if (!newPassword || newPassword.length < 6) {
        throw new Error('パスワードは6文字以上で入力してください。')
    }

    try {
        // 2. Admin Clientを使用してパスワードを更新
        const supabaseAdmin = await createAdminClient()
        const { error } = await supabaseAdmin.auth.admin.updateUserById(userId, {
            password: newPassword,
        })

        if (error) {
            console.error('Admin password reset error:', error)
            throw error
        }

        revalidatePath('/admin-secret')
        return { success: true, message: 'パスワードを更新しました。' }
    } catch (error: any) {
        return { success: false, message: error.message || 'パスワードの更新に失敗しました。' }
    }
}
