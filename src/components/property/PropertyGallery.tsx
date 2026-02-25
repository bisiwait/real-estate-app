'use client'

import { Swiper, SwiperSlide } from 'swiper/react'
import { Navigation, Pagination, Autoplay } from 'swiper/modules'
import 'swiper/css'
import 'swiper/css/navigation'
import 'swiper/css/pagination'

interface PropertyGalleryProps {
  images: string[]
}

export default function PropertyGallery({ images }: PropertyGalleryProps) {
  if (!images || images.length === 0) {
    return (
      <div className="w-full h-[300px] md:h-[500px] bg-slate-100 rounded-3xl flex items-center justify-center text-slate-400">
        No images available
      </div>
    )
  }

  return (
    <div className="relative w-full rounded-3xl overflow-hidden shadow-xl bg-slate-100 aspect-[16/9] md:aspect-[3/2] lg:h-[550px] lg:aspect-auto group">
      <Swiper
        modules={[Navigation, Pagination, Autoplay]}
        spaceBetween={0}
        slidesPerView={1}
        navigation
        pagination={{ clickable: true }}
        autoplay={{ delay: 5000 }}
        loop={true}
        className="w-full h-full"
      >
        {images.map((image, index) => (
          <SwiperSlide key={index}>
            <div className="w-full h-full">
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
  )
}
