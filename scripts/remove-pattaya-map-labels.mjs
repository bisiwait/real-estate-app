/**
 * パタヤ地図 PNG から「パタヤ中心部」「パタヤ南部」ラベル文字を除去する（1回限り）
 */
import sharp from 'sharp'
import fs from 'fs'

const inputPath = 'public/images/pattaya-area-map.png'
const outputPath = inputPath

const LABEL_BOXES = [
    { x0: 0.4, y0: 0.27, x1: 0.68, y1: 0.315 },
    { x0: 0.02, y0: 0.48, x1: 0.58, y1: 0.535 },
]

function isTextPixel(r, g, b) {
    return r < 90 && g < 90 && b < 90 && r + g + b < 200
}

function inAnyBox(x, y, w, h) {
    const xp = x / w
    const yp = y / h
    return LABEL_BOXES.some((b) => xp >= b.x0 && xp <= b.x1 && yp >= b.y0 && yp <= b.y1)
}

function sampleFill(data, w, h, ch, x, y) {
    const radii = [2, 4, 6, 8, 12, 16, 24, 32]
    for (const radius of radii) {
        let sr = 0
        let sg = 0
        let sb = 0
        let count = 0
        for (let dy = -radius; dy <= radius; dy++) {
            for (let dx = -radius; dx <= radius; dx++) {
                if (dx * dx + dy * dy > radius * radius) continue
                const nx = x + dx
                const ny = y + dy
                if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue
                const ni = (ny * w + nx) * ch
                const nr = data[ni]
                const ng = data[ni + 1]
                const nb = data[ni + 2]
                if (isTextPixel(nr, ng, nb)) continue
                sr += nr
                sg += ng
                sb += nb
                count++
            }
        }
        if (count > 0) {
            return [
                Math.round(sr / count),
                Math.round(sg / count),
                Math.round(sb / count),
            ]
        }
    }
    return null
}

const inputBuf = fs.readFileSync(inputPath)
const { data, info } = await sharp(inputBuf).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
const { width: w, height: h, channels: ch } = info
const pixels = new Uint8Array(data)

const toFill = []
for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
        if (!inAnyBox(x, y, w, h)) continue
        const i = (y * w + x) * ch
        const r = pixels[i]
        const g = pixels[i + 1]
        const b = pixels[i + 2]
        if (isTextPixel(r, g, b)) toFill.push([x, y])
    }
}

for (const [x, y] of toFill) {
    const rgb = sampleFill(pixels, w, h, ch, x, y)
    if (!rgb) continue
    const i = (y * w + x) * ch
    pixels[i] = rgb[0]
    pixels[i + 1] = rgb[1]
    pixels[i + 2] = rgb[2]
}

await sharp(pixels, { raw: { width: w, height: h, channels: ch } })
    .png({ compressionLevel: 9 })
    .toFile(outputPath)

console.log(`Removed ${toFill.length} label pixels -> ${outputPath}`)
