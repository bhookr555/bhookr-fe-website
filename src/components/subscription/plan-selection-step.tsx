"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { planSelectionSchema, type PlanSelectionFormData } from "@/lib/validators/subscription";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { isDietFoodCombinationAvailable } from "@/constants/subscription";
import { CalendarIcon, Sunrise, Sun, Moon } from "lucide-react";
import { motion } from "framer-motion";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import type { SubscriptionDuration, DietType, FoodPreference } from "@/types/subscription";
import { ClientFormWrapper } from "./client-form-wrapper";
import { PaymentLoader } from "@/components/shared/payment-loader";
import { useState } from "react";

interface PlanSelectionStepProps {
  defaultValues?: Partial<PlanSelectionFormData>;
  duration: SubscriptionDuration;
  dietType?: DietType;
  foodPreference?: FoodPreference;
  onNext: (data: PlanSelectionFormData) => void;
  onBack?: () => void;
  isSubmitting?: boolean;
}

export function PlanSelectionStep({
  defaultValues,
  duration: _duration,
  dietType = 'balanced_meal',
  foodPreference = 'veg',
  onNext,
  onBack,
  isSubmitting = false,
}: PlanSelectionStepProps) {
  const {
    setValue,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<PlanSelectionFormData>({
    resolver: zodResolver(planSelectionSchema),
    defaultValues: {
      planType: defaultValues?.planType,
      startDate: defaultValues?.startDate ? new Date(defaultValues.startDate) : undefined,
    },
  });

  const onSubmit = (data: PlanSelectionFormData) => {
    // Include selectedMeals in the submission
    onNext({
      ...data,
      selectedMeals: selectedMeals.map(meal => meal.charAt(0).toUpperCase() + meal.slice(1)) // Capitalize for display
    } as PlanSelectionFormData);
  };

  const selectedPlan = watch("planType");
  const selectedDate = watch("startDate");
  
  // Track selected meals - restore from defaultValues if available
  const [selectedMeals, setSelectedMeals] = useState<string[]>(() => {
    if (defaultValues?.selectedMeals && Array.isArray(defaultValues.selectedMeals)) {
      return defaultValues.selectedMeals.map(meal => meal.toLowerCase());
    }
    // Fallback to old logic if selectedMeals not provided
    return selectedPlan ? [selectedPlan === 'lite' ? 'breakfast' : selectedPlan === 'standard' ? 'lunch' : 'dinner'] : [];
  });

  const isComboAvailable = isDietFoodCombinationAvailable(dietType, foodPreference);

  const meals = [
    { id: 'breakfast', name: 'Breakfast', icon: Sunrise, planType: 'lite' as const },
    { id: 'lunch', name: 'Lunch', icon: Sun, planType: 'standard' as const },
    { id: 'dinner', name: 'Dinner', icon: Moon, planType: 'elite' as const },
  ];

  const toggleMeal = (mealId: string, _planType: 'lite' | 'standard' | 'elite') => {
    const newSelectedMeals = selectedMeals.includes(mealId)
      ? selectedMeals.filter(m => m !== mealId)
      : [...selectedMeals, mealId];
    
    setSelectedMeals(newSelectedMeals);
    
    // Set plan type based on number of meals selected
    if (newSelectedMeals.length === 1) {
      setValue("planType", "lite");
    } else if (newSelectedMeals.length === 2) {
      setValue("planType", "standard");
    } else if (newSelectedMeals.length === 3) {
      setValue("planType", "elite");
    }
  };

  // Get plan name based on number of meals selected
  const getPlanName = () => {
    switch (selectedMeals.length) {
      case 1:
        return "BHOOKR LITE PLAN";
      case 2:
        return "BHOOKR STANDARD PLAN";
      case 3:
        return "BHOOKR ELITE PLAN";
      default:
        return "Plan";
    }
  };

  const getMealDescription = () => {
    switch (selectedMeals.length) {
      case 1:
        return "single meal";
      case 2:
        return "two meal plan";
      case 3:
        return "three meal plan";
      default:
        return "Choose a plan to subscribe (You can select multiple)";
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.3 }}
      className="w-full"
    >
      <Card className="border-2 shadow-lg">
        <CardHeader className="space-y-1 pb-4">
          <CardTitle className="text-2xl sm:text-3xl font-bold text-center">
            {getPlanName()}
          </CardTitle>
          <CardDescription className="text-center text-base font-medium text-gray-900 dark:text-white">
            {selectedMeals.length > 0 ? getMealDescription() : "Choose a plan to subscribe (You can select multiple)"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!isComboAvailable && (
            <div className="mb-4 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
              <p className="text-sm text-yellow-800 dark:text-yellow-200">
                ⚠️ The selected diet type and food preference combination is currently not available. Please go back and select a different combination.
              </p>
            </div>
          )}
          <ClientFormWrapper onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {/* Meal Selection */}
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-3 sm:gap-4">
                {meals.map((meal) => {
                  const Icon = meal.icon;
                  const isSelected = selectedMeals.includes(meal.id);
                  
                  return (
                    <button
                      key={meal.id}
                      type="button"
                      onClick={() => toggleMeal(meal.id, meal.planType)}
                      aria-label={`${isSelected ? 'Deselect' : 'Select'} ${meal.name} meal`}
                      aria-pressed={isSelected}
                      className={cn(
                        "flex flex-col items-center justify-center gap-3 p-4 sm:p-6 rounded-lg border-2 transition-all hover:scale-105",
                        isSelected
                          ? "border-red-600 bg-red-50 dark:bg-red-950"
                          : "border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-gray-300"
                      )}
                    >
                      <div className={cn(
                        "p-3 sm:p-4 rounded-lg",
                        isSelected ? "bg-red-100 dark:bg-red-900" : "bg-gray-100 dark:bg-gray-700"
                      )}>
                        <Icon className={cn(
                          "w-6 h-6 sm:w-8 sm:h-8",
                          isSelected ? "text-red-600" : "text-gray-600 dark:text-gray-400"
                        )} />
                      </div>
                      <span className={cn(
                        "text-sm sm:text-base font-semibold",
                        isSelected ? "text-red-600" : "text-gray-900 dark:text-white"
                      )}>
                        {meal.name}
                      </span>
                    </button>
                  );
                })}
              </div>
              {selectedMeals.length === 0 && errors.planType && (
                <p className="text-sm text-red-600 font-medium text-center">
                  At least one plan must be selected
                </p>
              )}
            </div>

            {/* Start Date */}
            <div className="space-y-3">
              <Label className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white">
                Select subscription start date
              </Label>
              <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">
                Select the date when you want to start your subscription.
              </p>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full h-12 justify-center text-left font-normal",
                      !selectedDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {selectedDate ? format(selectedDate, "MM/dd/yyyy") : "mm/dd/yyyy"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="center">
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={(date) => {
                      if (date) {
                        date.setHours(0, 0, 0, 0);
                        setValue("startDate", date, { shouldValidate: true, shouldDirty: true });
                      }
                    }}
                    disabled={(date) => {
                      const minDate = new Date();
                      minDate.setDate(minDate.getDate() + 2);
                      minDate.setHours(0, 0, 0, 0);
                      return date < minDate;
                    }}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
              {errors.startDate && (
                <p className="text-sm text-red-600 font-medium text-center">
                  Subscription start date is required
                </p>
              )}
            </div>

            {/* Action Buttons */}
            <div className={`grid ${onBack ? 'grid-cols-2' : 'grid-cols-1'} gap-3 pt-4`}>
              {onBack && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={onBack}
                  aria-label="Go back to previous step"
                  className="h-12 text-sm sm:text-base font-semibold"
                >
                  Back
                </Button>
              )}
              <Button
                type="submit"
                disabled={isSubmitting || selectedMeals.length === 0}
                aria-label={isSubmitting ? "Saving your plan selection" : "Continue to billing details"}
                className="h-12 text-sm sm:text-base font-semibold bg-red-600 hover:bg-red-700 transition-all duration-300"
              >
                {isSubmitting && <PaymentLoader size="sm" className="mr-2" />}
                {isSubmitting ? "Saving..." : "Continue"}
              </Button>
            </div>
          </ClientFormWrapper>
        </CardContent>
      </Card>
    </motion.div>
  );
}
