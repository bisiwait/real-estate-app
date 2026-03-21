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

// アイコン文字（SVGなし。html2canvasでも確実に描画されるUnicode絵文字）
const ICONS: Record<string, string> = {
    type:      '🏠',
    size:      '📐',
    floor:     '🏢',
    bed:       '🛏',
    tag:       '✦',
    facility:  '★',
    phone:     '📞',
    line:      '💬',
    price:     '💰',
};

// 物件情報からキャッチコピーを自動生成
function generateHighlights(property: PropertyFlyerProps['property']): string[] {
    const result: string[] = [];
    const tags = property.tags || [];
    const title = property.title || '';
    const areaName = property.area?.name || '';

    // タグベース
    if (tags.some(t => /ペット可|ペット/.test(t))) result.push('ペット可物件');
    if (tags.some(t => /家具付|フルファニ/.test(t))) result.push('家具・家電付き');
    if (tags.some(t => /バルコニー|テラス/.test(t))) result.push('バルコニー付き');
    if (tags.some(t => /角部屋/.test(t))) result.push('開放感ある角部屋');
    if (tags.some(t => /海.*ビュー|オーシャン|オーシャンビュー/.test(t))) result.push('オーシャンビュー');
    if (tags.some(t => /シティ.*ビュー|シティビュー/.test(t))) result.push('シティビュー');
    if (tags.some(t => /プール/.test(t))) result.push('プール付き');
    if (tags.some(t => /ジム/.test(t))) result.push('フィットネスジム完備');

    // 物件情報ベース
    if (property.sqm >= 50) result.push(`${property.sqm}㎡以上の広々空間`);
    if (Number(property.floor) >= 10) result.push('高層階・眺望抜群');
    if (property.bedrooms === '1') result.push('1LDK コンパクト暮らし');
    if (property.bedrooms === '2' || property.bedrooms === '3') result.push(`${property.bedrooms}ベッドルーム・広々`);

    // エリアベース
    if (/パタヤ|Pattaya/i.test(areaName) || /パタヤ/i.test(title)) result.push('パタヤ人気エリア');
    if (/チョンブリ|Chonburi/i.test(areaName)) result.push('チョンブリ好立地');
    if (/ジョムティエン|Jomtien/i.test(areaName) || /ジョムティエン/i.test(title)) result.push('ジョムティエンビーチ近く');

    // 価格帯ベース
    if (property.is_for_rent && property.price <= 15000) result.push('コスパ優秀な賃料');
    if (property.is_for_rent && property.price >= 50000) result.push('ラグジュアリー物件');

    return result.slice(0, 5);
}

export const PropertyFlyer: React.FC<PropertyFlyerProps> = ({ property, agent, qrCodeUrl }) => {
    const autoHighlights = generateHighlights(property);

    // タグベースのハイライトも追加（重複除去）
    const IMPORTANT_KEYWORDS = ["ペット可", "バスタブ", "洗濯機", "駅近", "家具付", "角部屋", "オーシャン"];
    const tagHighlights = (property.tags || []).filter(tag =>
        IMPORTANT_KEYWORDS.some(k => tag.includes(k))
    );
    const allHighlights = Array.from(new Set([...autoHighlights, ...tagHighlights])).slice(0, 6);

    const mainFacilities = (property.shared_facilities || []).slice(0, 6);

    return (
        <div style={{
            width: '210mm',
            height: '297mm',
            backgroundColor: '#ffffff',
            padding: '14mm 16mm',
            display: 'flex',
            flexDirection: 'column',
            fontFamily: '"Noto Sans JP", sans-serif',
            color: '#1e293b',
            boxSizing: 'border-box',
            position: 'relative',
            gap: 0,
        }}>
            {/* Header */}
            <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '5mm',
                borderBottom: '2px solid #2A4076',
                paddingBottom: '3mm'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <div style={{ width: '8px', height: '28px', backgroundColor: '#f59e0b', borderRadius: '2px' }} />
                    <h1 style={{ fontSize: '20px', fontWeight: '900', color: '#2A4076', margin: 0, letterSpacing: '0.05em' }}>
                        Chonburi Connect
                    </h1>
                </div>
                <span style={{ fontSize: '10px', color: '#94a3b8', backgroundColor: '#f8fafc', padding: '2px 8px', borderRadius: '4px', border: '1px solid #e2e8f0' }}>
                    Ref: {property.reference_id || property.id.slice(0, 8).toUpperCase()}
                </span>
            </div>

            {/* Main Image */}
            <div style={{ width: '100%', height: '88mm', marginBottom: '5mm', borderRadius: '6px', overflow: 'hidden', position: 'relative' }}>
                {property.images && property.images.length > 0 ? (
                    <img
                        src={property.images[0]}
                        alt="Property"
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                ) : (
                    <div style={{ width: '100%', height: '100%', backgroundColor: '#e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <span style={{ color: '#94a3b8', fontSize: '14px' }}>NO IMAGE</span>
                    </div>
                )}
                {/* 種別バッジ */}
                <div style={{
                    position: 'absolute', top: '8px', left: '8px',
                    backgroundColor: property.is_for_rent ? '#2563eb' : '#dc2626',
                    color: '#fff', fontSize: '11px', fontWeight: '900',
                    padding: '3px 10px', borderRadius: '4px', letterSpacing: '0.08em',
                    lineHeight: '1.2', display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}>
                    {property.is_for_rent ? 'FOR RENT' : 'FOR SALE'}
                </div>
            </div>

            {/* Title */}
            <h2 style={{ fontSize: '18px', fontWeight: '900', color: '#1e293b', marginBottom: '4mm', lineHeight: '1.3', margin: '0 0 4mm 0' }}>
                {property.title}
            </h2>

            {/* Price — 大きく・目立つ色 */}
            <div style={{
                width: '100%',
                background: 'linear-gradient(135deg, #1e3a8a 0%, #2A4076 100%)',
                height: '24mm',
                borderRadius: '6px',
                marginBottom: '6mm',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                boxSizing: 'border-box',
                padding: 0
            }}>
                <div style={{ 
                    fontSize: '11px', 
                    fontWeight: 'bold', 
                    color: '#93c5fd', 
                    textTransform: 'uppercase', 
                    letterSpacing: '0.12em', 
                    textAlign: 'center',
                    marginBottom: '1mm',
                    lineHeight: '1.2',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                }}>
                    {ICONS.price}&nbsp;{property.is_for_rent ? 'MONTHLY RENT（賃料/月）' : 'SALE PRICE（販売価格）'}
                </div>
                <div style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center', 
                    gap: '8px',
                    lineHeight: '1.2'
                }}>
                    <span style={{ fontSize: '46px', color: '#fbbf24', fontWeight: '900', letterSpacing: '-0.02em' }}>
                        {property.price?.toLocaleString()}
                    </span>
                    <span style={{ fontSize: '18px', color: '#e2e8f0', fontWeight: 'bold', alignSelf: 'flex-end', marginBottom: '8px' }}>
                        THB{property.is_for_rent ? ' / mo.' : ''}
                    </span>
                </div>
            </div>

            {/* Summary Grid — アイコン付き */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(4, 1fr)',
                gap: '4mm',
                marginBottom: '6mm',
                width: '100%'
            }}>
                <InfoItem icon={ICONS.type}  label="TYPE"  value={property.property_type || '—'} />
                <InfoItem icon={ICONS.size}  label="SIZE"  value={`${property.sqm || '—'} m²`} />
                <InfoItem icon={ICONS.floor} label="FLOOR" value={property.floor ? `${property.floor}F` : '—'} />
                <InfoItem icon={ICONS.bed}   label="BED / BATH" value={`${property.bedrooms || '—'} / ${property.bathrooms || '—'}`} />
            </div>

            {/* Highlights & Facilities */}
            <div style={{ display: 'flex', gap: '5mm', marginBottom: '5mm' }}>
                {allHighlights.length > 0 && (
                    <div style={{ flex: 1 }}>
                        <SectionTitle title="HIGHLIGHTS / おすすめポイント" color="#2563eb" />
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '2mm', marginTop: '2mm' }}>
                            {allHighlights.map((item, idx) => (
                                <div key={idx} style={{
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    fontSize: '10px', fontWeight: 'bold', color: '#1e40af',
                                    backgroundColor: '#eff6ff',
                                    padding: '3px 8px', borderRadius: '20px',
                                    border: '1px solid #bfdbfe', gap: '3px',
                                    lineHeight: '1.2'
                                }}>
                                    <span style={{ color: '#3b82f6', fontSize: '9px', display: 'flex', alignItems: 'center' }}>{ICONS.tag}</span>
                                    {item}
                                </div>
                            ))}
                        </div>
                    </div>
                )}
                {mainFacilities.length > 0 && (
                    <div style={{ flex: 1 }}>
                        <SectionTitle title="FACILITIES / 共有施設" color="#64748b" />
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '2mm', marginTop: '2mm' }}>
                            {mainFacilities.map((facility, idx) => (
                                <span key={idx} style={{
                                    fontSize: '10px', backgroundColor: '#f1f5f9',
                                    padding: '3px 8px', borderRadius: '20px',
                                    fontWeight: 'bold', color: '#475569',
                                    border: '1px solid #e2e8f0',
                                    lineHeight: '1.2',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                                }}>
                                    {ICONS.facility} {facility}
                                </span>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* Descriptions */}
            <div style={{ flex: 1, overflow: 'hidden' }}>
                {property.description && (
                    <div style={{ marginBottom: '4mm' }}>
                        <SectionTitle title="物件紹介" color="#2A4076" />
                        <p style={{ fontSize: '11px', lineHeight: '1.65', color: '#475569', margin: '2mm 0 0 0' }}>
                            {property.description.replace(/<[^>]+>/g, '').slice(0, 280)}{property.description.length > 280 ? '…' : ''}
                        </p>
                    </div>
                )}
                {property.description_en && (
                    <div style={{ marginBottom: '4mm' }}>
                        <SectionTitle title="English Description" color="#2A4076" />
                        <p style={{ fontSize: '11px', lineHeight: '1.65', color: '#475569', margin: '2mm 0 0 0' }}>
                            {property.description_en.slice(0, 220)}{property.description_en.length > 220 ? '…' : ''}
                        </p>
                    </div>
                )}
            </div>

            {/* Footer */}
            <div style={{
                marginTop: 'auto',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-end',
                borderTop: '2px solid #e2e8f0',
                paddingTop: '4mm'
            }}>
                <div>
                    <div style={{ fontSize: '15px', fontWeight: '900', color: '#2A4076', marginBottom: '2mm' }}>{agent.full_name}</div>
                    {agent.phone && (
                        <div style={{ fontSize: '11px', color: '#64748b', marginBottom: '1mm' }}>
                            {ICONS.phone} {agent.phone}
                        </div>
                    )}
                    {agent.line_id && (
                        <div style={{ fontSize: '11px', color: '#64748b' }}>
                            {ICONS.line} LINE: {agent.line_id}
                        </div>
                    )}
                </div>
                <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '9px', color: '#94a3b8', textTransform: 'uppercase', marginBottom: '2mm', letterSpacing: '0.1em' }}>Scan for details</div>
                    {qrCodeUrl && <img src={qrCodeUrl} alt="QR" style={{ width: '22mm', height: '22mm' }} />}
                </div>
            </div>
        </div>
    );
};

const InfoItem = ({ icon, label, value }: { icon: string; label: string; value: string }) => (
    <div style={{
        backgroundColor: '#F8FAFF',
        padding: '0',
        borderRadius: '5px',
        border: '1px solid #e2e8f0',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '16mm',
        boxSizing: 'border-box',
        textAlign: 'center'
    }}>
        <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            gap: '4px', 
            width: '100%',
            marginBottom: '1mm',
            lineHeight: '1.2'
        }}>
            <span style={{ fontSize: '12px', display: 'flex', alignItems: 'center' }}>{icon}</span>
            <span style={{ 
                fontSize: '8px', 
                color: '#94a3b8', 
                textTransform: 'uppercase', 
                fontWeight: '800', 
                letterSpacing: '0.05em',
                lineHeight: '1.2'
            }}>{label}</span>
        </div>
        <div style={{ 
            fontSize: '14px', 
            color: '#2A4076', 
            fontWeight: '900', 
            width: '100%',
            lineHeight: '1.2',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
        }}>{value}</div>
    </div>
);

const SectionTitle = ({ title, color }: { title: string; color: string }) => (
    <div style={{
        fontSize: '10px',
        fontWeight: '900',
        color,
        textTransform: 'uppercase',
        letterSpacing: '0.08em',
        borderBottom: `2px solid ${color}`,
        paddingBottom: '1mm',
        display: 'inline-block'
    }}>
        {title}
    </div>
);
