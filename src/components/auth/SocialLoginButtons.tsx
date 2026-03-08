'use client'

import { Button } from '@/components/ui/button'
import { createClient } from '@/lib/supabase/client'
import { useState } from 'react'
import type { Provider } from '@supabase/supabase-js'

export function SocialLoginButtons() {
    const [loading, setLoading] = useState<string | null>(null)
    const supabase = createClient()

    const handleLogin = async (provider: 'google' | 'line') => {
        setLoading(provider)

        // LINE login often needs bot_prompt=normal to encourage friending the official account
        const queryParams: Record<string, string> = {}
        if (provider === 'line') {
            queryParams.bot_prompt = 'normal'
        }

        const { error } = await supabase.auth.signInWithOAuth({
            provider: provider as Provider,
            options: {
                redirectTo: `${window.location.origin}/auth/callback`,
                queryParams,
            },
        })

        if (error) {
            console.error(`${provider} login error:`, error.message)
            setLoading(null)
        }
    }

    return (
        <div className="flex flex-col gap-3 w-full max-w-sm">
            <Button
                variant="outline"
                className="relative h-12 font-bold bg-white text-slate-700 border-slate-200 hover:bg-slate-50 transition-all rounded-xl"
                onClick={() => handleLogin('google')}
                disabled={!!loading}
            >
                <div className="absolute left-4">
                    <svg viewBox="0 0 24 24" className="w-5 h-5" xmlns="http://www.w3.org/2000/svg">
                        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l3.66-2.85z" fill="#FBBC05" />
                        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335" />
                    </svg>
                </div>
                {loading === 'google' ? '接続中...' : 'Googleでログイン'}
            </Button>

            <Button
                className="relative h-12 font-bold bg-[#06C755] text-white hover:bg-[#05b34c] border-none transition-all rounded-xl"
                onClick={() => handleLogin('line')}
                disabled={!!loading}
            >
                <div className="absolute left-4">
                    <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current" xmlns="http://www.w3.org/2000/svg">
                        <path d="M24 10.304c0-5.369-5.383-9.738-12-9.738-6.616 0-12 4.369-12 9.738 0 4.814 4.269 8.846 10.036 9.608.391.084.922.258 1.057.592.121.303.079.778.039 1.085l-.171 1.047c-.052.312-.252 1.226 1.135.669 1.386-.557 7.474-4.402 10.199-7.537C23.058 14.348 24 12.421 24 10.304zm-14.717 4.144H7.425a.864.864 0 01-.864-.864V8.341a.864.864 0 011.728 0v4.515h.994a.864.864 0 010 1.728v.164zm1.908-.864a.864.864 0 011.728 0V13.58a.864.864 0 01-1.728 0v.004zm5.111 0c.05.518-.328.983-.846 1.033-.03.003-.061.004-.092.004h-.008a.864.864 0 01-.812-.864V9.652l-1.396 1.956a.864.864 0 01-1.428-.992l1.696-2.376a.864.864 0 011.64.444v5.04zm4.288-2.58a.864.864 0 010 1.728h-1.121v1.121a.864.864 0 01-1.728 0v-2.376c0-.477.387-.864.864-.864h1.985v.004l-.004-.383c0-.477.387-.864.864-.864s.864.387.864.864v.374h.001z" />
                    </svg>
                </div>
                {loading === 'line' ? '接続中...' : 'LINEでログイン'}
            </Button>
        </div>
    )
}
