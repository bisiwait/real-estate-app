/**
 * 物件検索のエリアマップ用定数（URL / DB の `area=` 値とは別に、UI 専用のセンチネルを持つ）
 */
export const PATTAYA_AREA_MAP_SELECT_VALUE = '__from_map__' as const

export type PattayaMapAreaKey =
    | 'naklua'
    | 'central'
    | 'south'
    | 'pratumnak'
    | 'jomtien'
    | 'east'

/** DB / URL と一致する `areas.name` 値（propertyListQuery と揃える） */
export const PATTAYA_MAP_AREAS: {
    key: PattayaMapAreaKey
    filterValue: string
    /** マップ上の日英表記（商用ポータル向け固定コピー） */
    labelJa: string
    labelEn: string
    /** デフォルト塗り（ホバー・選択で Tailwind 系に近い色へ変化） */
    fill: string
    fillHover: string
    fillSelected: string
    stroke: string
    path: string
}[] = [
    {
        key: 'naklua',
        filterValue: 'North Pattaya / Wongamat',
        labelJa: 'ナクルア・ウォンアマット',
        labelEn: 'Naklua / Wongamat',
        fill: '#e0e7ff',
        fillHover: '#c7d2fe',
        fillSelected: '#a5b4fc',
        stroke: '#6366f1',
        path:
            'M 108 18 C 95 22 88 38 92 52 L 90 78 C 88 88 96 96 108 98 L 268 96 C 282 94 292 82 288 68 L 284 44 C 280 28 268 18 252 16 L 198 14 Z',
    },
    {
        key: 'central',
        filterValue: 'Central Pattaya',
        labelJa: 'パタヤ中心部',
        labelEn: 'Central Pattaya',
        fill: '#dbeafe',
        fillHover: '#bfdbfe',
        fillSelected: '#93c5fd',
        stroke: '#3b82f6',
        path:
            'M 90 78 L 92 102 C 94 118 102 132 118 138 L 262 136 C 276 132 284 118 282 102 L 278 88 L 268 96 L 108 98 C 98 96 90 88 90 78 Z',
    },
    {
        key: 'south',
        filterValue: 'South Pattaya',
        labelJa: 'パタヤ南部',
        labelEn: 'South Pattaya',
        fill: '#cffafe',
        fillHover: '#a5f3fc',
        fillSelected: '#67e8f9',
        stroke: '#0891b2',
        path:
            'M 118 138 L 116 168 C 114 188 124 206 142 212 L 258 208 C 274 204 286 188 284 170 L 280 150 C 278 140 270 134 262 136 L 118 138 Z',
    },
    {
        key: 'pratumnak',
        filterValue: 'Pratumnak',
        labelJa: 'プラタムナック',
        labelEn: 'Pratumnak',
        fill: '#d1fae5',
        fillHover: '#a7f3d0',
        fillSelected: '#6ee7b7',
        stroke: '#059669',
        path:
            'M 142 212 C 128 216 120 232 124 248 L 132 278 C 136 292 150 302 166 300 L 252 296 C 268 292 278 276 276 260 L 272 232 C 268 218 258 208 258 208 L 142 212 Z',
    },
    {
        key: 'jomtien',
        filterValue: 'Jomtien',
        labelJa: 'ジョムティエン',
        labelEn: 'Jomtien',
        fill: '#fef3c7',
        fillHover: '#fde68a',
        fillSelected: '#fcd34d',
        stroke: '#d97706',
        path:
            'M 166 300 L 164 332 C 162 352 172 372 192 378 L 268 374 C 292 370 308 348 306 322 L 302 288 C 298 276 286 268 276 260 L 252 296 L 166 300 Z',
    },
    {
        key: 'east',
        filterValue: 'East Pattaya',
        labelJa: 'パタヤ東部',
        labelEn: 'East Pattaya',
        fill: '#f3e8ff',
        fillHover: '#e9d5ff',
        fillSelected: '#d8b4fe',
        stroke: '#9333ea',
        path:
            'M 286 44 L 292 82 L 298 120 L 304 168 L 308 220 L 312 280 L 314 340 L 318 372 L 402 368 L 398 320 L 392 240 L 384 160 L 376 88 L 368 36 L 320 32 Z',
    },
]

/** テキスト配置（viewBox 420×400 基準の概算 centroid） */
export const PATTAYA_MAP_LABEL_POS: Record<PattayaMapAreaKey, { x: number; y: number }> = {
    naklua: { x: 188, y: 52 },
    central: { x: 188, y: 118 },
    south: { x: 198, y: 176 },
    pratumnak: { x: 198, y: 258 },
    jomtien: { x: 228, y: 332 },
    east: { x: 348, y: 200 },
}
