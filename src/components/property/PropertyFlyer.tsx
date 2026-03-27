import React from 'react';

interface PropertyFlyerProps {
    property: {
        id: string;
        reference_id?: string;
        title: string;
        images: string[];
        price: number;
        is_for_rent: boolean;
        is_for_sale?: boolean;
        property_type: string;
        sqm: number;
        floor: string;
        bedrooms: string;
        bathrooms: string;
        description?: string;
        description_en?: string;
        description_th?: string;
        tags?: string[];
        shared_facilities?: string[];
        area?: { name?: string };
    };
    agent: {
        full_name: string;
        phone: string;
        line_id?: string;
    };
    qrCodeUrl: string;
}

/** PDF用: HTMLを除き、改行を残してプレーンテキスト化 */
function htmlToPlainText(html: string, maxLen: number): string {
    const withBreaks = html
        .replace(/<br\s*\/?>/gi, '\n')
        .replace(/<\/p>/gi, '\n')
        .replace(/<\/div>/gi, '\n')
        .replace(/<[^>]+>/g, '');
    const collapsed = withBreaks.replace(/\n{3,}/g, '\n\n').trim();
    if (collapsed.length <= maxLen) return collapsed;
    return `${collapsed.slice(0, maxLen)}…`;
}

function generateHighlights(property: PropertyFlyerProps['property']): string[] {
    const result: string[] = [];
    const tags = property.tags || [];
    const title = property.title || '';
    const areaName = property.area?.name || '';

    if (tags.some(t => /ペット可|ペット/.test(t))) result.push('ペット可物件');
    if (tags.some(t => /家具付|フルファニ/.test(t))) result.push('家具・家電付き');
    if (tags.some(t => /バルコニー|テラス/.test(t))) result.push('バルコニー付き');
    if (tags.some(t => /角部屋/.test(t))) result.push('開放感ある角部屋');
    if (tags.some(t => /海.*ビュー|オーシャン|オーシャンビュー/.test(t))) result.push('オーシャンビュー');
    if (tags.some(t => /シティ.*ビュー|シティビュー/.test(t))) result.push('シティビュー');
    if (tags.some(t => /プール/.test(t))) result.push('プール付き');
    if (tags.some(t => /ジム/.test(t))) result.push('フィットネスジム完備');
    if (property.sqm >= 50) result.push(`${property.sqm}㎡以上の広々空間`);
    if (Number(property.floor) >= 10) result.push('高層階・眺望抜群');
    if (property.bedrooms === '1') result.push('1LDK コンパクト暮らし');
    if (property.bedrooms === '2' || property.bedrooms === '3') result.push(`${property.bedrooms}ベッドルーム・広々`);
    if (/パタヤ|Pattaya/i.test(areaName) || /パタヤ/i.test(title)) result.push('パタヤ人気エリア');
    if (/チョンブリ|Chonburi/i.test(areaName)) result.push('チョンブリ好立地');
    if (/ジョムティエン|Jomtien/i.test(areaName) || /ジョムティエン/i.test(title)) result.push('ジョムティエンビーチ近く');
    if (property.is_for_rent && property.price <= 15000) result.push('コスパ優秀な賃料');
    if (property.is_for_rent && property.price >= 50000) result.push('ラグジュアリー物件');

    return result.slice(0, 5);
}

export const PropertyFlyer: React.FC<PropertyFlyerProps> = ({ property, agent, qrCodeUrl }) => {
    const autoHighlights = generateHighlights(property);
    const IMPORTANT_KEYWORDS = ["ペット可", "バスタブ", "洗濯機", "駅近", "家具付", "角部屋", "オーシャン"];
    const tagHighlights = (property.tags || []).filter(tag =>
        IMPORTANT_KEYWORDS.some(k => tag.includes(k))
    );
    const allHighlights = Array.from(new Set([...autoHighlights, ...tagHighlights])).slice(0, 6);
    const mainFacilities = (property.shared_facilities || []).slice(0, 6);

    const descJa = property.description
        ? htmlToPlainText(property.description, 900)
        : '';
    const descEn = property.description_en
        ? htmlToPlainText(property.description_en, 700)
        : '';

    return (
        <div style={{
            width: '210mm',
            minHeight: '297mm',
            height: 'auto',
            backgroundColor: '#ffffff',
            padding: '14mm 16mm',
            display: 'flex',
            flexDirection: 'column',
            fontFamily: '"Noto Sans JP", sans-serif',
            color: '#1e293b',
            boxSizing: 'border-box',
            position: 'relative',
            overflow: 'visible',
        }}>

            {/* ── Header ── */}
            <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '5mm',
                borderBottom: '2px solid #2A4076',
                paddingBottom: '3mm',
                flexShrink: 0,
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <div style={{ width: '8px', height: '28px', backgroundColor: '#f59e0b', borderRadius: '2px' }} />
                    <span style={{ fontSize: '20px', fontWeight: '900', color: '#2A4076', letterSpacing: '0.05em' }}>
                        Chonburi Home
                    </span>
                </div>
                <span style={{ fontSize: '10px', color: '#94a3b8', backgroundColor: '#f8fafc', padding: '2px 8px', borderRadius: '4px', border: '1px solid #e2e8f0' }}>
                    Ref: {property.reference_id || property.id.slice(0, 8).toUpperCase()}
                </span>
            </div>

            {/* ── Main Image ── */}
            <div style={{ width: '100%', height: '86mm', marginBottom: '5mm', borderRadius: '6px', overflow: 'hidden', position: 'relative', flexShrink: 0 }}>
                {property.images && property.images.length > 0 ? (
                    <img src={property.images[0]} alt="Property" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                    <div style={{ width: '100%', height: '100%', backgroundColor: '#e2e8f0' }} />
                )}
                <div style={{
                    position: 'absolute', top: '8px', left: '8px',
                    backgroundColor: property.is_for_rent ? '#2563eb' : '#dc2626',
                    color: '#ffffff',
                    fontSize: '11px',
                    fontWeight: '900',
                    letterSpacing: '0.1em',
                    padding: '4px 12px',
                    borderRadius: '4px',
                    display: 'inline-block',
                }}>
                    {property.is_for_rent ? 'FOR RENT' : 'FOR SALE'}
                </div>
            </div>

            {/* ── Title ── */}
            <div style={{ fontSize: '18px', fontWeight: '900', color: '#1e293b', marginBottom: '4mm', lineHeight: '1.3', flexShrink: 0 }}>
                {property.title}
            </div>

            {/* ── Price ── */}
            <div style={{
                width: '100%',
                backgroundColor: '#1e3a8a',
                borderRadius: '6px',
                marginBottom: '6mm',
                padding: '6mm 0',
                textAlign: 'center',
                boxSizing: 'border-box',
                flexShrink: 0,
            }}>
                <div style={{
                    fontSize: '11px',
                    fontWeight: '700',
                    color: '#93c5fd',
                    textTransform: 'uppercase',
                    letterSpacing: '0.12em',
                    marginBottom: '3mm',
                }}>
                    {property.is_for_rent ? 'MONTHLY RENT — 賃料/月' : 'SALE PRICE — 販売価格'}
                </div>
                <div style={{
                    fontSize: '46px',
                    fontWeight: '900',
                    color: '#fbbf24',
                    letterSpacing: '-0.02em',
                    lineHeight: '1',
                }}>
                    {property.price?.toLocaleString()}
                    <span style={{ fontSize: '18px', fontWeight: '700', color: '#e2e8f0', marginLeft: '8px' }}>
                        THB{property.is_for_rent ? ' / mo.' : ''}
                    </span>
                </div>
            </div>

            {/* ── Summary Grid ── */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(4, 1fr)',
                gap: '4mm',
                marginBottom: '6mm',
                flexShrink: 0,
            }}>
                <InfoItem label="TYPE" value={property.property_type || '—'} />
                <InfoItem label="SIZE" value={`${property.sqm || '—'} m²`} />
                <InfoItem label="FLOOR" value={property.floor ? `${property.floor}F` : '—'} />
                <InfoItem label="BED/BATH" value={`${property.bedrooms || '—'} / ${property.bathrooms || '—'}`} />
            </div>

            {/* ── Highlights & Facilities ── */}
            <div style={{ display: 'flex', gap: '5mm', marginBottom: '5mm', flexShrink: 0 }}>
                {allHighlights.length > 0 && (
                    <div style={{ flex: 1 }}>
                        <div style={{
                            fontSize: '10px', fontWeight: '900', color: '#2563eb',
                            textTransform: 'uppercase', letterSpacing: '0.08em',
                            borderBottom: '2px solid #2563eb', paddingBottom: '2px',
                            marginBottom: '3mm', display: 'inline-block',
                        }}>
                            HIGHLIGHTS / おすすめポイント
                        </div>
                        <div>
                            {allHighlights.map((item, idx) => (
                                <span key={idx} style={{
                                    display: 'inline-block',
                                    fontSize: '10px',
                                    fontWeight: '700',
                                    color: '#1e40af',
                                    backgroundColor: '#eff6ff',
                                    border: '1px solid #bfdbfe',
                                    borderRadius: '12px',
                                    padding: '3px 9px',
                                    marginRight: '3mm',
                                    marginBottom: '2mm',
                                }}>
                                    ✦ {item}
                                </span>
                            ))}
                        </div>
                    </div>
                )}
                {mainFacilities.length > 0 && (
                    <div style={{ flex: 1 }}>
                        <div style={{
                            fontSize: '10px', fontWeight: '900', color: '#64748b',
                            textTransform: 'uppercase', letterSpacing: '0.08em',
                            borderBottom: '2px solid #64748b', paddingBottom: '2px',
                            marginBottom: '3mm', display: 'inline-block',
                        }}>
                            FACILITIES / 共有施設
                        </div>
                        <div>
                            {mainFacilities.map((facility, idx) => (
                                <span key={idx} style={{
                                    display: 'inline-block',
                                    fontSize: '10px',
                                    fontWeight: '700',
                                    color: '#475569',
                                    backgroundColor: '#f1f5f9',
                                    border: '1px solid #e2e8f0',
                                    borderRadius: '12px',
                                    padding: '3px 9px',
                                    marginRight: '3mm',
                                    marginBottom: '2mm',
                                }}>
                                    ★ {facility}
                                </span>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* ── Descriptions（overflow で切らない。flex 縮小で1行化しないよう flexShrink:0） ── */}
            <div style={{ flexShrink: 0, overflow: 'visible', width: '100%' }}>
                {descJa ? (
                    <div style={{ marginBottom: '4mm' }}>
                        <div style={{
                            fontSize: '11px', fontWeight: '900', color: '#2A4076',
                            borderBottom: '2px solid #2A4076', paddingBottom: '2px',
                            marginBottom: '2mm', display: 'inline-block',
                        }}>物件紹介</div>
                        <p style={{
                            fontSize: '11px',
                            lineHeight: 1.65,
                            color: '#475569',
                            margin: 0,
                            whiteSpace: 'pre-line',
                            wordBreak: 'break-word',
                            overflowWrap: 'break-word',
                        }}>
                            {descJa}
                        </p>
                    </div>
                ) : null}
                {descEn ? (
                    <div style={{ marginBottom: '4mm' }}>
                        <div style={{
                            fontSize: '11px', fontWeight: '900', color: '#2A4076',
                            borderBottom: '2px solid #2A4076', paddingBottom: '2px',
                            marginBottom: '2mm', display: 'inline-block',
                        }}>English Description</div>
                        <p style={{
                            fontSize: '11px',
                            lineHeight: 1.65,
                            color: '#475569',
                            margin: 0,
                            whiteSpace: 'pre-line',
                            wordBreak: 'break-word',
                            overflowWrap: 'break-word',
                        }}>
                            {descEn}
                        </p>
                    </div>
                ) : null}
            </div>

            {/* ── Footer ── */}
            <div style={{
                marginTop: 'auto',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-end',
                borderTop: '2px solid #e2e8f0',
                paddingTop: '4mm',
                flexShrink: 0,
            }}>
                <div>
                    <div style={{ fontSize: '15px', fontWeight: '900', color: '#2A4076', marginBottom: '2mm' }}>{agent.full_name}</div>
                    {agent.phone && <div style={{ fontSize: '11px', color: '#64748b', marginBottom: '1mm' }}>📞 {agent.phone}</div>}
                    {agent.line_id && <div style={{ fontSize: '11px', color: '#64748b' }}>💬 LINE: {agent.line_id}</div>}
                </div>
                <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '9px', color: '#94a3b8', textTransform: 'uppercase', marginBottom: '2mm', letterSpacing: '0.1em' }}>Scan for details</div>
                    {qrCodeUrl && <img src={qrCodeUrl} alt="QR" style={{ width: '22mm', height: '22mm' }} />}
                </div>
            </div>
        </div>
    );
};

/* ── InfoItem ── html2canvas 向けにシンプルなブロックレイアウト */
const InfoItem = ({ label, value }: { label: string; value: string }) => (
    <div style={{
        backgroundColor: '#F8FAFF',
        border: '1px solid #e2e8f0',
        borderRadius: '5px',
        padding: '4mm 3mm',
        textAlign: 'center',
        boxSizing: 'border-box',
    }}>
        <div style={{
            fontSize: '8px',
            color: '#94a3b8',
            textTransform: 'uppercase',
            fontWeight: '800',
            letterSpacing: '0.06em',
            marginBottom: '2mm',
        }}>
            {label}
        </div>
        <div style={{
            fontSize: '14px',
            color: '#2A4076',
            fontWeight: '900',
        }}>
            {value}
        </div>
    </div>
);
