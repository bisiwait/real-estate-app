import React from 'react';
import { Page, Text, View, Document, StyleSheet, Font, Image } from '@react-pdf/renderer';

// Helper to get absolute URL for assets
const getAbsoluteUrl = (path: string) => {
    if (typeof window === 'undefined') return path;
    return `${window.location.origin}${path}`;
};

// Register JP Font
Font.register({
    family: 'NotoSansJP',
    fonts: [
        { src: getAbsoluteUrl('/fonts/NotoSansJP-Regular.ttf') },
        { src: getAbsoluteUrl('/fonts/NotoSansJP-Bold.ttf'), fontWeight: 'bold' },
    ],
});

// Register Thai Font
Font.register({
    family: 'NotoSansThai',
    fonts: [
        { src: getAbsoluteUrl('/fonts/NotoSansThai-Regular.ttf') },
        { src: getAbsoluteUrl('/fonts/NotoSansThai-Bold.ttf'), fontWeight: 'bold' },
    ],
});

// Create styles
const styles = StyleSheet.create({
    page: {
        flexDirection: 'column',
        backgroundColor: '#ffffff',
        fontFamily: 'NotoSansJP',
        padding: 15, // Further reduced from 20
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8, // Reduced from 10
        borderBottomWidth: 1,
        borderBottomColor: '#2A4076',
        paddingBottom: 4,
    },
    logo: {
        width: 120,
        height: 40,
        objectFit: 'contain',
    },
    refId: {
        fontSize: 10,
        color: '#64748b',
    },
    mainImage: {
        width: '100%',
        height: 280, // Slightly reduced to save space for text
        objectFit: 'cover',
        borderRadius: 2,
        marginBottom: 6,
    },
    propertyTitle: {
        fontSize: 15, // Slightly smaller
        fontWeight: 'bold',
        color: '#2A4076',
        marginBottom: 6,
    },
    infoBoxContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        marginBottom: 10, // Reduced from 20
    },
    infoBox: {
        width: '49%',
        backgroundColor: '#F8FAFF',
        paddingVertical: 5, // Reduced from 6
        paddingHorizontal: 8,
        borderRadius: 2,
        marginBottom: 3, // Reduced from 4
        borderWidth: 1,
        borderColor: '#e2e8f0',
    },
    infoLabel: {
        fontSize: 6.5,
        color: '#94a3b8',
        textTransform: 'uppercase',
        marginBottom: 1,
        fontFamily: 'NotoSansJP',
    },
    infoValue: {
        fontSize: 10, // Back to 10
        color: '#2A4076',
        fontWeight: 'bold',
        fontFamily: 'NotoSansJP',
    },
    priceContainer: {
        width: '100%',
        backgroundColor: '#eff6ff',
        padding: 8,
        borderRadius: 2,
        marginBottom: 8,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#bfdbfe',
    },
    priceLabel: {
        fontSize: 9, // Reduced from 10
        fontWeight: 'bold',
        color: '#3b82f6',
        marginBottom: 2, // Reduced from 4
    },
    priceValue: {
        fontSize: 22, // Slightly smaller from 24
        color: '#1e3a8a',
        fontWeight: 'bold',
        fontFamily: 'NotoSansJP',
    },
    sectionTitle: {
        fontSize: 11, // Reduced from 12
        fontWeight: 'bold',
        color: '#2A4076',
        marginTop: 4, // Reduced from 5
        marginBottom: 3, // Reduced from 5
        borderBottomWidth: 1,
        borderBottomColor: '#2A4076',
        paddingBottom: 1,
        fontFamily: 'NotoSansJP',
    },
    descriptionJP: {
        fontSize: 8.5, // Reduced from 9
        lineHeight: 1.4,
        color: '#334155',
        marginBottom: 6, // Tighter
        fontFamily: 'NotoSansJP',
    },
    descriptionEN: {
        fontSize: 8.5,
        lineHeight: 1.4,
        color: '#334155',
        marginBottom: 6,
        fontFamily: 'NotoSansJP',
    },
    descriptionTH: {
        fontSize: 8, // Even smaller
        lineHeight: 1.3,
        color: '#334155',
        marginBottom: 3,
        fontFamily: 'NotoSansThai',
    },
    sectionTitleTH: {
        fontSize: 11, // Reduced from 12
        fontWeight: 'bold',
        color: '#2A4076',
        marginTop: 4,
        marginBottom: 3,
        borderBottomWidth: 1,
        borderBottomColor: '#2A4076',
        paddingBottom: 1,
        fontFamily: 'NotoSansThai',
    },
    footer: {
        position: 'absolute',
        bottom: 25, // More breathing room
        left: 20,
        right: 20,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-end',
        borderTopWidth: 1,
        borderTopColor: '#e2e8f0',
        paddingTop: 12,
    },
    agentSection: {
        width: '70%',
    },
    qrSection: {
        width: '30%',
        flexDirection: 'column',
        alignItems: 'flex-end',
    },
    agentName: {
        fontSize: 10, // Slightly smaller from 11
        fontWeight: 'bold',
        color: '#2A4076',
        marginBottom: 3,
        fontFamily: 'NotoSansJP',
    },
    agentContact: {
        fontSize: 7.5, // Slightly smaller from 8
        color: '#64748b',
        marginBottom: 1,
        fontFamily: 'NotoSansJP',
    },
    qrCode: {
        width: 60,
        height: 60,
        marginTop: 4, // Space below label
    },
    qrLabel: {
        fontSize: 7,
        color: '#94a3b8', // Softer color
        textAlign: 'right',
        width: '100%',
        fontFamily: 'NotoSansJP',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    qrText: {
        fontSize: 8,
        color: '#64748b',
        marginTop: 4,
    },
    // New styles for Highlights and Facilities
    highlightsContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        marginTop: 2,
        marginBottom: 6,
    },
    highlightItem: {
        flexDirection: 'row',
        alignItems: 'center',
        marginRight: 10,
        marginBottom: 3,
    },
    highlightIcon: {
        width: 10,
        height: 10,
        marginRight: 3,
    },
    highlightText: {
        fontSize: 8,
        color: '#334155',
        fontFamily: 'NotoSansJP',
    },
    facilitiesList: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
        marginTop: 2,
    },
    facilityItem: {
        fontSize: 7.5,
        color: '#64748b',
        fontFamily: 'NotoSansJP',
        backgroundColor: '#f1f5f9',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 2,
    },
});

// Important keywords for Highlights
const IMPORTANT_KEYWORDS = ["ペット可", "バスタブ", "洗濯機", "駅近", "ペット", "家具付", "角部屋"];

// Checkmark Icon Component
const CheckIcon = () => (
    <View style={styles.highlightIcon}>
        <Text style={{ fontSize: 9, color: '#3b82f6', fontWeight: 'bold' }}>✓</Text>
    </View>
);

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

// Create Document Component
export const PropertyFlyer: React.FC<PropertyFlyerProps> = ({ property, agent, qrCodeUrl }) => {
    // Filter tags for highlights
    const highlights = (property.tags || []).filter(tag =>
        IMPORTANT_KEYWORDS.some(k => tag.includes(k))
    );

    // Limit shared facilities to 4
    const mainFacilities = (property.shared_facilities || []).slice(0, 4);

    return (
        <Document>
            <Page size="A4" style={styles.page}>
                {/* Header */}
                <View style={styles.header}>
                    <Text style={{ fontSize: 16, fontWeight: 'bold', color: '#2A4076' }}>Real Estate App</Text>
                    <Text style={styles.refId}>Ref ID: {property.reference_id || property.id.slice(0, 8)}</Text>
                </View>

                {/* Main Image */}
                {property.images && property.images.length > 0 && (
                    <Image
                        style={styles.mainImage}
                        src={property.images[0]}
                    />
                )}

                {/* Title */}
                <Text style={styles.propertyTitle}>{property.title}</Text>

                {/* Price */}
                <View style={styles.priceContainer}>
                    <Text style={styles.priceLabel}>
                        {property.is_for_rent ? 'RENT / MONTH (賃貸)' : 'SALE PRICE (販売価格)'}
                    </Text>
                    <Text style={styles.priceValue}>
                        {property.price?.toLocaleString()} {property.is_for_rent ? 'THB / Month' : 'THB'}
                    </Text>
                </View>

                {/* 4つのサマリーボックス */}
                <View style={styles.infoBoxContainer}>
                    <View style={styles.infoBox}>
                        <Text style={styles.infoLabel}>TYPE / 物件種別</Text>
                        <Text style={styles.infoValue}>{property.property_type}</Text>
                    </View>
                    <View style={styles.infoBox}>
                        <Text style={styles.infoLabel}>SIZE / 広さ (SQM)</Text>
                        <Text style={styles.infoValue}>{property.sqm} 平方メートル</Text>
                    </View>
                    <View style={styles.infoBox}>
                        <Text style={styles.infoLabel}>FLOOR / 階数</Text>
                        <Text style={styles.infoValue}>{property.floor}F</Text>
                    </View>
                    <View style={styles.infoBox}>
                        <Text style={styles.infoLabel}>BEDROOMS / 間取り</Text>
                        <Text style={styles.infoValue}>{property.bedrooms} Bed / {property.bathrooms} Bath</Text>
                    </View>
                </View>

                {/* Highlights (New) */}
                {highlights.length > 0 && (
                    <View style={{ marginBottom: 6 }}>
                        <Text style={[styles.infoLabel, { color: '#3b82f6', fontWeight: 'bold' }]}>HIGHLIGHTS / おすすめ</Text>
                        <View style={styles.highlightsContainer}>
                            {highlights.map((tag, idx) => (
                                <View key={idx} style={styles.highlightItem}>
                                    <CheckIcon />
                                    <Text style={styles.highlightText}>{tag}</Text>
                                </View>
                            ))}
                        </View>
                    </View>
                )}

                {/* Main Shared Facilities (New) */}
                {mainFacilities.length > 0 && (
                    <View style={{ marginBottom: 8 }}>
                        <Text style={styles.infoLabel}>MAIN FACILITIES / 主な共有施設</Text>
                        <View style={styles.facilitiesList}>
                            {mainFacilities.map((facility, idx) => (
                                <Text key={idx} style={styles.facilityItem}>{facility}</Text>
                            ))}
                        </View>
                    </View>
                )}

                {/* Descriptions */}
                {property.description && (
                    <View>
                        <Text style={styles.sectionTitle}>日本語紹介文</Text>
                        <Text style={styles.descriptionJP}>{property.description}</Text>
                    </View>
                )}

                {property.description_en && (
                    <View>
                        <Text style={styles.sectionTitle}>English Description</Text>
                        <Text style={styles.descriptionEN}>{property.description_en}</Text>
                    </View>
                )}

                {property.description_th && (
                    <View>
                        <Text style={styles.sectionTitleTH}>ข้อมูลอสังหาริมทรัพย์</Text>
                        <Text style={styles.descriptionTH}>{property.description_th}</Text>
                    </View>
                )}

                {/* Footer */}
                <View style={styles.footer}>
                    <View style={styles.agentSection}>
                        <Text style={styles.agentName}>{agent.full_name}</Text>
                        {agent.phone && <Text style={styles.agentContact}>Phone: {agent.phone}</Text>}
                        {agent.line_id && <Text style={styles.agentContact}>LINE ID: {agent.line_id}</Text>}
                    </View>
                    <View style={styles.qrSection}>
                        <Text style={styles.qrLabel}>Scan for details</Text>
                        {qrCodeUrl && (
                            <Image
                                style={styles.qrCode}
                                src={qrCodeUrl}
                            />
                        )}
                    </View>
                </View>
            </Page>
        </Document>
    );
};
