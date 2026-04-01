import { Resend } from 'resend'
import { getResendFromAddress } from '@/lib/resend-from'

const EMAIL_LIKE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function safeSubjectSnippet(s: string, maxLen: number): string {
  return s.replace(/[\r\n\u0000]+/g, ' ').trim().slice(0, maxLen)
}

export type InquirerConfirmationInput = {
  propertyTitle: string
  /** 物件タイプ（DB の表示用テキスト） */
  propertyType?: string | null
  /** 広さ（例: "45 ㎡"、未設定は "—" を渡す） */
  areaSqmDisplay?: string | null
  /** 家賃または販売価格の1行表示（例: "月額 15,000 THB"） */
  rentOrPriceDisplay?: string | null
  /** 物件詳細の絶対URL */
  propertyUrl?: string | null
  inquirerEmail: string
  inquirerName: string
  message: string
}

export type InquirerConfirmationResult =
  | { ok: true; resendId?: string | null }
  | { ok: false; error: string; code: 'no_api_key' | 'invalid_email' | 'resend_error' }

/**
 * 物件問い合わせの送信者宛・受付控えメール（Resend）。
 * Webhook が未設定の環境でも、API 経由で送るために共通化。
 */
export async function sendInquirerConfirmationEmail(
  input: InquirerConfirmationInput
): Promise<InquirerConfirmationResult> {
  const apiKey = process.env.RESEND_API_KEY?.trim()
  if (!apiKey) {
    return { ok: false, error: 'RESEND_API_KEY is not set', code: 'no_api_key' }
  }

  const to = (input.inquirerEmail || '').trim()
  if (!to || !EMAIL_LIKE.test(to)) {
    return { ok: false, error: 'Invalid recipient email', code: 'invalid_email' }
  }

  const titleSafe = escapeHtml((input.propertyTitle || '').trim() || '—')
  const nameSafe = escapeHtml((input.inquirerName || '').trim() || '—')
  const typeSafe = escapeHtml((input.propertyType || '').trim() || '—')
  const sqmSafe = escapeHtml((input.areaSqmDisplay || '').trim() || '—')
  const priceSafe = escapeHtml((input.rentOrPriceDisplay || '').trim() || '—')
  const urlRaw = (input.propertyUrl || '').trim()
  const urlSafe = escapeHtml(urlRaw)
  const messageRaw = (input.message || '').trim()
  const messageSafe = escapeHtml(messageRaw).replace(/\r\n|\n|\r/g, '<br/>')
  const subjTitle = safeSubjectSnippet(input.propertyTitle || '', 60)
  const urlRow =
    urlRaw.length > 0
      ? `<tr>
              <td style="padding: 10px; border-bottom: 1px solid #f1f5f9; color: #64748b; vertical-align: top;">URL</td>
              <td style="padding: 10px; border-bottom: 1px solid #f1f5f9; word-break: break-all;"><a href="${urlSafe}" style="color: #2563eb;">${urlSafe}</a></td>
            </tr>`
      : `<tr>
              <td style="padding: 10px; border-bottom: 1px solid #f1f5f9; color: #64748b; vertical-align: top;">URL</td>
              <td style="padding: 10px; border-bottom: 1px solid #f1f5f9;">—</td>
            </tr>`

  const resend = new Resend(apiKey)
  const { data, error } = await resend.emails.send({
    from: getResendFromAddress(),
    to: [to],
    subject: `【お問い合わせ受付】「${subjTitle}」について`,
    html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
          <h2 style="color: #1e293b; border-bottom: 2px solid #3b82f6; padding-bottom: 10px;">お問い合わせを受け付けました</h2>
          <p style="font-size: 15px; color: #475569; line-height: 1.6;">
            ${nameSafe} 様<br/><br/>
            この度はお問い合わせいただきありがとうございます。以下の内容で受け付けました。担当よりご連絡いたします。
          </p>
          <h3 style="color: #1e293b; font-size: 16px; margin-top: 28px;">送信内容</h3>
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 10px; border-bottom: 1px solid #f1f5f9; width: 120px; color: #64748b; vertical-align: top;">物件</td>
              <td style="padding: 10px; border-bottom: 1px solid #f1f5f9; font-weight: bold;">${titleSafe}</td>
            </tr>
            <tr>
              <td style="padding: 10px; border-bottom: 1px solid #f1f5f9; color: #64748b; vertical-align: top;">物件タイプ</td>
              <td style="padding: 10px; border-bottom: 1px solid #f1f5f9;">${typeSafe}</td>
            </tr>
            <tr>
              <td style="padding: 10px; border-bottom: 1px solid #f1f5f9; color: #64748b; vertical-align: top;">広さ</td>
              <td style="padding: 10px; border-bottom: 1px solid #f1f5f9;">${sqmSafe}</td>
            </tr>
            <tr>
              <td style="padding: 10px; border-bottom: 1px solid #f1f5f9; color: #64748b; vertical-align: top;">家賃・価格</td>
              <td style="padding: 10px; border-bottom: 1px solid #f1f5f9;">${priceSafe}</td>
            </tr>
            ${urlRow}
            <tr>
              <td style="padding: 10px; border-bottom: 1px solid #f1f5f9; color: #64748b; vertical-align: top;">お名前</td>
              <td style="padding: 10px; border-bottom: 1px solid #f1f5f9;">${nameSafe}</td>
            </tr>
            <tr>
              <td style="padding: 10px; border-bottom: 1px solid #f1f5f9; color: #64748b; vertical-align: top;">メール</td>
              <td style="padding: 10px; border-bottom: 1px solid #f1f5f9;">${escapeHtml(to)}</td>
            </tr>
          </table>
          <div style="margin-top: 16px; padding: 15px; background-color: #f8fafc; border-radius: 8px; color: #1e293b; font-size: 14px; line-height: 1.6;">
            <p style="margin: 0 0 8px; font-size: 12px; color: #64748b; font-weight: bold;">お問い合わせ内容</p>
            <div style="word-break: break-word;">${messageSafe || '—'}</div>
          </div>
          <p style="font-size: 12px; color: #94a3b8; margin-top: 28px; line-height: 1.6;">
            ※このメールは送信内容の控えです。本メールに直接ご返信いただいてもお答えできない場合があります。あらかじめご了承ください。
          </p>
          <p style="font-size: 11px; color: #cbd5e1; margin-top: 16px; text-align: center; font-weight: 600;">
            Chonburi Home
          </p>
        </div>
      `,
  })

  if (error) {
    console.error('[sendInquirerConfirmationEmail] Resend', error)
    return { ok: false, error: error.message || String(error), code: 'resend_error' }
  }

  return { ok: true, resendId: data?.id ?? null }
}
