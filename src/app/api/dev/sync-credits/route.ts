import { createClient, createAdminClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST() {
    const supabase = await createClient()
    const adminSupabase = await createAdminClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Add 100 test credits using Admin Client to bypass RLS
    const { data, error } = await adminSupabase
        .from('profiles')
        .upsert({
            id: user.id,
            available_credits: 100,
            updated_at: new Date().toISOString()
        })
        .select()

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, credits: 100 })
}
