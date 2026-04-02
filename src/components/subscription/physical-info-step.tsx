"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { physicalInfoSchema, type PhysicalInfoFormData } from "@/lib/validators/subscription";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Slider } from "@/components/ui/slider";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Ruler, Weight, Activity } from "lucide-react";
import { motion } from "framer-motion";
import { useState, useMemo } from "react";
import { ClientFormWrapper } from "./client-form-wrapper";
import { calculateBMI, getBMICategory } from "@/constants/subscription";

interface PhysicalInfoStepProps {
  defaultValues?: Partial<PhysicalInfoFormData>;
  onNext: (data: PhysicalInfoFormData) => void;
  onBack: () => void;
}

export function PhysicalInfoStep({ defaultValues, onNext, onBack }: PhysicalInfoStepProps) {
  const [height, setHeight] = useState(defaultValues?.height || 170);
  const [weight, setWeight] = useState(defaultValues?.weight || 70);

  const {
    setValue,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<PhysicalInfoFormData>({
    resolver: zodResolver(physicalInfoSchema),
    defaultValues: {
      gender: defaultValues?.gender || "male",
      height,
      weight,
    },
  });

  const gender = watch("gender");

  const handleHeightChange = (value: number[]) => {
    const newHeight = value[0] ?? 170;
    setHeight(newHeight);
    setValue("height", newHeight);
  };

  const handleWeightChange = (value: number[]) => {
    const newWeight = value[0] ?? 70;
    setWeight(newWeight);
    setValue("weight", newWeight);
  };

  // Calculate BMI
  const bmi = useMemo(() => calculateBMI(weight, height), [weight, height]);
  const bmiCategory = useMemo(() => getBMICategory(bmi), [bmi]);

  // Get BMI color based on category
  const getBMIColor = (category: string) => {
    if (category === "Normal weight") return "text-green-600";
    if (category === "Underweight") return "text-blue-600";
    if (category === "Overweight") return "text-yellow-600";
    return "text-red-600"; // Obese
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
          <CardTitle className="text-2xl sm:text-3xl font-bold text-center bg-linear-to-r from-red-600 to-orange-600 bg-clip-text text-transparent">
            Physical Information
          </CardTitle>
          <CardDescription className="text-center text-base">
            Help us understand your body metrics
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ClientFormWrapper onSubmit={handleSubmit(onNext)} className="space-y-6">
            {/* Gender */}
            <div className="space-y-3">
              <Label className="text-sm font-medium flex items-center gap-2">
                <Users className="w-4 h-4 text-red-600" />
                Gender
              </Label>
              <RadioGroup
                value={gender}
                onValueChange={(value) => setValue("gender", value as "male" | "female" | "other")}
                className="grid grid-cols-3 gap-3"
              >
                <div>
                  <RadioGroupItem value="male" id="male" className="peer sr-only" />
                  <Label
                    htmlFor="male"
                    className="flex flex-col items-center justify-center rounded-lg border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4 hover:bg-gray-50 dark:hover:bg-gray-700 peer-data-[state=checked]:border-red-600 peer-data-[state=checked]:bg-red-50 dark:peer-data-[state=checked]:bg-red-950 cursor-pointer transition-all"
                  >
                    <span className="text-sm font-semibold text-gray-900 dark:text-white">Male</span>
                  </Label>
                </div>
                <div>
                  <RadioGroupItem value="female" id="female" className="peer sr-only" />
                  <Label
                    htmlFor="female"
                    className="flex flex-col items-center justify-center rounded-lg border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4 hover:bg-gray-50 dark:hover:bg-gray-700 peer-data-[state=checked]:border-red-600 peer-data-[state=checked]:bg-red-50 dark:peer-data-[state=checked]:bg-red-950 cursor-pointer transition-all"
                  >
                    <span className="text-sm font-semibold text-gray-900 dark:text-white">Female</span>
                  </Label>
                </div>
                <div>
                  <RadioGroupItem value="other" id="other" className="peer sr-only" />
                  <Label
                    htmlFor="other"
                    className="flex flex-col items-center justify-center rounded-lg border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4 hover:bg-gray-50 dark:hover:bg-gray-700 peer-data-[state=checked]:border-red-600 peer-data-[state=checked]:bg-red-50 dark:peer-data-[state=checked]:bg-red-950 cursor-pointer transition-all"
                  >
                    <span className="text-sm font-semibold text-gray-900 dark:text-white">Other</span>
                  </Label>
                </div>
              </RadioGroup>
              {errors.gender && (
                <p className="text-sm text-red-600 font-medium">{errors.gender.message}</p>
              )}
            </div>

            {/* Height Slider */}
            <div className="space-y-3">
              <Label className="text-sm font-medium flex items-center gap-2">
                <Ruler className="w-4 h-4 text-red-600" />
                Height
              </Label>
              <div className="bg-gray-50 p-4 rounded-lg border-2 border-gray-200">
                <div className="text-center mb-4">
                  <span className="text-3xl font-bold text-red-600">{height}</span>
                  <span className="text-lg text-gray-600 ml-1">cm</span>
                </div>
                <Slider
                  min={100}
                  max={250}
                  step={1}
                  value={[height]}
                  onValueChange={handleHeightChange}
                  className="cursor-pointer"
                />
                <div className="flex justify-between mt-2 text-xs text-gray-500">
                  <span>100 cm</span>
                  <span>250 cm</span>
                </div>
              </div>
              {errors.height && (
                <p className="text-sm text-red-600 font-medium">{errors.height.message}</p>
              )}
            </div>

            {/* Weight Slider */}
            <div className="space-y-3">
              <Label className="text-sm font-medium flex items-center gap-2">
                <Weight className="w-4 h-4 text-red-600" />
                Weight
              </Label>
              <div className="bg-gray-50 p-4 rounded-lg border-2 border-gray-200">
                <div className="text-center mb-4">
                  <span className="text-3xl font-bold text-red-600">{weight}</span>
                  <span className="text-lg text-gray-600 ml-1">kg</span>
                </div>
                <Slider
                  min={30}
                  max={300}
                  step={1}
                  value={[weight]}
                  onValueChange={handleWeightChange}
                  className="cursor-pointer"
                />
                <div className="flex justify-between mt-2 text-xs text-gray-500">
                  <span>30 kg</span>
                  <span>300 kg</span>
                </div>
              </div>
              {errors.weight && (
                <p className="text-sm text-red-600 font-medium">{errors.weight.message}</p>
              )}
            </div>

            {/* BMI Display */}
            <div className="space-y-3">
              <Label className="text-sm font-medium flex items-center gap-2">
                <Activity className="w-4 h-4 text-red-600" />
                Body Mass Index (BMI)
              </Label>
              <div className="bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-900 p-6 rounded-lg border-2 border-gray-200 dark:border-gray-700">
                <div className="text-center space-y-2">
                  <div>
                    <span className="text-4xl font-bold text-red-600">{bmi}</span>
                    <span className="text-lg text-gray-600 dark:text-gray-400 ml-2">kg/m²</span>
                  </div>
                  <div className={`text-lg font-semibold ${getBMIColor(bmiCategory)}`}>
                    {bmiCategory}
                  </div>
                  <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-4 pt-4 border-t border-gray-300 dark:border-gray-600">
                    <div className="text-center">
                      <div className="font-semibold text-blue-600">&lt;18.5</div>
                      <div>Underweight</div>
                    </div>
                    <div className="text-center">
                      <div className="font-semibold text-green-600">18.5-25</div>
                      <div>Normal</div>
                    </div>
                    <div className="text-center">
                      <div className="font-semibold text-yellow-600">25-30</div>
                      <div>Overweight</div>
                    </div>
                    <div className="text-center">
                      <div className="font-semibold text-red-600">&gt;30</div>
                      <div>Obese</div>
                    </div>
                  </div>
                </div>
              </div>
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
