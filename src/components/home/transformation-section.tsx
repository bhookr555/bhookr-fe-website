"use client";

import React from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ClientTransformation } from "@/components/home/client-transformation";
import { SectionHeader } from "@/components/shared/section-header";
import Image from "next/image";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselPrevious,
  CarouselNext,
  type CarouselApi
} from "@/components/ui/carousel";
import {
  CLIENT_TRANSFORMATIONS,
  TRUST_BADGES,
  HOME_SECTIONS,
  HERO_SLIDER_CONFIG,
} from "@/constants";
import Autoplay from "embla-carousel-autoplay";

/**
 * Responsive transformation showcase with shadcn carousel
 * Touch-friendly controls and indicators
 */
export function TransformationSection() {
  const { socialProof } = HOME_SECTIONS;
  
  const [, setApi] = React.useState<CarouselApi>();

  const plugin = React.useRef(
    Autoplay({ delay: HERO_SLIDER_CONFIG.autoPlayInterval, stopOnInteraction: true })
  );

  if (CLIENT_TRANSFORMATIONS.length === 0) return null;

  return (
    <section className="w-full bg-white dark:bg-gray-900">
      <div className="container-responsive section-padding">
        <SectionHeader
          title={socialProof.title}
          highlight={socialProof.highlight}
          description={socialProof.description}
        />

        <div className="relative">
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
              {CLIENT_TRANSFORMATIONS.map((transformation, index) => (
                <CarouselItem key={index}>
                  <ClientTransformation
                    {...transformation}
                    index={index}
                  />
                </CarouselItem>
              ))}
            </CarouselContent>
            
            <CarouselPrevious 
              className="left-2 sm:left-3 md:left-4 lg:left-6 h-11 w-11 sm:h-12 sm:w-12 md:h-14 md:w-14 bg-white/90 hover:bg-white border-2 border-[#E31E24]/20 text-[#E31E24] hover:text-[#E31E24] shadow-md hover:shadow-lg transition-all duration-300 touch-manipulation"
              aria-label="Previous transformation"
            />
            <CarouselNext 
              className="right-2 sm:right-3 md:right-4 lg:right-6 h-11 w-11 sm:h-12 sm:w-12 md:h-14 md:w-14 bg-white/90 hover:bg-white border-2 border-[#E31E24]/20 text-[#E31E24] hover:text-[#E31E24] shadow-md hover:shadow-lg transition-all duration-300 touch-manipulation"
              aria-label="Next transformation"
            />
          </Carousel>

          {/* Trust Badges - Mobile-first responsive layout */}
          <div className="mt-4 sm:mt-6 md:mt-8 lg:mt-10 flex flex-wrap items-center justify-center gap-3 sm:gap-4 md:gap-6 lg:gap-8 xl:gap-12">
            {TRUST_BADGES.map((badge, idx) => (
              <React.Fragment key={idx}>
                <div className="text-center px-1 sm:px-2 lg:px-0">
                  <p className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-black text-[#E31E24]">
                    {badge.value}
                  </p>
                  <p className="text-xs sm:text-sm md:text-base text-gray-600 dark:text-gray-400 font-medium whitespace-nowrap">
                    {badge.label}
                  </p>
                </div>
                {idx < TRUST_BADGES.length - 1 && (
                  <div className="hidden md:block h-8 sm:h-10 lg:h-12 w-px bg-gray-300 dark:bg-gray-600" />
                )}
              </React.Fragment>
            ))}
          </div>

          {/* CTA Button - Outside Carousel */}
          <div className="mt-8 sm:mt-10 md:mt-12 lg:mt-14 flex justify-center">
            <motion.div
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="w-full max-w-md"
            >
              <Button 
                size="lg"
                onClick={() => {
                  const phoneNumber = "9542762906";
                  const message = "Hi, I would like to book a free consultation from BHOOKR website";
                  const whatsappUrl = `https://wa.me/${phoneNumber}?text=${encodeURIComponent(message)}`;
                  window.open(whatsappUrl, "_blank", "noopener,noreferrer");
                }}
                className="w-full bg-[#E31E24] hover:bg-[#C41E3A] text-white font-black text-base sm:text-lg md:text-xl py-5 sm:py-6 md:py-8 transition-all duration-300 shadow-2xl hover:shadow-red-500/50 cursor-pointer flex items-center justify-center gap-2 sm:gap-3"
              >
                <Image
                  src="https://upload.wikimedia.org/wikipedia/commons/6/6b/WhatsApp.svg"
                  alt="WhatsApp"
                  width={24}
                  height={24}
                  className="w-5 h-5 sm:w-6 sm:h-6"
                />
                <span className="hidden sm:inline">BOOK A FREE CONSULTATION</span>
                <span className="sm:hidden">FREE CONSULTATION</span>
              </Button>
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  );
}
