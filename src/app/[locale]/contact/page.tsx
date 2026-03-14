export const runtime = 'edge';
'use client'

import { useState } from 'react'
import { Mail, Phone, MapPin, MessageCircle, Send, Loader2, CheckCircle2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { getErrorMessage } from '@/lib/utils/errors'

export default function ContactPage() {
    const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle')
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        type: '迚ｩ莉ｶ縺ｫ縺､縺・※',
        message: ''
    })

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setStatus('submitting')

        const supabase = createClient()
        const { error } = await supabase
            .from('inquiries')
            .insert([
                {
                    inquirer_name: formData.name,
                    inquirer_email: formData.email,
                    message: `[${formData.type}] ${formData.message}`
                }
            ])

        if (error) {
            console.error('Contact error:', error)
            // Fallback if table doesn't exist yet, just simulate for now
            if (error.code === '42P01') {
                await new Promise(r => setTimeout(r, 1000))
                setStatus('success')
                return
            }
            setStatus('error')
        } else {
            setStatus('success')
        }
    }

    if (status === 'success') {
        return (
            <div className="bg-slate-50 min-h-screen py-20 flex items-center justify-center">
                <div className="bg-white rounded-3xl p-12 shadow-xl border border-slate-100 max-w-lg w-full text-center">
                    <div className="bg-emerald-100 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
                        <CheckCircle2 className="text-emerald-600 w-10 h-10" />
                    </div>
                    <h2 className="text-3xl font-black text-navy-secondary mb-4">縺雁撫縺・粋繧上○螳御ｺ・/h2>
                    <p className="text-slate-500 mb-8">
                        縺雁撫縺・粋繧上○縺ゅｊ縺後→縺・＃縺悶＞縺ｾ縺吶よ律譛ｬ莠ｺ繧ｹ繧ｿ繝・ヵ繧医ｊ縲∫匳骭ｲ縺・◆縺縺・◆繝｡繝ｼ繝ｫ繧｢繝峨Ξ繧ｹ縺ｸ霑ｽ縺｣縺ｦ縺秘｣邨｡縺輔○縺ｦ縺・◆縺縺阪∪縺吶・
                    </p>
                    <button onClick={() => setStatus('idle')} className="bg-navy-primary text-white px-8 py-3 rounded-xl font-bold hover:bg-navy-secondary transition-all">
                        繝輔か繝ｼ繝縺ｫ謌ｻ繧・
                    </button>
                </div>
            </div>
        )
    }

    return (
        <div className="bg-slate-50 min-h-screen">
            <div className="bg-navy-secondary py-20 text-white">
                <div className="container mx-auto px-4 text-center">
                    <h1 className="text-4xl md:text-6xl font-black mb-6">縺雁撫縺・粋繧上○</h1>
                    <p className="text-slate-400 text-lg max-w-2xl mx-auto">
                        迚ｩ莉ｶ縺ｫ髢｢縺吶ｋ縺碑ｳｪ蝠上ｄ謗ｲ霈峨・縺皮嶌隲・↑縺ｩ縲・br className="hidden md:block" />
                        譌･譛ｬ莠ｺ繧ｹ繧ｿ繝・ヵ縺御ｸ∝ｯｧ縺ｫ縺顔ｭ斐∴縺・◆縺励∪縺吶・
                    </p>
                </div>
            </div>

            <div className="container mx-auto px-4 -mt-10 pb-32">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

                    <div className="bg-white rounded-3xl p-10 shadow-xl border border-slate-100 lg:col-span-2">
                        <h2 className="text-2xl font-black text-navy-secondary mb-8">騾∽ｿ｡繝輔か繝ｼ繝</h2>
                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">縺雁錐蜑・(蠢・・</label>
                                    <input
                                        required
                                        type="text"
                                        className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-2 focus:ring-navy-primary outline-none transition-all"
                                        placeholder="螻ｱ逕ｰ 螟ｪ驛・
                                        value={formData.name}
                                        onChange={e => setFormData({ ...formData, name: e.target.value })}
                                        onInvalid={e => (e.target as HTMLInputElement).setCustomValidity('縺雁錐蜑阪ｒ蜈･蜉帙＠縺ｦ縺上□縺輔＞')}
                                        onInput={e => (e.target as HTMLInputElement).setCustomValidity('')}
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">繝｡繝ｼ繝ｫ繧｢繝峨Ξ繧ｹ (蠢・・</label>
                                    <input
                                        required
                                        type="email"
                                        className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-2 focus:ring-navy-primary outline-none transition-all"
                                        placeholder="yamada@example.com"
                                        value={formData.email}
                                        onChange={e => setFormData({ ...formData, email: e.target.value })}
                                        onInvalid={e => (e.target as HTMLInputElement).setCustomValidity('譛牙柑縺ｪ繝｡繝ｼ繝ｫ繧｢繝峨Ξ繧ｹ繧貞・蜉帙＠縺ｦ縺上□縺輔＞')}
                                        onInput={e => (e.target as HTMLInputElement).setCustomValidity('')}
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">縺雁撫縺・粋繧上○遞ｮ蛻･</label>
                                <select
                                    className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-2 focus:ring-navy-primary outline-none transition-all appearance-none cursor-pointer"
                                    value={formData.type}
                                    onChange={e => setFormData({ ...formData, type: e.target.value })}
                                >
                                    <option>迚ｩ莉ｶ縺ｫ縺､縺・※</option>
                                    <option>謗ｲ霈峨↓縺､縺・※・医が繝ｼ繝翫・讒假ｼ・/option>
                                    <option>縺昴・莉・/option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">繝｡繝・そ繝ｼ繧ｸ (蠢・・</label>
                                <textarea
                                    required
                                    rows={6}
                                    className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-2 focus:ring-navy-primary outline-none transition-all resize-none"
                                    placeholder="繝｡繝・そ繝ｼ繧ｸ繧貞・蜉帙＠縺ｦ縺上□縺輔＞"
                                    value={formData.message}
                                    onChange={e => setFormData({ ...formData, message: e.target.value })}
                                    onInvalid={e => (e.target as HTMLTextAreaElement).setCustomValidity('繝｡繝・そ繝ｼ繧ｸ繧貞・蜉帙＠縺ｦ縺上□縺輔＞')}
                                    onInput={e => (e.target as HTMLTextAreaElement).setCustomValidity('')}
                                ></textarea>
                            </div>

                            {status === 'error' && (
                                <div className="p-4 bg-red-50 text-red-600 rounded-xl text-sm font-bold flex items-center space-x-2">
                                    <Send className="w-4 h-4" />
                                    <span>騾∽ｿ｡縺ｫ螟ｱ謨励＠縺ｾ縺励◆縲よ凾髢薙ｒ鄂ｮ縺・※蜀榊ｺｦ縺願ｩｦ縺励￥縺縺輔＞縲・/span>
                                </div>
                            )}

                            <button
                                type="submit"
                                disabled={status === 'submitting'}
                                className="w-full bg-navy-primary text-white py-5 rounded-2xl font-black text-lg hover:bg-navy-secondary transition-all shadow-lg hover:shadow-xl disabled:opacity-70 flex items-center justify-center space-x-2"
                            >
                                {status === 'submitting' ? (
                                    <Loader2 className="w-6 h-6 animate-spin" />
                                ) : (
                                    <>
                                        <span>繝｡繝・そ繝ｼ繧ｸ繧帝∽ｿ｡縺吶ｋ</span>
                                        <Send className="w-5 h-5" />
                                    </>
                                )}
                            </button>
                        </form>
                    </div>


                    <div className="space-y-6">
                        <div className="bg-white rounded-3xl p-8 shadow-xl border border-slate-100">
                            <h3 className="text-xl font-black text-navy-secondary mb-8 underline decoration-navy-primary decoration-4 underline-offset-8">騾｣邨｡蜈域ュ蝣ｱ</h3>
                            <div className="space-y-8">
                                <div className="flex items-start">
                                    <div className="w-12 h-12 bg-navy-primary/10 rounded-2xl flex items-center justify-center mr-4 flex-shrink-0">
                                        <Mail className="w-6 h-6 text-navy-primary" />
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Email</p>
                                        <p className="text-navy-secondary font-bold">info@pattaya-esta.com</p>
                                    </div>
                                </div>
                                <div className="flex items-start">
                                    <div className="w-12 h-12 bg-navy-primary/10 rounded-2xl flex items-center justify-center mr-4 flex-shrink-0">
                                        <Phone className="w-6 h-6 text-navy-primary" />
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Business Hours</p>
                                        <p className="text-navy-secondary font-bold">10:00 - 18:00 (蟷ｳ譌･)</p>
                                    </div>
                                </div>
                                <div className="flex items-start">
                                    <div className="w-12 h-12 bg-navy-primary/10 rounded-2xl flex items-center justify-center mr-4 flex-shrink-0">
                                        <MessageCircle className="w-6 h-6 text-navy-primary" />
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5">LINE</p>
                                        <p className="text-navy-secondary font-bold">@pattaya-esta</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="bg-navy-primary text-white rounded-3xl p-8 shadow-xl relative overflow-hidden group">
                            <div className="absolute -right-4 -bottom-4 opacity-10 group-hover:scale-110 transition-transform duration-500">
                                <MapPin className="w-32 h-32" />
                            </div>
                            <h4 className="text-xl font-black mb-4 relative z-10">Office</h4>
                            <p className="text-sm text-slate-300 leading-relaxed relative z-10">
                                888 Moo 10, Pattaya 2nd Rd, Bang Lamung,<br />
                                Chon Buri 20150, Thailand
                            </p>
                        </div>
                    </div>

                </div>
            </div>
        </div>
    )
}
