"use client";
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useParams, useRouter } from 'next/navigation'
import { ChevronLeft } from 'lucide-react'
import Link from 'next/link'
import ListingForm from '@/components/property/ListingForm'

export default function ListPropertyPage() {
    const [loading, setLoading] = useState(true)
    const [isAdmin, setIsAdmin] = useState(false)
    const router = useRouter()
    const params = useParams()
    const locale = typeof params?.locale === 'string' ? params.locale : 'jp'
    const supabase = createClient()

    useEffect(() => {
        async function checkUserData() {
            const { data: { user } } = await supabase.auth.getUser()

            if (!user) {
                router.push(`/${locale}/login`)
                return
            }

            const { data: profile } = await supabase
                .from('profiles')
                .select('is_admin')
                .eq('id', user.id)
                .single()

            setIsAdmin(!!profile?.is_admin)
            setLoading(false)
        }

        checkUserData()
    }, [supabase, router, locale])

    if (loading) {
        return (
            <div className="min-h-[60vh] flex items-center justify-center">
                <div className="w-8 h-8 border-4 border-navy-primary border-t-transparent rounded-full animate-spin"></div>
            </div>
        )
    }

    const dashboardPath = isAdmin ? `/${locale}/admin-secret` : `/${locale}/dashboard`
    const ui = locale === 'th'
        ? {
            back: 'กลับไปแดชบอร์ด',
            title: 'ลงประกาศอสังหาริมทรัพย์',
            subtitle: 'กรอกรายละเอียดเพื่อเผยแพร่ประกาศของคุณ',
        }
        : locale === 'en'
            ? {
                back: 'Back to Dashboard',
                title: 'List Property',
                subtitle: 'Fill in the details to publish your listing.',
            }
            : {
                back: 'ダッシュボードに戻る',
                title: '物件を掲載する',
                subtitle: '詳細情報を入力して、物件を公開しましょう。',
            }

    return (
        <div className="bg-slate-50 min-h-screen py-16">
            <div className="container mx-auto px-4">
                <div className="max-w-4xl mx-auto">
                    <Link
                        href={dashboardPath}
                        className="inline-flex items-center space-x-2 text-slate-400 hover:text-navy-primary font-bold mb-8 transition-colors group"
                    >
                        <ChevronLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
                        <span>{ui.back}</span>
                    </Link>

                    <div className="flex items-center justify-between mb-12">
                        <div>
                            <h1 className="text-3xl font-black text-navy-secondary mb-2">{ui.title}</h1>
                            <p className="text-slate-500">{ui.subtitle}</p>
                        </div>
                    </div>

                    <ListingForm />
                </div>
            </div>
        </div>
    )
}
