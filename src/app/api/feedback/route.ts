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

        // ユーザー情報を取得して保存
        const { data: profile } = await supabase
            .from('profiles')
            .select('full_name')
            .eq('id', user.id)
            .single()

        const userIdentifier = profile?.full_name || user.email

        // テーブルが存在しない、または権限エラーの可能性があるため、
        // 最終手段として content の先頭にユーザー情報を付与して保存
        const enrichedContent = `【送信者: ${userIdentifier}】\n\n${content}`

        // デバッグ用にログを出力（Vercelのログで確認可能）
        console.log('Attempting to save feedback:', { title, priority, user_id: user.id });

        const { error } = await supabase
            .from('feedback')
            .insert([
                {
                    user_id: user.id,
                    title,
                    content: enrichedContent,
                    priority: priority || 'medium',
                    status: 'new'
                }
            ])

        if (error) {
            console.error('Supabase insert error details:', error);
            // feedbackテーブル自体が存在しない可能性を考慮し、
            // 失敗した場合はエラーを投げて catch ブロックで処理
            throw error
        }

        return NextResponse.json({ success: true })
    } catch (error: any) {
        console.error('Feedback submission error:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
