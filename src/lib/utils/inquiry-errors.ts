import { getErrorMessage } from '@/lib/utils/errors'

/** Supabase PostgREST のエラーを問い合わせフォーム向けに整形（原因特定用） */
export function formatInquirySubmitError(err: unknown): string {
  const base = getErrorMessage(err)
  if (!err || typeof err !== 'object') return base

  const o = err as { code?: string; message?: string; details?: string; hint?: string }
  if (o.code === undefined && !o.details && !o.hint) return base

  const lines: string[] = []
  if (o.code) lines.push(`code: ${o.code}`)
  if (o.message) lines.push(`message: ${o.message}`)
  if (o.details) lines.push(`details: ${o.details}`)
  if (o.hint) lines.push(`hint: ${o.hint}`)
  return lines.length ? `${base}\n\n${lines.join('\n')}` : base
}
