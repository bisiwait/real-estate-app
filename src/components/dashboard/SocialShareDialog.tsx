'use client'

import Script from 'next/script'
import React, { useRef, useState, useEffect } from 'react'
import { X, Copy, Download, Share2, Facebook, MessageCircle, FileText, CheckCircle, Crown, Sparkles, RefreshCw } from 'lucide-react'
// import html2canvas from 'html2canvas' // Removed for bundle optimization
// import { QRCodeCanvas } from 'qrcode.react' // Removed for bundle optimization
import { toast } from 'sonner'

interface SocialShareDialogProps {
  isOpen: boolean
  onClose: () => void
  propertyContext: {
    id: string
    title: string
    price: number
    isForRent: boolean
    isForSale: boolean
    mainImageUrl?: string
    agentContact?: string
    snsCopyJa: string
    snsCopyEn: string
    snsCopyTh: string
    area?: string
    description?: string
    amenities?: string[]
    facilities?: string[]
    sqm?: number
    floor?: string
  }
}

export default function SocialShareDialog({ isOpen, onClose, propertyContext }: SocialShareDialogProps) {
  const bannerRef = useRef<HTMLDivElement>(null)
  const [isGenerating, setIsGenerating] = useState(false)
  const [isGeneratingAi, setIsGeneratingAi] = useState(false)
  const [copied, setCopied] = useState<string | null>(null)
  const [mounted, setMounted] = useState(false)
  const [snsCopy, setSnsCopy] = useState({
    ja: propertyContext.snsCopyJa,
    en: propertyContext.snsCopyEn,
    th: propertyContext.snsCopyTh
  })

  // Sync state if propertyContext changes
  useEffect(() => {
    setSnsCopy({
      ja: propertyContext.snsCopyJa,
      en: propertyContext.snsCopyEn,
      th: propertyContext.snsCopyTh
    })
  }, [propertyContext])

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!isOpen || !mounted) return null

  const propertyUrl = typeof window !== 'undefined' ? `${window.location.origin}/jp/properties/${propertyContext.id}` : ''
  const displayPrice = propertyContext.price.toLocaleString() + ' ฿'
  const actionLabel = propertyContext.isForSale && propertyContext.isForRent ? 'FOR SALE / RENT' 
    : propertyContext.isForRent ? 'FOR RENT' 
    : propertyContext.isForSale ? 'FOR SALE' : 'AVAILABLE'

  // Format the copy with the requested layout
  const formatCopy = (rawCopy: string) => {
    return `🏠 ${propertyContext.title}\n💰 ${displayPrice}\n📍 パタヤ / Pattaya\n\n${rawCopy}\n\n🔗 詳細はこちら / View Details:\n${propertyUrl}\n\n#PattayaProperty #ChonburiConnect #RealEstate`
  }

  const jaCopy = formatCopy(snsCopy.ja || '魅力的な物件です。詳細はお問い合わせください。')
  const enCopy = formatCopy(snsCopy.en || 'Attractive property. Contact us for details.')
  const thCopy = formatCopy(snsCopy.th || 'ทรัพย์สินที่น่าสนใจ ติดต่อสอบถามรายละเอียด')

  const allCopies = `=== 日本語 ===\n${jaCopy}\n\n=== English ===\n${enCopy}\n\n=== ภาษาไทย ===\n${thCopy}`

  const handleGenerateAiCopy = async () => {
    setIsGeneratingAi(true)
    try {
      const res = await fetch('/api/generate-sns-copy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          propertyId: propertyContext.id,
          title: propertyContext.title,
          price: propertyContext.price,
          area: propertyContext.area,
          description: propertyContext.description,
          amenities: propertyContext.amenities,
          facilities: propertyContext.facilities,
          sqm: propertyContext.sqm,
          floor: propertyContext.floor
        })
      })

      if (!res.ok) {
         const errorText = await res.text();
         console.error("[SNS API Error Response]", res.status, errorText);
         
         if (res.status === 429 || errorText.includes('Quota exceeded') || errorText.includes('429 Too Many Requests')) {
             throw new Error("QUOTA_EXCEEDED");
         }
         
         throw new Error(`Generating failed: ${res.status} ${errorText}`)
      }
      const data = await res.json()
      console.log("[SNS API Success]", data)
      setSnsCopy({ ja: data.ja, en: data.en, th: data.th })
      toast.success('SNSコピーをAIで生成しました！', { className: 'bg-emerald-50 text-emerald-600 border-emerald-200 font-bold' })
    } catch (e: any) {
      if (e.message === "QUOTA_EXCEEDED" || (e.message && e.message.includes("429"))) {
          toast.error('AIの利用枠（無料枠）の上限に達しました。時間をおくか、Google AI Studioでクレジットカードを登録して従量課金を有効にしてください。', {
              duration: 8000,
          })
      } else {
          toast.error('コピーの生成に失敗しました。時間をおいて再試行してください。')
      }
      console.error("[SNS API Catch Error]", e)
    } finally {
      setIsGeneratingAi(false)
    }
  }

  const handleCopy = async (text: string, lang: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(lang)
      toast.success('コピーしました！', {
        position: 'top-center',
        duration: 2000,
        className: 'bg-navy-secondary text-amber-400 border-amber-400 font-bold',
      })
      setTimeout(() => setCopied(null), 2000)
    } catch (err) {
      console.error('Failed to copy text', err)
    }
  }

  const handleDownloadBanner = async () => {
    if (!bannerRef.current) return
    setIsGenerating(true)
    
    try {
      // Wait for all images within the banner reference to load completely, including CORS issues
      const images = Array.from(bannerRef.current.querySelectorAll('img'))
      console.log(`[SNS Banner] Waiting for ${images.length} images to mount...`)
      
      await Promise.all(images.map(img => {
        if (img.complete) {
            console.log("[SNS Banner] Image already complete:", img.src);
            return Promise.resolve();
        }
        return new Promise((resolve) => {
          img.onload = () => {
             console.log("[SNS Banner] Image loaded:", img.src);
             resolve(null);
          };
          img.onerror = () => {
             console.warn("[SNS Banner] Failed to load image:", img.src);
             resolve(null); // Resolve anyway to proceed with blank/error image
          };
        });
      }));

      // Give a tick for layout paints and font rendering stabilization
      console.log("[SNS Banner] All images resolved. Waiting 300ms for layout stabilization...");
      await new Promise(resolve => setTimeout(resolve, 300));

      // Inject QR code for banner using CDN qrcode.js
      if (window.QRCode) {
        const qrContainer = document.getElementById('banner-qrcode');
        if (qrContainer) {
          qrContainer.innerHTML = '';
          new window.QRCode(qrContainer, {
            text: propertyUrl,
            width: 128,
            height: 128,
            colorDark: "#000000",
            colorLight: "#ffffff",
            correctLevel: window.QRCode.CorrectLevel.H
          });
          // Small wait for QR render if any
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }

      if (!window.html2canvas) {
        toast.error("画像を生成するためのライブラリを読み込み中です。数秒待ってお試しください。")
        return;
      }

      console.log("[SNS Banner] Starting html2canvas capture...");
      const canvas = await window.html2canvas(bannerRef.current, {
        scale: 2, // High resolution
        useCORS: true,
        allowTaint: false,
        backgroundColor: '#2A4076',
        logging: true, // Temporary for debugging purposes
        onclone: (clonedDoc: Document) => {
           console.log("[SNS Banner] html2canvas cloned document successfully.");
        }
      } as any)
      
      const image = canvas.toDataURL('image/png')
      const link = document.createElement('a')
      link.href = image
      link.download = `property_${propertyContext.id}_sns.png`
      link.click()
    } catch (err) {
      console.error('Error generating banner:', err)
      alert("画像の生成に失敗しました。")
    } finally {
      setIsGenerating(false)
    }
  }

  // SNS social Share links
  const handleFacebookShare = () => {
    const url = encodeURIComponent(propertyUrl);
    window.open(`https://www.facebook.com/sharer/sharer.php?u=${url}`, '_blank', 'width=600,height=400');
  }

  const handleLineShare = () => {
    const text = encodeURIComponent(`【${propertyContext.title}】\n詳細を確認: ${propertyUrl}`)
    window.open(`https://social-plugins.line.me/lineit/share?url=${encodeURIComponent(propertyUrl)}&text=${text}`, '_blank', 'width=600,height=500')
  }

  return (
    <div className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center p-0 sm:p-4 lg:p-6 bg-navy-primary/90 backdrop-blur-md animate-in fade-in duration-200">
      <div 
        className="bg-slate-50 rounded-t-3xl sm:rounded-3xl w-full max-w-6xl max-h-[90vh] sm:max-h-[95vh] overflow-y-auto custom-scrollbar shadow-2xl overflow-hidden relative border border-amber-400/20"
        onClick={e => e.stopPropagation()}
      >
        <div className="sticky top-0 z-20 bg-gradient-to-r from-navy-secondary to-navy-primary px-4 sm:px-6 py-4 border-b border-amber-400/30 flex items-center justify-between shadow-md">
          <div className="flex items-center space-x-3">
             <div className="bg-amber-400/20 p-2 rounded-xl border border-amber-400/50">
               <Crown className="w-6 h-6 text-amber-400" />
             </div>
             <div>
               <h2 className="text-lg sm:text-xl font-black text-white tracking-tight">SNS投稿用キット <span className="text-amber-400 font-black text-sm uppercase tracking-widest ml-1">(Premium)</span></h2>
               <p className="text-xs font-bold text-slate-300 mt-0.5">ワンクリックで3ヶ国語のコピーとバナー画像を取得</p>
             </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 rounded-full hover:bg-white/10 transition-colors text-slate-300 hover:text-white"
          >
            <X size={24} />
          </button>
        </div>

        <div className="p-4 sm:p-6 lg:p-8 flex flex-col xl:flex-row gap-6 lg:gap-8">
          
          {/* Left/Top Column: AI Copy */}
          <div className="flex-1 space-y-4 sm:space-y-6 order-2 xl:order-1">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
               <h3 className="text-base sm:text-lg font-black text-navy-primary flex items-center">
                 <FileText className="w-5 h-5 mr-2 text-amber-500" />
                 AI生成コピー
                 {(snsCopy.ja || snsCopy.en || snsCopy.th) && (
                    <button 
                      onClick={handleGenerateAiCopy} 
                      disabled={isGeneratingAi} 
                      title="AIで再生成する" 
                      className="ml-2 p-1.5 rounded-lg text-slate-400 hover:text-amber-500 hover:bg-amber-50 transition-colors disabled:opacity-50"
                    >
                       <RefreshCw className={`w-4 h-4 ${isGeneratingAi ? 'animate-spin text-amber-500' : ''}`} />
                    </button>
                 )}
               </h3>
               
               <button 
                onClick={() => handleCopy(allCopies, 'all')}
                disabled={!snsCopy.ja && !snsCopy.en && !snsCopy.th}
                className="w-full sm:w-auto flex justify-center items-center text-sm font-black text-navy-secondary bg-gradient-to-r from-amber-300 to-amber-500 px-6 py-3 rounded-xl hover:from-amber-400 hover:to-amber-600 transition-all shadow-lg hover:shadow-xl active:scale-95 border border-amber-200 disabled:opacity-50 disabled:grayscale"
               >
                 {copied === 'all' ? <CheckCircle className="w-5 h-5 mr-2" /> : <Copy className="w-5 h-5 mr-2" />}
                 {copied === 'all' ? 'コピー完了！' : '3ヶ国語まとめてコピー'}
               </button>
            </div>

            <div className="bg-white p-4 sm:p-5 rounded-2xl border border-amber-100 shadow-sm border-l-4 border-l-amber-400">
               <p className="text-xs sm:text-sm font-bold text-slate-600 leading-relaxed">
                 💡 <strong>Tips:</strong> 日本語・英語・タイ語をまとめて1つのSNS投稿に記載することで、国際的な不動産業者としての信頼感が増し、より広いターゲットにリーチできます。
               </p>
            </div>

            {(!snsCopy.ja && !snsCopy.en && !snsCopy.th) ? (
              <div className="flex flex-col items-center justify-center p-8 sm:p-12 bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl text-center">
                 <div className="bg-white p-4 rounded-full shadow-sm mb-4 border border-slate-100">
                   <Sparkles className="w-8 h-8 text-amber-500" />
                 </div>
                 <h4 className="font-black text-navy-secondary text-lg mb-2">SNS用コピーがまだありません</h4>
                 <p className="text-sm font-bold text-slate-400 mb-6 max-w-sm">
                   物件の情報をもとに、AIがSNS投稿に最適な3ヶ国語の紹介文とハッシュタグを自動生成します。
                 </p>
                 <button 
                   onClick={handleGenerateAiCopy} 
                   disabled={isGeneratingAi} 
                   className="flex items-center justify-center space-x-2 bg-navy-secondary text-white px-8 py-3.5 rounded-xl font-bold hover:bg-navy-secondary/90 transition-all shadow-lg hover:shadow-xl disabled:opacity-50"
                 >
                   {isGeneratingAi ? (
                     <>
                       <span className="animate-spin mr-1 border-2 border-white/20 border-t-white w-5 h-5 rounded-full"></span>
                       <span>AIで生成中...</span>
                     </>
                   ) : (
                     <>
                       <Sparkles className="w-5 h-5 text-amber-400" />
                       <span>AIでSNSコピーを生成する (Premium)</span>
                     </>
                   )}
                 </button>
              </div>
            ) : (
              <div className="space-y-4">
                <CopyBlock language="日本語 (Japanese)" text={jaCopy} copied={copied === 'ja'} onCopy={() => handleCopy(jaCopy, 'ja')} />
                <CopyBlock language="英語 (English)" text={enCopy} copied={copied === 'en'} onCopy={() => handleCopy(enCopy, 'en')} />
                <CopyBlock language="タイ語 (Thai)" text={thCopy} copied={copied === 'th'} onCopy={() => handleCopy(thCopy, 'th')} />
              </div>
            )}

          </div>

          {/* Right/Bottom Column: Banner Preview & Share */}
          <div className="w-full xl:w-[400px] 2xl:w-[480px] flex-shrink-0 space-y-4 sm:space-y-6 order-1 xl:order-2">
             <h3 className="text-base sm:text-lg font-black text-navy-primary flex items-center">
                 <Share2 className="w-5 h-5 mr-2 text-amber-500" />
                 バナー画像・シェア画像
             </h3>

             {/* Dynamic Banner Preview container */}
             <div className="relative bg-gradient-to-br from-slate-200 to-slate-300 rounded-2xl overflow-hidden shadow-inner flex items-center justify-center p-3 sm:p-6 border border-slate-300">
               
               {isGenerating && (
                 <div className="absolute inset-0 z-50 bg-navy-primary/80 backdrop-blur-sm flex flex-col items-center justify-center text-white">
                   <span className="animate-spin border-4 border-white/20 border-t-amber-400 w-10 h-10 rounded-full mb-4"></span>
                   <p className="font-black tracking-widest text-lg">バナーを作成中...</p>
                 </div>
               )}

               {/* 1080x1080 equivalent container scaled down for preview */}
               <div 
                  className="relative aspect-square w-full max-w-[400px] overflow-hidden bg-white shadow-xl"
                  style={{ transformOrigin: 'top left' }}
               >
                  {/* Actual element to be captured. We set explicit size to ensure consistent generation */}
                  <div 
                    ref={bannerRef}
                    className="absolute inset-0 bg-[#2A4076] text-[#FFFFFF] overflow-hidden"
                    style={{ width: '1080px', height: '1080px', transform: 'scale(0.37037)', transformOrigin: 'top left' }} // 400/1080 = 0.37037
                  >
                     {/* Background Image */}
                     {propertyContext.mainImageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img 
                          src={propertyContext.mainImageUrl} 
                          alt="Banner BG" 
                          className="absolute inset-0 w-full h-full object-cover"
                          crossOrigin="anonymous"
                          onError={(e) => {
                             e.currentTarget.src = 'https://placehold.co/1080x1080/2A4076/ffffff?text=No+Image'
                          }}
                        />
                     ) : (
                        <div className="absolute inset-0 bg-[#2A4076] flex items-center justify-center">
                           <span className="text-5xl font-bold text-[#FFFFFF80]">NO IMAGE</span>
                        </div>
                     )}
                     
                     {/* Bottom Gradient Overlay (about 40% height) */}
                     <div className="absolute bottom-0 left-0 right-0 h-[45%] bg-gradient-to-t from-[#2A4076] via-[#2A4076E6] to-[#00000000]"></div>
                     
                     {/* Top Left: Status Label */}
                     <div className="absolute top-12 left-12 z-10 text-left">
                        <div className="inline-block bg-gradient-to-r from-[#fbbf24] to-[#d97706] text-[#2A4076] font-black text-3xl px-8 py-3 rounded-tr-3xl rounded-bl-3xl rounded-tl-sm rounded-br-sm shadow-2xl">
                          {actionLabel}
                        </div>
                     </div>

                     {/* Bottom layout wrapper */}
                     <div className="absolute bottom-12 left-12 right-12 z-10 flex justify-between items-end">
                        {/* Bottom Left: Property Name & Price */}
                        <div className="space-y-3 max-w-[700px]">
                           <h1 className="text-5xl font-black leading-tight text-[#FFFFFF] drop-shadow-2xl line-clamp-2">
                             {propertyContext.title}
                           </h1>
                           <p className="text-5xl font-black text-[#fbbf24] drop-shadow-lg pb-2">
                             {displayPrice} <span className="text-3xl font-bold text-[#FFFFFF] ml-2 drop-shadow-md">THB</span>
                           </p>
                           {/* Logo / Site name */}
                           <div className="pt-2 flex items-center space-x-3 opacity-95">
                              <div className="w-10 h-10 bg-[#f59e0b] rounded-full flex items-center justify-center shadow-lg">
                                 <span className="text-[#2A4076] font-black text-xl">C</span>
                              </div>
                              <span className="text-2xl font-black tracking-widest text-[#FFFFFFE6] uppercase shadow-sm">
                                Chonburi Connect
                              </span>
                           </div>
                        </div>

                        {/* Bottom Right: QR Code */}
                        <div className="flex flex-col items-center bg-[#FFFFFF] p-5 rounded-3xl shadow-2xl skew-y-0 transform border-4 border-[#fbbf24]">
                           <div className="bg-[#FFFFFF]">
                             <div id="preview-qrcode" className="w-[160px] h-[160px] flex items-center justify-center bg-white" />
                           </div>
                           <p className="text-[#2A4076] font-black text-xl mt-3 tracking-widest uppercase text-center w-full bg-[#f1f5f9] py-1.5 rounded-xl">
                             Scan Link
                           </p>
                        </div>
                     </div>
                  </div>
               </div>
             </div>

             <button
               onClick={handleDownloadBanner}
               disabled={isGenerating}
               className="w-full flex items-center justify-center py-3.5 sm:py-4 bg-navy-secondary text-white rounded-xl sm:rounded-2xl text-sm sm:text-base font-black hover:bg-navy-secondary/90 transition-all shadow-xl disabled:opacity-50 border border-navy-primary"
             >
               {isGenerating ? (
                 <span className="flex items-center"><span className="animate-spin mr-2 border-2 border-white/20 border-t-white w-5 h-5 rounded-full"></span>画像を生成中...</span>
               ) : (
                 <span className="flex items-center"><Download className="w-5 h-5 mr-2 text-amber-400" /> 画像を保存する</span>
               )}
             </button>

             <div className="pt-4 border-t border-slate-200">
               <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3 text-center sm:text-left">ダイレクトシェア</p>
               <div className="grid grid-cols-2 gap-3">
                 <button 
                  onClick={handleFacebookShare}
                  className="flex items-center justify-center p-3 rounded-xl bg-[#1877F2]/10 text-[#1877F2] hover:bg-[#1877F2]/20 font-bold text-sm transition-colors"
                 >
                   <Facebook className="w-4 h-4 mr-2" /> Facebook
                 </button>
                 <button 
                  onClick={handleLineShare}
                  className="flex items-center justify-center p-3 rounded-xl bg-[#06C755]/10 text-[#06C755] hover:bg-[#06C755]/20 font-bold text-sm transition-colors"
                 >
                   <MessageCircle className="w-4 h-4 mr-2" /> LINE
                 </button>
               </div>
             </div>

          </div>
        </div>
      </div>
      {/* Load CDN Scripts */}
      <Script src="https://unpkg.com/html2canvas@1.4.1/dist/html2canvas.min.js" strategy="lazyOnload" />
      <Script 
        src="https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js" 
        strategy="lazyOnload"
        onLoad={() => {
          // Initialize preview QR code
          const qrContainer = document.getElementById('preview-qrcode');
          if (qrContainer && window.QRCode) {
            qrContainer.innerHTML = '';
            new window.QRCode(qrContainer, {
              text: propertyUrl,
              width: 160,
              height: 160,
              colorDark: "#2A4076",
              colorLight: "#ffffff",
              correctLevel: window.QRCode.CorrectLevel.H
            });
          }
        }}
      />
    </div>
  )
}

function CopyBlock({ language, text, copied, onCopy }: { language: string, text: string, copied: boolean, onCopy: () => void }) {
  return (
    <div className="bg-white border text-sm border-slate-200 rounded-xl sm:rounded-2xl overflow-hidden shadow-sm shadow-slate-200/50 group">
      <div className="bg-slate-50 px-3 py-2.5 sm:px-4 sm:py-3 border-b border-slate-200 flex items-center justify-between">
        <span className="font-black text-navy-secondary text-xs sm:text-sm">{language}</span>
        <button 
          onClick={onCopy}
          className={`flex items-center text-xs font-bold px-3 py-1.5 rounded-lg transition-all ${
            copied ? 'bg-emerald-50 text-emerald-600' : 'bg-white border border-slate-200 text-slate-500 hover:border-slate-300 hover:text-navy-primary shadow-sm'
          }`}
        >
          {copied ? <CheckCircle className="w-4 h-4 mr-1.5" /> : <Copy className="w-4 h-4 mr-1.5" />}
          {copied ? 'コピー済み' : 'コピー'}
        </button>
      </div>
      <div className="p-3 sm:p-4 bg-white whitespace-pre-wrap font-medium text-slate-600 leading-relaxed text-[13px] max-h-[150px] sm:max-h-[200px] overflow-y-auto custom-scrollbar">
        {text || '生成されたコピーがありません。'}
      </div>
    </div>
  )
}
