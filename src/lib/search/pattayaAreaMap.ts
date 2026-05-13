/**
 * パタヤエリアコンセプトマップ（viewBox 座標・DB の areas.name と一致する filterValue）
 * 北から南へ海岸沿い＋東部内陸のラフ配置（商用向けに簡略化したコンセプト図）
 */
export type PattayaMapAreaKey =
    | 'naklua'
    | 'central'
    | 'south'
    | 'pratumnak'
    | 'jomtien'
    | 'east'

export const PATTAYA_MAP_AREAS: {
    key: PattayaMapAreaKey
    filterValue: string
    labelJa: string
    labelEn: string
    fill: string
    fillHover: string
    fillSelected: string
    path: string
}[] = [
    {
        key: 'naklua',
        filterValue: 'North Pattaya / Wongamat',
        labelJa: 'ナクルア・ウォンアマット',
        labelEn: 'Naklua / Wongamat',
        fill: '#f1f5f9',
        fillHover: '#e2e8f0',
        fillSelected: '#cbd5e1',
        path:
            'M 98 10 C 92 22 90 38 96 52 L 104 64 L 262 60 C 278 56 286 42 282 28 L 276 14 C 268 8 252 6 236 8 L 118 8 C 108 8 102 8 98 10 Z',
    },
    {
        key: 'central',
        filterValue: 'Central Pattaya',
        labelJa: 'パタヤ中心部',
        labelEn: 'Central Pattaya',
        fill: '#dbeafe',
        fillHover: '#bfdbfe',
        fillSelected: '#93c5fd',
        path:
            'M 96 52 L 104 64 L 262 60 L 258 94 L 102 98 C 88 92 86 76 92 62 Z',
    },
    {
        key: 'south',
        filterValue: 'South Pattaya',
        labelJa: 'パタヤ南部',
        labelEn: 'South Pattaya',
        fill: '#e0f2fe',
        fillHover: '#bae6fd',
        fillSelected: '#7dd3fc',
        path:
            'M 102 98 L 258 94 L 254 128 L 100 134 C 86 128 84 112 92 100 Z',
    },
    {
        key: 'pratumnak',
        filterValue: 'Pratumnak',
        labelJa: 'プラタムナック',
        labelEn: 'Pratumnak',
        fill: '#d1fae5',
        fillHover: '#a7f3d0',
        fillSelected: '#6ee7b7',
        path:
            'M 100 134 L 254 128 L 250 162 L 98 170 C 84 164 82 148 90 136 Z',
    },
    {
        key: 'jomtien',
        filterValue: 'Jomtien',
        labelJa: 'ジョムティエン',
        labelEn: 'Jomtien',
        fill: '#fef3c7',
        fillHover: '#fde68a',
        fillSelected: '#fcd34d',
        path:
            'M 98 170 L 250 162 L 256 248 L 96 256 C 82 248 78 220 86 198 Z',
    },
    {
        key: 'east',
        filterValue: 'East Pattaya',
        labelJa: 'パタヤ東部',
        labelEn: 'East Pattaya',
        fill: '#ede9fe',
        fillHover: '#ddd6fe',
        fillSelected: '#c4b5fd',
        path:
            'M 276 22 L 384 26 L 388 288 L 292 284 L 268 198 L 262 94 L 268 60 L 274 32 Z',
    },
]

/** ラベル位置（viewBox 400×320） */
export const PATTAYA_MAP_LABEL_POS: Record<PattayaMapAreaKey, { x: number; y: number }> = {
    naklua: { x: 188, y: 38 },
    central: { x: 178, y: 82 },
    south: { x: 176, y: 116 },
    pratumnak: { x: 176, y: 150 },
    jomtien: { x: 178, y: 212 },
    east: { x: 328, y: 150 },
}

/** 境界線（slate-200 / hover / selected） */
export const PATTAYA_MAP_STROKE = {
    default: '#e2e8f0',
    hover: '#cbd5e1',
    selected: '#94a3b8',
} as const
