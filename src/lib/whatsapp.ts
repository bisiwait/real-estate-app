import twilio from 'twilio'
import { parseThailandMobileToE164 } from '@/lib/thailand-mobile-e164'

type TwilioRestClient = ReturnType<typeof twilio>

let twilioSingleton: TwilioRestClient | null = null

function getTwilioClient(): TwilioRestClient {
    if (twilioSingleton) return twilioSingleton
    const sid = process.env.TWILIO_ACCOUNT_SID?.trim()
    const token = process.env.TWILIO_AUTH_TOKEN?.trim()
    if (!sid || !token) {
        throw new Error('TWILIO_ACCOUNT_SID / TWILIO_AUTH_TOKEN が未設定です')
    }
    twilioSingleton = twilio(sid, token)
    return twilioSingleton
}

function getConfiguredFrom(): string {
    let from = process.env.TWILIO_WHATSAPP_FROM?.trim()
    if (!from) {
        throw new Error('TWILIO_WHATSAPP_FROM が未設定です（例: whatsapp:+14155238886）')
    }
    if (!from.startsWith('whatsapp:')) {
        const num = from.replace(/\s/g, '')
        from = num.startsWith('+') ? `whatsapp:${num}` : `whatsapp:+${num.replace(/^\+/, '')}`
    }
    return from
}

export function normalizeWhatsAppToAddress(to: string): string {
    const t = to.trim()
    if (!t.length) throw new Error('送信先電話番号が空です')

    if (t.toLowerCase().startsWith('whatsapp:')) {
        const inner = t.slice('whatsapp:'.length).trim()
        if (/^\+[1-9]\d{8,14}$/.test(inner)) return `whatsapp:${inner}`
        const th = parseThailandMobileToE164(inner)
        if (th) return `whatsapp:${th}`
        throw new Error('whatsapp: に続く番号が E.164 として解釈できませんでした')
    }

    const e164Guess = /^\+[1-9]\d{8,14}$/.test(t) ? t : parseThailandMobileToE164(t)
    if (!e164Guess) {
        throw new Error(
            '電話番号を解釈できませんでした。E.164（+668xxxxxxxx）またはタイの携帯（08…）で指定してください'
        )
    }
    const e164 = e164Guess.startsWith('+') ? e164Guess : `+${e164Guess.replace(/^\+/, '')}`
    return `whatsapp:${e164}`
}

export interface SendWhatsAppResult {
    sid: string | null
    status: string | undefined
}

/**
 * Twilio WhatsApp で本文を送信する。
 */
export async function sendWhatsAppMessage(to: string, body: string): Promise<SendWhatsAppResult> {
    if (!body.trim()) {
        throw new Error('メッセージ本文が空です')
    }

    const from = getConfiguredFrom()
    const toAddress = normalizeWhatsAppToAddress(to)

    const client = getTwilioClient()
    console.log('[whatsapp] sending', {
        from,
        toMasked:
            toAddress.length > 12
                ? `${toAddress.slice(0, Math.min(toAddress.length, 18))}…`
                : toAddress,
        bodyLength: body.length,
    })

    const message = await client.messages.create({
        from,
        to: toAddress,
        body,
    })

    console.log('[whatsapp] sent ok', {
        sid: message.sid,
        status: message.status,
        errorCode: message.errorCode ?? null,
    })

    return { sid: message.sid ?? null, status: message.status }
}
