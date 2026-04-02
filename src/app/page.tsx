"use client";

import { useState, useEffect } from "react";
import { Header } from "@/components/layouts/header";
import { Footer } from "@/components/layouts/footer";
import { SplashScreen } from "@/components/shared/splash-screen";
import { HeroSlider } from "@/components/home/hero-slider";
import { TransformationSection } from "@/components/home/transformation-section";
import { FeaturesSection } from "@/components/home/features-section";
import { PricingSection } from "@/components/home/pricing-section";
import { TestimonialsSection } from "@/components/home/testimonials-section";
import { CTASection } from "@/components/home/cta-section";

export default function HomePage() {
  const [showSplash, setShowSplash] = useState(true);

  useEffect(() => {
    // Check if splash has been shown in this session
    const splashShown = sessionStorage.getItem("splashShown");
    if (splashShown === "true") {
      setShowSplash(false);
    }
  }, []);

  const handleSplashComplete = () => {
    sessionStorage.setItem("splashShown", "true");
    setShowSplash(false);
  };

  return (
    <>
      {showSplash && <SplashScreen duration={2500} onComplete={handleSplashComplete} />}
      
      <div className="flex min-h-screen flex-col">
        <Header />
        
        <main className="flex-1 -mt-px">
          <HeroSlider />
          <TransformationSection />
          <FeaturesSection />
          <PricingSection />
          <TestimonialsSection />
          <CTASection />
        </main>
        
        <Footer />
      </div>
    </>
  );
}
