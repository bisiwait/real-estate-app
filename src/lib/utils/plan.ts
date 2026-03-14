export const isPremium = (profile: any | null): boolean => {
    if (!profile) return false;
    // Admins are treated as premium
    if (profile.is_admin) return true;
    return profile.plan_type === 'premium' || profile.plan === 'premium';
};

export const PREMIUM_UPSELL_LINKS = {
    upgrade: '/pricing',
};
