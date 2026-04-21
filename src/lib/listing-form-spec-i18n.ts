export type ListingSpecFieldKey =
    | 'yearBuilt'
    | 'totalFloors'
    | 'totalUnits'
    | 'developer'
    | 'sqm'
    | 'floor'
    | 'bedrooms'
    | 'bathrooms'

function langKey(locale: string): 'jp' | 'en' | 'th' {
    if (locale === 'en') return 'en'
    if (locale === 'th') return 'th'
    return 'jp'
}

const FIELD_LABELS: Record<'jp' | 'en' | 'th', Record<ListingSpecFieldKey, string>> = {
    jp: {
        yearBuilt: '築年数',
        totalFloors: '総階数',
        totalUnits: '総戸数',
        developer: 'デベロッパー',
        sqm: '専有面積',
        floor: '所在階',
        bedrooms: '間取り',
        bathrooms: 'バスルーム',
    },
    en: {
        yearBuilt: 'Year built',
        totalFloors: 'Total floors',
        totalUnits: 'Total units',
        developer: 'Developer',
        sqm: 'Unit area',
        floor: 'Floor',
        bedrooms: 'Bedrooms',
        bathrooms: 'Bathrooms',
    },
    th: {
        yearBuilt: 'ปีที่สร้าง',
        totalFloors: 'จำนวนชั้นทั้งหมด',
        totalUnits: 'จำนวนยูนิตทั้งหมด',
        developer: 'ผู้พัฒนา',
        sqm: 'พื้นที่ใช้สอย',
        floor: 'ชั้นที่ตั้งอยู่',
        bedrooms: 'ห้องนอน',
        bathrooms: 'ห้องน้ำ',
    },
}

export function getListingSpecFieldLabel(locale: string, key: ListingSpecFieldKey): string {
    return FIELD_LABELS[langKey(locale)][key]
}

const BEDROOM_OPTIONS: Record<string, { jp: string; en: string; th: string }> = {
    '0': { jp: 'スタジオ', en: 'Studio', th: 'สตูดิโอ' },
    '1': { jp: '1ベッドルーム', en: '1 bedroom', th: '1 ห้องนอน' },
    '2': { jp: '2ベッドルーム', en: '2 bedrooms', th: '2 ห้องนอน' },
    '3': { jp: '3ベッドルーム', en: '3 bedrooms', th: '3 ห้องนอน' },
    '4': { jp: '4ベッドルーム', en: '4 bedrooms', th: '4 ห้องนอน' },
    '5': { jp: '5ベッドルーム以上', en: '5+ bedrooms', th: '5 ห้องนอนขึ้นไป' },
}

const BATHROOM_OPTIONS: Record<string, { jp: string; en: string; th: string }> = {
    '1': { jp: '1', en: '1 bathroom', th: '1 ห้องน้ำ' },
    '2': { jp: '2', en: '2 bathrooms', th: '2 ห้องน้ำ' },
    '3': { jp: '3', en: '3 bathrooms', th: '3 ห้องน้ำ' },
    '4': { jp: '4', en: '4 bathrooms', th: '4 ห้องน้ำ' },
    '5': { jp: '5以上', en: '5+ bathrooms', th: '5 ห้องน้ำขึ้นไป' },
}

export function getBedroomSelectOptionLabel(value: string, locale: string): string {
    const row = BEDROOM_OPTIONS[value]
    if (!row) return value
    return row[langKey(locale)]
}

export function getBathroomSelectOptionLabel(value: string, locale: string): string {
    const row = BATHROOM_OPTIONS[value]
    if (!row) return value
    return row[langKey(locale)]
}
