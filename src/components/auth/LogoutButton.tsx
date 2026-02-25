'use client'

import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { LogOut } from 'lucide-react'
import { useState } from 'react'

export default function LogoutButton() {
    const supabase = createClient()
    const router = useRouter()
    const [isLoading, setIsLoading] = useState(false)

    const handleLogout = async () => {
        setIsLoading(true)
        const { error } = await supabase.auth.signOut()

        if (!error) {
            router.push('/')
            router.refresh()
        } else {
            console.error('Logout error:', error)
            setIsLoading(false)
        }
    }

    return (
        <button
            onClick={handleLogout}
            disabled={isLoading}
            className="flex items-center space-x-2 text-sm font-bold text-slate-500 hover:text-red-500 transition-colors disabled:opacity-50"
        >
            <LogOut className="w-4 h-4" />
            <span>{isLoading ? 'サインアウト中...' : 'ログアウト'}</span>
        </button>
    )
}
