/**
 * Pricing Plans Configuration
 */

export interface PlanFeature {
  text: string;
  included: boolean;
}

export interface PricingPlan {
  name: string;
  price: number;
  duration: string;
  features: PlanFeature[];
  popular?: boolean;
  subtitle: string;
}

export const PRICING_PLANS: PricingPlan[] = [
  {
    name: "BHOOKR LITE PLAN",
    price: 209,
    duration: "single meal",
    features: [
      { text: "High Protein", included: true },
      { text: "Customization", included: true },
      { text: "Nutritional support", included: false },
      { text: "Quantity Adjustment", included: false },
      { text: "Elite membership", included: false },
    ],
    subtitle: "Perfect for light eaters or lunch only",
  },
  {
    name: "BHOOKR STANDARD PLAN",
    price: 189,
    duration: "two meal plan",
    features: [
      { text: "High Protein & Fibre", included: true },
      { text: "Customization", included: true },
      { text: "Nutritional support", included: false },
      { text: "Quantity Adjustment", included: false },
      { text: "Elite membership", included: false },
    ],
    popular: true,
    subtitle: "Our most popular plan for daily nutrition",
  },
  {
    name: "BHOOKR ELITE PLAN",
    price: 169,
    duration: "three meal plan",
    features: [
      { text: "High Protein & Fibre", included: true },
      { text: "Customization", included: true },
      { text: "Nutritional support", included: true },
      { text: "Quantity Adjustment", included: true },
      { text: "Elite membership", included: true },
      { text: "Free delivery within 3Km", included: true },
    ],
    subtitle: "Complete nutrition solution with all benefits",
  },
];

export const POPULAR_PLAN_BADGE_TEXT = "⭐ Most Popular";
