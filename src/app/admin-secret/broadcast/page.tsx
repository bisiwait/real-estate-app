import { redirect } from 'next/navigation'
export const runtime = 'edge';
import { isAdmin } from '@/lib/admin'
import BroadcastManager from '@/components/admin/BroadcastManager'

export default async function AdminBroadcastPage() {
    const isUserAdmin = await isAdmin()

    // Strict redirect for non-admins
    if (!isUserAdmin) {
        redirect('/')
    }

    return (
        <div className="bg-slate-50 min-h-screen pb-20 pt-24">
            <div className="container mx-auto px-4">
                <div className="mb-8">
                    <div className="flex items-center space-x-2">
                        <div className="bg-amber-500 text-navy-secondary text-[10px] font-black px-2 py-0.5 rounded uppercase tracking-widest leading-none">
                            Secret Mode
                        </div>
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Admin Access Only</span>
                    </div>
                </div>

                <BroadcastManager />
            </div>
        </div>
    )
}
