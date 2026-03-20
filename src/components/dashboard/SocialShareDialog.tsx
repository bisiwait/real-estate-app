'use client'

import React, { useRef, useState, useEffect } from 'react'
import Script from 'next/script'
import { X, Download, Share2, Facebook, MessageCircle, Crown, FileText, CheckCircle, Copy, ChevronDown } from 'lucide-react'
import { toast } from 'sonner'
import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import * as htmlToImage from 'html-to-image'

function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs))
}

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
    area?: string
    description?: string
    amenities?: string[]
    facilities?: string[]
    sqm?: number
    floor?: string
    layout?: string
  }
}

export default function SocialShareDialog({ isOpen, onClose, propertyContext }: SocialShareDialogProps) {
  const bannerRef = useRef<HTMLDivElement>(null)
  const captureRef = useRef<HTMLDivElement>(null)
  const [isGenerating, setIsGenerating] = useState(false)
  const [mounted, setMounted] = useState(false)
  
  // Translation States
  const [translatedText, setTranslatedText] = useState({ 
    ja: '', 
    en: '', 
    th: '' 
  })
  const [activeLang, setActiveLang] = useState<'ja' | 'en' | 'th'>('ja')
  const [isTranslating, setIsTranslating] = useState(false)

  // Property Edit States
  const [editedProperty, setEditedProperty] = useState({
    title: propertyContext.title || '',
    price: propertyContext.price || 0,
    layout: propertyContext.layout || '',
    floor: propertyContext.floor || '',
    sqm: propertyContext.sqm || 0,
    description: propertyContext.description || ''
  })

  // Update local state if propertyContext changes
  useEffect(() => {
    setEditedProperty({
      title: propertyContext.title || '',
      price: propertyContext.price || 0,
      layout: propertyContext.layout || '',
      floor: propertyContext.floor || '',
      sqm: propertyContext.sqm || 0,
      description: propertyContext.description || ''
    })
  }, [propertyContext])

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!isOpen || !mounted) return null

  const propertyUrl = typeof window !== 'undefined' ? `${window.location.origin}/jp/properties/${propertyContext.id}` : ''
  const displayPrice = Number(editedProperty.price).toLocaleString() + ' ฿'
  const actionLabel = propertyContext.isForSale && propertyContext.isForRent ? 'FOR SALE / RENT' 
    : propertyContext.isForRent ? 'FOR RENT' 
    : propertyContext.isForSale ? 'FOR SALE' : 'AVAILABLE'

  const handleTranslate = async () => {
    if (!editedProperty.description) {
      toast.error('翻訳する説明文がありません。')
      return;
    }
    setIsTranslating(true)
    try {
      const res = await fetch('/api/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: editedProperty.description }),
      })
      if (!res.ok) {
        throw new Error('Translation failed')
      }
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      
      setTranslatedText({ ja: data.ja, en: data.en, th: data.th })
      toast.success('翻訳が完了しました！')
    } catch (e: any) {
      toast.error('翻訳に失敗しました。 API設定を確認してください。')
      console.error(e)
    } finally {
      setIsTranslating(false)
    }
  }

  const handleCopy = async (text: string) => {
    try {
      if (!text) return;
      await navigator.clipboard.writeText(text)
      toast.success('コピーしました！', {
        position: 'top-center',
        duration: 2000,
        className: 'bg-navy-secondary text-amber-400 border-amber-400 font-bold',
      })
    } catch (err) {
      console.error('Failed to copy text', err)
    }
  }

  const handleDownloadBanner = async () => {
    if (!captureRef.current) return
    setIsGenerating(true)
    
    try {
      // 1. 画像の読み込み完了を待機
      const images = Array.from(captureRef.current.querySelectorAll('img'))
      await Promise.all(images.map(img => {
        if (img.complete) return Promise.resolve();
        return new Promise((resolve) => {
          img.onload = () => resolve(null);
          img.onerror = () => resolve(null);
        });
      }));

      // 2. QRコードの生成（キャプチャ用隠しエリアにも描画）
      if (window.QRCode) {
        const qrContainers = [
          document.getElementById('preview-qrcode'),
          document.getElementById('capture-qrcode')
        ];
        
        for (const qrContainer of qrContainers) {
          if (qrContainer) {
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
        }
        await new Promise(resolve => setTimeout(resolve, 500));
      }

      // 3. html-to-image を使用してキャプチャ
      const dataUrl = await htmlToImage.toPng(captureRef.current, {
        width: 1080,
        height: 1080,
        cacheBust: true,
        pixelRatio: 2, // 高解像度
      });
      
      // 4. ダウンロード実行
      const link = document.createElement('a')
      link.href = dataUrl
      link.download = `ChonburiConnect_${editedProperty.title.replace(/\s+/g, '_')}_SNS.png`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      
      toast.success('画像を保存しました！')
    } catch (err) {
      console.error('Error generating banner:', err)
      toast.error("画像の保存に失敗しました。")
    } finally {
      setIsGenerating(false)
    }
  }

  const handleFacebookShare = () => {
    const url = propertyUrl;
    const encodedUrl = encodeURIComponent(url);
    window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`, '_blank', 'width=600,height=400');
  }

  const handleLineShare = () => {
    const aiText = translatedText[activeLang] || ''
    // LINE share URL has a ~2000 char limit — keep AI text under 500 chars to stay safe
    const shortText = aiText.substring(0, 500)
    const hasMore = aiText.length > 500
    
    // lineit/share?url= には物件URLのみを渡す（これがプレビューに使われる）
    const shareUrl = `${propertyUrl}?v=FINAL_FORCE_OGP_02`
    const encodedUrl = encodeURIComponent(shareUrl)
    
    // text= には物件名とAI紹介文を渡す
    const shareText = `【${editedProperty.title}】\n${shortText}${hasMore ? '…' : ''}`
    const encodedText = encodeURIComponent(shareText)
    
    window.open(`https://social-plugins.line.me/lineit/share?url=${encodedUrl}&text=${encodedText}`, '_blank', 'width=600,height=500')
  }

  const handleCopyForLine = async () => {
    const aiText = translatedText[activeLang] || ''
    const shareUrl = `${propertyUrl}?v=shared_link_final_check`
    const fullText = `【${editedProperty.title}】\n${aiText}\n\n物件詳細を見る：${shareUrl}`
    await handleCopy(fullText)
  }

  // 共通のバナーコンテンツ部分を関数として定義
  const renderBannerContent = (isCapture: boolean = false) => (
    <div 
      className="absolute inset-0 bg-[#2A4076] text-[#FFFFFF] overflow-hidden"
      style={{ width: '1080px', height: '1080px' }}
    >
       {propertyContext.mainImageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img 
            src={propertyContext.mainImageUrl} 
            alt="Banner BG" 
            className="absolute inset-0 w-full h-full object-cover"
            crossOrigin="anonymous"
          />
       ) : (
          <div className="absolute inset-0 bg-[#2A4076] flex items-center justify-center">
             <span className="text-5xl font-bold text-[#FFFFFF80]">NO IMAGE</span>
          </div>
       )}
       
       <div className="absolute bottom-0 left-0 right-0 h-[45%] bg-gradient-to-t from-[#2A4076] via-[#2A4076E6] to-transparent"></div>
       
       <div className="absolute top-12 left-12 z-10 text-left">
          <div className="inline-block bg-gradient-to-r from-[#fbbf24] to-[#d97706] text-[#1A2B56] font-black text-3xl px-8 py-3 rounded-tr-3xl rounded-bl-3xl rounded-tl-sm rounded-br-sm shadow-2xl">
            {actionLabel}
          </div>
       </div>

       <div className="absolute bottom-12 left-12 right-12 z-10 flex justify-between items-end">
          <div className="space-y-3 max-w-[800px]">
             <h1 className="text-7xl font-black leading-tight text-[#1A2B56]" style={{ textShadow: '1.5px 1.5px 0 #ffffff, -1.5px -1.5px 0 #ffffff, 1.5px -1.5px 0 #ffffff, -1.5px 1.5px 0 #ffffff, 1.5px 0 0 #ffffff, -1.5px 0 0 #ffffff, 0 1.5px 0 #ffffff, 0 -1.5px 0 #ffffff, 4px 4px 8px rgba(0,0,0,0.3)' }}>
               {editedProperty.title}
             </h1>
             
             <div className="flex items-center space-x-4 mt-2 mb-2" style={{ display: 'flex', flexDirection: 'row', alignItems: 'center' }}>
                {editedProperty.layout && <span className="text-2xl font-bold text-white" style={{ textShadow: '0 2px 4px rgba(0,0,0,0.5)' }}>{editedProperty.layout}</span>}
                {editedProperty.layout && <span className="text-white text-opacity-70 text-xl">•</span>}
                {editedProperty.sqm > 0 && <span className="text-2xl font-bold text-white" style={{ textShadow: '0 2px 4px rgba(0,0,0,0.5)' }}>{editedProperty.sqm} Sq.m</span>}
                {editedProperty.sqm > 0 && <span className="text-white text-opacity-70 text-xl">•</span>}
                {editedProperty.floor && <span className="text-2xl font-bold text-white" style={{ textShadow: '0 2px 4px rgba(0,0,0,0.5)' }}>{editedProperty.floor} Floor</span>}
             </div>
             
             {/* AI Generated Text Overlay */}
             {translatedText[activeLang] && (
               <div className="mt-6 max-w-[850px] bg-black bg-opacity-30 p-6 rounded-2xl border border-white border-opacity-10" style={{ backdropFilter: 'blur(8px)' }}>
                 <p className="text-2xl font-bold text-white leading-relaxed line-clamp-[6] whitespace-pre-wrap" style={{ textShadow: '0 2px 4px rgba(0,0,0,0.5)' }}>
                   {translatedText[activeLang]}
                 </p>
               </div>
             )}

             <p className="text-5xl font-black text-[#fbbf24] drop-shadow-lg pb-2">
               {displayPrice} <span className="text-3xl font-bold text-[#FFFFFF] ml-2 drop-shadow-md">THB</span>
             </p>
             <div className="pt-2 flex items-center space-x-3 opacity-95">
                <div className="w-10 h-10 bg-[#f59e0b] rounded-full flex items-center justify-center shadow-lg">
                   <span className="text-[#2A4076] font-black text-xl">C</span>
                </div>
                <span className="text-2xl font-black tracking-widest text-[#FFFFFFE6] uppercase shadow-sm">
                  Chonburi Connect
                </span>
             </div>
          </div>

           <div className="flex flex-col items-center bg-[#FFFFFF] p-5 rounded-3xl shadow-2xl skew-y-0 transform border-4 border-[#fbbf24]">
              <div className="bg-[#FFFFFF]">
                <div id={isCapture ? "capture-qrcode" : "preview-qrcode"} className="w-[160px] h-[160px] flex items-center justify-center bg-white" />
              </div>
             <p className="text-[#2A4076] font-black text-xl mt-3 tracking-widest uppercase text-center w-full bg-[#f1f5f9] py-1.5 rounded-xl">
               Scan Link
             </p>
          </div>
       </div>
    </div>
  );

  return (
    <div className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center p-0 sm:p-4 lg:p-6 bg-navy-primary/90 backdrop-blur-md animate-in fade-in duration-200">
      {/* キャプチャ用の隠しコンテナ（画面外に配置） */}
      <div className="fixed -left-[2000px] -top-[2000px]">
        <div ref={captureRef} style={{ width: '1080px', height: '1080px', position: 'relative' }}>
          {renderBannerContent(true)}
        </div>
      </div>
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
               <h2 className="text-lg sm:text-xl font-black text-white tracking-tight">AI機能 & シェア画像 <span className="text-amber-400 font-black text-sm uppercase tracking-widest ml-1">(Premium)</span></h2>
               <p className="text-xs font-bold text-slate-300 mt-0.5">物件説明の翻訳や、SNS投稿用のバナー画像を取得</p>
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
          
          {/* Left Column: Property Info Form & AI Translation */}
          <div className="flex-1 space-y-6 order-2 xl:order-1">
            
            {/* Basic Info Edit Form */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
              <h3 className="text-base sm:text-lg font-black text-navy-primary border-b border-slate-100 pb-2 mb-4">物件情報（表示・編集用）</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="text-xs font-bold text-slate-500 mb-1 block">物件タイトル (Title)</label>
                  <input type="text" value={editedProperty.title} onChange={e => setEditedProperty({...editedProperty, title: e.target.value})} className="w-full text-sm p-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-amber-400 focus:outline-none" />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 mb-1 block">価格 (Price)</label>
                  <input type="number" value={editedProperty.price || ''} onChange={e => setEditedProperty({...editedProperty, price: Number(e.target.value)})} className="w-full text-sm p-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-amber-400 focus:outline-none" />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 mb-1 block">間取り (Layout)</label>
                  <input type="text" value={editedProperty.layout} onChange={e => setEditedProperty({...editedProperty, layout: e.target.value})} className="w-full text-sm p-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-amber-400 focus:outline-none" />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 mb-1 block">階数 (Floor)</label>
                  <input type="text" value={editedProperty.floor} onChange={e => setEditedProperty({...editedProperty, floor: e.target.value})} className="w-full text-sm p-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-amber-400 focus:outline-none" />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 mb-1 block">広さ (Sqm)</label>
                  <input type="number" value={editedProperty.sqm || ''} onChange={e => setEditedProperty({...editedProperty, sqm: Number(e.target.value)})} className="w-full text-sm p-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-amber-400 focus:outline-none" />
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
               <div className="flex flex-col">
                 <h3 className="text-base sm:text-lg font-black text-navy-primary flex items-center">
                   <FileText className="w-5 h-5 mr-2 text-amber-500" />
                   説明文の編集とAI翻訳
                 </h3>
                 <p className="text-[10px] text-slate-400 font-bold ml-7">※SNS投稿用にキャッチーな文章に翻訳します</p>
               </div>
               
               <button 
                onClick={handleTranslate}
                disabled={isTranslating || !editedProperty.description}
                className="w-full sm:w-auto flex justify-center items-center text-sm font-black text-navy-secondary bg-gradient-to-r from-amber-300 to-amber-500 px-6 py-2.5 rounded-xl hover:from-amber-400 hover:to-amber-600 transition-all shadow-md hover:shadow-lg active:scale-95 border border-amber-200 disabled:opacity-50 disabled:grayscale"
               >
                 {isTranslating ? (
                   <><span className="animate-spin mr-2 border-2 border-navy-primary/20 border-t-navy-primary w-4 h-4 rounded-full"></span>翻訳中...</>
                 ) : (
                   'SNS用翻訳'
                 )}
               </button>
            </div>

            <div className="space-y-4">
              <div>
                 <label className="text-xs font-bold text-slate-500 mb-1 block">元の文章 (Property Description)</label>
                 <textarea 
                    value={editedProperty.description}
                    onChange={e => setEditedProperty({...editedProperty, description: e.target.value})}
                    placeholder="説明文を入力してください..."
                    className="w-full text-[13px] leading-relaxed p-3 bg-white border border-slate-200 rounded-xl max-h-60 min-h-[160px] focus:ring-2 focus:ring-amber-400 focus:outline-none transition-all resize-y" 
                 />
              </div>

              <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                {/* JA */}
                <div className={cn("transition-all duration-200", activeLang === 'ja' ? "ring-2 ring-amber-400 rounded-2xl p-1" : "")}>
                  <div className="flex justify-between items-center mb-1 px-1">
                     <label className="text-xs font-black text-navy-primary flex items-center">
                       日本語 (Japanese)
                       {activeLang === 'ja' && <span className="ml-2 text-[9px] bg-amber-400 text-white px-1.5 py-0.5 rounded-full uppercase">Previewing</span>}
                     </label>
                     <div className="flex items-center space-x-1">
                       <button 
                        onClick={() => setActiveLang('ja')}
                        className={cn("text-[10px] font-bold px-2 py-0.5 rounded-lg transition-colors", activeLang === 'ja' ? "bg-amber-400 text-white" : "bg-slate-100 text-slate-400 hover:bg-slate-200")}
                       >
                         プレビュー
                       </button>
                       <button onClick={() => handleCopy(translatedText.ja)} className="text-slate-400 hover:text-navy-primary transition-colors p-1"><Copy className="w-4 h-4" /></button>
                     </div>
                  </div>
                  <textarea 
                    value={translatedText.ja}
                    onChange={e => setTranslatedText({ ...translatedText, ja: e.target.value })}
                    onFocus={() => setActiveLang('ja')}
                    placeholder="翻訳結果がここに表示されます"
                    className="w-full text-[13px] leading-relaxed p-3 bg-slate-50 border border-slate-200 rounded-xl max-h-52 min-h-[140px] focus:ring-2 focus:ring-amber-400 focus:outline-none transition-all resize-y" 
                  />
                </div>
                {/* EN */}
                <div className={cn("transition-all duration-200", activeLang === 'en' ? "ring-2 ring-amber-400 rounded-2xl p-1" : "")}>
                  <div className="flex justify-between items-center mb-1 px-1">
                     <label className="text-xs font-black text-navy-primary flex items-center">
                       英語 (English)
                       {activeLang === 'en' && <span className="ml-2 text-[9px] bg-amber-400 text-white px-1.5 py-0.5 rounded-full uppercase">Previewing</span>}
                     </label>
                     <div className="flex items-center space-x-1">
                       <button 
                        onClick={() => setActiveLang('en')}
                        className={cn("text-[10px] font-bold px-2 py-0.5 rounded-lg transition-colors", activeLang === 'en' ? "bg-amber-400 text-white" : "bg-slate-100 text-slate-400 hover:bg-slate-200")}
                       >
                         プレビュー
                       </button>
                       <button onClick={() => handleCopy(translatedText.en)} className="text-slate-400 hover:text-navy-primary transition-colors p-1"><Copy className="w-4 h-4" /></button>
                     </div>
                  </div>
                  <textarea 
                    value={translatedText.en}
                    onChange={e => setTranslatedText({ ...translatedText, en: e.target.value })}
                    onFocus={() => setActiveLang('en')}
                    placeholder="English translation will appear here"
                    className="w-full text-[13px] leading-relaxed p-3 bg-slate-50 border border-slate-200 rounded-xl max-h-52 min-h-[140px] focus:ring-2 focus:ring-amber-400 focus:outline-none transition-all resize-y" 
                  />
                </div>
                {/* TH */}
                <div className={cn("transition-all duration-200", activeLang === 'th' ? "ring-2 ring-amber-400 rounded-2xl p-1" : "")}>
                  <div className="flex justify-between items-center mb-1 px-1">
                     <label className="text-xs font-black text-navy-primary flex items-center">
                       タイ語 (Thai)
                       {activeLang === 'th' && <span className="ml-2 text-[9px] bg-amber-400 text-white px-1.5 py-0.5 rounded-full uppercase">Previewing</span>}
                     </label>
                     <div className="flex items-center space-x-1">
                       <button 
                        onClick={() => setActiveLang('th')}
                        className={cn("text-[10px] font-bold px-2 py-0.5 rounded-lg transition-colors", activeLang === 'th' ? "bg-amber-400 text-white" : "bg-slate-100 text-slate-400 hover:bg-slate-200")}
                       >
                         プレビュー
                       </button>
                       <button onClick={() => handleCopy(translatedText.th)} className="text-slate-400 hover:text-navy-primary transition-colors p-1"><Copy className="w-4 h-4" /></button>
                     </div>
                  </div>
                  <textarea 
                    value={translatedText.th}
                    onChange={e => setTranslatedText({ ...translatedText, th: e.target.value })}
                    onFocus={() => setActiveLang('th')}
                    placeholder="ผลลัพธ์การแปลจะแสดงที่นี่"
                    className="w-full text-[13px] leading-relaxed p-3 bg-slate-50 border border-slate-200 rounded-xl max-h-52 min-h-[140px] focus:ring-2 focus:ring-amber-400 focus:outline-none transition-all resize-y" 
                  />
                </div>
              </div>
            </div>

          </div>

          {/* Right Column: Banner Preview & Share */}
          <div className="w-full xl:w-[400px] 2xl:w-[480px] flex-shrink-0 space-y-4 sm:space-y-6 order-1 xl:order-2">
             <h3 className="text-base sm:text-lg font-black text-navy-primary flex items-center">
                 <Share2 className="w-5 h-5 mr-2 text-amber-500" />
                 バナー画像・シェア画像
             </h3>

             <div className="relative bg-gradient-to-br from-slate-200 to-slate-300 rounded-2xl overflow-hidden shadow-inner flex items-center justify-center p-3 sm:p-6 border border-slate-300">
               
               {isGenerating && (
                 <div className="absolute inset-0 z-50 bg-navy-primary/80 backdrop-blur-sm flex flex-col items-center justify-center text-white">
                   <span className="animate-spin border-4 border-white/20 border-t-amber-400 w-10 h-10 rounded-full mb-4"></span>
                   <p className="font-black tracking-widest text-lg">バナーを作成中...</p>
                 </div>
               )}

               <div 
                  className="relative aspect-square w-full max-w-[400px] overflow-hidden bg-white shadow-xl"
                  style={{ transformOrigin: 'top left' }}
               >
                  <div 
                    ref={bannerRef}
                    className="absolute inset-0 bg-[#2A4076] text-[#FFFFFF] overflow-hidden"
                    style={{ width: '1080px', height: '1080px', transform: 'scale(0.37037)', transformOrigin: 'top left' }}
                  >
                    {renderBannerContent(false)}
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
               <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-3 gap-2">
                 <p className="text-xs font-black text-slate-400 uppercase tracking-widest">ダイレクトシェア</p>
                 <p className="text-[10px] font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-100">
                   ※画像は先に保存してください
                 </p>
               </div>
               <div className="grid grid-cols-2 gap-3">
                 <button 
                  onClick={handleFacebookShare}
                  className="flex items-center justify-center p-3 rounded-xl bg-[#1877F2]/10 text-[#1877F2] hover:bg-[#1877F2]/20 font-bold text-sm transition-all active:scale-95 cursor-pointer"
                 >
                   <Facebook className="w-4 h-4 mr-2" /> Facebook
                 </button>
                 <button 
                  onClick={handleLineShare}
                  className="flex items-center justify-center p-3 rounded-xl bg-[#06C755]/10 text-[#06C755] hover:bg-[#06C755]/20 font-bold text-sm transition-all active:scale-95 cursor-pointer"
                 >
                   <MessageCircle className="w-4 h-4 mr-2" /> LINE
                 </button>
               </div>
             </div>

          </div>
        </div>
      </div>
      <Script 
        src="https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js" 
        strategy="lazyOnload"
        onLoad={() => {
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
