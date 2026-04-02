"use client";

import React, { useState } from "react";
import Image from "next/image";
import { Card, CardContent } from "@/components/ui/card";
import { SectionHeader } from "@/components/shared/section-header";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselPrevious,
  CarouselNext,
  type CarouselApi
} from "@/components/ui/carousel";
import {
  TESTIMONIALS,
  HOME_SECTIONS,
  HERO_SLIDER_CONFIG,
} from "@/constants";
import Autoplay from "embla-carousel-autoplay";

// Individual Testimonial Card Component with Read More/Less
function TestimonialCard({ testimonial }: { testimonial: any }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const isLongText = testimonial.feedback.length > 150;

  return (
    <Card className="border-2 border-[#E31E24]/20">
      <CardContent className="p-3 sm:p-4 md:p-6 lg:p-8 xl:p-10 min-h-[300px] sm:min-h-[350px] md:min-h-[400px]">
        <div className="grid md:grid-cols-2 gap-4 sm:gap-6 md:gap-8 lg:gap-10 items-center h-full">
          {/* Client Image - Mobile-first sizing */}
          <div className="flex justify-center md:justify-center">
            <div className="relative h-40 w-28 sm:h-48 sm:w-32 md:h-64 md:w-44 lg:h-72 lg:w-52 xl:h-80 xl:w-60 rounded-2xl overflow-hidden border-4 border-[#E31E24] mx-auto md:mx-0">
              <Image
                src={testimonial.image}
                alt={testimonial.name}
                fill
                className="object-cover"
                sizes="(max-width: 640px) 128px, (max-width: 768px) 160px, (max-width: 1024px) 208px, 240px"
              />
            </div>
          </div>

          {/* Content - Mobile-first typography */}
          <div className="flex-1 text-center md:text-left space-y-2 sm:space-y-3 md:space-y-4 flex flex-col justify-between h-full">
            <div className="space-y-2 sm:space-y-3 md:space-y-4">
              {/* Stars - Mobile-first sizing */}
              <div className="flex justify-center md:justify-start gap-0.5 sm:gap-1">
                {Array.from({ length: testimonial.rating }).map((_, i) => (
                  <span key={i} className="text-yellow-400 text-lg sm:text-xl md:text-2xl">
                    ★
                  </span>
                ))}
              </div>

              {/* USP Badge - Mobile-first sizing */}
              <div className="inline-block bg-[#E31E24] text-white px-3 sm:px-4 py-1.5 sm:py-2 rounded-full text-xs sm:text-sm font-bold">
                {testimonial.usp}
              </div>

              {/* Feedback - Mobile-first typography with Read More/Less */}
              <div className="space-y-2">
                <p 
                  className={`text-sm sm:text-base md:text-lg lg:text-xl text-gray-700 dark:text-gray-300 leading-relaxed italic transition-all duration-300 ${
                    !isExpanded && isLongText ? 'line-clamp-4 overflow-hidden' : ''
                  }`}
                >
                  &quot;{testimonial.feedback}&quot;
                </p>
                
                {/* Read More / Read Less Button */}
                {isLongText && (
                  <button
                    onClick={() => setIsExpanded(!isExpanded)}
                    className="text-[#E31E24] hover:text-[#C41E3A] font-semibold text-sm transition-colors duration-200 flex items-center gap-1"
                  >
                    {isExpanded ? (
                      <>
                        Read Less 
                        <svg className="w-4 h-4 transform rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </>
                    ) : (
                      <>
                        Read More 
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>

            {/* Client Info - Always at bottom */}
            <div className="space-y-0.5 sm:space-y-1 pt-2 mt-auto">
              <p className="font-bold text-base sm:text-lg md:text-xl text-gray-900 dark:text-white">
                {testimonial.name}
              </p>
              <p className="text-xs sm:text-sm md:text-base text-gray-600 dark:text-gray-400">
                {testimonial.profession}
              </p>
              <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-500">
                📍 {testimonial.locality}, {testimonial.city}
              </p>
              <p className="text-xs sm:text-sm font-semibold text-[#E31E24]">
                Plan: {testimonial.plan}
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Responsive testimonials section with shadcn carousel
 * Mobile: Stacked image/content
 * Desktop: Side-by-side layout
 */
export function TestimonialsSection() {
  const { testimonials: section } = HOME_SECTIONS;

  const [api, setApi] = React.useState<CarouselApi>();

  const plugin = React.useRef(
    Autoplay({ delay: HERO_SLIDER_CONFIG.autoPlayInterval, stopOnInteraction: true })
  );

  React.useEffect(() => {
    if (!api) return;
  }, [api]);

  if (TESTIMONIALS.length === 0) return null;

  return (
    <section className="relative w-full overflow-hidden bg-gray-50 dark:bg-gray-900">
      <div className="container-responsive section-padding">
        <SectionHeader
          title={section.title}
          highlight={section.highlight}
          description={section.description}
          className="mb-6 sm:mb-8 md:mb-10 lg:mb-12 xl:mb-16"
        />

        <div className="relative max-w-5xl mx-auto">
          <Carousel
            setApi={setApi}
            plugins={[plugin.current]}
            className="w-full"
            opts={{
              align: "start",
              loop: true,
            }}
          >
            <CarouselContent>
              {TESTIMONIALS.map((testimonial, index) => (
                <CarouselItem key={index}>
                  <TestimonialCard testimonial={testimonial} />
                </CarouselItem>
              ))}
            </CarouselContent>
            
            <CarouselPrevious 
              className="left-2 sm:left-3 md:left-4 h-8 w-8 sm:h-10 sm:w-10 bg-white/90 hover:bg-white border-2 border-[#E31E24]/20 text-[#E31E24] hover:text-[#E31E24] transition-all duration-300"
            />
            <CarouselNext 
              className="right-2 sm:right-3 md:right-4 h-8 w-8 sm:h-10 sm:w-10 bg-white/90 hover:bg-white border-2 border-[#E31E24]/20 text-[#E31E24] hover:text-[#E31E24] transition-all duration-300"
            />
          </Carousel>
        </div>
      </div>
    </section>
  );
}
