'use client';

import Script from 'next/script';
import React, { useState, useEffect, useRef } from 'react';
// import { pdf } from '@react-pdf/renderer'; // Removed for bundle optimization
import { PropertyFlyer } from './PropertyFlyer';
import { FileText, Download, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
// qrcode import is kept because it's already in package.json and not too heavy, but we'll monitor
import QRCode from 'qrcode'; 

interface PropertyPdfDownloadProps {
    property: any;
    agent: any;
    dict: any;
    iconOnly?: boolean;
}

export default function PropertyPdfDownload({ property, agent, dict, iconOnly }: PropertyPdfDownloadProps) {
    const [isClient, setIsClient] = useState(false);
    const [qrCodeUrl, setQrCodeUrl] = useState<string>('');
    const [imageBase64, setImageBase64] = useState<string | null>(null);
    const [isGenerating, setIsGenerating] = useState(false);
    const [isDataReady, setIsDataReady] = useState(false);
    const flyerRef = useRef<HTMLDivElement>(null);
    const priceValue = property.is_for_rent ? property.rent_price : property.sale_price;



    const flyerData = {
        property: {
            id: property.id,
            reference_id: property.reference_id,
            title: property.title,
            images: imageBase64 ? [imageBase64] : [],
            price: priceValue,
            is_for_rent: property.is_for_rent,
            property_type: property.property_type,
            sqm: property.sqm,
            floor: property.floor,
            bedrooms: property.bedrooms,
            bathrooms: property.bathrooms,
            description: property.description,
            description_en: property.description_en,
            description_th: property.description_th,
            tags: property.tags || [],
            shared_facilities: property.project?.facilities || property.project_facilities || [],
        },
        agent: {
            full_name: agent?.full_name || 'Our Agent',
            phone: agent?.phone || '',
            line_id: agent?.line_id || '',
        },
        qrCodeUrl: qrCodeUrl,
    };

    const fetchImageAsBase64 = async (imageUrl: string): Promise<string | null> => {
        try {
            console.log('Fetching image for Base64 conversion (Robust):', imageUrl);
            const res = await fetch(imageUrl, {
                mode: 'cors',
                headers: {
                    'Accept': 'image/*'
                }
            });

            if (!res.ok) {
                throw new Error(`Failed to fetch image: ${res.status} ${res.statusText}`);
            }

            const buffer = await res.arrayBuffer();
            const bytes = new Uint8Array(buffer);
            let binary = '';
            // For very large images, this loop might be slow, but for flyers it should be fine.
            // Using a chunked approach is better for huge blobs, but property images are usually < 2MB.
            for (let i = 0; i < bytes.byteLength; i++) {
                binary += String.fromCharCode(bytes[i]);
            }
            const base64String = btoa(binary);
            const contentType = res.headers.get('content-type') || 'image/jpeg';
            const dataUrl = `data:${contentType};base64,${base64String}`;

            console.log('Image converted to Base64 (Uint8Array) result length:', dataUrl.length);
            return dataUrl;
        } catch (e) {
            console.error('Failed to convert image to base64 using Uint8Array:', e);
            return null;
        }
    };

    useEffect(() => {
        setIsClient(true);

        const prepareData = async () => {
            setIsDataReady(false);

            try {
                // 1. Generate QR Code
                const url = `${window.location.origin}/properties/${property.id}`;
                console.log('Generating QR code for PDF Flyer URL:', url);
                const qrDataUrl = await QRCode.toDataURL(url, {
                    margin: 1,
                    width: 250,
                    color: {
                        dark: '#2A4076',
                        light: '#ffffff'
                    }
                });
                setQrCodeUrl(qrDataUrl);
                console.log('QR Code generated successfully for PDF');

                // 2. Convert Main Image to Base64
                if (property.images && property.images.length > 0) {
                    console.log('Starting pre-load of main property image for PDF...');
                    const b64 = await fetchImageAsBase64(property.images[0]);
                    setImageBase64(b64);
                    if (b64) {
                        console.log('Main image pre-loaded successfully');
                    } else {
                        console.warn('Main image pre-load failed');
                    }
                }

                // Strictly ready only if QR code is done (image is optional but logged)
                if (qrDataUrl) {
                    setIsDataReady(true);
                    console.log('PDF Data Preparation Complete: Ready for download');
                }
            } catch (err) {
                console.error('Error in PDF data preparation:', err);
                // Fallback: at least allow text/QR if possible
                setIsDataReady(true);
            }
        };

        prepareData();
    }, [property.id, property.images]);

    const handleDownload = async () => {
        if (isGenerating || !isDataReady) return;
        setIsGenerating(true);

        try {
            console.log('Starting PDF generation process (CDN Mode)...');

            if (!window.jspdf || !window.html2canvas) {
                toast.error("PDF生成用のライブラリを読み込み中です。数秒待ってお試しください。")
                return;
            }

            console.log('Invoking html2canvas on hidden flyer container...');
            const canvas = await window.html2canvas(flyerRef.current, {
                scale: 2,
                useCORS: true,
                logging: false
            });

            const imgData = canvas.toDataURL('image/jpeg', 0.95);
            const { jsPDF } = window.jspdf;
            const pdf = new jsPDF('p', 'mm', 'a4');
            const pageWidth = pdf.internal.pageSize.getWidth();
            const pageHeight = pdf.internal.pageSize.getHeight();
            
            pdf.addImage(imgData, 'JPEG', 0, 0, pageWidth, pageHeight);
            pdf.save(`Property_${property.reference_id || property.id.slice(0, 8)}.pdf`);
            
            console.log('Download initiated successfully');
        } catch (error) {
            console.error('Critical error in handleDownload:', error);
            alert('PDFの生成中にエラーが発生しました。コンソールログを確認してください。');
        } finally {
            setIsGenerating(false);
        }
    };

    if (iconOnly) {
        return (
            <div className="">
                {isDataReady ? (
                    <button
                        onClick={handleDownload}
                        disabled={isGenerating}
                        className={`p-2.5 rounded-xl transition-all border shadow-sm flex items-center justify-center ${isGenerating
                            ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed'
                            : 'bg-white hover:bg-slate-50 text-navy-primary border-slate-100 hover:border-navy-primary/20'
                            }`}
                        title="PDFチラシを保存"
                    >
                        {isGenerating ? (
                            <Loader2 className="w-5 h-5 animate-spin" />
                        ) : (
                            <Download className="w-5 h-5" />
                        )}
                    </button>
                ) : (
                    <button disabled className="p-2.5 rounded-xl bg-slate-50 text-slate-300 border border-slate-100 cursor-not-allowed shadow-sm">
                        <Loader2 className="w-5 h-5 animate-spin" />
                    </button>
                )}
            </div>
        );
    }

    return (
        <div className="mt-3">
            {isDataReady ? (
                <button
                    onClick={handleDownload}
                    disabled={isGenerating}
                    className={`w-full py-3.5 rounded-2xl font-semibold text-sm flex items-center justify-center gap-2 border transition-all ${isGenerating
                        ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed'
                        : 'bg-white hover:bg-slate-50 text-[#2A4076] border-[#2A4076]'
                        }`}
                >
                    {isGenerating ? (
                        <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            PDF生成中...
                        </>
                    ) : (
                        <>
                            <Download className="w-4 h-4" />
                            PDFチラシを保存
                        </>
                    )}
                </button>
            ) : (
                <button disabled className="w-full bg-slate-100 text-slate-400 py-3.5 rounded-2xl font-semibold text-sm flex items-center justify-center gap-2 border border-slate-200 cursor-not-allowed">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    PDFデータを準備中...
                </button>
            )}

            {/* Hidden Flyer for Capture */}
            <div className="fixed -left-[4000px] top-0 pointer-events-none">
                <div ref={flyerRef} style={{ width: '210mm', height: '297mm', backgroundColor: 'white' }}>
                    <PropertyFlyer {...flyerData} />
                </div>
            </div>

            {/* Load CDN Scripts */}
            <Script src="https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js" strategy="lazyOnload" />
            <Script src="https://unpkg.com/html2canvas@1.4.1/dist/html2canvas.min.js" strategy="lazyOnload" />
        </div>
    );
}
