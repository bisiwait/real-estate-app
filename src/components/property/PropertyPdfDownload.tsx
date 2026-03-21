'use client';

import Script from 'next/script';
import React, { useState, useEffect, useRef } from 'react';
import { PropertyFlyer } from './PropertyFlyer';
import { FileText, Download, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

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
            // Append timestamp to bust cache to prevent CORS issues on cached images
            const cacheBuster = imageUrl.includes('?') ? `&t=${Date.now()}` : `?t=${Date.now()}`;
            const fetchUrl = `${imageUrl}${cacheBuster}`;
            
            console.log('Fetching image for compression (with cache bust):', fetchUrl);
            const res = await fetch(fetchUrl, { mode: 'cors', cache: 'no-store' });
            if (!res.ok) throw new Error(`Fetch failed: ${res.status}`);
            
            const blob = await res.blob();
            const img = new Image();
            const objectUrl = URL.createObjectURL(blob);
            
            return new Promise((resolve) => {
                img.onload = () => {
                    URL.revokeObjectURL(objectUrl);
                    const canvas = document.createElement('canvas');
                    
                    // Resize logic: max width 1200px while maintaining aspect ratio
                    const MAX_WIDTH = 1200;
                    let width = img.width;
                    let height = img.height;
                    
                    if (width > MAX_WIDTH) {
                        height = (MAX_WIDTH / width) * height;
                        width = MAX_WIDTH;
                    }
                    
                    canvas.width = width;
                    canvas.height = height;
                    
                    const ctx = canvas.getContext('2d');
                    if (!ctx) {
                        resolve(null);
                        return;
                    }
                    
                    ctx.drawImage(img, 0, 0, width, height);
                    
                    // Compress to JPEG with 0.7 quality
                    const dataUrl = canvas.toDataURL('image/jpeg', 0.7);
                    console.log(`Resized to ${width}x${height}, b64 length: ${dataUrl.length}`);
                    resolve(dataUrl);
                };
                img.onerror = () => {
                    URL.revokeObjectURL(objectUrl);
                    resolve(null);
                };
                img.src = objectUrl;
            });
        } catch (e) {
            console.error('Failed to compress image:', e);
            return null;
        }
    };

    useEffect(() => {
        setIsClient(true);

        const prepareData = async () => {
            setIsDataReady(false);
            const timeout = setTimeout(() => {
                console.warn('PDF preparation timed out - enabling button with partial data');
                setIsDataReady(true);
            }, 8000); // 8 second safety timeout

            try {
                // 1. Convert Main Image to Base64 (Do this first as it's critical)
                if (property.images && property.images.length > 0) {
                    console.log('Starting pre-load of main property image for PDF...');
                    const b64 = await fetchImageAsBase64(property.images[0]);
                    setImageBase64(b64);
                }

                // 2. Generate QR Code using CDN library
                const url = `${window.location.origin}/properties/${property.id}`;
                let retries = 0;
                const MAX_RETRIES = 15;

                const checkQRCode = () => {
                    if (window.QRCode) {
                        try {
                            const tempContainer = document.createElement('div');
                            new window.QRCode(tempContainer, {
                                text: url,
                                width: 250,
                                height: 250,
                                colorDark: "#2A4076",
                                colorLight: "#ffffff",
                                correctLevel: window.QRCode.CorrectLevel.H
                            });
                            
                            setTimeout(() => {
                                const canvas = tempContainer.querySelector('canvas');
                                if (canvas) {
                                    setQrCodeUrl(canvas.toDataURL());
                                    console.log('QR Code generated successfully');
                                }
                            }, 100);
                        } catch (e) {
                            console.error('QR generation error:', e);
                        }
                    } else if (retries < MAX_RETRIES) {
                        retries++;
                        setTimeout(checkQRCode, 500);
                    } else {
                        console.warn('QR Code library failed to load in time');
                    }
                };
                
                checkQRCode();

            } catch (err) {
                console.error('Error in PDF data preparation:', err);
            } finally {
                clearTimeout(timeout);
                setIsDataReady(true); // Always enable the button
            }
        };

        if (property.id) prepareData();
    }, [property.id, property.images]);

    const handleDownload = async () => {
        if (isGenerating || !isDataReady) return;
        setIsGenerating(true);

        try {
            console.log('--- Start PDF Data Validation ---');
            console.log('Property ID:', property.id);
            console.log('Title:', property.title);
            console.log('Price:', priceValue);
            console.log('Images array length:', property.images?.length || 0);
            console.log('Base64 generated:', !!imageBase64);
            console.log('QR Code generated:', !!qrCodeUrl);
            
            if (!property.id || !property.title) {
                console.warn('⚠️ Missing critical property data (ID or Title). PDF might be incomplete.');
            }
            if (!imageBase64 && property.images && property.images.length > 0) {
                console.warn('⚠️ Base64 image failed to generate, but image URL exists. Will fallback to empty/default image in PDF.');
            }
            console.log('--- End PDF Data Validation ---');

            const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
            console.log('Starting optimized PDF generation...');

            let jsPDFModule;
            let html2canvasModule;
            
            try {
                jsPDFModule = await import('jspdf');
                html2canvasModule = await import('html2canvas');
            } catch (importError) {
                console.error("Failed to load PDF libraries dynamically:", importError);
                toast.error("PDF生成エンジンの読み込みに失敗しました。時間をおいて再試行してください。");
                setIsGenerating(false);
                return;
            }

            const html2canvas = html2canvasModule.default || html2canvasModule;
            const jsPDF = jsPDFModule.default || jsPDFModule.jsPDF;

            // Optional: wait a tiny bit to ensure React has fully committed the DOM
            console.log('Verifying flyerRef DOM existence...');
            let refAttempt = 0;
            while (!flyerRef.current && refAttempt < 10) {
                console.log(`flyerRef not found, polling... (${refAttempt + 1}/10)`);
                await sleep(100);
                refAttempt++;
            }

            if (!flyerRef.current) {
                console.error("Flyer DOM reference is missing! Polling failed.");
                toast.error("チラシ枠の描画に失敗しました。画面をリロードしてください。");
                setIsGenerating(false);
                return;
            }

            console.log('Executing html2canvas on flyerRef...');
            
            // 1. Wait for all images inside flyerRef to be fully decoded
            const images = Array.from(flyerRef.current.querySelectorAll('img'));
            console.log(`Waiting for ${images.length} images to decode...`);
            await Promise.all(
                images.map(async (img) => {
                    if (img.complete) return;
                    try {
                        await img.decode();
                    } catch (e) {
                        console.warn('Image decode failed (ignoring and proceeding):', img.src, e);
                    }
                })
            );
            console.log('All images decoded or verified.');

            // 2. Capture flyer with automatic retry logic
            const MAX_RETRIES = 3;
            let attempt = 0;
            let canvas = null;

            while (attempt < MAX_RETRIES) {
                try {
                    console.log(`html2canvas attempt ${attempt + 1}/${MAX_RETRIES}...`);
                    canvas = await html2canvas(flyerRef.current, {
                        scale: 2, // 2x scale to maintain high resolution
                        useCORS: true,
                        allowTaint: false, // Essential to prevent security errors causing rendering stops
                        logging: true, // Output debug logs from html2canvas
                        backgroundColor: '#ffffff',
                        width: 793.7, // 210mm in pixels at 96dpi
                        height: 1122.5 // 297mm in pixels at 96dpi
                    });
                    
                    if (canvas) {
                        console.log('html2canvas completed successfully.');
                        break; // Exit retry loop on success
                    }
                } catch (captureError) {
                    console.error(`html2canvas throw on attempt ${attempt + 1}:`, captureError);
                }
                
                attempt++;
                if (attempt < MAX_RETRIES) {
                    console.log(`Waiting 500ms before next attempt...`);
                    await sleep(500);
                }
            }

            if (!canvas) {
                console.error("All html2canvas attempts failed.");
                toast.error("PDFの描画処理に失敗しました。時間をおいて再度お試しください。");
                setIsGenerating(false);
                return;
            }

            console.log('Converting canvas to image/jpeg...');

            // Convert canvas to compressed JPEG
            const imgData = canvas.toDataURL('image/jpeg', 0.8);
            const pdf = new jsPDF({
                orientation: 'p',
                unit: 'mm',
                format: 'a4',
                compress: true // Enable internal PDF compression
            });
            
            const pageWidth = pdf.internal.pageSize.getWidth();
            const pageHeight = pdf.internal.pageSize.getHeight();
            
            pdf.addImage(imgData, 'JPEG', 0, 0, pageWidth, pageHeight, undefined, 'FAST');
            pdf.save(`Property_${property.reference_id || property.id.slice(0, 8)}.pdf`);
            
            toast.success("PDFのダウンロードを開始しました。");
        } catch (error) {
            console.error('Error during PDF export:', error);
            toast.error("PDFの作成中にエラーが発生しました。");
        } finally {
            setIsGenerating(false);
        }
    };

    const flyerDOM = (
        <div 
            style={{ 
                position: 'fixed', 
                top: '-10000px', 
                left: '-10000px', 
                zIndex: -9999,
                pointerEvents: 'none'
            }}
        >
            <div ref={flyerRef} style={{ width: '210mm', height: '297mm', backgroundColor: 'white' }}>
                <PropertyFlyer {...flyerData} />
            </div>
        </div>
    );

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
                {flyerDOM}
                <Script src="https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js" strategy="lazyOnload" />
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

            {flyerDOM}

            {/* Load CDN Scripts (Only QR Code remains from CDN as it's used on mount) */}
            <Script src="https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js" strategy="lazyOnload" />
        </div>
    );
}
