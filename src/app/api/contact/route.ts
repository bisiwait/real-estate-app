import { randomUUID } from 'node:crypto'
import { NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { notifyAgentContactSubmission } from '@/lib/agent-contact-notify'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function trimStr(v: unknown): string {
    return typeof v === 'string' ? v.trim() : ''
}

export async function POST(req: Request) {
    const supabaseUser = await createClient()
    const {
        data: { user },
    } = await supabaseUser.auth.getUser()
    if (!user?.id) {
        return NextResponse.json({ error: 'お問い合わせにはログインが必要です。' }, { status: 401 })
    }

    let body: Record<string, unknown>
    try {
        body = (await req.json()) as Record<string, unknown>
    } catch {
        return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
    }

    const agentId = trimStr(body.agentId)
    const name = trimStr(body.name)
    const email = trimStr(body.email)
    const phone = trimStr(body.phone)
    const message = trimStr(body.message)

    if (!agentId || !UUID_RE.test(agentId)) {
        return NextResponse.json({ error: '無効なエージェントです。' }, { status: 400 })
    }
    if (!name) {
        return NextResponse.json({ error: '氏名を入力してください。' }, { status: 400 })
    }
    if (!email || !EMAIL_RE.test(email)) {
        return NextResponse.json({ error: '有効なメールアドレスを入力してください。' }, { status: 400 })
    }
    if (!phone) {
        return NextResponse.json({ error: '電話番号を入力してください。' }, { status: 400 })
    }
    if (!message) {
        return NextResponse.json({ error: 'お問い合わせ内容を入力してください。' }, { status: 400 })
    }
    if (message.length > 8000) {
        return NextResponse.json({ error: 'お問い合わせ内容が長すぎます。' }, { status: 400 })
    }

    const admin = await createAdminClient()
    const { data: profile, error: profErr } = await admin
        .from('profiles')
        .select('id, email, full_name, deleted_at, status')
        .eq('id', agentId)
        .maybeSingle()

    if (profErr || !profile) {
        return NextResponse.json({ error: 'エージェントが見つかりません。' }, { status: 404 })
    }
    if (profile.deleted_at != null || profile.status === 'suspended') {
        return NextResponse.json({ error: 'このエージェントにはお問い合わせできません。' }, { status: 403 })
    }

    const submissionId = randomUUID()
    // .select() は挿入後の行 SELECT が RLS で弾かれると全体が失敗するため、ID はサーバーで付与して返却のみにする
    const { error: insErr } = await supabaseUser.from('agent_contacts').insert({
        id: submissionId,
        agent_id: agentId,
        submitter_id: user.id,
        customer_name: name,
        customer_email: email,
        customer_phone: phone,
        message,
        is_handled: false,
    })

    if (insErr) {
        console.error('[api/contact] insert', insErr)
        return NextResponse.json({ error: '送信に失敗しました。時間をおいて再度お試しください。' }, { status: 500 })
    }

    const agentEmail = typeof profile.email === 'string' ? profile.email.trim() : ''
    void notifyAgentContactSubmission({
        agentEmail: agentEmail || '',
        agentName: typeof profile.full_name === 'string' ? profile.full_name : null,
        customerName: name,
        customerEmail: email,
        customerPhone: phone,
        message,
        submissionId,
    }).catch(() => {})

    return NextResponse.json({ success: true, id: submissionId })
}
