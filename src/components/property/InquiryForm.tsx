'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Send, Loader2, CheckCircle, ChevronDown, ChevronUp } from 'lucide-react'
import { getErrorMessage } from '@/lib/utils/errors'
import { clsx } from 'clsx'

interface InquiryFormProps {
    propertyId: string
    propertyName: string
    dict: any
}

export default function InquiryForm({ propertyId, propertyName, dict }: InquiryFormProps) {
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        phone: '',
        message: dict.property.inquiry_default_message?.replace('{propertyName}', propertyName) || `Regarding "${propertyName}", please give me more details.`
    })
    const [loading, setLoading] = useState(false)
    const [success, setSuccess] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [isOpen, setIsOpen] = useState(false)
    const [isDesktop, setIsDesktop] = useState(false)

    useEffect(() => {
        setIsDesktop(window.innerWidth >= 1024)
        const handleResize = () => setIsDesktop(window.innerWidth >= 1024)
        window.addEventListener('resize', handleResize)
        
        const handleOpenEvent = () => setIsOpen(true)
        window.addEventListener('open-inquiry-form', handleOpenEvent)

        return () => {
            window.removeEventListener('resize', handleResize)
            window.removeEventListener('open-inquiry-form', handleOpenEvent)
        }
    }, [])

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
            // Check if propertyId is a valid UUID
            const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(propertyId)

            if (!isUuid) {
                console.warn('Mock property detected (non-UUID ID). This inquiry will not be saved to the database.')
                await new Promise(resolve => setTimeout(resolve, 1000))
                localStorage.setItem(`last_inquiry_${propertyId}`, Date.now().toString())
                setSuccess(true)
                return
            }

            const { error: submitError } = await supabase
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

            if (submitError) throw submitError

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
                <h3 className="text-lg font-normal text-navy-secondary mb-3">{dict.property.inquiry_success_title}</h3>
                <p className="text-slate-600 text-sm leading-relaxed">
                    {dict.property.inquiry_success_desc}
                </p>
            </div>
        )
    }

    return (
        <div id="inquiry-form-section" className="relative overflow-visible scroll-mt-24">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="w-full flex items-center justify-between lg:cursor-default"
                disabled={isDesktop}
            >
                <h3 className="text-base font-normal text-navy-secondary flex items-center">
                    <Send className="w-5 h-5 mr-3 text-navy-primary" />
                    {dict.property.inquiry_title}
                </h3>
                <div className="lg:hidden text-navy-primary bg-slate-50 p-1 rounded-lg">
                    {isOpen ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                </div>
            </button>

            <div className={clsx(
                "transition-all duration-500 ease-in-out lg:opacity-100 lg:max-h-none lg:mt-6 px-0.5",
                isOpen
                    ? "mt-6 max-h-[2000px] opacity-100 overflow-visible"
                    : "max-h-0 opacity-0 lg:max-h-none lg:opacity-100 overflow-hidden lg:overflow-visible"
            )}>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-[10px] font-normal text-slate-400 uppercase tracking-widest mb-1.5 ml-1">{dict.labels.name_label} ({dict.common.required})</label>
                        <input
                            type="text"
                            required
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            placeholder={dict.labels.name_placeholder}
                            className="w-full px-4 py-3.5 bg-slate-50 border border-slate-100 rounded-xl text-sm focus:ring-2 focus:ring-navy-primary outline-none transition-all"
                            onInvalid={e => (e.target as HTMLInputElement).setCustomValidity(dict.property.error_name_required)}
                            onInput={e => (e.target as HTMLInputElement).setCustomValidity('')}
                        />
                    </div>

                    <div>
                        <label className="block text-[10px] font-normal text-slate-400 uppercase tracking-widest mb-1.5 ml-1">{dict.labels.email_label} ({dict.common.required})</label>
                        <input
                            type="email"
                            required
                            value={formData.email}
                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                            placeholder="example@mail.com"
                            className="w-full px-4 py-3.5 bg-slate-50 border border-slate-100 rounded-xl text-sm focus:ring-2 focus:ring-navy-primary outline-none transition-all"
                            onInvalid={e => (e.target as HTMLInputElement).setCustomValidity(dict.property.error_email_invalid)}
                            onInput={e => (e.target as HTMLInputElement).setCustomValidity('')}
                        />
                    </div>

                    <div>
                        <label className="block text-[10px] font-normal text-slate-400 uppercase tracking-widest mb-1.5 ml-1">{dict.labels.phone_label}</label>
                        <input
                            type="tel"
                            value={formData.phone}
                            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                            placeholder="+66 00 000 0000"
                            className="w-full px-4 py-3.5 bg-slate-50 border border-slate-100 rounded-xl text-sm focus:ring-2 focus:ring-navy-primary outline-none transition-all"
                        />
                    </div>

                    <div>
                        <label className="block text-[10px] font-normal text-slate-400 uppercase tracking-widest mb-1.5 ml-1">{dict.labels.inquiry_content_label}</label>
                        <textarea
                            rows={4}
                            required
                            value={formData.message}
                            onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                            className="w-full px-4 py-3.5 bg-slate-50 border border-slate-100 rounded-xl text-sm focus:ring-2 focus:ring-navy-primary outline-none transition-all resize-none"
                            onInvalid={e => (e.target as HTMLTextAreaElement).setCustomValidity(dict.property.error_message_required)}
                            onInput={e => (e.target as HTMLTextAreaElement).setCustomValidity('')}
                        ></textarea>
                    </div>

                    {error && (
                        <div className="text-red-500 text-xs font-normal px-1">{error}</div>
                    )}

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-navy-primary text-white py-4 rounded-xl font-normal flex items-center justify-center space-x-2 hover:bg-navy-secondary transition-all shadow-lg hover:shadow-xl mt-4"
                    >
                        {loading ? (
                            <Loader2 className="w-5 h-5 animate-spin" />
                        ) : (
                            <>
                                <span>{dict.property.submit_inquiry_btn}</span>
                                <Send className="w-4 h-4 ml-1" />
                            </>
                        )}
                    </button>

                    <p className="text-[10px] text-slate-400 text-center mt-4 whitespace-pre-line">
                        {dict.property.inquiry_footer_note}
                    </p>
                </form>
            </div>
        </div>
    )
}
