/**
 * Subscription Types and Interfaces
 */

export type Gender = "male" | "female" | "other";

export type Goal = "weight_loss" | "balanced_diet" | "gain_muscle" | "sport_specific";

export type DietType = "low_carb_high_protein" | "balanced_meal" | "ketogenic" | "salads" | "muscle_gain" | "mass_bowls";

export type FoodPreference = "non_veg" | "veg" | "eggtarian" | "vegan";

export type ActivityLevel = "sedentary" | "moderately" | "active" | "others";

export type SubscriptionDuration = "7_days" | "monthly";

export type PlanType = "lite" | "standard" | "elite";

export type MealType = "breakfast" | "lunch" | "dinner";

export type TwoMealCombination = "breakfast_lunch" | "breakfast_dinner" | "lunch_dinner";

export interface PersonalInfo {
  fullName: string;
  phoneNumber: string;
  email: string;
  age: number;
}

export interface PhysicalInfo {
  gender: Gender;
  height: number; // in cms
  weight: number; // in kgs
}

export interface GoalSelection {
  goal: Goal;
}

export interface DietSelection {
  dietType: DietType;
}

export interface FoodPreferenceSelection {
  foodPreference: FoodPreference;
}

export interface ActivityAndDuration {
  activityLevel: ActivityLevel;
  duration: SubscriptionDuration;
}

export interface PlanSelection {
  planType: PlanType;
  startDate: Date;
  selectedMeals?: string[]; // ['breakfast', 'lunch', 'dinner']
}

export interface BillingDetails {
  address: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
}

export interface SubscriptionFormData {
  personalInfo: PersonalInfo;
  physicalInfo: PhysicalInfo;
  goalSelection: GoalSelection;
  dietSelection: DietSelection;
  foodPreferenceSelection: FoodPreferenceSelection;
  activityAndDuration: ActivityAndDuration;
  planSelection: PlanSelection;
  billingDetails?: BillingDetails;
}

export interface SubscriptionPlan {
  id: string;
  name: string;
  type: PlanType;
  mealsPerDay: number;
  pricePerMeal: number;
  features: string[];
  popular?: boolean;
}

export interface SubscriptionOrder {
  id: string;
  userId: string;
  formData: SubscriptionFormData;
  totalAmount: number;
  status: "pending" | "processing" | "completed" | "failed";
  paymentId?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface PaymentResponse {
  success: boolean;
  orderId: string;
  paymentId: string;
  amount: number;
  message?: string;
}

export interface InvoiceData {
  invoiceNumber: string;
  orderDate: Date;
  customerName: string;
  email: string;
  phone: string;
  totalAmount: number;
  paymentMethod: string;
  paymentId: string;
  isSubscription: boolean;
  // Subscription-specific fields
  planName?: string;
  duration?: string;
  startDate?: Date;
  subscriptionAmount?: number;
  subscriptionGST?: number; // 5% GST on subscription
  deliveryCharges?: number;
  deliveryGST?: number; // 18% GST on delivery
  // Menu items specific fields
  items?: Array<{
    planId: string;
    name: string;
    price: number;
    quantity: number;
  }>;
  itemAmount?: number;
  itemGST?: number;
  deliveryBase?: number;
}
