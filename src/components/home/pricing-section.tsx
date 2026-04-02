"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { SectionHeader } from "@/components/shared/section-header";
import { FeatureList } from "@/components/shared/feature-list";
import {
  PRICING_PLANS,
  POPULAR_PLAN_BADGE_TEXT,
  HOME_SECTIONS,
  getStaggeredAnimation,
} from "@/constants";

/**
 * Responsive pricing section with mobile-first card layout
 * Mobile: Stacked cards
 * Tablet+: 3-column grid with popular plan emphasis
 */
export function PricingSection() {
  const { pricing } = HOME_SECTIONS;

  return (
    <section className="w-full bg-white dark:bg-gray-900">
      <div className="container-responsive section-padding">
        <SectionHeader title={pricing.title} description={pricing.description} />

        <div className="mx-auto grid max-w-6xl gap-5 sm:gap-6 md:gap-7 lg:gap-8 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          {PRICING_PLANS.map((plan, index) => (
            <motion.div key={index} {...getStaggeredAnimation(index)}>
              <Card
                className={`card-hover h-full relative overflow-hidden transition-all duration-300 ${
                  plan.popular
                    ? "border-2 border-[#E31E24] shadow-2xl shadow-red-500/20 md:scale-105"
                    : "border-2 border-gray-200 dark:border-gray-700"
                }`}
              >
                {plan.popular && (
                  <div className="absolute top-0 right-0 bg-gradient-to-r from-[#E31E24] to-[#C41E3A] px-4 sm:px-6 py-1.5 sm:py-2 text-xs sm:text-sm font-bold text-white rounded-bl-lg shadow-lg">
                    {POPULAR_PLAN_BADGE_TEXT}
                  </div>
                )}

                <CardHeader className="pt-8 sm:pt-10 p-4 sm:p-6">
                  <CardTitle className="text-lg sm:text-xl md:text-2xl mb-2">
                    {plan.name}
                  </CardTitle>
                  <div className="mt-4 sm:mt-6">
                    <span className="text-3xl sm:text-4xl md:text-5xl font-bold text-[#E31E24]">
                      ₹{plan.price}
                    </span>
                    <span className="text-sm sm:text-base text-gray-500 dark:text-gray-400 ml-2">
                      {plan.duration}
                    </span>
                  </div>
                </CardHeader>

                <CardContent className="pt-4 sm:pt-6 p-4 sm:p-6">
                  <FeatureList features={plan.features} />

                  <Button
                    asChild
                    className={`w-full font-semibold py-5 sm:py-6 text-sm sm:text-base transition-all duration-300 mt-4 ${
                      plan.popular
                        ? "bg-[#E31E24] hover:bg-[#C41E3A] text-white shadow-lg hover:shadow-xl hover:scale-105"
                        : "border-2 border-[#E31E24] text-[#E31E24] hover:bg-[#E31E24] hover:text-white"
                    }`}
                    variant={plan.popular ? "default" : "outline"}
                  >
                    <Link href="/subscribe">Subscribe Now</Link>
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
