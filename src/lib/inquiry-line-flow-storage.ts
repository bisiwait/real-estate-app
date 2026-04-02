/**
 * LINE 問い合わせフロー用ストレージ。
 * sessionStorage はタブ単位のため、友だち追加で別タブが開く・LIFF が別タブで終わると下書きが読めない。
 * localStorage にも同じキーで書き、get は session → local の順でフォールバックする。
 */

export function flowStorageGet(key: string): string | null {
  if (typeof window === 'undefined') return null
  try {
    const s = sessionStorage.getItem(key)
    if (s != null && s !== '') return s
  } catch {
    /* private mode 等 */
  }
  try {
    const l = localStorage.getItem(key)
    if (l != null && l !== '') return l
  } catch {
    /* */
  }
  return null
}

export function flowStorageSet(key: string, value: string): void {
  if (typeof window === 'undefined') return
  try {
    sessionStorage.setItem(key, value)
  } catch {
    /* */
  }
  try {
    localStorage.setItem(key, value)
  } catch {
    /* */
  }
}

export function flowStorageRemove(key: string): void {
  if (typeof window === 'undefined') return
  try {
    sessionStorage.removeItem(key)
  } catch {
    /* */
  }
  try {
    localStorage.removeItem(key)
  } catch {
    /* */
  }
}
