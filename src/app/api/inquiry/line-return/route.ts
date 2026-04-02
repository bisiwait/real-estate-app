import { NextResponse } from 'next/server'
import { safeNextPath } from '@/lib/auth/safe-next-path'
import { LINE_INQUIRY_RETURN_PATH_COOKIE } from '@/lib/inquiry-line-return-cookie'

export async function POST(request: Request) {
  let body: { path?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'invalid json' }, { status: 400 })
  }
  const path = safeNextPath(typeof body.path === 'string' ? body.path : null)
  if (!path) {
    return NextResponse.json({ error: 'invalid path' }, { status: 400 })
  }
  const res = NextResponse.json({ ok: true })
  res.cookies.set(LINE_INQUIRY_RETURN_PATH_COOKIE, encodeURIComponent(path), {
    path: '/',
    maxAge: 1800,
    sameSite: 'lax',
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
  })
  return res
}
