'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Send, Loader2, CheckCircle } from 'lucide-react'
import { getErrorMessage } from '@/lib/utils/errors'

interface InquiryFormProps {
    propertyId: string
    propertyName: string
}

export default function InquiryForm({ propertyId, propertyName }: InquiryFormProps) {
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        phone: '',
        message: `「${propertyName}」について、詳細を教えてください。`
    })
    const [loading, setLoading] = useState(false)
    const [success, setSuccess] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const supabase = createClient()

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()

        // Simple client-side rate limit check (1 inquiry per 30 seconds)
        const lastInquiry = localStorage.getItem(`last_inquiry_${propertyId}`)
        if (lastInquiry && Date.now() - parseInt(lastInquiry) < 30000) {
            setError('送信の間隔が短すぎます。しばらく待ってから再度お試しください。')
            return
        }

        setLoading(true)
        setError(null)

        try {
            // Check if propertyId is a valid UUID (mock data IDs like 'keen-sriracha-v2' will fail DB constraints)
            const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(propertyId)

            if (!isUuid) {
                console.warn('Mock property detected (non-UUID ID). This inquiry will not be saved to the database.')
                // For mock data, we just simulate success to avoid DB foreign key errors
                await new Promise(resolve => setTimeout(resolve, 1000))
                localStorage.setItem(`last_inquiry_${propertyId}`, Date.now().toString())
                setSuccess(true)
                return
            }

            console.log('Inserting inquiry for property:', propertyId)
            const { data: submitResult, error: submitError } = await supabase
                .from('inquiries')
                .insert([
                    {
                        property_id: propertyId,
                        inquirer_name: formData.name,
                        inquirer_email: formData.email,
                        inquirer_phone: formData.phone,
                        message: formData.message
                    }
                ])
                .select()

            if (submitError) {
                console.error('Supabase error details:', submitError)
                throw submitError
            }

            console.log('Inquiry submitted successfully:', submitResult)

            // Set rate limit timestamp
            localStorage.setItem(`last_inquiry_${propertyId}`, Date.now().toString())
            setSuccess(true)
        } catch (err: any) {
            console.error('Inquiry submission error:', err)
            setError(getErrorMessage(err))
        } finally {
            setLoading(false)
        }
    }

    if (success) {
        return (
            <div className="bg-emerald-50 rounded-3xl p-10 text-center border border-emerald-100 animate-in fade-in zoom-in duration-500">
                <div className="bg-white w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 shadow-sm">
                    <CheckCircle className="w-10 h-10 text-emerald-500" />
                </div>
                <h3 className="text-xl font-black text-navy-secondary mb-3">送信完了いたしました</h3>
                <p className="text-slate-600 text-sm leading-relaxed">
                    お問い合わせありがとうございます。内容を確認次第、担当者よりご連絡させていただきます。
                </p>
            </div>
        )
    }

    return (
        <div className="bg-white rounded-3xl p-8 shadow-xl border border-slate-100">
            <h3 className="text-xl font-black text-navy-secondary mb-6 flex items-center">
                <Send className="w-5 h-5 mr-3 text-navy-primary" />
                お問い合わせ
            </h3>

            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">お名前 (必須)</label>
                    <input
                        type="text"
                        required
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        placeholder="山田 太郎"
                        className="w-full px-4 py-3.5 bg-slate-50 border border-slate-100 rounded-xl text-sm focus:ring-2 focus:ring-navy-primary outline-none transition-all"
                        onInvalid={e => (e.target as HTMLInputElement).setCustomValidity('お名前を入力してください')}
                        onInput={e => (e.target as HTMLInputElement).setCustomValidity('')}
                    />
                </div>

                <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">メールアドレス (必須)</label>
                    <input
                        type="email"
                        required
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        placeholder="yamada@example.com"
                        className="w-full px-4 py-3.5 bg-slate-50 border border-slate-100 rounded-xl text-sm focus:ring-2 focus:ring-navy-primary outline-none transition-all"
                        onInvalid={e => (e.target as HTMLInputElement).setCustomValidity('メールアドレスを正しく入力してください')}
                        onInput={e => (e.target as HTMLInputElement).setCustomValidity('')}
                    />
                </div>

                <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">電話番号</label>
                    <input
                        type="tel"
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        placeholder="090-0000-0000"
                        className="w-full px-4 py-3.5 bg-slate-50 border border-slate-100 rounded-xl text-sm focus:ring-2 focus:ring-navy-primary outline-none transition-all"
                    />
                </div>

                <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">お問い合わせ内容</label>
                    <textarea
                        rows={4}
                        required
                        value={formData.message}
                        onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                        className="w-full px-4 py-3.5 bg-slate-50 border border-slate-100 rounded-xl text-sm focus:ring-2 focus:ring-navy-primary outline-none transition-all resize-none"
                        onInvalid={e => (e.target as HTMLTextAreaElement).setCustomValidity('お問い合わせ内容を入力してください')}
                        onInput={e => (e.target as HTMLTextAreaElement).setCustomValidity('')}
                    ></textarea>
                </div>

                {error && (
                    <div className="text-red-500 text-xs font-bold px-1">{error}</div>
                )}

                <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-navy-primary text-white py-4 rounded-xl font-black flex items-center justify-center space-x-2 hover:bg-navy-secondary transition-all shadow-lg hover:shadow-xl mt-4"
                >
                    {loading ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                        <>
                            <span>この物件にお問い合わせ</span>
                            <Send className="w-4 h-4 ml-1" />
                        </>
                    )}
                </button>

                <p className="text-[10px] text-slate-400 text-center mt-4">
                    お問い合わせ内容送信後、担当者よりご連絡いたします。<br />
                    ※匿名性は維持され、掲載主に直接メールアドレス等が開示されることはありません。
                </p>
            </form>
        </div>
    )
}
