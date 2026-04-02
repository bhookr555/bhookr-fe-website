import type { 
  SubscriptionPlan, 
  Goal, 
  DietType, 
  FoodPreference, 
  ActivityLevel, 
  SubscriptionDuration 
} from "@/types/subscription";
import { Target, Heart, Dumbbell, Trophy, Beef, Salad, Egg, Leaf, Croissant, Apple, Pizza, Carrot } from "lucide-react";

/**
 * Subscription Plans Configuration
 */
export const SUBSCRIPTION_PLANS: SubscriptionPlan[] = [
  {
    id: "lite",
    name: "BHOOKR LITE PLAN",
    type: "lite",
    mealsPerDay: 1,
    pricePerMeal: 209,
    features: [
      "High Protein",
      "Customization",
      "Single meal per day",
      "Basic nutritional guidance",
      "Mobile app access",
    ],
  },
  {
    id: "standard",
    name: "BHOOKR STANDARD PLAN",
    type: "standard",
    mealsPerDay: 2,
    pricePerMeal: 189,
    features: [
      "High Protein & Fibre",
      "Full Customization",
      "Two meals per day",
      "Nutritional support",
      "Priority customer service",
      "Weekly progress tracking",
    ],
    popular: true,
  },
  {
    id: "elite",
    name: "BHOOKR ELITE PLAN",
    type: "elite",
    mealsPerDay: 3,
    pricePerMeal: 169,
    features: [
      "High Protein & Fibre",
      "Premium Customization",
      "Three meals per day",
      "Dedicated nutritionist",
      "Quantity Adjustment",
      "Elite membership benefits",
      "Free delivery within 3Km",
      "24/7 customer support",
    ],
  },
];

/**
 * Fitness Goals
 */
export const FITNESS_GOALS: Array<{ value: Goal; label: string; description: string; icon: typeof Target }> = [
  {
    value: "weight_loss",
    label: "Weight Loss",
    description: "Achieve your target weight with calorie-controlled meals",
    icon: Target,
  },
  {
    value: "balanced_diet",
    label: "Balanced Diet",
    description: "Maintain a healthy lifestyle with balanced nutrition",
    icon: Heart,
  },
  {
    value: "gain_muscle",
    label: "Gain Muscle",
    description: "Build muscle mass with high-protein meals",
    icon: Dumbbell,
  },
  {
    value: "sport_specific",
    label: "Sport Specific",
    description: "Optimized nutrition for athletic performance",
    icon: Trophy,
  },
];

/**
 * Diet Types
 */
export const DIET_TYPES: Array<{ value: DietType; label: string; description: string; icon: typeof Croissant }> = [
  {
    value: "low_carb_high_protein",
    label: "Low Carb & High Protein",
    description: "Maximize protein, minimize carbs for faster results",
    icon: Beef,
  },
  {
    value: "balanced_meal",
    label: "Balanced Meal",
    description: "Equal portions of protein, carbs, and healthy fats",
    icon: Apple,
  },
  {
    value: "ketogenic",
    label: "Ketogenic Diet",
    description: "High fat, very low carb for ketosis",
    icon: Pizza,
  },
  {
    value: "salads",
    label: "Fresh Salads",
    description: "Light, fresh, and nutrient-dense salad bowls",
    icon: Salad,
  },
  {
    value: "muscle_gain",
    label: "Muscle Gain / Athletic Style",
    description: "High protein meals designed for muscle building",
    icon: Dumbbell,
  },
  {
    value: "mass_bowls",
    label: "Mass Bowls (High in Carbs)",
    description: "High carb meals for weight gain and energy",
    icon: Pizza,
  },
];

/**
 * Food Preferences
 */
export const FOOD_PREFERENCES: Array<{ value: FoodPreference; label: string; description: string; icon: typeof Beef }> = [
  {
    value: "non_veg",
    label: "Non-Vegetarian",
    description: "Includes chicken, fish, and meat options",
    icon: Beef,
  },
  {
    value: "veg",
    label: "Vegetarian",
    description: "Plant-based with dairy products",
    icon: Carrot,
  },
  {
    value: "eggtarian",
    label: "Eggtarian",
    description: "Vegetarian diet including eggs",
    icon: Egg,
  },
  {
    value: "vegan",
    label: "Vegan",
    description: "100% plant-based, no animal products",
    icon: Leaf,
  },
];

/**
 * Activity Levels
 */
export const ACTIVITY_LEVELS: Array<{ value: ActivityLevel; label: string; description: string }> = [
  {
    value: "sedentary",
    label: "Sedentary",
    description: "Little to no exercise (desk job)",
  },
  {
    value: "moderately",
    label: "Moderately Active",
    description: "Light exercise 1-3 days per week",
  },
  {
    value: "active",
    label: "Active",
    description: "Moderate exercise 3-5 days per week",
  },
  {
    value: "others",
    label: "Very Active",
    description: "Heavy exercise 6-7 days per week",
  },
];

/**
 * Subscription Durations
 */
export const SUBSCRIPTION_DURATIONS: Array<{ 
  value: SubscriptionDuration; 
  label: string; 
  days: number;
  badge?: string;
}> = [
  {
    value: "7_days",
    label: "Try 1 week trial plan",
    days: 7,
  },
  {
    value: "monthly",
    label: "1 Month",
    days: 30,
  },
];

/**
 * Meal Selection Options
 */
export const SINGLE_MEAL_OPTIONS = [
  { value: "breakfast", label: "Breakfast" },
  { value: "lunch", label: "Lunch" },
  { value: "dinner", label: "Dinner" },
] as const;

export const TWO_MEAL_OPTIONS = [
  { value: "breakfast_lunch", label: "Breakfast + Lunch" },
  { value: "breakfast_dinner", label: "Breakfast + Dinner" },
  { value: "lunch_dinner", label: "Lunch + Dinner" },
] as const;

/**
 * Pricing matrix based on diet type and food preference (1 month / 30 days)
 * Values are for individual meals: breakfast, lunch, dinner, or all 3 meals
 */
interface MealPricing {
  breakfast: number;
  lunch: number;
  dinner: number;
  threeMeal: number;
}

const DIET_PRICING_MATRIX: Record<string, Record<string, MealPricing>> = {
  low_carb_high_protein: {
    veg: { breakfast: 4899, lunch: 6199, dinner: 4999, threeMeal: 16997 },
    non_veg: { breakfast: 4899, lunch: 6599, dinner: 5499, threeMeal: 16997 },
    eggtarian: { breakfast: 4899, lunch: 5130, dinner: 4999, threeMeal: 15028 },
    vegan: { breakfast: 4899, lunch: 5469, dinner: 4589, threeMeal: 14897 },
  },
  balanced_meal: {
    veg: { breakfast: 4714, lunch: 5799, dinner: 4999, threeMeal: 15512 },
    non_veg: { breakfast: 4999, lunch: 6799, dinner: 4999, threeMeal: 16797 },
    eggtarian: { breakfast: 4999, lunch: 5460, dinner: 4799, threeMeal: 15258 },
    vegan: { breakfast: 4799, lunch: 5899, dinner: 4589, threeMeal: 15297 },
  },
  ketogenic: {
    veg: { breakfast: 6000, lunch: 7500, dinner: 7500, threeMeal: 21000 },
    non_veg: { breakfast: 6000, lunch: 7500, dinner: 7500, threeMeal: 21000 },
    eggtarian: { breakfast: 6000, lunch: 7500, dinner: 7500, threeMeal: 21000 },
    vegan: { breakfast: 0, lunch: 0, dinner: 0, threeMeal: 0 }, // Not available
  },
  muscle_gain: {
    veg: { breakfast: 0, lunch: 0, dinner: 0, threeMeal: 0 }, // Not available
    non_veg: { breakfast: 5130, lunch: 7499, dinner: 4999, threeMeal: 16999 },
    eggtarian: { breakfast: 0, lunch: 0, dinner: 0, threeMeal: 0 }, // Not available
    vegan: { breakfast: 0, lunch: 0, dinner: 0, threeMeal: 0 }, // Not available
  },
  mass_bowls: {
    veg: { breakfast: 4999, lunch: 6999, dinner: 5299, threeMeal: 16899 },
    non_veg: { breakfast: 5130, lunch: 7399, dinner: 4999, threeMeal: 17528 },
    eggtarian: { breakfast: 5130, lunch: 6420, dinner: 5499, threeMeal: 16699 },
    vegan: { breakfast: 0, lunch: 0, dinner: 0, threeMeal: 0 }, // Not available
  },
  salads: {
    veg: { breakfast: 4399, lunch: 4399, dinner: 4399, threeMeal: 13197 },
    non_veg: { breakfast: 5499, lunch: 5499, dinner: 5499, threeMeal: 16497 },
    eggtarian: { breakfast: 4799, lunch: 4799, dinner: 4799, threeMeal: 14397 },
    vegan: { breakfast: 4499, lunch: 4499, dinner: 4499, threeMeal: 13497 },
  },
};

/**
 * Pricing matrix for 7-day trial plan
 * Values are for individual meals: breakfast, lunch, dinner, or 2-meal/3-meal packages
 * Note: Salads are NOT available for 7-day trial
 */
const DIET_PRICING_7_DAYS: Record<string, Record<string, MealPricing>> = {
  low_carb_high_protein: {
    veg: { breakfast: 1274, lunch: 1512, dinner: 1232, threeMeal: 3849 },
    non_veg: { breakfast: 1211, lunch: 1533, dinner: 1351, threeMeal: 4089 },
    eggtarian: { breakfast: 1211, lunch: 1267, dinner: 1232, threeMeal: 3699 },
    vegan: { breakfast: 1162, lunch: 1351, dinner: 1162, threeMeal: 3669 },
  },
  balanced_meal: {
    veg: { breakfast: 1169, lunch: 1421, dinner: 1232, threeMeal: 3819 },
    non_veg: { breakfast: 1232, lunch: 1582, dinner: 1232, threeMeal: 4039 },
    eggtarian: { breakfast: 1232, lunch: 1344, dinner: 1183, threeMeal: 3749 },
    vegan: { breakfast: 1183, lunch: 1442, dinner: 1141, threeMeal: 3759 },
  },
  ketogenic: {
    veg: { breakfast: 1470, lunch: 1750, dinner: 1750, threeMeal: 4969 },
    non_veg: { breakfast: 1400, lunch: 1750, dinner: 1750, threeMeal: 4899 },
    eggtarian: { breakfast: 1400, lunch: 1750, dinner: 1750, threeMeal: 4899 },
    vegan: { breakfast: 0, lunch: 0, dinner: 0, threeMeal: 0 }, // Not available
  },
  muscle_gain: {
    veg: { breakfast: 0, lunch: 0, dinner: 0, threeMeal: 0 }, // Not available
    non_veg: { breakfast: 1267, lunch: 1750, dinner: 1232, threeMeal: 4249 },
    eggtarian: { breakfast: 0, lunch: 0, dinner: 0, threeMeal: 0 }, // Not available
    vegan: { breakfast: 0, lunch: 0, dinner: 0, threeMeal: 0 }, // Not available
  },
  mass_bowls: {
    veg: { breakfast: 1232, lunch: 1701, dinner: 1302, threeMeal: 4229 },
    non_veg: { breakfast: 1207, lunch: 1722, dinner: 1232, threeMeal: 4159 },
    eggtarian: { breakfast: 1207, lunch: 1568, dinner: 1351, threeMeal: 4119 },
    vegan: { breakfast: 0, lunch: 0, dinner: 0, threeMeal: 0 }, // Not available
  },
  salads: {
    veg: { breakfast: 0, lunch: 0, dinner: 0, threeMeal: 0 }, // Not available for 7-day trial
    non_veg: { breakfast: 0, lunch: 0, dinner: 0, threeMeal: 0 }, // Not available for 7-day trial
    eggtarian: { breakfast: 0, lunch: 0, dinner: 0, threeMeal: 0 }, // Not available for 7-day trial
    vegan: { breakfast: 0, lunch: 0, dinner: 0, threeMeal: 0 }, // Not available for 7-day trial
  },
};

/**
 * Calculate total subscription price based on diet type, food preference, plan type, and duration
 * @param mealSelection - For Standard plan: which 2 meals (breakfast_lunch, breakfast_dinner, lunch_dinner)
 *                        For Lite plan: which single meal (breakfast, lunch, or dinner)
 */
export function calculateSubscriptionPrice(
  planType: "lite" | "standard" | "elite",
  duration: SubscriptionDuration,
  dietType: DietType = "balanced_meal",
  foodPreference: FoodPreference = "veg",
  mealSelection?: "breakfast_lunch" | "breakfast_dinner" | "lunch_dinner" | "breakfast" | "lunch" | "dinner"
): { itemAmount: number } {
  const plan = SUBSCRIPTION_PLANS.find((p) => p.type === planType);
  const durationConfig = SUBSCRIPTION_DURATIONS.find((d) => d.value === duration);

  if (!plan || !durationConfig) {
    return { itemAmount: 0 };
  }

  // For 7-day trial, use special pricing with meal selection support
  if (duration === "7_days") {
    const mealPricing = DIET_PRICING_7_DAYS[dietType]?.[foodPreference];
    
    if (!mealPricing || mealPricing.threeMeal === 0) {
      return { itemAmount: 0 };
    }
    
    let itemAmount = 0;

    if (planType === "elite") {
      // Elite plan: 3 meals (breakfast + lunch + dinner)
      itemAmount = mealPricing.threeMeal;
    } else if (planType === "standard") {
      // Standard plan: 2 meals - calculate based on user selection
      const combo = mealSelection || "lunch_dinner"; // Default to lunch + dinner
      
      if (combo === "breakfast_lunch") {
        itemAmount = mealPricing.breakfast + mealPricing.lunch;
      } else if (combo === "breakfast_dinner") {
        itemAmount = mealPricing.breakfast + mealPricing.dinner;
      } else if (combo === "lunch_dinner") {
        itemAmount = mealPricing.lunch + mealPricing.dinner;
      }
    } else if (planType === "lite") {
      // Lite plan: 1 meal - calculate based on user selection
      const meal = mealSelection || "lunch"; // Default to lunch
      
      if (meal === "breakfast") {
        itemAmount = mealPricing.breakfast;
      } else if (meal === "lunch") {
        itemAmount = mealPricing.lunch;
      } else if (meal === "dinner") {
        itemAmount = mealPricing.dinner;
      }
    }

    return { itemAmount };
  }

  // Get meal pricing for 1 month (30 days) from the pricing matrix
  const mealPricing = DIET_PRICING_MATRIX[dietType]?.[foodPreference];
  
  if (!mealPricing || mealPricing.threeMeal === 0) {
    // Diet type + food preference combination not available
    return { itemAmount: 0 };
  }

  // For monthly duration, use meal-specific pricing
  if (duration === "monthly") {
    let itemAmount = 0;

    if (planType === "elite") {
      // Elite plan: 3 meals (breakfast + lunch + dinner)
      itemAmount = mealPricing.threeMeal;
    } else if (planType === "standard") {
      // Standard plan: 2 meals - calculate based on user selection
      const combo = mealSelection || "lunch_dinner"; // Default to lunch + dinner
      
      if (combo === "breakfast_lunch") {
        itemAmount = mealPricing.breakfast + mealPricing.lunch;
      } else if (combo === "breakfast_dinner") {
        itemAmount = mealPricing.breakfast + mealPricing.dinner;
      } else if (combo === "lunch_dinner") {
        itemAmount = mealPricing.lunch + mealPricing.dinner;
      }
    } else if (planType === "lite") {
      // Lite plan: 1 meal - calculate based on user selection
      const meal = mealSelection || "lunch"; // Default to lunch
      
      if (meal === "breakfast") {
        itemAmount = mealPricing.breakfast;
      } else if (meal === "lunch") {
        itemAmount = mealPricing.lunch;
      } else if (meal === "dinner") {
        itemAmount = mealPricing.dinner;
      }
    }

    return { itemAmount };
  }

  // For other durations, calculate proportionally
  // This is a fallback for custom durations if added in the future
  let monthlyPrice = 0;
  
  if (planType === "elite") {
    monthlyPrice = mealPricing.threeMeal;
  } else if (planType === "standard") {
    const combo = mealSelection || "lunch_dinner";
    if (combo === "breakfast_lunch") {
      monthlyPrice = mealPricing.breakfast + mealPricing.lunch;
    } else if (combo === "breakfast_dinner") {
      monthlyPrice = mealPricing.breakfast + mealPricing.dinner;
    } else {
      monthlyPrice = mealPricing.lunch + mealPricing.dinner;
    }
  } else {
    const meal = mealSelection || "lunch";
    if (meal === "breakfast") {
      monthlyPrice = mealPricing.breakfast;
    } else if (meal === "lunch") {
      monthlyPrice = mealPricing.lunch;
    } else {
      monthlyPrice = mealPricing.dinner;
    }
  }
  
  const itemAmount = Math.round((monthlyPrice / 30) * durationConfig.days);

  return { itemAmount };
}

/**
 * Check if a diet type and food preference combination is available
 */
export function isDietFoodCombinationAvailable(
  dietType: DietType,
  foodPreference: FoodPreference
): boolean {
  const mealPricing = DIET_PRICING_MATRIX[dietType]?.[foodPreference];
  return mealPricing !== undefined && mealPricing.threeMeal > 0;
}

/**
 * Get available food preferences for a given diet type
 */
export function getAvailableFoodPreferences(dietType: DietType): FoodPreference[] {
  const preferences = DIET_PRICING_MATRIX[dietType];
  if (!preferences) return [];
  
  return Object.keys(preferences).filter(
    (pref) => {
      const mealPricing = preferences[pref];
      return mealPricing !== undefined && mealPricing.threeMeal > 0;
    }
  ) as FoodPreference[];
}

/**
 * Calculate BMI
 */
export function calculateBMI(weight: number, height: number): number {
  const heightInMeters = height / 100;
  return Number((weight / (heightInMeters * heightInMeters)).toFixed(1));
}

/**
 * Get BMI category
 */
export function getBMICategory(bmi: number): string {
  if (bmi < 18.5) return "Underweight";
  if (bmi < 25) return "Normal weight";
  if (bmi < 30) return "Overweight";
  return "Obese";
}

/**
 * Calculate recommended daily calories
 */
export function calculateDailyCalories(
  weight: number,
  height: number,
  age: number,
  gender: "male" | "female" | "other",
  activityLevel: ActivityLevel,
  goal: Goal
): number {
  // Using Mifflin-St Jeor Equation
  let bmr: number;
  
  if (gender === "male") {
    bmr = 10 * weight + 6.25 * height - 5 * age + 5;
  } else {
    bmr = 10 * weight + 6.25 * height - 5 * age - 161;
  }

  // Activity multipliers
  const activityMultipliers = {
    sedentary: 1.2,
    moderately: 1.375,
    active: 1.55,
    others: 1.725,
  };

  const tdee = bmr * activityMultipliers[activityLevel];

  // Goal adjustments
  const goalAdjustments = {
    weight_loss: -500,
    balanced_diet: 0,
    gain_muscle: 300,
    sport_specific: 200,
  };

  return Math.round(tdee + goalAdjustments[goal]);
}
