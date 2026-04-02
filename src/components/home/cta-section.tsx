"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { HOME_SECTIONS } from "@/constants";

/**
 * Responsive call-to-action section with mobile-first design
 * Optimized button sizing and spacing for all devices
 */
export function CTASection() {
  const { cta } = HOME_SECTIONS;

  return (
    <section className="relative w-full overflow-hidden bg-gradient-to-r from-[#E31E24] to-[#C41E3A] text-white">
      <div className="absolute inset-0 bg-gradient-to-br from-red-600/5 via-transparent to-orange-600/5" />
      <div className="relative z-10 container-responsive section-padding">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="mx-auto flex max-w-3xl flex-col items-center text-center px-2 sm:px-4"
        >
          <h2 className="mb-3 sm:mb-4 md:mb-5 lg:mb-6 leading-tight">
            {cta.title}
          </h2>
          <p className="mb-5 sm:mb-6 md:mb-7 lg:mb-8 xl:mb-10 text-white/90 leading-relaxed max-w-2xl">
            {cta.description}
          </p>
          <Button
            asChild
            size="lg"
            className="bg-white text-[#E31E24] hover:bg-gray-100 active:bg-gray-200 font-bold px-6 sm:px-7 md:px-8 lg:px-10 xl:px-12 py-4 sm:py-5 md:py-6 text-sm sm:text-base md:text-lg lg:text-xl transition-all duration-300 shadow-2xl hover:shadow-white/30 hover:scale-105 active:scale-95 touch-manipulation min-h-[52px] sm:min-h-[56px] md:min-h-[60px]"
          >
            <Link href="/subscribe" className="flex items-center gap-2 sm:gap-3">
              <span className="whitespace-nowrap">{cta.buttonText}</span> 
              <ArrowRight className="h-4 w-4 sm:h-5 sm:w-5 md:h-6 md:w-6 shrink-0" />
            </Link>
          </Button>
        </motion.div>
      </div>
    </section>
  );
}
