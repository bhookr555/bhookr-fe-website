"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, ArrowLeft, ArrowRight, User, Target, Utensils, Calendar, Package } from "lucide-react";
import { motion } from "framer-motion";
import { calculateSubscriptionPrice, SUBSCRIPTION_PLANS, SUBSCRIPTION_DURATIONS, DIET_TYPES, FOOD_PREFERENCES, FITNESS_GOALS, ACTIVITY_LEVELS } from "@/constants/subscription";
import { CouponInput } from "@/components/shared/coupon-input";
import { useSubscriptionStore } from "@/store/subscription";
import { SubscriptionFormData } from "@/types/subscription";
import { useAuth } from "@/contexts/AuthContext";
import { getSubscriptionDeliveryFee } from "@/config/pricing";


interface SubscriptionReviewStepProps {
  formData: Partial<SubscriptionFormData>;
  onNext: () => void;
  onBack: () => void;
}

export function SubscriptionReviewStep({ formData, onNext, onBack }: SubscriptionReviewStepProps) {
  const { appliedCoupon, applyCoupon, removeCoupon } = useSubscriptionStore();
  const { user } = useAuth();
  
  // Extract data
  const planType = formData.planSelection?.planType || "lite";
  const duration = formData.activityAndDuration?.duration || "monthly";
  const dietType = formData.dietSelection?.dietType || "balanced_meal";
  const foodPreference = formData.foodPreferenceSelection?.foodPreference || "veg";
  
  // Calculate BMI
  const weight = formData.physicalInfo?.weight || 0;
  const height = formData.physicalInfo?.height || 0;
  const bmi = height > 0 ? Number((weight / Math.pow(height / 100, 2)).toFixed(1)) : 0;
  
  // Get BMI category
  const getBMICategory = (bmiValue: number) => {
    if (bmiValue < 18.5) return { label: 'Underweight', color: 'text-blue-600 dark:text-blue-400' };
    if (bmiValue < 25) return { label: 'Normal', color: 'text-green-600 dark:text-green-400' };
    if (bmiValue < 30) return { label: 'Overweight', color: 'text-orange-600 dark:text-orange-400' };
    return { label: 'Obese', color: 'text-red-600 dark:text-red-400' };
  };
  
  const bmiCategory = getBMICategory(bmi);
  
  // Get plan details
  const plan = SUBSCRIPTION_PLANS.find(p => p.type === planType);
  const durationConfig = SUBSCRIPTION_DURATIONS.find(d => d.value === duration);
  const dietTypeConfig = DIET_TYPES.find(d => d.value === dietType);
  const foodPreferenceConfig = FOOD_PREFERENCES.find(f => f.value === foodPreference);
  const goal = FITNESS_GOALS.find(g => g.value === formData.goalSelection?.goal);
  const activityLevel = ACTIVITY_LEVELS.find(a => a.value === formData.activityAndDuration?.activityLevel);

  // Calculate pricing
  const pricing = calculateSubscriptionPrice(planType, duration, dietType, foodPreference);
  
  // Item amount (food cost)
  const itemAmount = pricing.itemAmount;
  
  // Apply coupon discount to item amount first
  const couponDiscount = appliedCoupon?.discountAmount || 0;
  const discountedItemAmount = Math.max(0, itemAmount - couponDiscount);
  
  // GST on discounted food price (5%)
  const itemGST = Math.round(discountedItemAmount * 0.05);
  
  // Calculate delivery charges based on plan type
  const deliveryBase = getSubscriptionDeliveryFee(planType);
  const deliveryGST = Math.round(deliveryBase * 0.18); // 18% GST on delivery
  const deliveryCharges = deliveryBase + deliveryGST;
  
  // Total payable
  const grandTotal = discountedItemAmount + itemGST + deliveryCharges;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.3 }}
      className="w-full max-w-4xl mx-auto space-y-6"
    >
      {/* Header */}
      <div className="text-center space-y-2">
        <h2 className="text-3xl font-bold text-gray-900 dark:text-white">Review Your Subscription</h2>
        <p className="text-gray-600 dark:text-gray-400">
          Please review your selections before proceeding to payment
        </p>
      </div>

      {/* Personal Information */}
      <Card className="border-2 dark:border-gray-700">
        <CardHeader className="bg-gray-50 dark:bg-gray-800/50">
          <CardTitle className="flex items-center gap-2 text-lg">
            <User className="w-5 h-5 text-[#E31E24]" />
            Personal Information
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Full Name</p>
              <p className="font-semibold text-gray-900 dark:text-white">{formData.personalInfo?.fullName}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Email</p>
              <p className="font-semibold text-gray-900 dark:text-white">{formData.personalInfo?.email}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Phone</p>
              <p className="font-semibold text-gray-900 dark:text-white">{formData.personalInfo?.phoneNumber}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Age</p>
              <p className="font-semibold text-gray-900 dark:text-white">{formData.personalInfo?.age} years</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Health & Fitness Profile */}
      <Card className="border-2 dark:border-gray-700">
        <CardHeader className="bg-gray-50 dark:bg-gray-800/50">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Target className="w-5 h-5 text-[#E31E24]" />
            Health & Fitness Profile
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Weight</p>
              <p className="font-semibold text-gray-900 dark:text-white">{formData.physicalInfo?.weight} kg</p>
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Height</p>
              <p className="font-semibold text-gray-900 dark:text-white">{formData.physicalInfo?.height} cm</p>
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">BMI</p>
              <p className="font-semibold text-gray-900 dark:text-white">
                {bmi > 0 ? bmi : 'N/A'}
                {bmi > 0 && (
                  <span className={`ml-2 text-sm font-medium ${bmiCategory.color}`}>
                    ({bmiCategory.label})
                  </span>
                )}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Goal</p>
              <Badge variant="outline" className="font-semibold">
                {goal?.label}
              </Badge>
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Activity Level</p>
              <Badge variant="outline" className="font-semibold">
                {activityLevel?.label}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Diet Preferences */}
      <Card className="border-2 dark:border-gray-700">
        <CardHeader className="bg-gray-50 dark:bg-gray-800/50">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Utensils className="w-5 h-5 text-[#E31E24]" />
            Diet Preferences
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Diet Type</p>
              <p className="font-semibold text-gray-900 dark:text-white">{dietTypeConfig?.label}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Food Preference</p>
              <Badge className="bg-[#E31E24] hover:bg-[#E31E24]/90">
                {foodPreferenceConfig?.label}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Subscription Plan */}
      <Card className="border-2 border-[#E31E24] dark:border-[#E31E24] shadow-lg">
        <CardHeader className="bg-gradient-to-r from-[#E31E24] to-[#FF6B6B] text-white">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Package className="w-5 h-5" />
            Selected Plan
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white">{plan?.name}</h3>
                <p className="text-gray-600 dark:text-gray-400 mt-1">
                  {plan?.mealsPerDay} meal{plan?.mealsPerDay !== 1 ? 's' : ''} per day
                </p>
              </div>
              {plan?.popular && (
                <Badge className="bg-[#E31E24]">Most Popular</Badge>
              )}
            </div>
            
            <div className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
              <Calendar className="w-4 h-4" />
              <span className="font-semibold">{durationConfig?.label}</span>
              <span className="text-sm text-gray-500">({durationConfig?.days} days)</span>
            </div>

            {/* User's Subscription Choices */}
            <div className="grid grid-cols-2 gap-2 mt-4">
              <Badge variant="outline" className="text-xs justify-start">
                <CheckCircle2 className="w-3 h-3 mr-1 flex-shrink-0" />
                {goal?.label}
              </Badge>
              <Badge variant="outline" className="text-xs justify-start">
                <CheckCircle2 className="w-3 h-3 mr-1 flex-shrink-0" />
                {dietTypeConfig?.label}
              </Badge>
              <Badge variant="outline" className="text-xs justify-start">
                <CheckCircle2 className="w-3 h-3 mr-1 flex-shrink-0" />
                {foodPreferenceConfig?.label}
              </Badge>
              <Badge variant="outline" className="text-xs justify-start">
                <CheckCircle2 className="w-3 h-3 mr-1 flex-shrink-0" />
                Start: {formData.planSelection?.startDate ? new Date(formData.planSelection.startDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : 'Not selected'}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Price Breakdown */}
      <Card className="border-2 border-green-500 dark:border-green-600 shadow-lg">
        <CardHeader className="bg-green-50 dark:bg-green-900/20">
          <CardTitle className="flex items-center gap-2 text-lg text-green-700 dark:text-green-400">
            💰 Price Summary
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6 space-y-4">
          {/* Item Amount */}
          <div className="flex justify-between items-center">
            <div>
              <p className="font-medium text-gray-900 dark:text-white">Item Amount</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {plan?.mealsPerDay} meal{plan?.mealsPerDay !== 1 ? 's' : ''} × {durationConfig?.days} days
              </p>
            </div>
            <p className="font-semibold text-gray-900 dark:text-white">₹{itemAmount.toLocaleString()}</p>
          </div>

          {/* Coupon Discount */}
          {appliedCoupon && couponDiscount > 0 && (
            <div className="flex justify-between items-center text-green-600 dark:text-green-400">
              <p className="font-medium">Coupon Discount ({appliedCoupon.code})</p>
              <p className="font-semibold">-₹{couponDiscount.toLocaleString()}</p>
            </div>
          )}

          <Separator />

          {/* GST on Food */}
          <div className="flex justify-between items-center">
            <p className="text-gray-600 dark:text-gray-400 flex items-center gap-1">
              GST
              <span className="text-xs bg-gray-100 dark:bg-gray-700 px-1.5 py-0.5 rounded" title="5% GST on food">
                ⓘ
              </span>
            </p>
            <p className="text-gray-900 dark:text-white">₹{itemGST.toLocaleString()}</p>
          </div>

          {/* Delivery Charges */}
          <div className="flex justify-between items-center">
            <p className="text-gray-600 dark:text-gray-400 flex items-center gap-1">
              Delivery Charges
              <span className="text-xs bg-gray-100 dark:bg-gray-700 px-1.5 py-0.5 rounded cursor-help" title={`₹${deliveryBase.toLocaleString()} + 18% GST`}>
                ⓘ
              </span>
            </p>
            <p className="text-gray-900 dark:text-white">₹{deliveryCharges.toLocaleString()}</p>
          </div>

          <Separator className="my-4" />

          {/* Grand Total */}
          <div className="flex justify-between items-center bg-red-50 dark:bg-red-950/20 p-4 rounded-lg">
            <p className="text-xl font-bold text-gray-900 dark:text-white">Total Payable</p>
            <p className="text-2xl font-bold text-[#E31E24]">₹{grandTotal.toLocaleString()}</p>
          </div>

          {/* Savings Badge */}
          {appliedCoupon && couponDiscount > 0 && (
            <div className="bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-lg p-3">
              <p className="text-sm text-green-800 dark:text-green-200 text-center font-medium">
                🎉 You&apos;re saving ₹{couponDiscount.toLocaleString()} on this subscription!
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Coupon Input */}
      <CouponInput
        orderAmount={itemAmount}
        type="subscription"
        userId={user?.uid}
        appliedCoupon={appliedCoupon}
        onApplyCoupon={applyCoupon}
        onRemoveCoupon={removeCoupon}
      />

      {/* Action Buttons */}
      <div className="flex gap-4 pt-4">
        <Button
          type="button"
          variant="outline"
          onClick={onBack}
          className="flex-1 h-12"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
        <Button
          onClick={onNext}
          className="flex-1 h-12 bg-[#E31E24] hover:bg-[#E31E24]/90"
        >
          Proceed to Payment
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </motion.div>
  );
}
