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

    console.warn('Unhandled error for localization:', error)
    return message || '予期せぬエラーが発生しました。'
}
