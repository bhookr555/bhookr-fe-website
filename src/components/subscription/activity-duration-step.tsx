"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  activityAndDurationSchema,
  type ActivityAndDurationFormData,
} from "@/lib/validators/subscription";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ACTIVITY_LEVELS, SUBSCRIPTION_DURATIONS } from "@/constants/subscription";
import { Activity, Clock, Info } from "lucide-react";
import { motion } from "framer-motion";
import { ClientFormWrapper } from "./client-form-wrapper";
import type { DietType } from "@/types/subscription";

interface ActivityAndDurationStepProps {
  defaultValues?: Partial<ActivityAndDurationFormData>;
  goal?: string;
  dietType?: DietType;
  onNext: (data: ActivityAndDurationFormData) => void;
  onBack: () => void;
}

export function ActivityAndDurationStep({
  defaultValues,
  goal: _goal,
  dietType,
  onNext,
  onBack,
}: ActivityAndDurationStepProps) {
  const {
    setValue,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<ActivityAndDurationFormData>({
    resolver: zodResolver(activityAndDurationSchema),
    defaultValues,
  });

  const selectedActivity = watch("activityLevel");
  const selectedDuration = watch("duration");

  // Check if salads are selected
  const isSaladsSelected = dietType === "salads";

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
            Activity & Duration
          </CardTitle>
          <CardDescription className="text-center text-base">
            Tell us about your activity level and subscription duration
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ClientFormWrapper onSubmit={handleSubmit(onNext)} className="space-y-6">
            {/* Activity Level */}
            <div className="space-y-3">
              <Label className="text-sm font-medium flex items-center gap-2">
                <Activity className="w-4 h-4 text-red-600" />
                Physical Activity Level
              </Label>
              <RadioGroup
                value={selectedActivity}
                onValueChange={(value) => setValue("activityLevel", value as any)}
                className="grid grid-cols-1 sm:grid-cols-2 gap-3"
              >
                {ACTIVITY_LEVELS.map((activity) => (
                  <div key={activity.value}>
                    <RadioGroupItem
                      value={activity.value}
                      id={activity.value}
                      className="peer sr-only"
                    />
                    <Label
                      htmlFor={activity.value}
                      className="flex flex-col rounded-lg border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4 hover:bg-gray-50 dark:hover:bg-gray-700 peer-data-[state=checked]:border-red-600 peer-data-[state=checked]:bg-red-50 dark:peer-data-[state=checked]:bg-red-950 cursor-pointer transition-all"
                    >
                      <span className="text-base font-bold text-gray-900 dark:text-white mb-1">
                        {activity.label}
                      </span>
                      <span className="text-sm text-gray-600 dark:text-gray-300">{activity.description}</span>
                    </Label>
                  </div>
                ))}
              </RadioGroup>
              {errors.activityLevel && (
                <p className="text-sm text-red-600 font-medium">
                  {errors.activityLevel.message}
                </p>
              )}
            </div>

            {/* Subscription Duration */}
            <div className="space-y-3">
              <Label className="text-sm font-medium flex items-center gap-2">
                <Clock className="w-4 h-4 text-red-600" />
                Subscription Duration
              </Label>
              
              {/* Salads notification */}
              {isSaladsSelected && (
                <div className="flex items-start gap-2 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                  <Info className="w-4 h-4 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-yellow-800 dark:text-yellow-200">
                    Trial plan is not available for Salads. Please select 1 Month duration.
                  </p>
                </div>
              )}
              
              <RadioGroup
                value={selectedDuration}
                onValueChange={(value) => setValue("duration", value as any)}
                className="grid grid-cols-2 sm:grid-cols-3 gap-3"
              >
                {SUBSCRIPTION_DURATIONS.map((duration) => {
                  const isDisabled = isSaladsSelected && duration.value === "7_days";
                  return (
                    <div key={duration.value}>
                      <RadioGroupItem
                        value={duration.value}
                        id={duration.value}
                        disabled={isDisabled}
                        className="peer sr-only"
                      />
                      <Label
                        htmlFor={duration.value}
                        className={`flex flex-col items-center justify-center rounded-lg border-2 p-4 transition-all relative ${
                          isDisabled
                            ? "border-gray-200 dark:border-gray-700 bg-gray-100 dark:bg-gray-800 opacity-50 cursor-not-allowed"
                            : "border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 peer-data-[state=checked]:border-red-600 peer-data-[state=checked]:bg-red-50 dark:peer-data-[state=checked]:bg-red-950 cursor-pointer"
                        }`}
                      >
                        {duration.badge && !isDisabled && (
                          <Badge className="absolute -top-2 -right-2 bg-red-600 text-xs">
                            {duration.badge}
                          </Badge>
                        )}
                        <span className={`text-base font-bold ${
                          isDisabled ? "text-gray-400 dark:text-gray-600" : "text-gray-900 dark:text-white"
                        }`}>
                          {duration.label}
                        </span>
                        {isDisabled && (
                          <span className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                            Not available
                          </span>
                        )}
                      </Label>
                    </div>
                  );
                })}
              </RadioGroup>
              {errors.duration && (
                <p className="text-sm text-red-600 font-medium">{errors.duration.message}</p>
              )}
            </div>

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
