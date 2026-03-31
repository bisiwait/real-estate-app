/**
 * liff.line.me の正しい形式は
 *   https://liff.line.me/{LIFF_ID}?liff.state=...
 * で渡す（公式ドキュメントどおり）。
 * LINE 側が liff.line.me 上でパス形式（.../LIFF_ID/jp:uuid）へリダイレクト表示することがあり、それ自体は必ずしもバグではない。
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

/**
 * liff.line.me を経由せず、LIFF エンドポイントへ直接遷移させる URL。
 * LINE 側ゲートウェイで liff.line.me がリロードループする事象の回避用。LINE 内ブラウザで開けば liff.init は通常どおり動く。
 */
export function buildLiffInquiryBridgeDirectUrl(
  siteOrigin: string,
  locale: string,
  propertyId: string
): string {
  const origin = siteOrigin.trim().replace(/\/$/, '')
  const loc = locale.trim().toLowerCase()
  const pid = propertyId.trim().toLowerCase()
  const u = new URL(`${origin}/${loc}/line/inquiry-bridge`)
  u.searchParams.set('liff.state', `${loc}:${pid}`)
  return u.href
}
