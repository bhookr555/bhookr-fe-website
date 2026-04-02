"use client";

import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SectionHeader } from "@/components/shared/section-header";
import { DynamicIcon } from "@/components/shared/dynamic-icon";
import { FEATURES, HOME_SECTIONS, getStaggeredAnimation } from "@/constants";

/**
 * Responsive features section with mobile-first grid layout
 * Mobile: 1 column
 * Tablet: 2 columns
 * Desktop: 3-4 columns
 */
export function FeaturesSection() {
  const { features } = HOME_SECTIONS;

  return (
    <section className="w-full border-y border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
      <div className="container-responsive section-padding">
        <SectionHeader
          title={features.title}
          highlight={features.highlight}
          description={features.description}
        />

        <div className="grid-responsive-4">
          {FEATURES.map((feature, index) => (
            <motion.div key={index} {...getStaggeredAnimation(index)}>
              <Card className="card-hover h-full border-2 hover:border-[#E31E24] bg-white dark:bg-gray-900 flex flex-col transition-shadow duration-300">
                <CardHeader className="flex-grow p-4 sm:p-5 md:p-6">
                  <div className="mb-3 sm:mb-4 flex h-12 w-12 sm:h-14 sm:w-14 md:h-16 md:w-16 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30">
                    <DynamicIcon
                      name={feature.icon}
                      className="h-6 w-6 sm:h-8 sm:w-8 md:h-10 md:w-10 text-[#E31E24]"
                    />
                  </div>
                  <CardTitle className="text-base sm:text-lg md:text-xl min-h-[2.5rem] sm:min-h-[3rem] flex items-center">
                    {feature.title}
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0 p-4 sm:p-5 md:p-6">
                  <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400">
                    {feature.description}
                  </p>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
