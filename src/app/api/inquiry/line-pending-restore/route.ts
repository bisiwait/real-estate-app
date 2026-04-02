import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'
import {
  LINE_INQUIRY_PENDING_COOKIE,
  LINE_INQUIRY_PENDING_MAX_AGE_SEC,
  isLineInquiryPendingStored,
  type LineInquiryPendingPayload,
} from '@/lib/inquiry-line-pending-cookie'

export const dynamic = 'force-dynamic'

const MAX_AGE_MS = LINE_INQUIRY_PENDING_MAX_AGE_SEC * 1000

export async function GET() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user?.id) {
    return NextResponse.json({ pending: null as LineInquiryPendingPayload | null })
  }

  const jar = await cookies()
  const raw = jar.get(LINE_INQUIRY_PENDING_COOKIE)?.value
  if (!raw) {
    return NextResponse.json({ pending: null as LineInquiryPendingPayload | null })
  }

  let decoded: string
  try {
    decoded = decodeURIComponent(raw)
  } catch {
    return NextResponse.json({ pending: null as LineInquiryPendingPayload | null })
  }

  let parsed: unknown
  try {
    parsed = JSON.parse(decoded)
  } catch {
    return NextResponse.json({ pending: null as LineInquiryPendingPayload | null })
  }

  if (!isLineInquiryPendingStored(parsed) || parsed.sub !== user.id) {
    return NextResponse.json({ pending: null as LineInquiryPendingPayload | null })
  }

  if (Date.now() - parsed.at > MAX_AGE_MS) {
    return NextResponse.json({ pending: null as LineInquiryPendingPayload | null })
  }

  const pending: LineInquiryPendingPayload = {
    v: 1,
    propertyId: parsed.propertyId,
    locale: parsed.locale,
    name: parsed.name,
    email: parsed.email,
    message: parsed.message,
    at: parsed.at,
  }

  return NextResponse.json({ pending })
}
