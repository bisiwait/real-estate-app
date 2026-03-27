/**
 * PDF 用: 物件紹介などを A4 1 ページ分の高さに収まるよう分割（行の途中で画像分割しない）
 */

export function mmToPx(mm: number): number {
    return (mm * 96) / 25.4;
}

export function htmlToPlainTextForPdf(html: string): string {
    const withBreaks = html
        .replace(/<br\s*\/?>/gi, "\n")
        .replace(/<\/p>/gi, "\n")
        .replace(/<\/div>/gi, "\n")
        .replace(/<[^>]+>/g, "");
    return withBreaks.replace(/\n{3,}/g, "\n\n").trim();
}

function splitOversizedLine(line: string, measurer: HTMLDivElement, maxH: number): string[] {
    const out: string[] = [];
    let rest = line;
    while (rest.length > 0) {
        measurer.textContent = rest;
        if (measurer.offsetHeight <= maxH) {
            out.push(rest);
            break;
        }
        let lo = 1;
        let hi = rest.length;
        while (lo < hi) {
            const mid = Math.ceil((lo + hi) / 2);
            measurer.textContent = rest.slice(0, mid);
            if (measurer.offsetHeight > maxH) hi = mid - 1;
            else lo = mid;
        }
        const take = Math.max(1, lo);
        out.push(rest.slice(0, take));
        rest = rest.slice(take);
    }
    return out;
}

function splitOversizedBlock(block: string, measurer: HTMLDivElement, maxH: number): string[] {
    const lines = block.split("\n");
    const out: string[] = [];
    let acc = "";
    const fits = (s: string) => {
        measurer.textContent = s;
        return measurer.offsetHeight <= maxH;
    };
    for (const line of lines) {
        const trial = acc ? `${acc}\n${line}` : line;
        if (fits(trial)) {
            acc = trial;
            continue;
        }
        if (acc) {
            out.push(acc);
            acc = "";
        }
        if (fits(line)) {
            acc = line;
            continue;
        }
        out.push(...splitOversizedLine(line, measurer, maxH));
    }
    if (acc) out.push(acc);
    return out;
}

/**
 * チラシ本文カラムと同じ幅・フォントで高さを測り、maxHeightPx を超えないテキスト塊に分割する
 */
export function splitPlainTextIntoPdfChunks(text: string, contentWidthPx: number, maxHeightPx: number): string[] {
    const t = text.trim();
    if (!t) return [];

    const measurer = document.createElement("div");
    measurer.style.cssText = [
        "position:fixed",
        "left:-16000px",
        "top:0",
        "visibility:hidden",
        "pointer-events:none",
        `width:${contentWidthPx}px`,
        'font-family:"Noto Sans JP","Hiragino Sans",Meiryo,sans-serif',
        "font-size:11px",
        "line-height:1.65",
        "color:#475569",
        "white-space:pre-line",
        "word-break:break-word",
        "overflow-wrap:break-word",
        "box-sizing:border-box",
    ].join(";");
    document.body.appendChild(measurer);

    try {
        const chunks: string[] = [];
        const paras = t.split(/\n\n+/).filter(Boolean);
        let acc = "";
        const fits = (s: string) => {
            measurer.textContent = s;
            return measurer.offsetHeight <= maxHeightPx;
        };
        const flushAcc = () => {
            if (acc.trim()) {
                chunks.push(acc.trim());
                acc = "";
            }
        };

        for (const p of paras) {
            const trial = acc ? `${acc}\n\n${p}` : p;
            if (fits(trial)) {
                acc = trial;
                continue;
            }
            flushAcc();
            if (fits(p)) {
                acc = p;
                continue;
            }
            chunks.push(...splitOversizedBlock(p, measurer, maxHeightPx));
        }
        flushAcc();
        return chunks;
    } finally {
        measurer.remove();
    }
}
