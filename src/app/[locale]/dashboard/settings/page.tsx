import { createClient } from '@/lib/supabase/server'
export const runtime = 'edge';
import { redirect } from 'next/navigation'
import { Settings, UserCircle } from 'lucide-react'
import ProfileForm from '@/components/dashboard/ProfileForm'

export default async function SettingsPage() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        redirect('/login')
    }

    return (
        <div className="bg-slate-50 min-h-screen pb-20">
            {/* Header */}
            <div className="bg-navy-secondary py-16 text-white pt-24">
                <div className="container mx-auto px-4">
                    <div className="flex items-center space-x-4">
                        <div className="bg-white/10 p-4 rounded-2xl backdrop-blur-md border border-white/20">
                            <Settings className="w-8 h-8 text-white" />
                        </div>
                        <div>
                            <h1 className="text-3xl font-black tracking-tight">プロフィール設定</h1>
                            <p className="text-slate-400 text-sm font-medium mt-1 uppercase tracking-widest">Account Settings</p>
                        </div>
                    </div>
                </div>
            </div>

            <div className="container mx-auto px-4 -mt-10">
                <div className="max-w-4xl mx-auto">
                    <div className="bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden">
                        <div className="p-8 md:p-12">
                            <div className="flex items-center space-x-4 mb-10 pb-6 border-b border-slate-50">
                                <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-300">
                                    <UserCircle className="w-10 h-10" />
                                </div>
                                <div>
                                    <h2 className="text-xl font-black text-navy-secondary">公開プロフィール情報</h2>
                                    <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-1">Information displayed to clients</p>
                                </div>
                            </div>

                            <ProfileForm />
                        </div>
                    </div>

                    <div className="mt-8 bg-amber-50 rounded-2xl p-6 border border-amber-100">
                        <h4 className="text-amber-800 font-black text-sm mb-2 flex items-center">
                            <Settings className="w-4 h-4 mr-2" />
                            情報の公開について
                        </h4>
                        <p className="text-amber-700/80 text-xs font-bold leading-relaxed">
                            ここで登録した情報は、物件詳細ページやお問い合わせ後のエージェント情報として表示されます。
                            電話番号やLINE IDを正確に入力することで、お客様とのコンタクトがスムーズになります。
                        </p>
                    </div>
                </div>
            </div>
        </div>
    )
}
