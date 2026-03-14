import React from 'react';

interface PropertyFlyerProps {
    property: {
        id: string;
        reference_id?: string;
        title: string;
        images: string[];
        price: number;
        is_for_rent: boolean;
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
    };
    agent: {
        full_name: string;
        phone: string;
        line_id?: string;
    };
    qrCodeUrl: string;
}

// Checkmark Icon Component
const CheckIcon = () => (
    <span style={{ fontSize: '12px', color: '#3b82f6', fontWeight: 'bold', marginRight: '4px' }}>✓</span>
);

export const PropertyFlyer: React.FC<PropertyFlyerProps> = ({ property, agent, qrCodeUrl }) => {
    // Filter tags for highlights
    const IMPORTANT_KEYWORDS = ["ペット可", "バスタブ", "洗濯機", "駅近", "ペット", "家具付", "角部屋"];
    const highlights = (property.tags || []).filter(tag =>
        IMPORTANT_KEYWORDS.some(k => tag.includes(k))
    );

    // Limit shared facilities to 4
    const mainFacilities = (property.shared_facilities || []).slice(0, 4);

    return (
        <div style={{
            width: '210mm',
            height: '297mm',
            backgroundColor: '#ffffff',
            padding: '20mm',
            display: 'flex',
            flexDirection: 'column',
            fontFamily: '"Noto Sans JP", sans-serif',
            color: '#1e293b',
            boxSizing: 'border-box',
            position: 'relative'
        }}>
            {/* Header */}
            <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '10mm',
                borderBottom: '1px solid #2A4076',
                paddingBottom: '4mm'
            }}>
                <h1 style={{ fontSize: '24px', fontWeight: '900', color: '#2A4076', margin: 0 }}>Real Estate App</h1>
                <span style={{ fontSize: '12px', color: '#64748b' }}>Ref ID: {property.reference_id || property.id.slice(0, 8)}</span>
            </div>

            {/* Main Image */}
            <div style={{ width: '100%', height: '100mm', marginBottom: '8mm', borderRadius: '4px', overflow: 'hidden' }}>
                {property.images && property.images.length > 0 && (
                    <img
                        src={property.images[0]}
                        alt="Property"
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                )}
            </div>

            {/* Title */}
            <h2 style={{ fontSize: '22px', fontWeight: '900', color: '#2A4076', marginBottom: '6mm', lineHeight: '1.2' }}>
                {property.title}
            </h2>

            {/* Price */}
            <div style={{
                width: '100%',
                backgroundColor: '#eff6ff',
                padding: '6mm',
                borderRadius: '4px',
                marginBottom: '8mm',
                textAlign: 'center',
                border: '1px solid #bfdbfe'
            }}>
                <div style={{ fontSize: '12px', fontWeight: 'bold', color: '#3b82f6', marginBottom: '2mm', textTransform: 'uppercase' }}>
                    {property.is_for_rent ? 'RENT / MONTH (賃貸)' : 'SALE PRICE (販売価格)'}
                </div>
                <div style={{ fontSize: '32px', color: '#1e3a8a', fontWeight: '900' }}>
                    {property.price?.toLocaleString()} <span style={{ fontSize: '18px' }}>{property.is_for_rent ? 'THB / Month' : 'THB'}</span>
                </div>
            </div>

            {/* Summary Grid */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(2, 1fr)',
                gap: '4mm',
                marginBottom: '10mm'
            }}>
                <InfoItem label="TYPE / 物件種別" value={property.property_type} />
                <InfoItem label="SIZE / 広さ (SQM)" value={`${property.sqm} 平方メートル`} />
                <InfoItem label="FLOOR / 階数" value={`${property.floor}F`} />
                <InfoItem label="BEDROOMS / 間取り" value={`${property.bedrooms} Bed / ${property.bathrooms} Bath`} />
            </div>

            {/* Highlights & Facilities */}
            <div style={{ display: 'flex', gap: '8mm', marginBottom: '8mm' }}>
                {highlights.length > 0 && (
                    <div style={{ flex: 1 }}>
                        <div style={{ fontSize: '10px', color: '#3b82f6', fontWeight: '900', marginBottom: '2mm', textTransform: 'uppercase' }}>HIGHLIGHTS / おすすめ</div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '3mm' }}>
                            {highlights.map((tag, idx) => (
                                <div key={idx} style={{ display: 'flex', alignItems: 'center', fontSize: '11px', fontWeight: 'bold' }}>
                                    <CheckIcon /> {tag}
                                </div>
                            ))}
                        </div>
                    </div>
                )}
                {mainFacilities.length > 0 && (
                    <div style={{ flex: 1 }}>
                        <div style={{ fontSize: '10px', color: '#64748b', fontWeight: '900', marginBottom: '2mm', textTransform: 'uppercase' }}>FACILITIES / 共有施設</div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '2mm' }}>
                            {mainFacilities.map((facility, idx) => (
                                <span key={idx} style={{ fontSize: '10px', backgroundColor: '#f1f5f9', padding: '1mm 3mm', borderRadius: '4px', fontWeight: 'bold' }}>{facility}</span>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* Descriptions */}
            <div style={{ flex: 1, overflow: 'hidden' }}>
                {property.description && (
                    <div style={{ marginBottom: '6mm' }}>
                        <SectionTitle title="日本語紹介文" />
                        <p style={{ fontSize: '12px', lineHeight: '1.6', color: '#334155', margin: 0 }}>{property.description}</p>
                    </div>
                )}
                {property.description_en && (
                    <div style={{ marginBottom: '6mm' }}>
                        <SectionTitle title="English Description" />
                        <p style={{ fontSize: '12px', lineHeight: '1.6', color: '#334155', margin: 0 }}>{property.description_en}</p>
                    </div>
                )}
            </div>

            {/* Footer */}
            <div style={{
                marginTop: 'auto',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-end',
                borderTop: '1px solid #e2e8f0',
                paddingTop: '8mm'
            }}>
                <div>
                    <div style={{ fontSize: '16px', fontWeight: '900', color: '#2A4076', marginBottom: '2mm' }}>{agent.full_name}</div>
                    {agent.phone && <div style={{ fontSize: '12px', color: '#64748b' }}>Phone: {agent.phone}</div>}
                    {agent.line_id && <div style={{ fontSize: '12px', color: '#64748b' }}>LINE ID: {agent.line_id}</div>}
                </div>
                <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '10px', color: '#94a3b8', textTransform: 'uppercase', marginBottom: '2mm' }}>Scan for details</div>
                    {qrCodeUrl && <img src={qrCodeUrl} alt="QR" style={{ width: '25mm', height: '25mm' }} />}
                </div>
            </div>
        </div>
    );
};

const InfoItem = ({ label, value }: { label: string, value: string }) => (
    <div style={{
        backgroundColor: '#F8FAFF',
        padding: '3mm 5mm',
        borderRadius: '4px',
        border: '1px solid #e2e8f0'
    }}>
        <div style={{ fontSize: '9px', color: '#94a3b8', textTransform: 'uppercase', marginBottom: '1mm' }}>{label}</div>
        <div style={{ fontSize: '14px', color: '#2A4076', fontWeight: 'bold' }}>{value}</div>
    </div>
);

const SectionTitle = ({ title }: { title: string }) => (
    <div style={{
        fontSize: '14px',
        fontWeight: '900',
        color: '#2A4076',
        marginBottom: '2mm',
        borderBottom: '2px solid #2A4076',
        paddingBottom: '1mm',
        display: 'inline-block'
    }}>
        {title}
    </div>
);
