/** クリップボードへコピー（Clipboard API 不可時は execCommand にフォールバック） */
export async function copyTextToClipboard(text: string): Promise<boolean> {
  const t = text.trim()
  if (!t) return false
  try {
    if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(t)
      return true
    }
  } catch {
    /* fallback below */
  }
  try {
    if (typeof document === 'undefined') return false
    const ta = document.createElement('textarea')
    ta.value = t
    ta.setAttribute('readonly', '')
    ta.style.position = 'fixed'
    ta.style.left = '-9999px'
    document.body.appendChild(ta)
    ta.select()
    const ok = document.execCommand('copy')
    document.body.removeChild(ta)
    return ok
  } catch {
    return false
  }
}
