/** 登録完了ページ表示ガード用（サーバーとクライアントで同じ名前を使う） */
export const SIGNUP_WELCOME_COOKIE_NAME = 'cc_signup_welcome'

/** サンクスページ直前に呼ぶ（メール確認OFFの即時遷移など） */
export function setSignupWelcomeCookie(): void {
    if (typeof document === 'undefined') return
    const maxAge = 60 * 30 // 30 分
    document.cookie = `${SIGNUP_WELCOME_COOKIE_NAME}=1; path=/; max-age=${maxAge}; SameSite=Lax`
}
