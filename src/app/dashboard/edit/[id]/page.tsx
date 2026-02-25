import { createClient } from '@/lib/supabase/server'
export const runtime = 'edge';
import { notFound, redirect } from 'next/navigation'
import ListingForm from '@/components/property/ListingForm'
import { ChevronLeft, Edit3 } from 'lucide-react'
import Link from 'next/link'

export default async function EditPropertyPage({ params }: { params: { id: string } }) {
    const { id } = await params
    const supabase = await createClient()

    // Get current user
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect('/login')

    // Fetch property details
    const { data: property, error } = await supabase
        .from('properties')
        .select('*')
        .eq('id', id)
        .single()

    if (error || !property) {
        notFound()
    }

    // Security check: Only owner can edit
    if (property.user_id !== user.id) {
        redirect('/dashboard')
    }

    return (
        <div className="bg-slate-50 min-h-screen py-16">
            <div className="container mx-auto px-4">
                <div className="max-w-4xl mx-auto">
                    <Link
                        href="/dashboard"
                        className="inline-flex items-center space-x-2 text-slate-400 hover:text-navy-primary font-bold mb-8 transition-colors group"
                    >
                        <ChevronLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
                        <span>ダッシュボードに戻る</span>
                    </Link>

                    <div className="flex items-center justify-between mb-12">
                        <div className="flex items-center space-x-4">
                            <div className="bg-navy-primary p-4 rounded-2xl shadow-lg border border-navy-primary/20">
                                <Edit3 className="w-8 h-8 text-white" />
                            </div>
                            <div>
                                <h1 className="text-3xl font-black text-navy-secondary mb-1">物件情報を編集</h1>
                                <p className="text-slate-500 font-medium">#{property.id.slice(0, 8)} - {property.title}</p>
                            </div>
                        </div>
                    </div>

                    <ListingForm initialData={property} mode="edit" />
                </div>
            </div>
        </div>
    )
}
