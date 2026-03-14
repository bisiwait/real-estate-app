export const runtime = 'edge';
'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Lock, Loader2, CheckCircle2, ShieldCheck } from 'lucide-react'
import { getErrorMessage } from '@/lib/utils/errors'

export default function ResetPasswordPage() {
    const [password, setPassword] = useState('')
    const [confirmPassword, setConfirmPassword] = useState('')
    const [loading, setLoading] = useState(false)
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)

    const router = useRouter()
    const supabase = createClient()

    const handleResetPassword = async (e: React.FormEvent) => {
        e.preventDefault()

        if (password !== confirmPassword) {
            setMessage({ type: 'error', text: '繝代せ繝ｯ繝ｼ繝峨′荳閾ｴ縺励∪縺帙ｓ縲・ })
            return
        }

        setLoading(true)
        setMessage(null)

        try {
            const { error } = await supabase.auth.updateUser({
                password: password,
            })
            if (error) throw error

            setMessage({ type: 'success', text: '繝代せ繝ｯ繝ｼ繝峨ｒ譖ｴ譁ｰ縺励∪縺励◆縲・遘貞ｾ後↓繝ｭ繧ｰ繧､繝ｳ逕ｻ髱｢縺ｸ遘ｻ蜍輔＠縺ｾ縺吶・ })
            setTimeout(() => {
                router.push('/login')
            }, 3000)
        } catch (error: any) {
            setMessage({ type: 'error', text: getErrorMessage(error) })
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center py-20 px-4 mt-10">
            <div className="bg-white w-full max-w-md rounded-[40px] shadow-2xl overflow-hidden border border-slate-100 p-8 md:p-12">
                <div className="mb-10 text-center">
                    <div className="w-16 h-16 bg-navy-primary/5 rounded-2xl flex items-center justify-center mx-auto mb-6">
                        <Lock className="w-8 h-8 text-navy-primary" />
                    </div>
                    <h1 className="text-3xl font-black text-navy-secondary mb-3">
                        譁ｰ縺励＞繝代せ繝ｯ繝ｼ繝・
                    </h1>
                    <p className="text-slate-400 font-medium">繧ｻ繧ｭ繝･繝ｪ繝・ぅ菫晁ｭｷ縺ｮ縺溘ａ縲∵耳貂ｬ縺輔ｌ縺ｫ縺上＞蠑ｷ蜉帙↑繝代せ繝ｯ繝ｼ繝峨ｒ險ｭ螳壹＠縺ｦ縺上□縺輔＞縲・/p>
                </div>

                {message && (
                    <div className={`mb-8 p-4 rounded-2xl text-sm font-bold flex items-center ${message.type === 'success' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-red-50 text-red-600 border border-red-100'}`}>
                        {message.type === 'success' ? <CheckCircle2 className="w-4 h-4 mr-3 shrink-0" /> : <Lock className="w-4 h-4 mr-3 shrink-0" />}
                        {message.text}
                    </div>
                )}

                <form onSubmit={handleResetPassword} className="space-y-6">
                    <div>
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">譁ｰ縺励＞繝代せ繝ｯ繝ｼ繝・/label>
                        <div className="relative">
                            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="窶｢窶｢窶｢窶｢窶｢窶｢窶｢窶｢"
                                className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm focus:ring-4 focus:ring-navy-primary/5 focus:border-navy-primary outline-none transition-all font-medium"
                                required
                                minLength={6}
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">繝代せ繝ｯ繝ｼ繝峨・遒ｺ隱・/label>
                        <div className="relative">
                            <ShieldCheck className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                            <input
                                type="password"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                placeholder="窶｢窶｢窶｢窶｢窶｢窶｢窶｢窶｢"
                                className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm focus:ring-4 focus:ring-navy-primary/5 focus:border-navy-primary outline-none transition-all font-medium"
                                required
                                minLength={6}
                            />
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-navy-primary text-white py-5 rounded-2xl font-black flex items-center justify-center space-x-3 hover:bg-navy-secondary transition-all shadow-xl shadow-navy-primary/20"
                    >
                        {loading ? (
                            <Loader2 className="w-5 h-5 animate-spin" />
                        ) : (
                            <span>繝代せ繝ｯ繝ｼ繝峨ｒ譖ｴ譁ｰ縺吶ｋ</span>
                        )}
                    </button>
                </form>
            </div>
        </div>
    )
}
