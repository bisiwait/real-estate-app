import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'


export async function GET(request: Request) {
    const { searchParams, origin } = new URL(request.url)
    const code = searchParams.get('code')
    // if "next" is in param, use it as the redirect URL
    const next = searchParams.get('next') ?? '/dashboard'

    if (code) {
        const supabase = await createClient()
        const { data, error } = await supabase.auth.exchangeCodeForSession(code)
        if (!error && data.user) {
            const user = data.user
            const metadata = user.user_metadata

            // If this was an agent signup, ensure the profile has the agent role
            if (metadata.user_role === 'agent') {
                await supabase
                    .from('profiles')
                    .update({ 
                        user_role: 'agent',
                        full_name: metadata.full_name,
                        company_name: metadata.company_name,
                        phone_number: metadata.phone_number,
                        line_id: metadata.line_id,
                        target_area: metadata.target_area
                    })
                    .eq('id', user.id)
            }

            return NextResponse.redirect(`${origin}${next}`)
        }
    }

    // return the user to an error page with instructions
    return NextResponse.redirect(`${origin}/auth/auth-code-error`)
}
