/** 共有施設名（日本語/英語の断片）がリストに含まれるか */
export function facilityMatches(facilityNames: string[], matchers: string[]): boolean {
    if (!facilityNames.length) return false
    const haystack = facilityNames.join(" ").toLowerCase()
    return matchers.some((m) => haystack.includes(m.toLowerCase()))
}

export type CompareFacilityRow = {
    id: string
    matchers: string[]
}

/** 比較表でチェック表示する共有施設（プール・ジム・サウナ等） */
export const COMPARE_FACILITY_ROWS: CompareFacilityRow[] = [
    { id: "pool", matchers: ["プール", "pool", "swimming", "infinity"] },
    { id: "gym", matchers: ["フィットネス", "ジム", "gym", "fitness"] },
    { id: "sauna", matchers: ["サウナ", "sauna"] },
    { id: "security", matchers: ["セキュリティ", "security", "24h", "24時間"] },
    { id: "parking", matchers: ["駐車場", "parking", "car park"] },
]

export function getMergedFacilities(property: {
    project?: { facilities?: string[] | null } | null
    project_facilities?: string[] | null
}): string[] {
    const a = property.project?.facilities ?? []
    const b = property.project_facilities ?? []
    return [...new Set([...a, ...b].filter(Boolean))]
}
