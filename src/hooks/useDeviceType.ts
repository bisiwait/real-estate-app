'use client'

import { useLayoutEffect, useState } from 'react'

export type DeviceType = 'smartphone' | 'desktop'

/**
 * スマートフォンか PC／タブレットかを判定する。
 * iPad および一般的な Android タブレットは PC 扱い（メール誘導）。
 * SSR 時およびハイドレーション直前は desktop（LINE 案内を出さない安全側）。
 */
export function getDeviceType(): DeviceType {
  if (typeof window === 'undefined') return 'desktop'

  const ua = navigator.userAgent || ''
  const maxTouchPoints = navigator.maxTouchPoints ?? 0
  const platform = navigator.platform || ''

  const isIPad =
    /iPad/i.test(ua) ||
    (platform === 'MacIntel' && maxTouchPoints > 1)

  const isAndroid = /Android/i.test(ua)
  const isAndroidTablet = isAndroid && !/Mobile/i.test(ua)
  const isAndroidPhone = isAndroid && /Mobile/i.test(ua)
  const isIPhoneOrIPod = /iPhone|iPod/i.test(ua)

  if (isIPad || isAndroidTablet) return 'desktop'
  if (isIPhoneOrIPod || isAndroidPhone) return 'smartphone'

  const narrow = window.innerWidth <= 480
  if (narrow && typeof window.matchMedia === 'function') {
    if (window.matchMedia('(pointer: coarse)').matches) return 'smartphone'
  }

  return 'desktop'
}

export function useDeviceType() {
  const [deviceType, setDeviceType] = useState<DeviceType>('desktop')

  useLayoutEffect(() => {
    const update = () => setDeviceType(getDeviceType())
    update()
    window.addEventListener('resize', update)
    return () => window.removeEventListener('resize', update)
  }, [])

  return {
    deviceType,
    isSmartphone: deviceType === 'smartphone',
    isDesktop: deviceType === 'desktop',
  }
}
