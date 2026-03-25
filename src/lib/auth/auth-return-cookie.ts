import { safeNextPath } from '@/lib/auth/safe-next-path'

/** Google OAuth 用。redirectTo から ?next を外す代わりに短時間だけ保持する */
export const AUTH_RETURN_TO_COOKIE = 'auth_return_to'

export function setAuthReturnToCookie(rawPath: string): void {
    if (typeof document === 'undefined') return
    const validated = safeNextPath(rawPath)
    if (!validated) return
    const enc = encodeURIComponent(validated)
    const secure = typeof window !== 'undefined' && window.location.protocol === 'https:'
    document.cookie = `${AUTH_RETURN_TO_COOKIE}=${enc}; Path=/; Max-Age=600; SameSite=Lax${secure ? '; Secure' : ''}`
}
