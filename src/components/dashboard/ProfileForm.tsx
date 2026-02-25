'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Save, Loader2, User, Building2, Phone, Globe, MessageSquare, Info } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { getErrorMessage } from '@/lib/utils/errors'

interface ProfileData {
    full_name: string
    company_name: string
    phone: string
    bio: string
    website: string
    line_id: string
    email: string
}

export default function ProfileForm() {
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [formData, setFormData] = useState<ProfileData>({
        full_name: '',
        company_name: '',
        phone: '',
        bio: '',
        website: '',
        line_id: '',
        email: ''
    })
    const [error, setError] = useState<string | null>(null)
    const router = useRouter()
    const supabase = createClient()

    useEffect(() => {
        const fetchProfile = async () => {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) return

            const { data, error } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', user.id)
                .single()

            if (error) {
                console.error('Fetch profile error:', error)
            } else if (data) {
                setFormData({
                    full_name: data.full_name || '',
                    company_name: data.company_name || '',
                    phone: data.phone || '',
                    bio: data.bio || '',
                    website: data.website || '',
                    line_id: data.line_id || '',
                    email: user.email || ''
                })
            }
            setLoading(false)
        }

        fetchProfile()
    }, [])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setSaving(true)
        setError(null)

        try {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) throw new Error('Authentication required')

            const { error } = await supabase
                .from('profiles')
                .update({
                    ...formData,
                    updated_at: new Date().toISOString()
                })
                .eq('id', user.id)

            if (error) throw error

            // Redirect immediately
            router.push('/dashboard?profile_updated=true')
        } catch (err: any) {
            console.error('Update profile error:', err)
            setError(getErrorMessage(err))
        } finally {
            setSaving(false)
        }
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center py-20">
                <Loader2 className="w-8 h-8 text-navy-primary animate-spin" />
            </div>
        )
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-8">
            {error && (
                <div className="bg-red-50 text-red-600 p-4 rounded-2xl text-sm font-bold border border-red-100 animate-in fade-in slide-in-from-top-2">
                    {error}
                </div>
            )}


            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* 基本情報 */}
                <div className="space-y-6">
                    <h3 className="text-sm font-black text-navy-secondary uppercase tracking-widest flex items-center">
                        <User className="w-4 h-4 mr-2 text-navy-primary" />
                        基本情報
                    </h3>

                    <div>
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">お名前 <span className="text-red-500">*</span></label>
                        <div className="relative">
                            <input
                                required
                                type="text"
                                value={formData.full_name}
                                onChange={e => setFormData({ ...formData, full_name: e.target.value })}
                                className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-sm focus:ring-2 focus:ring-navy-primary outline-none transition-all pl-10"
                                placeholder="山田 太郎"
                                onInvalid={e => (e.target as HTMLInputElement).setCustomValidity('お名前を入力してください')}
                                onInput={e => (e.target as HTMLInputElement).setCustomValidity('')}
                            />
                            <User className="w-4 h-4 text-slate-300 absolute left-3.5 top-1/2 -translate-y-1/2" />
                        </div>
                    </div>

                    <div>
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">メールアドレス (確認用・変更不可)</label>
                        <div className="relative">
                            <input
                                readOnly
                                type="email"
                                value={formData.email}
                                className="w-full px-4 py-3 bg-slate-100 border border-slate-200 rounded-xl text-sm text-slate-500 cursor-not-allowed outline-none transition-all pl-10"
                                placeholder="yamada@example.com"
                            />
                            <Globe className="w-4 h-4 text-slate-300 absolute left-3.5 top-1/2 -translate-y-1/2" />
                        </div>
                        <p className="text-[10px] text-slate-400 mt-1 ml-1">※ログイン用メールアドレスです。変更はできません。</p>
                    </div>

                    <div>
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">会社名 / 所属</label>
                        <div className="relative">
                            <input
                                type="text"
                                value={formData.company_name}
                                onChange={e => setFormData({ ...formData, company_name: e.target.value })}
                                className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-sm focus:ring-2 focus:ring-navy-primary outline-none transition-all pl-10"
                                placeholder="ABC不動産"
                            />
                            <Building2 className="w-4 h-4 text-slate-300 absolute left-3.5 top-1/2 -translate-y-1/2" />
                        </div>
                    </div>

                    <div>
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">電話番号</label>
                        <div className="relative">
                            <input
                                type="tel"
                                value={formData.phone}
                                onChange={e => setFormData({ ...formData, phone: e.target.value })}
                                className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-sm focus:ring-2 focus:ring-navy-primary outline-none transition-all pl-10"
                                placeholder="090-0000-0000"
                            />
                            <Phone className="w-4 h-4 text-slate-300 absolute left-3.5 top-1/2 -translate-y-1/2" />
                        </div>
                    </div>
                </div>

                {/* その他情報 */}
                <div className="space-y-6">
                    <h3 className="text-sm font-black text-navy-secondary uppercase tracking-widest flex items-center">
                        <Globe className="w-4 h-4 mr-2 text-navy-primary" />
                        連絡先・ウェブ
                    </h3>

                    <div>
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">LINE ID</label>
                        <div className="relative">
                            <input
                                type="text"
                                value={formData.line_id}
                                onChange={e => setFormData({ ...formData, line_id: e.target.value })}
                                className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-sm focus:ring-2 focus:ring-navy-primary outline-none transition-all pl-10"
                                placeholder="line_id_123"
                            />
                            <MessageSquare className="w-4 h-4 text-slate-300 absolute left-3.5 top-1/2 -translate-y-1/2" />
                        </div>
                    </div>

                    <div>
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">ウェブサイト / SNS</label>
                        <div className="relative">
                            <input
                                type="url"
                                value={formData.website}
                                onChange={e => setFormData({ ...formData, website: e.target.value })}
                                className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-sm focus:ring-2 focus:ring-navy-primary outline-none transition-all pl-10"
                                placeholder="https://example.com"
                            />
                            <Globe className="w-4 h-4 text-slate-300 absolute left-3.5 top-1/2 -translate-y-1/2" />
                        </div>
                    </div>
                </div>

                {/* 自己紹介 */}
                <div className="md:col-span-2 space-y-4">
                    <h3 className="text-sm font-black text-navy-secondary uppercase tracking-widest flex items-center">
                        <Info className="w-4 h-4 mr-2 text-navy-primary" />
                        自己紹介 / メッセージ
                    </h3>
                    <textarea
                        rows={4}
                        value={formData.bio}
                        onChange={e => setFormData({ ...formData, bio: e.target.value })}
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-sm focus:ring-2 focus:ring-navy-primary outline-none transition-all"
                        placeholder="物件探しのお手伝いをさせていただきます。お気軽にご相談ください。"
                    />
                </div>
            </div>

            <div className="flex justify-end pt-4">
                <button
                    disabled={saving}
                    type="submit"
                    className="flex items-center space-x-2 bg-navy-primary text-white px-10 py-4 rounded-2xl font-black hover:bg-navy-secondary transition-all shadow-lg hover:shadow-xl disabled:opacity-50 active:scale-95"
                >
                    {saving ? (
                        <>
                            <Loader2 className="w-5 h-5 animate-spin" />
                            <span>保存中...</span>
                        </>
                    ) : (
                        <>
                            <Save className="w-5 h-5" />
                            <span>設定を保存する</span>
                        </>
                    )}
                </button>
            </div>
        </form>
    )
}
