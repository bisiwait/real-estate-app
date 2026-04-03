/**
 * Error message mapping for Supabase and PostgreSQL errors to Japanese.
 */

const ERROR_MAPPINGS: Record<string, string> = {
    // Auth Errors
    'Invalid login credentials': 'メールアドレスまたはパスワードが正しくありません。',
    'Email not confirmed': 'メールアドレスが確認されていません。メールボックスを確認してください。',
    'User already registered': 'このメールアドレスは既に登録されています。',
    'Password should be at least 6 characters': 'パスワードは6文字以上で入力してください。',
    'Invalid email': '有効なメールアドレスを入力してください。',
    'User not found': 'ユーザーが見つかりませんでした。',
    'Network request failed': 'ネットワークエラーが発生しました。接続を確認してください。',

    // PostgreSQL Error Codes
    '23505': 'この項目は既に登録されています（重複エラー）。',
    '23503': '関連するデータが見つからないか、参照エラーが発生しました。',
    '42501': 'アクセス権限がありません。',
    'P0001': 'ビジネスルール違反が発生しました。',
    '23514': 'データの形式がデータベースの制約と一致しません。マイグレーション未適用の可能性があります。',
    '42703': 'データベースに必要な列がありません。最新のマイグレーションを Supabase に適用してください。',
}

/**
 * Returns a Japanese error message based on the error code or message.
 * @param error Either a code string or a message string from Supabase
 * @returns Japanese error message
 */
export function getErrorMessage(error: any): string {
    if (!error) return '予期せぬエラーが発生しました。'

    // Handle Supabase error object
    const message = typeof error === 'string' ? error : error.message || ''
    const code = error.code || ''

    // Check code mapping first
    if (code && ERROR_MAPPINGS[code]) {
        return ERROR_MAPPINGS[code]
    }

    // Check message mapping
    for (const [key, value] of Object.entries(ERROR_MAPPINGS)) {
        if (message.includes(key)) {
            return value
        }
    }

    // Fallback or generic message
    if (message.includes('JWT')) return 'セッションが期限切れです。再度ログインしてください。'

    if (message.includes('Could not find the') && message.includes('column'))
        return 'データベースの列が見つかりません。Supabase に inquiries 用の最新マイグレーション（email / preferred_reply_channel など）を適用してください。'

    if (
        message.includes('backup_and_draft_properties_for_agent_suspend') ||
        message.includes('restore_properties_after_agent_resume') ||
        (message.includes('function') && message.includes('does not exist'))
    ) {
        return 'データベースの関数または列が見つかりません。Supabase に 20260403150000_properties_status_before_suspension.sql を含む最新マイグレーションを適用してください。'
    }

    if (message.includes('inquiries_preferred_reply_channel_check') || message.includes('preferred_reply_channel'))
        return '返信方法の値がデータベースと一致しません。マイグレーションで preferred_reply_channel を email / line に更新したか確認してください。'

    console.warn('Unhandled error for localization:', error)
    return message || '予期せぬエラーが発生しました。'
}
