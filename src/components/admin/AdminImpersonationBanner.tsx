import { cookies } from 'next/headers'
import { getDictionary } from '@/lib/i18n/get-dictionary'
import { ADMIN_IMPERSONATION_REVERT_COOKIE } from '@/lib/auth/admin-impersonation'

export default async function AdminImpersonationBanner({ locale }: { locale: string }) {
    const jar = await cookies()
    if (!jar.get(ADMIN_IMPERSONATION_REVERT_COOKIE)?.value) {
        return null
    }

    const dict = await getDictionary(locale)
    const t = (dict as { admin_impersonation?: { banner: string; return_to_admin: string } }).admin_impersonation
    if (!t) return null

    return (
        <div
            className="sticky top-0 z-[200] flex flex-wrap items-center justify-center gap-3 border-b border-amber-300/80 bg-amber-100 px-3 py-2 text-center shadow-sm"
            role="region"
            aria-label="管理者によるエージェント代行"
        >
            <p className="text-xs font-black text-amber-950 md:text-sm">{t.banner}</p>
            {/* Server Action + redirect では Set-Cookie が不安定なため、フル GET で Route Handler へ */}
            <a
                href={`/${locale}/auth/end-impersonation`}
                className="inline-flex items-center justify-center rounded-lg bg-navy-secondary px-4 py-1.5 text-xs font-black text-white shadow-sm transition-colors hover:bg-navy-primary md:text-sm"
            >
                {t.return_to_admin}
            </a>
        </div>
    )
}
