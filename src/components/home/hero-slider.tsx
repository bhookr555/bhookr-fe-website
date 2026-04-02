"use client";

import React from "react";
import { HERO_SLIDES, HERO_SLIDER_CONFIG } from "@/constants";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselPrevious,
  CarouselNext,
  type CarouselApi
} from "@/components/ui/carousel";
import Autoplay from "embla-carousel-autoplay";

/**
 * Responsive hero slider using shadcn/ui carousel
 * Mobile (≤640px): 55vh height, compact controls, mobile-optimized images
 * Tablet (641-1024px): 65vh height, medium controls
 * Desktop (≥1025px): 75-85vh height, large controls
 * Touch-optimized with 44x44px minimum tap targets
 */
export function HeroSlider() {
  const [api, setApi] = React.useState<CarouselApi>();
  const [current, setCurrent] = React.useState(0);
  const [isMobile, setIsMobile] = React.useState(false);

  const plugin = React.useRef(
    Autoplay({ 
      delay: HERO_SLIDER_CONFIG.autoPlayInterval,
      stopOnInteraction: false,
      stopOnMouseEnter: false,
      playOnInit: true
    })
  );

  // Detect mobile viewport
  React.useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 640);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  React.useEffect(() => {
    if (!api) {
      return;
    }

    setCurrent(api.selectedScrollSnap());

    api.on("select", () => {
      setCurrent(api.selectedScrollSnap());
    });

    // Ensure first slide is visible
    api.scrollTo(0, true);
  }, [api]);

  if (HERO_SLIDES.length === 0) {
    return null;
  }

  return (
    <section 
      className="relative w-full h-[55vh] min-h-[300px] sm:h-[60vh] md:h-[65vh] lg:h-[75vh] xl:h-[85vh] max-h-[900px] mb-8 sm:mb-10 md:mb-14 lg:mb-16 xl:mb-20 2xl:mb-24 overflow-hidden"
      aria-label="Hero slider"
    >
      <Carousel
        setApi={setApi}
        plugins={[plugin.current]}
        className="w-full h-full"
        opts={{
          align: "start",
          loop: true,
          slidesToScroll: 1,
          containScroll: "trimSnaps",
          startIndex: 0,
          skipSnaps: false,
        }}
      >
        <CarouselContent className="h-full -ml-4">
          {HERO_SLIDES.map((slide) => {
            // Use mobile image if available and on mobile viewport
            const imageSource = isMobile && slide.mobileImage ? slide.mobileImage : slide.image;
            
            return (
              <CarouselItem key={slide.id} className="h-full">
                <div className="relative w-full h-full bg-gray-200 overflow-hidden">
                  <img
                    src={imageSource}
                    alt={slide.alt}
                    className="w-full h-full object-cover"
                  />
                </div>
              </CarouselItem>
            );
          })}
        </CarouselContent>
        
        {/* Custom Navigation Buttons - WCAG 44x44px touch targets */}
        <CarouselPrevious 
          className="absolute left-2 sm:left-3 md:left-4 lg:left-6 xl:left-8 top-1/2 -translate-y-1/2 h-11 w-11 sm:h-12 sm:w-12 md:h-14 md:w-14 lg:h-16 lg:w-16 bg-white/90 hover:bg-white active:bg-gray-100 border-2 border-white/30 text-gray-900 hover:text-gray-900 shadow-lg hover:shadow-xl active:shadow-md z-10 transition-all duration-300 touch-manipulation" 
          aria-label="Previous slide"
        />
        
        <CarouselNext 
          className="absolute right-2 sm:right-3 md:right-4 lg:right-6 xl:right-8 top-1/2 -translate-y-1/2 h-11 w-11 sm:h-12 sm:w-12 md:h-14 md:w-14 lg:h-16 lg:w-16 bg-white/90 hover:bg-white active:bg-gray-100 border-2 border-white/30 text-gray-900 hover:text-gray-900 shadow-lg hover:shadow-xl active:shadow-md z-10 transition-all duration-300 touch-manipulation" 
          aria-label="Next slide"
        />

        {/* Slide Indicators - Touch-optimized with 44px min height */}
        <div 
          className="absolute bottom-4 sm:bottom-5 md:bottom-6 lg:bottom-8 xl:bottom-10 left-1/2 -translate-x-1/2 z-20 flex gap-2 sm:gap-2.5 md:gap-3 lg:gap-3.5"
          role="tablist"
          aria-label="Slide indicators"
        >
          {HERO_SLIDES.map((_, index) => (
            <button
              key={index}
              onClick={() => api?.scrollTo(index)}
              className={`rounded-full transition-all duration-300 touch-manipulation ${
                current === index
                  ? "h-2 sm:h-2.5 md:h-3 lg:h-3.5 w-6 sm:w-8 md:w-12 lg:w-16 xl:w-20 bg-white shadow-lg ring-2 ring-white/30" 
                  : "h-2 sm:h-2.5 md:h-3 lg:h-3.5 w-2 sm:w-2.5 md:w-3 lg:w-3.5 bg-white/60 hover:bg-white/80 active:bg-white"
              }`}
              style={{ minHeight: '12px', minWidth: '12px' }}
              aria-label={`Go to slide ${index + 1}`}
              aria-current={current === index ? "true" : "false"}
              role="tab"
            />
          ))}
        </div>
      </Carousel>
    </section>
  );
}

