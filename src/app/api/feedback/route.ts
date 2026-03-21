import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(req: Request) {
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const body = await req.json()
        const { title, content, priority } = body

        if (!title || !content) {
            return NextResponse.json({ error: 'Title and content are required' }, { status: 400 })
        }

        const { error } = await supabase
            .from('feedback')
            .insert([
                {
                    user_id: user.id,
                    title,
                    content,
                    priority: priority || 'medium',
                    status: 'new'
                }
            ])

        if (error) throw error

        return NextResponse.json({ success: true })
    } catch (error: any) {
        console.error('Feedback submission error:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
