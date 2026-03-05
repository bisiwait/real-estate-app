'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Save, Loader2, User, Building2, Phone, Globe, MessageSquare, Info, Camera, X } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { getErrorMessage } from '@/lib/utils/errors'
import imageCompression from 'browser-image-compression'
import Image from 'next/image'

interface ProfileData {
    full_name: string
    company_name: string
    phone: string
    bio: string
    website: string
    line_id: string
    email: string
    avatar_url: string
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
        email: '',
        avatar_url: ''
    })
    const [error, setError] = useState<string | null>(null)
    const [avatarFile, setAvatarFile] = useState<File | null>(null)
    const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
    const fileInputRef = useRef<HTMLInputElement>(null)
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
                    email: user.email || '',
                    avatar_url: data.avatar_url || ''
                })
                if (data.avatar_url) {
                    setAvatarPreview(data.avatar_url)
                }
            }
            setLoading(false)
        }

        fetchProfile()
    }, [])

    const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (file) {
            setAvatarFile(file)
            const reader = new FileReader()
            reader.onloadend = () => {
                setAvatarPreview(reader.result as string)
            }
            reader.readAsDataURL(file)
        }
    }

    const uploadAvatar = async (userId: string) => {
        if (!avatarFile) return formData.avatar_url

        const options = {
            maxSizeMB: 0.5,
            maxWidthOrHeight: 400,
            useWebWorker: true,
            fileType: 'image/webp'
        }

        try {
            const compressedFile = await imageCompression(avatarFile, options)
            const fileName = `avatar-${Date.now()}.webp`
            const filePath = `${userId}/${fileName}`

            // Upload to Supabase Storage
            const { error: uploadError } = await supabase.storage
                .from('avatars')
                .upload(filePath, compressedFile, {
                    cacheControl: '3600',
                    upsert: true
                })

            if (uploadError) throw uploadError

            // Get public URL
            const { data: { publicUrl } } = supabase.storage
                .from('avatars')
                .getPublicUrl(filePath)

            return publicUrl
        } catch (err) {
            console.error('Avatar upload error:', err)
            throw new Error('画像のアップロードに失敗しました。')
        }
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setSaving(true)
        setError(null)

        try {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) throw new Error('Authentication required')

            // 1. Upload avatar if changed
            let finalAvatarUrl = formData.avatar_url
            if (avatarFile) {
                finalAvatarUrl = await uploadAvatar(user.id)
            }

            // 2. Update profile
            const { error } = await supabase
                .from('profiles')
                .update({
                    full_name: formData.full_name,
                    company_name: formData.company_name,
                    phone: formData.phone,
                    bio: formData.bio,
                    website: formData.website,
                    line_id: formData.line_id,
                    avatar_url: finalAvatarUrl,
                    updated_at: new Date().toISOString()
                })
                .eq('id', user.id)

            if (error) throw error

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

            {/* アバターアップロードセクション */}
            <div className="flex flex-col items-center sm:flex-row sm:items-end gap-6 pb-6 border-b border-slate-50">
                <div className="relative group">
                    <div className="w-32 h-32 rounded-3xl bg-slate-100 border-4 border-white shadow-xl overflow-hidden flex items-center justify-center text-slate-300 relative">
                        {avatarPreview ? (
                            <img src={avatarPreview} alt="Preview" className="w-full h-full object-cover" />
                        ) : (
                            <User className="w-16 h-16" />
                        )}
                        <div
                            onClick={() => fileInputRef.current?.click()}
                            className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center text-white cursor-pointer active:bg-black/60"
                        >
                            <Camera className="w-8 h-8 mb-1 transition-transform active:scale-90" />
                            <span className="text-[10px] font-black uppercase tracking-widest">Change</span>
                        </div>
                    </div>
                    {avatarPreview && avatarFile && (
                        <button
                            type="button"
                            onClick={() => {
                                setAvatarFile(null)
                                setAvatarPreview(formData.avatar_url || null)
                            }}
                            className="absolute -top-2 -right-2 bg-white text-red-500 p-1.5 rounded-xl shadow-lg hover:scale-110 transition-transform"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    )}
                </div>
                <div className="text-center sm:text-left space-y-2">
                    <h3 className="text-lg font-black text-navy-secondary leading-none">プロフィール画像</h3>
                    <p className="text-xs text-slate-400 font-medium max-w-xs">
                        顔写真や会社のロゴを登録してください。<br />
                        推奨サイズ: 400x400px (正方形)
                    </p>
                    <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="text-[10px] font-black text-navy-primary hover:text-navy-secondary uppercase tracking-widest bg-navy-primary/5 px-4 py-2 rounded-lg transition-all active:scale-95 active:bg-navy-primary/10"
                    >
                        画像を選択する
                    </button>
                    <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleAvatarChange}
                        accept="image/*"
                        className="hidden"
                    />
                </div>
            </div>

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
