'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
    Save,
    Loader2,
    User,
    Building2,
    Phone,
    Mail,
    Globe,
    Info,
    Camera,
    X,
    CreditCard,
    Calendar,
    AlertCircle,
    Zap,
    RefreshCw,
    Crown,
    Check,
    MessageCircle,
    Eye,
} from 'lucide-react'
import { useRouter, useParams } from 'next/navigation'
import { getErrorMessage } from '@/lib/utils/errors'
import imageCompression from 'browser-image-compression'
import Image from 'next/image'
import { format } from 'date-fns'
import { ja } from 'date-fns/locale'
import Link from 'next/link'
import { clsx } from 'clsx'
import { isPremiumActive } from '@/lib/utils/plan'
interface ProfileData {
    full_name: string
    company_name: string
    phone: string
    bio: string
    website: string
    email: string
    avatar_url: string
    plan: string
    plan_type: string
    current_period_end: string | null
    auto_renew: boolean
    is_admin: boolean
    /** 物件ページ等で電話ボタンを出すか（DB: show_phone_in_inquiry） */
    show_phone_in_inquiry: boolean
    /** 物件ページ等でLINE導線を出すか（DB: show_line_in_inquiry） */
    show_line_in_inquiry: boolean
}

export default function ProfileForm() {
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [updatingSubscription, setUpdatingSubscription] = useState(false)
    const [formData, setFormData] = useState<ProfileData>({
        full_name: '',
        company_name: '',
        phone: '',
        bio: '',
        website: '',
        email: '',
        avatar_url: '',
        plan: 'free',
        plan_type: 'standard',
        current_period_end: null,
        auto_renew: true,
        is_admin: false,
        show_phone_in_inquiry: true,
        show_line_in_inquiry: true,
    })
    const [togglingPhoneVisibility, setTogglingPhoneVisibility] = useState(false)
    const [togglingLineVisibility, setTogglingLineVisibility] = useState(false)
    /** LINE連携ページで保存した友だち追加URL等（表示のみ・このフォームでは編集しない） */
    const [lineConnectStoredValue, setLineConnectStoredValue] = useState('')
    const [error, setError] = useState<string | null>(null)
    const [success, setSuccess] = useState<string | null>(null)
    const [avatarFile, setAvatarFile] = useState<File | null>(null)
    const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
    const fileInputRef = useRef<HTMLInputElement>(null)
    const router = useRouter()
    const params = useParams()
    const locale = params.locale as string
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
                    email: user.email || '',
                    avatar_url: data.avatar_url || '',
                    plan: data.plan || 'free',
                    plan_type: data.plan_type || 'standard',
                    current_period_end: data.current_period_end || null,
                    auto_renew: data.auto_renew ?? true,
                    is_admin: data.is_admin === true,
                    show_phone_in_inquiry: data.show_phone_in_inquiry !== false,
                    show_line_in_inquiry: data.show_line_in_inquiry !== false,
                })
                const lineBasic = (data as { line_basic_id?: string | null }).line_basic_id?.trim() ?? ''
                const lineLegacy =
                    (data as { line_id?: string | null }).line_id != null
                        ? String((data as { line_id?: string | null }).line_id).trim()
                        : ''
                setLineConnectStoredValue(lineBasic || lineLegacy)
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

    const persistInquiryVisibility = async (patch: {
        show_phone_in_inquiry?: boolean
        show_line_in_inquiry?: boolean
    }) => {
        setError(null)
        setSuccess(null)
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) throw new Error('Authentication required')
        const { error: updateError } = await supabase
            .from('profiles')
            .update({
                ...patch,
                updated_at: new Date().toISOString(),
            })
            .eq('id', user.id)
        if (updateError) throw updateError
    }

    const toggleShowPhoneInInquiry = async () => {
        if (togglingPhoneVisibility) return
        const next = !formData.show_phone_in_inquiry
        const prev = formData.show_phone_in_inquiry
        setFormData((f) => ({ ...f, show_phone_in_inquiry: next }))
        setTogglingPhoneVisibility(true)
        try {
            await persistInquiryVisibility({ show_phone_in_inquiry: next })
            setSuccess('物件ページの電話表示を更新しました。')
        } catch (err: unknown) {
            setFormData((f) => ({ ...f, show_phone_in_inquiry: prev }))
            setError(getErrorMessage(err))
        } finally {
            setTogglingPhoneVisibility(false)
        }
    }

    const toggleShowLineInInquiry = async () => {
        if (togglingLineVisibility) return
        const next = !formData.show_line_in_inquiry
        const prev = formData.show_line_in_inquiry
        setFormData((f) => ({ ...f, show_line_in_inquiry: next }))
        setTogglingLineVisibility(true)
        try {
            await persistInquiryVisibility({ show_line_in_inquiry: next })
            setSuccess('物件ページのLINE表示を更新しました。')
        } catch (err: unknown) {
            setFormData((f) => ({ ...f, show_line_in_inquiry: prev }))
            setError(getErrorMessage(err))
        } finally {
            setTogglingLineVisibility(false)
        }
    }

    const toggleAutoRenew = async () => {
        setUpdatingSubscription(true)
        setError(null)
        setSuccess(null)

        try {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) throw new Error('Authentication required')

            const nextAutoRenew = !formData.auto_renew
            const { error: updateError } = await supabase
                .from('profiles')
                .update({
                    auto_renew: nextAutoRenew,
                    updated_at: new Date().toISOString()
                })
                .eq('id', user.id)

            if (updateError) throw updateError

            setFormData(prev => ({ ...prev, auto_renew: nextAutoRenew }))
            setSuccess(nextAutoRenew ? '次回の自動更新を有効にしました。' : '次回の自動更新をオフにしました。')
        } catch (err: any) {
            console.error('Toggle auto-renew error:', err)
            setError(getErrorMessage(err))
        } finally {
            setUpdatingSubscription(false)
        }
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setSaving(true)
        setError(null)
        setSuccess(null)

        try {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) throw new Error('Authentication required')

            // 1. Upload avatar if changed
            let finalAvatarUrl = formData.avatar_url
            if (avatarFile) {
                finalAvatarUrl = await uploadAvatar(user.id)
            }

            // 2. Update profile（電話/LINE の物件ページ表示は別トグルで即時保存）
            const { error } = await supabase
                .from('profiles')
                .update({
                    full_name: formData.full_name,
                    company_name: formData.company_name,
                    phone: formData.phone,
                    bio: formData.bio,
                    website: formData.website,
                    avatar_url: finalAvatarUrl,
                    updated_at: new Date().toISOString()
                })
                .eq('id', user.id)

            if (error) throw error

            setSuccess('プロフィールを更新しました。')
            window.scrollTo({ top: 0, behavior: 'smooth' })
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

    const isPremium = isPremiumActive({
        plan: formData.plan,
        plan_type: formData.plan_type,
        current_period_end: formData.current_period_end,
        is_admin: formData.is_admin,
    })

    return (
        <div className="space-y-12">
            {/* メッセージ表示 */}
            <div className="space-y-4">
                {error && (
                    <div className="bg-red-50 text-red-600 p-4 rounded-2xl text-sm font-bold border border-red-100 flex items-center gap-3">
                        <AlertCircle className="w-5 h-5 shrink-0" />
                        {error}
                    </div>
                )}
                {success && (
                    <div className="bg-emerald-50 text-emerald-600 p-4 rounded-2xl text-sm font-bold border border-emerald-100 flex items-center gap-3 animate-in fade-in slide-in-from-top-2">
                        <Check className="w-5 h-5 shrink-0" />
                        {success}
                    </div>
                )}
            </div>

            <form onSubmit={handleSubmit} className="space-y-12">
                {/* サブスクリプション管理セクション */}
                <section className="bg-slate-50/50 border border-slate-100 rounded-[2.5rem] p-6 md:p-10 relative overflow-hidden group transition-all hover:bg-white hover:shadow-xl hover:shadow-slate-200/50">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-navy-primary/5 rounded-full -mr-16 -mt-16 pointer-events-none" />

                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-8 relative z-10">
                        <div className="space-y-4">
                            <h3 className="text-[10px] font-black text-navy-primary uppercase tracking-[0.2em] flex items-center gap-2">
                                <CreditCard className="w-3 h-3" />
                                Subscription Management
                            </h3>
                            <div>
                                <div className="flex items-center gap-3 mb-1">
                                    <h2 className="text-2xl font-black text-navy-secondary">
                                        {isPremium ? 'Pro Plan' : 'Standard Plan'}
                                    </h2>
                                    {isPremium && (
                                        <span className="bg-amber-100 text-amber-700 text-[10px] font-black px-2 py-0.5 rounded-full flex items-center gap-1">
                                            <Crown className="w-3 h-3" />
                                            ACTIVE
                                        </span>
                                    )}
                                </div>
                                <p className="text-sm text-slate-500 font-medium">
                                    {isPremium
                                        ? 'プロフェッショナルなすべての機能をご利用いただけます。'
                                        : '基本機能を無料でご利用いただけます。掲載数に制限はありません。'
                                    }
                                </p>
                            </div>

                            {isPremium && formData.current_period_end && (
                                <div className="flex items-center gap-6 mt-4 pt-4 border-t border-slate-100">
                                    <div className="space-y-1">
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">次回更新日</p>
                                        <div className="flex items-center gap-2 font-bold text-navy-secondary">
                                            <Calendar className="w-4 h-4 text-slate-400" />
                                            {format(new Date(formData.current_period_end), 'yyyy年MM月dd日', { locale: ja })}
                                        </div>
                                    </div>
                                    <div className="space-y-1 text-center md:text-left">
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">自動更新</p>
                                        <div className={`text-sm font-black ${formData.auto_renew ? 'text-emerald-500' : 'text-slate-400'}`}>
                                            {formData.auto_renew ? 'ON' : 'OFF'}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="flex flex-col gap-3 shrink-0">
                            {!isPremium ? (
                                <Link
                                    href={`/${locale}/pricing`}
                                    className="flex items-center justify-center gap-2 bg-navy-primary text-white px-8 py-4 rounded-2xl font-black hover:bg-navy-secondary transition-all shadow-lg active:scale-95 text-sm"
                                >
                                    <Zap className="w-4 h-4 fill-white" />
                                    プロプランにアップグレード
                                </Link>
                            ) : (
                                <button
                                    type="button"
                                    onClick={toggleAutoRenew}
                                    disabled={updatingSubscription}
                                    className={`flex items-center justify-center gap-2 px-8 py-4 rounded-2xl font-black transition-all active:scale-95 text-sm border-2 ${formData.auto_renew
                                        ? 'bg-white border-slate-200 text-slate-600 hover:border-red-200 hover:text-red-500'
                                        : 'bg-emerald-500 border-emerald-500 text-white hover:bg-emerald-600'
                                        }`}
                                >
                                    {updatingSubscription ? (
                                        <RefreshCw className="w-4 h-4 animate-spin" />
                                    ) : formData.auto_renew ? (
                                        <>
                                            <X className="w-4 h-4" />
                                            次回の自動更新をオフにする
                                        </>
                                    ) : (
                                        <>
                                            <RefreshCw className="w-4 h-4" />
                                            自動更新をオンにする
                                        </>
                                    )}
                                </button>
                            )}
                            {isPremium && (
                                <p className="text-[10px] text-slate-400 font-medium text-center md:text-left">
                                    {formData.auto_renew
                                        ? '※ 自動更新をオフにしても、期間終了まで機能をご利用いただけます。'
                                        : '※ 自動更新がオフになっています。期間終了後はStandardプランに移行します。'
                                    }
                                </p>
                            )}
                        </div>
                    </div>
                </section>

                <section className="rounded-[2.5rem] border border-[#06C755]/25 bg-[#06C755]/5 p-6 md:p-8 shadow-sm">
                    <h3 className="text-sm font-black text-navy-secondary flex items-center gap-2">
                        <MessageCircle className="h-5 w-5 text-[#06C755]" />
                        LINE問い合わせ（LINE公式アカウント連携の設定）
                    </h3>
                    <p className="mt-3 text-xs font-medium leading-relaxed text-slate-600">
                        <strong>LINE公式アカウントの友だち追加URL</strong>
                        だけで物件ページからお客様をLINEへ案内できます（API設定は不要）。アプリでアカウントを作る手順も同ページにあります。
                    </p>
                    <Link
                        href={`/${locale}/dashboard/line-connect`}
                        className="mt-5 inline-flex items-center justify-center gap-2 rounded-xl bg-[#06C755] px-6 py-3.5 text-sm font-black text-white shadow-md transition hover:bg-[#05b34c] active:scale-[0.98]"
                    >
                        LINE連携の設定ページを開く
                    </Link>
                </section>

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

                    {/* 連絡先 */}
                    <div className="space-y-6">
                        <h3 className="text-sm font-black text-navy-secondary uppercase tracking-widest flex items-center">
                            <Phone className="w-4 h-4 mr-2 text-navy-primary" />
                            連絡先
                        </h3>

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
                                <Mail className="w-4 h-4 text-slate-300 absolute left-3.5 top-1/2 -translate-y-1/2" />
                            </div>
                            <p className="text-[10px] text-slate-400 mt-1 ml-1">※ログイン用メールアドレスです。変更はできません。</p>
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

                        <div className="rounded-xl border border-[#06C755]/25 bg-gradient-to-br from-[#06C755]/6 to-white p-4 shadow-sm">
                            <p className="text-[10px] font-black uppercase tracking-widest text-[#047c3d] flex items-center gap-2">
                                <MessageCircle className="h-3.5 w-3.5 shrink-0" aria-hidden />
                                LINE（連携設定で登録した値）
                            </p>
                            {lineConnectStoredValue ? (
                                <p className="mt-2 break-all text-xs font-semibold leading-relaxed text-navy-secondary">
                                    {lineConnectStoredValue}
                                </p>
                            ) : (
                                <p className="mt-2 text-xs font-medium leading-relaxed text-slate-600">
                                    未設定です。{' '}
                                    <Link
                                        href={`/${locale}/dashboard/line-connect`}
                                        className="font-black text-[#047c3d] underline decoration-[#06C755]/40 underline-offset-2 hover:text-[#035c2f]"
                                    >
                                        LINE連携の設定
                                    </Link>
                                    から友だち追加URLなどを登録できます。
                                </p>
                            )}
                            <p className="mt-2 text-[10px] font-medium text-slate-500">
                                ※ 編集は「LINE連携の設定」ページから行えます。ここでは参照のみです。
                            </p>
                        </div>

                        <div className="rounded-2xl border border-navy-primary/15 bg-gradient-to-br from-slate-50 to-white p-5 shadow-sm">
                            <h4 className="text-[10px] font-black uppercase tracking-widest text-navy-primary flex items-center gap-2">
                                <Eye className="h-3.5 w-3.5" aria-hidden />
                                物件ページでの連絡先表示
                            </h4>
                            <p className="mt-2 text-xs font-medium leading-relaxed text-slate-600">
                                メールでの問い合わせフォームは<strong className="text-navy-secondary">常に表示</strong>されます（非表示にできません）。
                            </p>
                            <div className="mt-4 space-y-3">
                                <label className="flex cursor-pointer items-start justify-between gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-slate-300">
                                    <span className="min-w-0 flex-1">
                                        <span className="block text-sm font-black text-navy-secondary">電話番号を物件ページに表示</span>
                                        <span className="mt-1 block text-[11px] font-medium leading-relaxed text-slate-500">
                                            OFFにすると、物件ページ下部の「電話」ボタンが出なくなります。電話番号を未登録のときは、ONでも表示されません。
                                        </span>
                                    </span>
                                    <span className="relative flex shrink-0 items-center gap-2 pt-0.5">
                                        <input
                                            type="checkbox"
                                            role="switch"
                                            className="sr-only"
                                            checked={formData.show_phone_in_inquiry}
                                            disabled={togglingPhoneVisibility}
                                            onChange={() => void toggleShowPhoneInInquiry()}
                                            aria-label="電話番号を物件ページに表示"
                                        />
                                        <span
                                            className={clsx(
                                                'flex h-7 w-12 items-center rounded-full p-0.5 transition',
                                                formData.show_phone_in_inquiry ? 'bg-emerald-500' : 'bg-slate-300',
                                                togglingPhoneVisibility && 'opacity-50'
                                            )}
                                            aria-hidden
                                        >
                                            <span
                                                className={clsx(
                                                    'block h-6 w-6 rounded-full bg-white shadow transition-transform duration-200',
                                                    formData.show_phone_in_inquiry ? 'translate-x-[1.25rem]' : 'translate-x-0'
                                                )}
                                            />
                                        </span>
                                        {togglingPhoneVisibility ? (
                                            <Loader2 className="h-4 w-4 shrink-0 animate-spin text-navy-primary" aria-hidden />
                                        ) : null}
                                    </span>
                                </label>

                                <label className="flex cursor-pointer items-start justify-between gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-slate-300">
                                    <span className="min-w-0 flex-1">
                                        <span className="block text-sm font-black text-navy-secondary">LINEを物件ページに表示</span>
                                        <span className="mt-1 block text-[11px] font-medium leading-relaxed text-slate-500">
                                            OFFにすると、問い合わせのLINEタブ・ボタンが出なくなります。LINE連携を未設定のときは、ONでも表示されません。
                                        </span>
                                    </span>
                                    <span className="relative flex shrink-0 items-center gap-2 pt-0.5">
                                        <input
                                            type="checkbox"
                                            role="switch"
                                            className="sr-only"
                                            checked={formData.show_line_in_inquiry}
                                            disabled={togglingLineVisibility}
                                            onChange={() => void toggleShowLineInInquiry()}
                                            aria-label="LINEを物件ページに表示"
                                        />
                                        <span
                                            className={clsx(
                                                'flex h-7 w-12 items-center rounded-full p-0.5 transition',
                                                formData.show_line_in_inquiry ? 'bg-emerald-500' : 'bg-slate-300',
                                                togglingLineVisibility && 'opacity-50'
                                            )}
                                            aria-hidden
                                        >
                                            <span
                                                className={clsx(
                                                    'block h-6 w-6 rounded-full bg-white shadow transition-transform duration-200',
                                                    formData.show_line_in_inquiry ? 'translate-x-[1.25rem]' : 'translate-x-0'
                                                )}
                                            />
                                        </span>
                                        {togglingLineVisibility ? (
                                            <Loader2 className="h-4 w-4 shrink-0 animate-spin text-navy-primary" aria-hidden />
                                        ) : null}
                                    </span>
                                </label>
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
        </div>
    )
}
