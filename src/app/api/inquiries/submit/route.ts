import { NextRequest, NextResponse } from 'next/server'
import { createClient as createBaseClient, type User } from '@supabase/supabase-js'
import { createAdminClient, createClient } from '@/lib/supabase/server'
import { notifyAgentOfNewInquiry } from '@/lib/inquiry-agent-notification-email'
import { sendInquirerConfirmationEmail } from '@/lib/inquiry-inquirer-confirmation-email'
import { getPublicSiteUrl } from '@/lib/site-url'
import { hostHeaderFromRequest } from '@/lib/env/deployment-target'
import { getSupabasePublicConfig } from '@/lib/env/supabase-data-plane'

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

const LOCALE_RE = /^(jp|en|th)$/i

function normEmail(s: string | null | undefined): string {
  return (s ?? '').trim().toLowerCase()
}

function toFiniteNumber(v: unknown): number | null {
  if (v == null || v === '') return null
  const x = typeof v === 'number' ? v : Number(v)
  return Number.isFinite(x) ? x : null
}

function formatRentOrPriceDisplay(p: {
  is_for_rent?: boolean | null
  is_for_sale?: boolean | null
  rent_price?: number | string | null
  sale_price?: number | string | null
  price?: number | string | null
  listing_type?: string | null
}): string {
  const parts: string[] = []
  const rent = toFiniteNumber(p.rent_price)
  const sale = toFiniteNumber(p.sale_price)
  const legacy = toFiniteNumber(p.price)
  if (p.is_for_rent === true && rent != null) parts.push(`月額 ${rent.toLocaleString('ja-JP')} THB`)
  if (p.is_for_sale === true && sale != null) parts.push(`販売価格 ${sale.toLocaleString('ja-JP')} THB`)
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
 * 物件メール問い合わせを保存し、エージェント通知 + 送信者控えメールを送る。
 * DB Webhook 未設定でも通知が届くようアプリ側で完結する。
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

    if (!inquirerName || !message) {
      return NextResponse.json({ error: 'お名前とお問い合わせ内容が必要です。' }, { status: 400 })
    }

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

    const { data: property, error: pErr } = await admin
      .from('properties')
      .select(
        'title, user_id, property_type, sqm, is_for_rent, is_for_sale, rent_price, sale_price, price, listing_type'
      )
      .eq('id', propertyId)
      .maybeSingle()

    if (pErr || !property?.title || !property.user_id) {
      return NextResponse.json({ error: '物件が見つかりません。' }, { status: 404 })
    }

    const { data: inserted, error: insErr } = await admin
      .from('inquiries')
      .insert([
        {
          property_id: propertyId,
          inquirer_name: inquirerName,
          inquirer_email: inquirerEmail,
          email: inquirerEmail,
          inquirer_phone: null,
          message,
          preferred_reply_channel: 'email',
          line_user_id: null,
        },
      ])
      .select('id')
      .single()

    if (insErr || !inserted?.id) {
      console.error('[inquiries/submit] insert', insErr)
      return NextResponse.json(
        { error: insErr?.message || 'お問い合わせの保存に失敗しました。' },
        { status: 500 }
      )
    }

    const notifyResult = await notifyAgentOfNewInquiry(admin, {
      inquiryId: inserted.id as string,
      propertyId,
      propertyTitle: property.title as string,
      agentUserId: property.user_id as string,
      inquirerName,
      inquirerEmail,
      inquirerPhone: null,
      message,
      preferredReplyChannel: 'email',
      lineUserId: null,
    })

    if (!notifyResult.ok) {
      console.error('[inquiries/submit] agent notify failed', notifyResult.error)
    }

    const propertyUrl = `${getPublicSiteUrl()}/${locale}/properties/${propertyId}`
    const confirmResult = await sendInquirerConfirmationEmail({
      propertyTitle: property.title as string,
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

    if (!confirmResult.ok) {
      console.warn('[inquiries/submit] inquirer confirmation failed', confirmResult.error)
    }

    return NextResponse.json({
      success: true,
      inquiry_id: inserted.id,
      agent_notified: notifyResult.ok && !('skipped' in notifyResult && notifyResult.skipped),
      inquirer_confirmation_sent: confirmResult.ok,
    })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Unknown error'
    console.error('[inquiries/submit]', e)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
