/** DB 上のプランが premium か（Webhook 遅延時は期限切れでも true のことがある） */
export function isPremiumPlanFlag(profile: any | null): boolean {
    if (!profile) return false;
    if (profile.is_admin) return true;
    return profile.plan_type === 'premium' || profile.plan === 'premium';
}

/**
 * プレミアム機能の利用可否。管理ユーザーは常に true。
 * 契約終了日（current_period_end）が過去なら false（DB がまだ premium でも制限）。
 * current_period_end が無い旧データは premium フラグが立っていれば true（互換）。
 */
export function isPremiumActive(profile: any | null): boolean {
    if (!profile) return false;
    if (profile.is_admin) return true;
    const premiumFlag = profile.plan_type === 'premium' || profile.plan === 'premium';
    if (!premiumFlag) return false;
    const end = profile.current_period_end;
    if (!end || typeof end !== 'string') return true;
    const t = new Date(end).getTime();
    if (Number.isNaN(t)) return true;
    return t > Date.now();
}

/** UI・機能ゲート用。実質「契約期内のプレミアム」。 */
export const isPremium = isPremiumActive;

/** DB がプレミアムかつ current_period_end が過去（契約終了）。サイドバー用。 */
export function isPremiumSubscriptionExpired(profile: any | null): boolean {
    if (!profile || profile.is_admin) return false;
    const premiumFlag = profile.plan_type === 'premium' || profile.plan === 'premium';
    if (!premiumFlag) return false;
    const end = profile.current_period_end;
    if (!end || typeof end !== 'string') return false;
    const t = new Date(end).getTime();
    if (Number.isNaN(t)) return false;
    return t <= Date.now();
}

export function getEffectivePlan(profile: any | null): string {
    if (!profile) return 'free';
    if (profile.is_admin) return profile.plan_type || profile.plan || 'premium';
    if (isPremiumActive(profile)) return profile.plan_type || profile.plan || 'premium';
    const flag = profile.plan_type || profile.plan;
    return flag === 'standard' ? 'standard' : 'free';
}

export const PREMIUM_UPSELL_LINKS = {
    upgrade: '/pricing',
};
