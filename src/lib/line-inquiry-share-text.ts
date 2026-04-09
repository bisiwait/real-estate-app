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

/** LINE 起動用: トーク入力に文言を載せた line.me 共有 URL */
export function buildLineMeTextShareUrl(message: string): string {
    return `https://line.me/R/msg/text/?${encodeURIComponent(message)}`
}
