/** DB / API 用の value は英語キーのまま。表示ラベルのみ多言語化。 */
const PROPERTY_TYPE_LABELS: Record<string, { jp: string; en: string; th: string }> = {
    Condo: { jp: 'コンドミニアム', en: 'Condominium', th: 'คอนโดมิเนียม' },
    House: { jp: 'ヴィラ・一軒家', en: 'Villa / House', th: 'วิลล่า / บ้านเดี่ยว' },
    Townhouse: { jp: 'タウンハウス', en: 'Townhouse', th: 'ทาวน์เฮาส์' },
    Apartment: { jp: 'アパート', en: 'Apartment', th: 'อพาร์ตเมนต์' },
    ServiceApartment: { jp: 'サービスアパート', en: 'Service apartment', th: 'เซอร์วิสอพาร์ตเมนต์' },
    Commercial: { jp: '店舗・商業', en: 'Retail / Commercial', th: 'อาคารพาณิชย์ / เชิงพาณิชย์' },
}

export function getPropertyTypeOptionLabel(value: string, locale: string): string {
    const row = PROPERTY_TYPE_LABELS[value]
    if (!row) return value
    if (locale === 'en') return row.en
    if (locale === 'th') return row.th
    return row.jp
}

export function getPropertyTypeFieldLabel(locale: string): string {
    if (locale === 'en') return 'Property type'
    if (locale === 'th') return 'ประเภททรัพย์'
    return '物件タイプ'
}
