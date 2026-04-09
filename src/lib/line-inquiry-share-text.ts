/**
 * 物件ページの LINE 問い合わせ用クリップボード文（messages のテンプレート）を組み立てる。
 */
export function buildLineInquiryShareText(
    template: string,
    propertyName: string,
    propertyPageUrl: string
): string {
    return template.replace(/\{propertyName\}/g, propertyName).replace(/\{propertyUrl\}/g, propertyPageUrl)
}
