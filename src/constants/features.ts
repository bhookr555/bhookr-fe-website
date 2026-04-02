/**
 * Features Configuration
 */

export interface Feature {
  icon: string; // Icon name (to be used with lucide-react)
  title: string;
  description: string;
}

export const FEATURES: Feature[] = [
  {
    icon: "Truck",
    title: "Fresh & Hygienic Meals",
    description: "Delivered to your doorstep",
  },
  {
    icon: "Sparkles",
    title: "High in Protein",
    description: "Power-packed nutrition",
  },
  {
    icon: "ChefHat",
    title: "Customization Like No One Does",
    description: "Tailored to your needs",
  },
  {
    icon: "CheckCircle",
    title: "Nutritional Support",
    description: "Expert guidance included",
  },
  {
    icon: "Clock",
    title: "Flexible Services",
    description: "Pause, skip, or cancel anytime",
  },
  {
    icon: "ChefHat",
    title: "Traditional Healthy Meals",
    description: "Break from conventional diets",
  },
  {
    icon: "Sparkles",
    title: "Calorie Counted Meals",
    description: "Precision in every plate",
  },
  {
    icon: "CheckCircle",
    title: "Experience to Believe",
    description: "You need to try to know us",
  },
];

/**
 * Icon mapping for features
 */
export const FEATURE_ICON_SIZE = {
  height: 10,
  width: 10
} as const;
