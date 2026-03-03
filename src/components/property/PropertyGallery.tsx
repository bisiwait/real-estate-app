'use client'

import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { Swiper, SwiperSlide } from 'swiper/react'
import { Navigation, Pagination, Autoplay, Zoom } from 'swiper/modules'
import { X } from 'lucide-react'
import 'swiper/css'
import 'swiper/css/navigation'
import 'swiper/css/pagination'
import 'swiper/css/zoom'

interface PropertyGalleryProps {
  images: string[]
}

export default function PropertyGallery({ images }: PropertyGalleryProps) {
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [initialSlide, setInitialSlide] = useState(0)
  const [activeIndex, setActiveIndex] = useState(0)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (isFullscreen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }
    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [isFullscreen])

  if (!images || images.length === 0) {
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
          {activeIndex + 1} / {images.length}
        </div>

        <Swiper
          modules={[Navigation, Pagination, Autoplay]}
          spaceBetween={0}
          slidesPerView={1}
          navigation
          pagination={{ clickable: true }}
          autoplay={{ delay: 5000, disableOnInteraction: false }}
          loop={true}
          onSlideChange={(swiper) => setActiveIndex(swiper.realIndex)}
          className="w-full h-full cursor-zoom-in"
        >
          {images.map((image, index) => (
            <SwiperSlide key={index}>
              <div
                className="w-full h-full cursor-pointer"
                onClick={() => openFullscreen(index)}
              >
                <img
                  src={image}
                  alt={`Property image ${index + 1}`}
                  className="w-full h-full object-cover"
                  loading="eager"
                />
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
          {/* 閉じるボタン（ヘッダーよりも前面に来るよう Portal 内で配置） */}
          <button
            onClick={closeFullscreen}
            className="absolute top-12 right-6 md:top-8 md:right-8 z-[100000] text-white p-4 rounded-full bg-navy-primary hover:bg-navy-secondary shadow-2xl transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <X className="w-8 h-8" />
            <span className="text-sm font-bold pr-1 hidden sm:block">閉じる</span>
          </button>

          <div
            className="w-full h-full py-0 relative flex items-center justify-center pointer-events-none"
          >
            <div className="w-full h-full pointer-events-auto">
              <Swiper
                modules={[Navigation, Pagination, Zoom]}
                spaceBetween={20}
                slidesPerView={1}
                initialSlide={initialSlide}
                navigation
                pagination={{ clickable: true, type: 'fraction' }}
                zoom={true}
                onClick={closeFullscreen}
                className="w-full h-[80vh] md:h-full mt-[10vh] md:mt-0"
              >
                {images.map((image, index) => (
                  <SwiperSlide key={index} className="flex items-center justify-center">
                    <div className="swiper-zoom-container flex items-center justify-center w-full h-[80vh] md:h-full">
                      <img
                        src={image}
                        alt={`Fullscreen ${index + 1}`}
                        className="max-w-full max-h-full object-contain"
                      />
                    </div>
                  </SwiperSlide>
                ))}
              </Swiper>
            </div>
            <style jsx global>{`
              .swiper-zoom-container {
                display: flex;
                align-items: center;
                justify-content: center;
                width: 100%;
                height: 100%;
              }
              .swiper-zoom-container > img {
                max-width: 100%;
                max-height: 100%;
                object-fit: contain;
              }
            `}</style>
          </div>
        </div>,
        document.body
      )}
    </>
  )
}
