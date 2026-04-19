'use client'

import { useState, useEffect, useCallback } from 'react'
import PropertyThumbnail from '@/components/property/PropertyThumbnail'
import { resolvePropertyImageUrl } from '@/lib/property-image-url'
import { createPortal } from 'react-dom'
import { Swiper, SwiperSlide } from 'swiper/react'
import { Navigation, Pagination, Autoplay, Zoom } from 'swiper/modules'
import { X, ChevronLeft, ChevronRight } from 'lucide-react'
import 'swiper/css'
import 'swiper/css/navigation'
import 'swiper/css/pagination'
import 'swiper/css/zoom'

interface PropertyGalleryProps {
  images: string[]
  /** 物件詳細のメインビジュアル：先頭スライドを最優先読み込み */
  priority?: boolean
}

const MAIN_GALLERY_SIZES =
  '(max-width: 640px) 100vw, (max-width: 1024px) 100vw, min(896px, 66vw)'

function neighborIndices(center: number, len: number): Set<number> {
  const s = new Set<number>()
  if (len <= 0) return s
  const c = Math.max(0, Math.min(center, len - 1))
  s.add(c)
  if (c > 0) s.add(c - 1)
  if (c < len - 1) s.add(c + 1)
  return s
}

export default function PropertyGallery({ images, priority = true }: PropertyGalleryProps) {
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [initialSlide, setInitialSlide] = useState(0)
  const [activeIndex, setActiveIndex] = useState(0)
  const [mounted, setMounted] = useState(false)
  /** メインギャラリー: 表示中＋前後のみ実画像をマウント（非表示スライドの並列取得を防ぐ） */
  const [mainLoadedIndices, setMainLoadedIndices] = useState<Set<number>>(() => new Set([0]))
  const [fsLoadedIndices, setFsLoadedIndices] = useState<Set<number>>(() => new Set())

  const safeImages = (images ?? []).filter(
    (src): src is string => typeof src === 'string' && src.trim().length > 0
  )

  /** Swiper の loop はスライドが1枚だと内部エラーになりやすい */
  const enableLoop = safeImages.length > 1

  const expandMainLoaded = useCallback((realIndex: number) => {
    setMainLoadedIndices((prev) => {
      const next = new Set(prev)
      neighborIndices(realIndex, safeImages.length).forEach((i) => next.add(i))
      return next
    })
  }, [safeImages.length])

  const expandFsLoaded = useCallback((realIndex: number) => {
    setFsLoadedIndices((prev) => {
      const next = new Set(prev)
      neighborIndices(realIndex, safeImages.length).forEach((i) => next.add(i))
      return next
    })
  }, [safeImages.length])

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (isFullscreen) {
      document.body.style.overflow = 'hidden'
      setFsLoadedIndices(neighborIndices(initialSlide, safeImages.length))
    } else {
      document.body.style.overflow = 'unset'
      setFsLoadedIndices(new Set())
    }
    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [isFullscreen, initialSlide, safeImages.length])

  useEffect(() => {
    setActiveIndex(0)
    setMainLoadedIndices(neighborIndices(0, safeImages.length))
  }, [safeImages.length])

  if (safeImages.length === 0) {
    return (
      <div className="w-full h-[300px] md:h-[500px] bg-slate-100 rounded-3xl flex items-center justify-center text-slate-400">
        No images available
      </div>
    )
  }

  const openFullscreen = (index: number) => {
    setInitialSlide(index)
    setIsFullscreen(true)
  }

  const closeFullscreen = () => {
    setIsFullscreen(false)
  }

  return (
    <>
      <div className="relative w-full rounded-2xl md:rounded-3xl overflow-hidden shadow-xl bg-slate-100 aspect-square sm:aspect-[4/3] md:aspect-[3/2] lg:h-[550px] lg:aspect-auto group">
        {/* Image Counter Overlay */}
        <div className="absolute top-4 left-4 z-20 bg-black/40 backdrop-blur-md px-3 py-1.5 rounded-full text-white text-[10px] font-black tracking-widest pointer-events-none">
          {activeIndex + 1} / {safeImages.length}
        </div>

        <Swiper
          modules={[Navigation, Pagination, Autoplay]}
          spaceBetween={0}
          slidesPerView={1}
          navigation
          pagination={{ clickable: true }}
          autoplay={{ delay: 5000, disableOnInteraction: false }}
          loop={enableLoop}
          onSlideChange={(swiper) => {
            const ri = swiper.realIndex
            setActiveIndex(ri)
            expandMainLoaded(ri)
          }}
          className="w-full h-full cursor-zoom-in"
        >
          {safeImages.map((image, index) => (
            <SwiperSlide key={`gallery-main-${index}`}>
              <div
                className="relative w-full h-full min-h-[280px] sm:min-h-[360px] cursor-pointer"
                onClick={() => openFullscreen(index)}
              >
                {mainLoadedIndices.has(index) ? (
                  <PropertyThumbnail
                    src={resolvePropertyImageUrl(image)}
                    alt={`Property image ${index + 1}`}
                    fill
                    sizes={MAIN_GALLERY_SIZES}
                    priority={priority && index === 0}
                    loading={index === 0 ? 'eager' : 'lazy'}
                    className="object-cover"
                  />
                ) : (
                  <div
                    className="absolute inset-0 bg-slate-200/80"
                    aria-hidden
                  />
                )}
              </div>
            </SwiperSlide>
          ))}
        </Swiper>

        <style jsx global>{`
          .swiper-button-next, .swiper-button-prev {
            color: white !important;
            background: rgba(15, 23, 42, 0.4);
            width: 48px !important;
            height: 48px !important;
            border-radius: 99px;
            backdrop-filter: blur(4px);
            transition: all 0.3s ease;
            opacity: 0;
          }
          .swiper-button-next:after, .swiper-button-prev:after {
            font-size: 18px !important;
            font-weight: bold;
          }
          .group:hover .swiper-button-next, .group:hover .swiper-button-prev {
            opacity: 1;
          }
          .swiper-pagination-bullet {
            background: white !important;
            opacity: 0.6;
          }
          .swiper-pagination-bullet-active {
            opacity: 1;
            width: 24px !important;
            border-radius: 4px !important;
          }
        `}</style>
      </div>

      {isFullscreen && mounted && createPortal(
        <div
          className="fixed inset-0 z-[99999] bg-black/95 flex flex-col justify-center items-center"
          onClick={closeFullscreen}
        >
          {/* 閉じるボタン */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              closeFullscreen();
            }}
            className="absolute top-12 right-6 md:top-8 md:right-8 z-[100000] text-white p-4 rounded-full bg-navy-primary hover:bg-navy-secondary shadow-2xl transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-90"
          >
            <X className="w-8 h-8" />
            <span className="text-sm font-bold pr-1 hidden sm:block">閉じる</span>
          </button>

          <div
            className="w-full h-full py-0 relative flex items-center justify-center"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Custom Navigation */}
            <button className="swiper-fullscreen-prev absolute left-4 md:left-8 z-[100000] w-12 h-12 md:w-16 md:h-16 bg-white/10 hover:bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center text-white transition-all border border-white/20 active:scale-90 active:bg-white/30">
              <ChevronLeft className="w-8 h-8 md:w-10 md:h-10" />
            </button>
            <button className="swiper-fullscreen-next absolute right-4 md:right-8 z-[100000] w-12 h-12 md:w-16 md:h-16 bg-white/10 hover:bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center text-white transition-all border border-white/20 active:scale-90 active:bg-white/30">
              <ChevronRight className="w-8 h-8 md:w-10 md:h-10" />
            </button>

            <div className="w-full h-full">
              <Swiper
                modules={[Navigation, Pagination, Zoom]}
                spaceBetween={20}
                slidesPerView={1}
                initialSlide={initialSlide}
                loop={enableLoop}
                navigation={{
                  nextEl: '.swiper-fullscreen-next',
                  prevEl: '.swiper-fullscreen-prev',
                }}
                pagination={{ clickable: true, type: 'fraction' }}
                zoom={true}
                className="w-full h-full"
                onSlideChange={(swiper) => expandFsLoaded(swiper.realIndex)}
              >
                {safeImages.map((image, index) => (
                  <SwiperSlide key={`gallery-fs-${index}`} className="flex items-center justify-center">
                    <div className="swiper-zoom-container relative flex items-center justify-center w-full h-full min-h-[50vh]">
                      {fsLoadedIndices.has(index) ? (
                        <PropertyThumbnail
                          src={resolvePropertyImageUrl(image)}
                          alt={`Fullscreen ${index + 1}`}
                          fill
                          sizes="100vw"
                          loading={index === initialSlide ? 'eager' : 'lazy'}
                          priority={index === initialSlide}
                          className="object-contain"
                        />
                      ) : (
                        <div className="absolute inset-0 bg-neutral-900" aria-hidden />
                      )}
                    </div>
                  </SwiperSlide>
                ))}
              </Swiper>
            </div>
          </div>
          <style jsx global>{`
            .swiper-pagination-fraction {
              color: white !important;
              bottom: 24px !important;
              font-weight: bold;
              font-size: 14px;
            }
            .swiper-zoom-container {
              display: flex;
              align-items: center;
              justify-content: center;
              width: 100%;
              height: 100%;
            }
          `}</style>
        </div>,
        document.body
      )}
    </>

  )
}
