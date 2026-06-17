'use client';

import { useState } from "react";
import { X, ChevronLeft, ChevronRight } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { ProductImage } from "@/lib/mock-data";
import { PLACEHOLDER_IMAGE_URL } from "@/lib/catalog-adapter";

interface ProductImageGalleryProps {
  images: ProductImage[];
  productName: string;
}

export default function ProductImageGallery({ images, productName }: ProductImageGalleryProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [lightbox, setLightbox] = useState(false);

  const prev = () => setActiveIndex(i => (i - 1 + images.length) % images.length);
  const next = () => setActiveIndex(i => (i + 1) % images.length);

  return (
    <>
      <div className="flex flex-col md:flex-row-reverse gap-4" data-testid="product-gallery">
        {/* Primary Image */}
        <div
          className="flex-1 relative overflow-hidden rounded-2xl bg-[#F5F0EB] cursor-zoom-in"
          style={{ aspectRatio: "1/1" }}
          onClick={() => setLightbox(true)}
        >
          <AnimatePresence mode="wait">
            <motion.img
              key={activeIndex}
              src={images[activeIndex]?.url ?? PLACEHOLDER_IMAGE_URL}
              alt={images[activeIndex]?.alt ?? productName}
              className="w-full h-full object-cover"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
            />
          </AnimatePresence>
          {images.length > 1 && (
            <>
              <button onClick={(e) => { e.stopPropagation(); prev(); }} className="absolute left-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white/80 backdrop-blur-sm flex items-center justify-center shadow hover:bg-white transition-colors" aria-label="Previous image">
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button onClick={(e) => { e.stopPropagation(); next(); }} className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white/80 backdrop-blur-sm flex items-center justify-center shadow hover:bg-white transition-colors" aria-label="Next image">
                <ChevronRight className="w-4 h-4" />
              </button>
            </>
          )}
        </div>

        {/* Thumbnails */}
        {images.length > 1 && (
          <div className="flex md:flex-col gap-2 overflow-x-auto md:overflow-y-auto md:w-20 md:max-h-[480px]">
            {images.map((img, i) => (
              <button
                key={img.id}
                onClick={() => setActiveIndex(i)}
                className={`flex-shrink-0 w-16 h-16 md:w-20 md:h-20 rounded-xl overflow-hidden border-2 transition-all ${i === activeIndex ? "border-primary" : "border-transparent hover:border-border"}`}
                aria-label={`View image ${i + 1}`}
                data-testid={`thumbnail-${i}`}
              >
                <img src={img.url} alt={img.alt} className="w-full h-full object-cover" />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Lightbox */}
      <AnimatePresence>
        {lightbox && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/90 z-[100] flex items-center justify-center p-4"
            onClick={() => setLightbox(false)}
          >
            <button className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors" aria-label="Close lightbox">
              <X className="w-5 h-5 text-white" />
            </button>
            <img
              src={images[activeIndex]?.url ?? PLACEHOLDER_IMAGE_URL}
              alt={images[activeIndex]?.alt ?? productName}
              className="max-w-full max-h-[90vh] object-contain rounded-2xl"
              onClick={(e) => e.stopPropagation()}
            />
            {images.length > 1 && (
              <>
                <button onClick={(e) => { e.stopPropagation(); prev(); }} className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors" aria-label="Previous">
                  <ChevronLeft className="w-5 h-5 text-white" />
                </button>
                <button onClick={(e) => { e.stopPropagation(); next(); }} className="absolute right-16 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors" aria-label="Next">
                  <ChevronRight className="w-5 h-5 text-white" />
                </button>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
