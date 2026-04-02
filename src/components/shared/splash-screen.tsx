"use client";

import React, { useEffect, useState } from "react";
import Image from "next/image";

interface SplashScreenProps {
  duration?: number;
  onComplete?: () => void;
}

/**
 * SplashScreen - Industry-standard minimal splash screen
 * 
 * Clean, professional design following modern app standards:
 * - Centered logo with subtle fade-in
 * - Simple spinner indicator
 * - Smooth fade-out transition
 * 
 * @param duration - Display duration in milliseconds (default: 2500ms)
 * @param onComplete - Callback when animation completes
 */
export function SplashScreen({ duration = 2500, onComplete }: SplashScreenProps) {
  const [isVisible, setIsVisible] = useState(true);
  const [shouldRender, setShouldRender] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false);
      
      // Wait for fade-out to complete
      setTimeout(() => {
        setShouldRender(false);
        onComplete?.();
      }, 600);
    }, duration);

    return () => clearTimeout(timer);
  }, [duration, onComplete]);

  if (!shouldRender) return null;

  return (
    <div 
      className={`
        fixed inset-0 z-[9999] 
        bg-white dark:bg-gray-950
        flex flex-col items-center justify-center
        transition-opacity duration-500
        ${isVisible ? 'opacity-100' : 'opacity-0'}
      `}
      role="dialog"
      aria-label="Loading"
    >
      {/* Logo */}
      <div className="splash-logo-fade mb-12">
        <Image
          src="/finalred.png"
          alt="BHOOKR"
          width={400}
          height={125}
          priority
          className="w-auto h-auto max-w-[280px] sm:max-w-[350px] md:max-w-[400px]"
          quality={100}
        />
      </div>

      {/* Spinner */}
      <div className="relative w-12 h-12" role="status" aria-live="polite">
        <div className="absolute inset-0 border-4 border-gray-200 dark:border-gray-800 rounded-full"></div>
        <div className="absolute inset-0 border-4 border-transparent border-t-[#E31E24] rounded-full splash-spinner-ring"></div>
        <span className="sr-only">Loading...</span>
      </div>
    </div>
  );
}

export default SplashScreen;
