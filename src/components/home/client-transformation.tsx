"use client";

import Image from "next/image";
import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { useState } from "react";

interface ClientTransformationProps {
  beforeImage?: string;
  afterImage?: string;
  clientName?: string;
  clientRole?: string;
  weightLoss?: string;
  days?: string;
  rating?: string;
  testimonial?: string;
  index: number;
}

export function ClientTransformation({
  beforeImage = '/transformations/placeholder-before.jpg',
  afterImage = '/transformations/placeholder-after.jpg',
  clientName = 'Anonymous',
  clientRole = 'BHOOKR Client',
  weightLoss = 'N/A',
  days = 'N/A',
  rating = '5.0',
  testimonial = 'Amazing transformation journey with BHOOKR!',
  index,
}: ClientTransformationProps) {
  const isEven = index % 2 === 0;
  const [isExpanded, setIsExpanded] = useState(false);
  const isLongText = testimonial.length > 200;

  return (
    <div className="space-y-8">
      <div className="grid lg:grid-cols-2 gap-6 sm:gap-8 lg:gap-12 items-center">
        {/* Left Side: Before & After Images */}
        <motion.div
          initial={{ x: isEven ? -50 : 50, opacity: 0 }}
          whileInView={{ x: 0, opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className={`relative ${isEven ? 'lg:order-1' : 'lg:order-2'}`}
        >
          <div className="grid grid-cols-2 gap-3 sm:gap-4">
            {/* Before Image */}
            <div className="relative">
              <div className="absolute top-2 sm:top-4 left-2 sm:left-4 z-10 bg-gray-800/90 text-white px-2 sm:px-4 py-1 sm:py-2 rounded-lg font-bold text-xs sm:text-sm">
                BEFORE
              </div>
              <div className="relative aspect-[3/4] rounded-xl sm:rounded-2xl overflow-hidden border-2 sm:border-4 border-gray-300 dark:border-gray-700">
                <Image
                  src={beforeImage}
                  alt={`${clientName} Before Transformation`}
                  fill
                  className="object-cover"
                  sizes="(max-width: 640px) 45vw, (max-width: 1024px) 35vw, 25vw"
                  quality={75}
                />
              </div>
            </div>
            
            {/* After Image */}
            <div className="relative">
              <div className="absolute top-2 sm:top-4 left-2 sm:left-4 z-10 bg-[#E31E24] text-white px-2 sm:px-4 py-1 sm:py-2 rounded-lg font-bold text-xs sm:text-sm">
                AFTER
              </div>
              <div className="relative aspect-[3/4] rounded-xl sm:rounded-2xl overflow-hidden border-2 sm:border-4 border-[#E31E24] shadow-xl sm:shadow-2xl shadow-red-500/30">
                <Image
                  src={afterImage}
                  alt={`${clientName} After Transformation`}
                  fill
                  className="object-cover"
                  sizes="(max-width: 640px) 45vw, (max-width: 1024px) 35vw, 25vw"
                  quality={75}
                />
              </div>
            </div>
          </div>
          
          {/* Stats Overlay */}
          <div className="mt-4 sm:mt-6 grid grid-cols-3 gap-2 sm:gap-4 text-center">
            <div className="bg-gradient-to-br from-red-50 to-white dark:from-gray-800 dark:to-gray-900 p-2 sm:p-4 rounded-lg sm:rounded-xl border-2 border-[#E31E24]/20">
              <p className="text-xl sm:text-2xl md:text-3xl font-black text-[#E31E24]">{weightLoss}</p>
              <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 font-medium">Weight Loss</p>
            </div>
            <div className="bg-gradient-to-br from-red-50 to-white dark:from-gray-800 dark:to-gray-900 p-2 sm:p-4 rounded-lg sm:rounded-xl border-2 border-[#E31E24]/20">
              <p className="text-xl sm:text-2xl md:text-3xl font-black text-[#E31E24]">{days}</p>
              <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 font-medium">Days</p>
            </div>
            <div className="bg-gradient-to-br from-red-50 to-white dark:from-gray-800 dark:to-gray-900 p-2 sm:p-4 rounded-lg sm:rounded-xl border-2 border-[#E31E24]/20">
              <p className="text-xl sm:text-2xl md:text-3xl font-black text-[#E31E24]">{rating}</p>
              <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 font-medium">Rating</p>
            </div>
          </div>
        </motion.div>

        {/* Right Side: Testimonial */}
        <motion.div
          initial={{ x: isEven ? 50 : -50, opacity: 0 }}
          whileInView={{ x: 0, opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className={`space-y-6 ${isEven ? 'lg:order-2' : 'lg:order-1'} flex flex-col`}
        >
          <Card className="border-2 border-[#E31E24]/20 shadow-xl flex-1">
            <CardContent className="p-4 sm:p-6 md:p-8 h-full flex flex-col justify-between min-h-[280px] sm:min-h-[320px] md:min-h-[360px]">
              <div className="space-y-4 sm:space-y-6 flex-1">
                {/* Quote Icon */}
                <div className="text-4xl sm:text-5xl md:text-6xl text-[#E31E24] leading-none">&quot;</div>
                
                {/* Testimonial Text */}
                <div className="space-y-2">
                  <div 
                    className={`text-base sm:text-lg md:text-xl text-gray-700 dark:text-gray-300 leading-relaxed transition-all duration-300 ${
                      !isExpanded && isLongText 
                        ? 'line-clamp-6 sm:line-clamp-7 md:line-clamp-8 overflow-hidden' 
                        : ''
                    }`}
                    dangerouslySetInnerHTML={{ __html: testimonial }}
                  />
                  
                  {/* Read More / Read Less Button */}
                  {isLongText && (
                    <button
                      onClick={() => setIsExpanded(!isExpanded)}
                      className="text-[#E31E24] hover:text-[#C41E3A] font-semibold text-sm sm:text-base transition-colors duration-200 flex items-center gap-1 mt-2"
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
              <div className="pt-3 sm:pt-4 border-t-2 border-gray-200 dark:border-gray-700 mt-auto">
                <p className="font-bold text-base sm:text-lg text-gray-900 dark:text-white">{clientName}</p>
                <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">{clientRole}</p>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
