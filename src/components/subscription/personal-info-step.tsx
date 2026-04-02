"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { personalInfoSchema, type PersonalInfoFormData } from "@/lib/validators/subscription";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { User, Mail, Phone, Calendar } from "lucide-react";
import { motion } from "framer-motion";
import { ClientFormWrapper } from "./client-form-wrapper";

interface PersonalInfoStepProps {
  defaultValues?: Partial<PersonalInfoFormData>;
  onNext: (data: PersonalInfoFormData) => void;
  onBack?: () => void;
}

export function PersonalInfoStep({ defaultValues, onNext, onBack }: PersonalInfoStepProps) {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<PersonalInfoFormData>({
    resolver: zodResolver(personalInfoSchema),
    defaultValues,
  });

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
            Personal Information
          </CardTitle>
          <CardDescription className="text-center text-base">
            Let&apos;s start with your basic details
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ClientFormWrapper onSubmit={handleSubmit(onNext)} className="space-y-5">
            {/* Full Name */}
            <div className="space-y-2">
              <Label htmlFor="fullName" className="text-sm font-medium flex items-center gap-2">
                <User className="w-4 h-4 text-red-600" />
                Full Name
              </Label>
              <Input
                id="fullName"
                placeholder="Enter your full name"
                {...register("fullName")}
                className="h-12 text-base"
                autoFocus
              />
              {errors.fullName && (
                <p className="text-sm text-red-600 font-medium">{errors.fullName.message}</p>
              )}
            </div>

            {/* Phone Number */}
            <div className="space-y-2">
              <Label htmlFor="phoneNumber" className="text-sm font-medium flex items-center gap-2">
                <Phone className="w-4 h-4 text-red-600" />
                Phone Number
              </Label>
              <Input
                id="phoneNumber"
                type="tel"
                placeholder="Enter 10-digit mobile number"
                {...register("phoneNumber")}
                maxLength={10}
                className="h-12 text-base"
              />
              {errors.phoneNumber && (
                <p className="text-sm text-red-600 font-medium">{errors.phoneNumber.message}</p>
              )}
            </div>

            {/* Email */}
            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-medium flex items-center gap-2">
                <Mail className="w-4 h-4 text-red-600" />
                Email Address
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="Enter your email"
                {...register("email")}
                className="h-12 text-base"
              />
              {errors.email && (
                <p className="text-sm text-red-600 font-medium">{errors.email.message}</p>
              )}
            </div>

            {/* Age */}
            <div className="space-y-2">
              <Label htmlFor="age" className="text-sm font-medium flex items-center gap-2">
                <Calendar className="w-4 h-4 text-red-600" />
                Age
              </Label>
              <Input
                id="age"
                type="number"
                placeholder="Enter your age"
                {...register("age", { valueAsNumber: true })}
                min="13"
                max="120"
                className="h-12 text-base"
              />
              {errors.age && (
                <p className="text-sm text-red-600 font-medium">{errors.age.message}</p>
              )}
            </div>

            {/* Action Buttons */}
            <div className={`grid ${onBack ? 'grid-cols-2' : 'grid-cols-1'} gap-3`}>
              {onBack && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={onBack}
                  className="h-12 text-sm sm:text-base font-semibold"
                >
                  Back
                </Button>
              )}
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
