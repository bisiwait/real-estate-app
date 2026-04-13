import { Resend } from 'resend'
import { getResendFromAddress } from '@/lib/resend-from'

export type AgentContactNotifyParams = {
    agentEmail: string
    agentName: string | null
    customerName: string
    customerEmail: string
    customerPhone: string
    message: string
    submissionId: string
}

/**
 * エージェント向けお知らせメール（骨組み）。
 * RESEND_API_KEY が無い場合は送信せずログのみ。
 */
export async function notifyAgentContactSubmission(
    params: AgentContactNotifyParams
): Promise<{ ok: true; resendId?: string | null } | { ok: false; skipped: boolean; error?: string }> {
    const apiKey = process.env.RESEND_API_KEY?.trim()
    if (!apiKey) {
        console.info('[agent-contact-notify] RESEND_API_KEY not set; email skipped')
        return { ok: false, skipped: true }
    }

    const to = params.agentEmail.trim()
    if (!to) {
        return { ok: false, skipped: true, error: 'no_agent_email' }
    }

    const from = getResendFromAddress()
    const subject = `【Chonburi Home】エージェントページに新しいお問い合わせ（${params.customerName}）`
    const text = [
        `エージェント: ${params.agentName || '（未設定）'}`,
        `送信ID: ${params.submissionId}`,
        '',
        '--- お客様情報 ---',
        `氏名: ${params.customerName}`,
        `メール: ${params.customerEmail}`,
        `電話: ${params.customerPhone}`,
        '',
        '--- 内容 ---',
        params.message,
    ].join('\n')

    try {
        const resend = new Resend(apiKey)
        const { data, error } = await resend.emails.send({
            from,
            to,
            subject,
            text,
        })
        if (error) {
            console.warn('[agent-contact-notify] Resend error:', error.message)
            return { ok: false, skipped: false, error: error.message }
        }
        return { ok: true, resendId: data?.id ?? null }
    } catch (e) {
        const msg = e instanceof Error ? e.message : String(e)
        console.warn('[agent-contact-notify]', msg)
        return { ok: false, skipped: false, error: msg }
    }
}
