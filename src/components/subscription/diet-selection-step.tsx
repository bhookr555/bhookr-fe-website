"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { dietSelectionSchema, type DietSelectionFormData } from "@/lib/validators/subscription";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DIET_TYPES } from "@/constants/subscription";
import { motion } from "framer-motion";
import { ClientFormWrapper } from "./client-form-wrapper";

interface DietSelectionStepProps {
  defaultValues?: Partial<DietSelectionFormData>;
  goal?: string;
  onNext: (data: DietSelectionFormData) => void;
  onBack: () => void;
}

export function DietSelectionStep({ defaultValues, goal, onNext, onBack }: DietSelectionStepProps) {
  const {
    setValue,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<DietSelectionFormData>({
    resolver: zodResolver(dietSelectionSchema),
    defaultValues,
  });

  const selectedDiet = watch("dietType");

  // Filter diet types based on goal
  const availableDietTypes = goal === "sport_specific"
    ? DIET_TYPES.filter(diet => 
        diet.value === "salads" || 
        diet.value === "muscle_gain" || 
        diet.value === "mass_bowls"
      )
    : DIET_TYPES;

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
          <CardTitle className="text-2xl sm:text-3xl font-bold text-center bg-gradient-to-r from-red-600 to-orange-600 bg-clip-text text-transparent">
            Choose Your Diet
          </CardTitle>
          <CardDescription className="text-center text-base">
            Select the diet type that suits you best
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ClientFormWrapper onSubmit={handleSubmit(onNext)} className="space-y-6">
            <RadioGroup
              value={selectedDiet}
              onValueChange={(value) => setValue("dietType", value as any)}
              className="grid grid-cols-1 sm:grid-cols-2 gap-4"
            >
              {availableDietTypes.map((diet) => {
                const Icon = diet.icon;
                return (
                  <div key={diet.value}>
                    <RadioGroupItem
                      value={diet.value}
                      id={diet.value}
                      className="peer sr-only"
                    />
                    <Label
                      htmlFor={diet.value}
                      className="flex flex-col items-center justify-center rounded-lg border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-6 hover:bg-gray-50 dark:hover:bg-gray-700 peer-data-[state=checked]:border-red-600 peer-data-[state=checked]:bg-red-50 dark:peer-data-[state=checked]:bg-red-950 cursor-pointer transition-all h-full"
                    >
                      <Icon className="w-12 h-12 text-red-600 dark:text-red-500 mb-3" />
                      <span className="text-lg font-bold text-gray-900 dark:text-white mb-1">
                        {diet.label}
                      </span>
                      <span className="text-sm text-gray-600 dark:text-gray-300 text-center">
                        {diet.description}
                      </span>
                    </Label>
                  </div>
                );
              })}
            </RadioGroup>

            {errors.dietType && (
              <p className="text-sm text-red-600 font-medium text-center">
                {errors.dietType.message}
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
