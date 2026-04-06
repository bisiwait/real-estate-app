import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { MessageCircle } from 'lucide-react'
import LineConnectClient from '@/components/dashboard/LineConnectClient'

export default async function LineConnectPage({ params }: { params: Promise<{ locale: string }> }) {
    const { locale } = await params
    const supabase = await createClient()
    const {
        data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
        redirect(`/${locale}/login`)
    }

    return (
        <div className="bg-slate-50 min-h-screen pb-20">
            <div className="bg-navy-secondary py-14 text-white pt-24 md:pt-28">
                <div className="container mx-auto max-w-6xl px-4">
                    <div className="flex items-center gap-4">
                        <div className="rounded-2xl border border-white/20 bg-white/10 p-4 backdrop-blur-md">
                            <MessageCircle className="h-9 w-9 text-[#7ee8a8]" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-black tracking-tight !text-slate-100 md:text-3xl">LINE連携の設定</h1>
                            <p className="mt-1 text-xs font-bold uppercase tracking-widest text-slate-400">
                                かんたん連携 · 友だち追加URLだけでOK
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            <div className="container mx-auto max-w-6xl px-4 -mt-8">
                <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-2xl md:p-10">
                    <LineConnectClient locale={locale} />
                </div>
            </div>
        </div>
    )
}
