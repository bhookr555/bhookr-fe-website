/**
 * Home Page Hero Slider Configuration
 */

export interface SlideConfig {
  id: number;
  image: string;
  mobileImage?: string; // Optional mobile-specific image
  alt: string;
}

export const HERO_SLIDES: SlideConfig[] = [
  {
    id: 1,
    image: "/slides/1.avif",
    mobileImage: "/slides/mobile1.avif",
    alt: "BHOOKR Slide 1"
  },
  {
    id: 2,
    image: "/slides/2.avif",
    mobileImage: "/slides/mobile2.avif",
    alt: "BHOOKR Slide 2"
  },
  {
    id: 3,
    image: "/slides/3.avif",
    mobileImage: "/slides/mobile3.avif",
    alt: "BHOOKR Slide 3"
  }
];

export const HERO_SLIDER_CONFIG = {
  autoPlayInterval: 5000, // milliseconds
  transitionDuration: 500 // milliseconds
} as const;

/**
 * Home Page Section Titles
 */
export const HOME_SECTIONS = {
  socialProof: {
    title: "Real Results, Real",
    highlight: "People",
    description: "See how BHOOKR is transforming lives across Hyderabad"
  },
  features: {
    title: "Why Choose",
    highlight: "BHOOKR",
    description: "Experience the perfect blend of convenience, quality, and taste"
  },
  pricing: {
    title: "Choose Your Plan",
    description: "Flexible subscription plans to fit your lifestyle"
  },
  testimonials: {
    title: "Look At What Our",
    highlight: "People Saying",
    description: "Real stories from real people who transformed their lives with BHOOKR"
  },
  cta: {
    title: "Ready to Start Your Journey?",
    description: "Join thousands of happy customers enjoying fresh, delicious meals every day. Start your food subscription today!",
    buttonText: "Get Started Today"
  }
} as const;

