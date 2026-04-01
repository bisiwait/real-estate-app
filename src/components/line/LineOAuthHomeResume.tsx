'use client'

import { useEffect, useRef } from 'react'
import { usePathname } from 'next/navigation'

/** InquiryForm の sessionStorage キーと一致させる */
const RESUME_PID_KEY = 'inquiry_resume_property_id'
const PENDING_LINE_INQUIRY_KEY = 'inquiry_line_pending_v1'
const PROP_UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const LOCALE_HOME = /^\/(jp|en|th)\/?$/

function readResumePropertyId(): string | null {
  if (typeof window === 'undefined') return null
  try {
    const r = sessionStorage.getItem(RESUME_PID_KEY)
    if (r && PROP_UUID.test(r)) return r.toLowerCase()
    const raw = sessionStorage.getItem(PENDING_LINE_INQUIRY_KEY)
    if (!raw) return null
    const o = JSON.parse(raw) as { propertyId?: string }
    if (o.propertyId && PROP_UUID.test(o.propertyId)) return String(o.propertyId).toLowerCase()
  } catch {
    /* */
  }
  return null
}

/**
 * LINE のコールバック URL がロケールトップ（例: /jp?code=...）のとき、
 * OAuth クエリを落とさず物件詳細へ寄せて LIFF / 自動送信が動くようにする。
 */
export default function LineOAuthHomeResume() {
  const pathname = usePathname()
  const ran = useRef(false)

  useEffect(() => {
    if (ran.current) return
    if (typeof window === 'undefined') return
    const path = pathname || ''
    const m = path.match(LOCALE_HOME)
    if (!m) return
    const sp = new URLSearchParams(window.location.search)
    if (!sp.get('code')) return
    const pid = readResumePropertyId()
    if (!pid) return
    ran.current = true
    const loc = m[1]
    const qs = sp.toString()
    window.location.replace(
      `${window.location.origin}/${loc}/properties/${pid}${qs ? `?${qs}` : ''}`
    )
  }, [pathname])

  return null
}
