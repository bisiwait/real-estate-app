import { Suspense } from 'react'
import { Loader2 } from 'lucide-react'
import RegisterPageClient from './RegisterPageClient'

export default function RegisterPage() {
    return (
        <Suspense
            fallback={
                <div className="flex min-h-screen items-center justify-center bg-slate-50">
                    <Loader2 className="h-10 w-10 animate-spin text-navy-primary" />
                </div>
            }
        >
            <RegisterPageClient />
        </Suspense>
    )
}
