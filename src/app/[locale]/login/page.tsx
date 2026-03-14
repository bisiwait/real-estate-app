
import { Suspense } from 'react'
import { Loader2 } from 'lucide-react'
import { getDictionary } from '@/lib/i18n/get-dictionary'
import LoginContent from '@/components/auth/LoginContent'

export default async function LoginPage({
    params
}: {
    params: Promise<{ locale: string }>
}) {
    const { locale } = await params
    const dict = await getDictionary(locale)

    return (
        <Suspense fallback={
            <div className="min-h-screen bg-slate-50 flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-navy-primary" />
            </div>
        }>
            <LoginContent dict={dict} locale={locale} />
        </Suspense>
    )
}
