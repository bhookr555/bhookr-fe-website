import { z } from "zod";

/**
 * Subscription Form Validation Schemas
 * Enhanced for Google Sheets integration
 */

// Step 1: Personal Information
export const personalInfoSchema = z.object({
  fullName: z.string().min(2, "Full name must be at least 2 characters").max(100, "Full name is too long"),
  phoneNumber: z.string()
    .regex(/^[6-9]\d{9}$/, "Please enter a valid 10-digit Indian mobile number")
    .length(10, "Phone number must be 10 digits"),
  email: z.string().email("Please enter a valid email address"),
  age: z.number()
    .int("Age must be a whole number")
    .min(13, "You must be at least 13 years old")
    .max(120, "Please enter a valid age")
    .positive("Age must be a positive number"),
});

// Step 2: Physical Information
export const physicalInfoSchema = z.object({
  gender: z.enum(["male", "female", "other"], {
    message: "Please select your gender",
  }),
  height: z.number()
    .min(100, "Height must be at least 100 cm")
    .max(400, "Height must be less than 400 cm")
    .positive("Height must be a positive number"),
  weight: z.number()
    .min(30, "Weight must be at least 30 kg")
    .max(200, "Weight must be less than 200 kg")
    .positive("Weight must be a positive number"),
});

// Step 3: Goal Selection
export const goalSelectionSchema = z.object({
  goal: z.enum(["weight_loss", "balanced_diet", "gain_muscle", "sport_specific"], {
    message: "Please select your fitness goal",
  }),
});

// Step 4: Diet Type Selection
export const dietSelectionSchema = z.object({
  dietType: z.enum([
    "low_carb_high_protein",
    "salads",
    "ketogenic",
    "balanced_meal",
    "muscle_gain",
    "mass_bowls"
  ], {
    message: "Please select your preferred diet type",
  }),
});

// Step 5: Food Preference Selection
export const foodPreferenceSchema = z.object({
  foodPreference: z.enum(["veg", "non_veg", "vegan", "eggtarian"], {
    message: "Please select your food preference",
  }),
});

// Step 6: Activity Level and Subscription Type
export const activityAndDurationSchema = z.object({
  activityLevel: z.enum(["sedentary", "moderately", "active", "others"], {
    message: "Please select your activity level",
  }),
  duration: z.enum(["7_days", "monthly"], {
    message: "Please select subscription type",
  }),
});

// Step 7: Meal Plans and Start Date
export const planSelectionSchema = z.object({
  planType: z.enum(["lite", "standard", "elite"], {
    message: "Please select a plan type",
  }),
  startDate: z.date({
    message: "Please select a start date",
  }).refine((date) => {
    const minDate = new Date();
    minDate.setDate(minDate.getDate() + 2); // Minimum 2 days from today
    minDate.setHours(0, 0, 0, 0);
    return date >= minDate;
  }, "Start date must be at least 2 days from today. Today and tomorrow are not available."),
  selectedMeals: z.array(z.string()).optional(), // Track which specific meals user selected
});

// Step 8: Billing Details
export const billingDetailsSchema = z.object({
  address: z.string().min(10, "Please enter your complete address"),
  city: z.string().min(2, "Please enter your city"),
  state: z.string().min(2, "Please enter your state"),
  zipCode: z.string()
    .regex(/^\d{6}$/, "Please enter a valid 6-digit pincode")
    .length(6, "Pincode must be 6 digits"),
  country: z.string().default("India"),
});

// Complete Subscription Form Schema (for final submission)
export const subscriptionFormSchema = z.object({
  personalInfo: personalInfoSchema,
  physicalInfo: physicalInfoSchema,
  goalSelection: goalSelectionSchema,
  dietSelection: dietSelectionSchema,
  foodPreferenceSelection: foodPreferenceSchema,
  activityAndDuration: activityAndDurationSchema,
  planSelection: planSelectionSchema,
});

// Helper: Convert plan type to meal plans (fallback only)
function getPlanMeals(planType: string): string[] {
  switch (planType) {
    case 'lite':
      return ['Breakfast'];
    case 'standard':
      return ['Breakfast', 'Lunch'];
    case 'elite':
      return ['Breakfast', 'Lunch', 'Dinner'];
    default:
      return [];
  }
}

// Helper: Convert form data to Google Sheets format
export function convertToLeadData(formData: any): {
  name: string;
  email: string;
  phoneNumber: string;
  age: number;
  gender: string;
  height: number;
  weight: number;
  goal: string;
  diet: string;
  foodPreference: string;
  physicalState: string;
  subscriptionType: string;
  plan: string[];
  subscriptionStartDate: string;
} {
  // Use actual selected meals if available, otherwise fallback to plan type conversion
  const selectedMeals = formData.planSelection?.selectedMeals;
  const planType = formData.planSelection?.planType || '';
  const mealPlans = selectedMeals && selectedMeals.length > 0 
    ? selectedMeals 
    : getPlanMeals(planType);
  
  return {
    name: formData.personalInfo?.fullName || '',
    email: formData.personalInfo?.email || '',
    phoneNumber: formData.personalInfo?.phoneNumber || '',
    age: formData.personalInfo?.age || 0,
    gender: formData.physicalInfo?.gender || '',
    height: formData.physicalInfo?.height || 0,
    weight: formData.physicalInfo?.weight || 0,
    goal: formData.goalSelection?.goal || '',
    diet: formData.dietSelection?.dietType || '',
    foodPreference: formData.foodPreferenceSelection?.foodPreference || '',
    physicalState: formData.activityAndDuration?.activityLevel || '',
    subscriptionType: formData.activityAndDuration?.duration || '',
    plan: mealPlans,
    subscriptionStartDate: formData.planSelection?.startDate 
      ? (typeof formData.planSelection.startDate === 'string' 
         ? formData.planSelection.startDate 
         : formData.planSelection.startDate.toISOString().split('T')[0])
      : '',
  };
}


// Type inference
export type PersonalInfoFormData = z.infer<typeof personalInfoSchema>;
export type PhysicalInfoFormData = z.infer<typeof physicalInfoSchema>;
export type GoalSelectionFormData = z.infer<typeof goalSelectionSchema>;
export type DietSelectionFormData = z.infer<typeof dietSelectionSchema>;
export type FoodPreferenceFormData = z.infer<typeof foodPreferenceSchema>;
export type ActivityAndDurationFormData = z.infer<typeof activityAndDurationSchema>;
export type PlanSelectionFormData = z.infer<typeof planSelectionSchema>;
export type BillingDetailsFormData = z.infer<typeof billingDetailsSchema>;
export type SubscriptionFormDataValidated = z.infer<typeof subscriptionFormSchema>;
