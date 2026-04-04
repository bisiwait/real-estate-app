import { NextRequest, NextResponse } from 'next/server'
import { createClient as createBaseClient, type User } from '@supabase/supabase-js'
import { createAdminClient, createClient } from '@/lib/supabase/server'
import { sendInquirerConfirmationEmail } from '@/lib/inquiry-inquirer-confirmation-email'
import { getPublicSiteUrl } from '@/lib/site-url'
import { hostHeaderFromRequest } from '@/lib/env/deployment-target'
import { getSupabasePublicConfig } from '@/lib/env/supabase-data-plane'

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

const LOCALE_RE = /^(jp|en|th)$/i

type PropertyPricingRow = {
  is_for_rent?: boolean | null
  is_for_sale?: boolean | null
  rent_price?: number | string | null
  sale_price?: number | string | null
  price?: number | string | null
  listing_type?: string | null
}

function toFiniteNumber(v: unknown): number | null {
  if (v == null || v === '') return null
  const x = typeof v === 'number' ? v : Number(v)
  return Number.isFinite(x) ? x : null
}

/** メール「家賃・価格」行用（賃貸・売却の併記にも対応） */
function formatRentOrPriceDisplay(p: PropertyPricingRow): string {
  const parts: string[] = []
  const rent = toFiniteNumber(p.rent_price)
  const sale = toFiniteNumber(p.sale_price)
  const legacy = toFiniteNumber(p.price)
  const forRent = p.is_for_rent === true
  const forSale = p.is_for_sale === true

  if (forRent && rent != null) parts.push(`月額 ${rent.toLocaleString('ja-JP')} THB`)
  if (forSale && sale != null) parts.push(`販売価格 ${sale.toLocaleString('ja-JP')} THB`)
  if (parts.length > 0) return parts.join(' / ')

  const lt = (p.listing_type || '').toLowerCase()
  if (lt === 'rent' && legacy != null) return `月額 ${legacy.toLocaleString('ja-JP')} THB`
  if ((lt === 'sale' || lt === 'sell') && legacy != null)
    return `販売価格 ${legacy.toLocaleString('ja-JP')} THB`
  if (rent != null) return `月額 ${rent.toLocaleString('ja-JP')} THB`
  if (sale != null) return `販売価格 ${sale.toLocaleString('ja-JP')} THB`
  if (legacy != null) return `${legacy.toLocaleString('ja-JP')} THB`
  return '—'
}

function formatSqmDisplay(sqm: unknown): string {
  const n = toFiniteNumber(sqm)
  if (n == null) return '—'
  return `${n.toLocaleString('ja-JP')} ㎡`
}

function normEmail(s: string | null | undefined): string {
  return (s ?? '').trim().toLowerCase()
}

async function getAuthenticatedUser(req: NextRequest): Promise<User | null> {
  const m = req.headers.get('authorization')?.match(/^Bearer\s+(.+)$/i)
  if (m?.[1]) {
    const { url, anonKey } = getSupabasePublicConfig(hostHeaderFromRequest(req))
    const sb = createBaseClient(url, anonKey)
    const {
      data: { user },
      error,
    } = await sb.auth.getUser(m[1])
    if (!error && user?.id) return user
  }
  const supabaseAuth = await createClient()
  const {
    data: { user },
  } = await supabaseAuth.auth.getUser()
  return user?.id ? user : null
}

/**
 * 問い合わせフォーム送信直後に呼ぶ。ログインユーザーのメールと inquirer_email が一致するときだけ
 * 送信者宛に受付控えメールを送る。
 *
 * ※ inquiries は RLS で owner（エージェント）のみ SELECT 可のため、inquiry_id ではなくフォーム内容で検証する。
 */
export async function POST(req: NextRequest) {
  try {
    const user = await getAuthenticatedUser(req)

    if (!user?.id) {
      return NextResponse.json({ error: 'ログインが必要です。' }, { status: 401 })
    }

    let body: {
      property_id?: string
      locale?: string
      inquirer_email?: string
      inquirer_name?: string
      message?: string
    }
    try {
      body = await req.json()
    } catch {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
    }

    const propertyId = typeof body.property_id === 'string' ? body.property_id.trim() : ''
    if (!propertyId || !UUID_RE.test(propertyId)) {
      return NextResponse.json({ error: 'property_id が不正です。' }, { status: 400 })
    }

    const localeRaw = typeof body.locale === 'string' ? body.locale.trim().toLowerCase() : ''
    const locale = LOCALE_RE.test(localeRaw) ? localeRaw : 'jp'

    const inquirerEmail = typeof body.inquirer_email === 'string' ? body.inquirer_email.trim() : ''
    const inquirerName = typeof body.inquirer_name === 'string' ? body.inquirer_name.trim() : ''
    const message = typeof body.message === 'string' ? body.message.trim() : ''

    const admin = await createAdminClient()
    const { data: prof } = await admin.from('profiles').select('email').eq('id', user.id).maybeSingle()
    const allowedEmails = new Set<string>()
    if (user.email) allowedEmails.add(normEmail(user.email))
    if (prof?.email && typeof prof.email === 'string') allowedEmails.add(normEmail(prof.email))

    if (!inquirerEmail || !allowedEmails.has(normEmail(inquirerEmail))) {
      return NextResponse.json(
        { error: 'お問い合わせのメールアドレスがログイン中のアカウントと一致しません。' },
        { status: 403 }
      )
    }

    if (!inquirerName || !message) {
      return NextResponse.json({ error: 'お名前とお問い合わせ内容が必要です。' }, { status: 400 })
    }

    const { data: property, error: pErr } = await admin
      .from('properties')
      .select(
        'title, property_type, sqm, is_for_rent, is_for_sale, rent_price, sale_price, price, listing_type'
      )
      .eq('id', propertyId)
      .maybeSingle()

    if (pErr || !property?.title) {
      console.warn('[confirm-email] property not found', propertyId, pErr?.message)
      return NextResponse.json({ error: '物件が見つかりません。' }, { status: 404 })
    }

    const baseUrl = getPublicSiteUrl()
    const propertyUrl = `${baseUrl}/${locale}/properties/${propertyId}`

    const result = await sendInquirerConfirmationEmail({
      propertyTitle: property.title,
      propertyType:
        typeof property.property_type === 'string' && property.property_type.trim()
          ? property.property_type.trim()
          : null,
      areaSqmDisplay: formatSqmDisplay(property.sqm),
      rentOrPriceDisplay: formatRentOrPriceDisplay(property),
      propertyUrl,
      inquirerEmail,
      inquirerName,
      message,
    })

    if (!result.ok) {
      const status = result.code === 'no_api_key' ? 503 : 422
      return NextResponse.json(
        { error: result.error, code: result.code },
        { status }
      )
    }

    return NextResponse.json({ success: true, resend_id: result.resendId ?? null })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Unknown error'
    console.error('[confirm-email]', e)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
