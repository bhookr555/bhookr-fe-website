"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { foodPreferenceSchema, type FoodPreferenceFormData } from "@/lib/validators/subscription";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FOOD_PREFERENCES, getAvailableFoodPreferences } from "@/constants/subscription";
import { motion } from "framer-motion";
import { ClientFormWrapper } from "./client-form-wrapper";
import type { DietType } from "@/types/subscription";

interface FoodPreferenceStepProps {
  defaultValues?: Partial<FoodPreferenceFormData>;
  dietType?: DietType;
  onNext: (data: FoodPreferenceFormData) => void;
  onBack: () => void;
}

export function FoodPreferenceStep({ defaultValues, dietType = 'balanced_meal', onNext, onBack }: FoodPreferenceStepProps) {
  const {
    setValue,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FoodPreferenceFormData>({
    resolver: zodResolver(foodPreferenceSchema),
    defaultValues,
  });

  const selectedPreference = watch("foodPreference");

  // Get available food preferences based on selected diet type
  const availableFoodPreferences = getAvailableFoodPreferences(dietType);
  const filteredPreferences = FOOD_PREFERENCES.filter(pref => 
    availableFoodPreferences.includes(pref.value)
  );

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
          <CardTitle className="text-2xl sm:text-3xl font-bold text-center bg-linear-to-r from-red-600 to-orange-600 bg-clip-text text-transparent">
            Food Preference
          </CardTitle>
          <CardDescription className="text-center text-base">
            What type of food do you prefer?
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ClientFormWrapper onSubmit={handleSubmit(onNext)} className="space-y-6">
            <RadioGroup
              value={selectedPreference}
              onValueChange={(value) => setValue("foodPreference", value as any)}
              className="grid grid-cols-1 sm:grid-cols-2 gap-4"
            >
              {filteredPreferences.map((preference) => {
                const Icon = preference.icon;
                return (
                  <div key={preference.value}>
                    <RadioGroupItem
                      value={preference.value}
                      id={preference.value}
                      className="peer sr-only"
                    />
                    <Label
                      htmlFor={preference.value}
                      className="flex flex-col items-center justify-center rounded-lg border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-6 hover:bg-gray-50 dark:hover:bg-gray-700 peer-data-[state=checked]:border-red-600 peer-data-[state=checked]:bg-red-50 dark:peer-data-[state=checked]:bg-red-950 cursor-pointer transition-all h-full"
                    >
                      <Icon className="w-12 h-12 text-red-600 dark:text-red-500 mb-3" />
                      <span className="text-lg font-bold text-gray-900 dark:text-white mb-1">
                        {preference.label}
                      </span>
                      <span className="text-sm text-gray-600 dark:text-gray-300 text-center">
                        {preference.description}
                      </span>
                    </Label>
                  </div>
                );
              })}
            </RadioGroup>

            {errors.foodPreference && (
              <p className="text-sm text-red-600 font-medium text-center">
                {errors.foodPreference.message}
              </p>
            )}

            {/* Action Buttons */}
            <div className="grid grid-cols-2 gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={onBack}
                className="h-12 text-sm sm:text-base font-semibold"
              >
                Back
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting}
                className="h-12 text-sm sm:text-base font-semibold bg-linear-to-r from-red-600 to-orange-600 hover:from-red-700 hover:to-orange-700 transition-all duration-300"
              >
                Continue
              </Button>
            </div>
          </ClientFormWrapper>
        </CardContent>
      </Card>
    </motion.div>
  );
}
