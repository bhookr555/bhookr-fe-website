"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { billingDetailsSchema, type BillingDetailsFormData } from "@/lib/validators/subscription";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { MapPin, Building, Map, Hash, Globe } from "lucide-react";
import { motion } from "framer-motion";
import { ClientFormWrapper } from "./client-form-wrapper";

interface BillingDetailsStepProps {
  defaultValues?: Partial<BillingDetailsFormData>;
  onNext: (data: BillingDetailsFormData) => void;
  onBack: () => void;
}

export function BillingDetailsStep({ defaultValues, onNext, onBack }: BillingDetailsStepProps) {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<BillingDetailsFormData>({
    resolver: zodResolver(billingDetailsSchema) as any,
    defaultValues: {
      ...defaultValues,
      country: "India",
    },
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
            Billing Details
          </CardTitle>
          <CardDescription className="text-center text-base">
            Enter your delivery address
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ClientFormWrapper onSubmit={handleSubmit(onNext)} className="space-y-5">
            {/* Address */}
            <div className="space-y-2">
              <Label htmlFor="address" className="text-sm font-medium flex items-center gap-2">
                <MapPin className="w-4 h-4 text-red-600" />
                Address
              </Label>
              <Input
                id="address"
                placeholder="Enter complete address"
                {...register("address")}
                className="h-12 text-base"
                autoFocus
              />
              {errors.address && (
                <p className="text-sm text-red-600 font-medium">{errors.address.message}</p>
              )}
            </div>

            {/* City */}
            <div className="space-y-2">
              <Label htmlFor="city" className="text-sm font-medium flex items-center gap-2">
                <Building className="w-4 h-4 text-red-600" />
                City
              </Label>
              <Input
                id="city"
                placeholder="Enter your city"
                {...register("city")}
                className="h-12 text-base"
              />
              {errors.city && (
                <p className="text-sm text-red-600 font-medium">{errors.city.message}</p>
              )}
            </div>

            {/* State & ZIP Code */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="state" className="text-sm font-medium flex items-center gap-2">
                  <Map className="w-4 h-4 text-red-600" />
                  State
                </Label>
                <Input
                  id="state"
                  placeholder="Enter your state"
                  {...register("state")}
                  className="h-12 text-base"
                />
                {errors.state && (
                  <p className="text-sm text-red-600 font-medium">{errors.state.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="zipCode" className="text-sm font-medium flex items-center gap-2">
                  <Hash className="w-4 h-4 text-red-600" />
                  PIN Code
                </Label>
                <Input
                  id="zipCode"
                  placeholder="6-digit PIN code"
                  {...register("zipCode")}
                  maxLength={6}
                  className="h-12 text-base"
                />
                {errors.zipCode && (
                  <p className="text-sm text-red-600 font-medium">{errors.zipCode.message}</p>
                )}
              </div>
            </div>

            {/* Country */}
            <div className="space-y-2">
              <Label htmlFor="country" className="text-sm font-medium flex items-center gap-2">
                <Globe className="w-4 h-4 text-red-600" />
                Country
              </Label>
              <Input
                id="country"
                {...register("country")}
                className="h-12 text-base bg-gray-50"
                readOnly
              />
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
                Review & Continue
              </Button>
            </div>
          </ClientFormWrapper>
        </CardContent>
      </Card>
    </motion.div>
  );
}
