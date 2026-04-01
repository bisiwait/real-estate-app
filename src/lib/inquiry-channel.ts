/** inquiries.preferred_reply_channel を送信用に正規化 */
export function normalizeInquiryReplyChannel(ch: string | null | undefined): 'email' | 'line' {
  if (ch === 'line' || ch === 'email_and_line') return 'line'
  return 'email'
}

/** LINE Push 失敗時にエージェント／管理者へ見せる日本語メッセージ */
export function linePushFailureUserMessage(status: number, bodySnippet: string): string {
  const lower = bodySnippet.toLowerCase()
  const blockedHint =
    '送信失敗：ユーザーがブロックしている可能性があります。メールでの連絡に切り替えてください。'
  if (status === 401) {
    return '送信失敗：LINE チャネルのアクセストークンを確認してください（401）。'
  }
  if (status === 403) {
    return blockedHint
  }
  if (status === 404) {
    return blockedHint
  }
  if (status === 400) {
    if (lower.includes('invalid') || lower.includes('not found') || lower.includes('blocked')) {
      return blockedHint
    }
    return `${blockedHint}（LINE API: ${status}）`
  }
  if (status >= 400 && status < 500) {
    return `${blockedHint}（HTTP ${status}）`
  }
  return `LINE 送信に失敗しました（HTTP ${status}）。メールでの連絡をご検討ください。`
}
