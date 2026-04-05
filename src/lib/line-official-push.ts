/**
 * 公式 LINE（Messaging API）の Push 送信。Bearer は呼び出し元で渡す（エージェントごとのチャネルアクセストークンまたはサイト共通トークン）。
 */
export async function lineOfficialPushText(
  toUserId: string,
  text: string,
  accessToken: string
): Promise<{ ok: boolean; status: number; body?: string }> {
  const res = await fetch('https://api.line.me/v2/bot/message/push', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({
      to: toUserId,
      messages: [{ type: 'text', text }],
    }),
  })
  const body = await res.text()
  return { ok: res.ok, status: res.status, body: body.slice(0, 500) }
}
