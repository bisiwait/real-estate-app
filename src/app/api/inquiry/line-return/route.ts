import { NextResponse } from 'next/server'
import { safeNextPath } from '@/lib/auth/safe-next-path'
import { LINE_INQUIRY_RETURN_PATH_COOKIE } from '@/lib/inquiry-line-return-cookie'
import { createClient } from '@/lib/supabase/server'
import {
  LINE_INQUIRY_PENDING_COOKIE,
  LINE_INQUIRY_PENDING_MAX_AGE_SEC,
  isLineInquiryPendingPayload,
  truncatePendingForCookie,
  type LineInquiryPendingStored,
} from '@/lib/inquiry-line-pending-cookie'

const COOKIE_BASE = {
  path: '/' as const,
  sameSite: 'lax' as const,
  secure: process.env.NODE_ENV === 'production',
}

const MAX_COOKIE_VALUE_CHARS = 3800

export async function POST(request: Request) {
  let body: {
    path?: string
    pending?: unknown
    clear_line_inquiry_pending?: boolean
  }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'invalid json' }, { status: 400 })
  }

  const res = NextResponse.json({ ok: true })
  let didSomething = false

  if (body.clear_line_inquiry_pending === true) {
    res.cookies.set(LINE_INQUIRY_PENDING_COOKIE, '', { ...COOKIE_BASE, maxAge: 0 })
    didSomething = true
  }

  if (typeof body.path === 'string') {
    const path = safeNextPath(body.path)
    if (!path) {
      return NextResponse.json({ error: 'invalid path' }, { status: 400 })
    }
    res.cookies.set(LINE_INQUIRY_RETURN_PATH_COOKIE, encodeURIComponent(path), {
      ...COOKIE_BASE,
      httpOnly: true,
      maxAge: 1800,
    })
    didSomething = true
  }

  if (body.pending !== undefined && body.pending !== null) {
    if (!isLineInquiryPendingPayload(body.pending)) {
      return NextResponse.json({ error: 'invalid pending' }, { status: 400 })
    }
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user?.id) {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
    }
    const slim = truncatePendingForCookie(body.pending)
    const stored: LineInquiryPendingStored = {
      ...slim,
      propertyId: slim.propertyId.toLowerCase(),
      sub: user.id,
    }
    const encoded = encodeURIComponent(JSON.stringify(stored))
    if (encoded.length > MAX_COOKIE_VALUE_CHARS) {
      console.warn('[line-return] pending cookie too large, skipped')
    } else {
      res.cookies.set(LINE_INQUIRY_PENDING_COOKIE, encoded, {
        ...COOKIE_BASE,
        httpOnly: true,
        maxAge: LINE_INQUIRY_PENDING_MAX_AGE_SEC,
      })
    }
    didSomething = true
  }

  if (!didSomething) {
    return NextResponse.json({ error: 'nothing to do' }, { status: 400 })
  }

  return res
}
