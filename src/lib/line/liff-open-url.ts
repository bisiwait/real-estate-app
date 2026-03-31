/**
 * liff.line.me の正しい形式は
 *   https://liff.line.me/{LIFF_ID}?liff.state=...
 * であり、jp:uuid をパスに付ける（.../LIFF_ID/jp:uuid）は無効。
 * @see https://developers.line.biz/ja/docs/liff/opening-liff-app/
 */
export function buildLiffLineMeOpenUrl(liffId: string, liffStatePlain: string): string {
  const id = liffId.trim().replace(/^\/+|\/+$/g, '')
  if (!id) throw new Error('LIFF ID is empty')
  const u = new URL(`https://liff.line.me/${id}`)
  u.searchParams.set('liff.state', liffStatePlain)
  return u.href
}

/** 物件問い合わせフロー用: state は「ロケール:propertyUuid」 */
export function buildLiffInquiryHandoffUrl(
  liffId: string,
  locale: string,
  propertyId: string
): string {
  return buildLiffLineMeOpenUrl(liffId, `${locale}:${propertyId}`)
}
