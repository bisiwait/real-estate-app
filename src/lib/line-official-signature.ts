import { createHmac, timingSafeEqual } from 'crypto'

/**
 * LINE Messaging API Webhook の X-Line-Signature 検証（raw body 文字列に対する HMAC-SHA256 Base64）。
 */
export function verifyLineChannelSignature(
  rawBody: string,
  signatureHeader: string | null,
  channelSecret: string
): boolean {
  if (!signatureHeader || !channelSecret) return false
  const digest = createHmac('sha256', channelSecret).update(rawBody, 'utf8').digest('base64')
  try {
    const a = Buffer.from(signatureHeader, 'utf8')
    const b = Buffer.from(digest, 'utf8')
    if (a.length !== b.length) return false
    return timingSafeEqual(a, b)
  } catch {
    return false
  }
}

export async function lineOfficialReplyMessage(
  replyToken: string,
  messages: Array<{ type: 'text'; text: string }>,
  accessToken: string
): Promise<{ ok: boolean; status: number; body?: string }> {
  const res = await fetch('https://api.line.me/v2/bot/message/reply', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ replyToken, messages }),
  })
  const text = await res.text()
  return { ok: res.ok, status: res.status, body: text.slice(0, 500) }
}
