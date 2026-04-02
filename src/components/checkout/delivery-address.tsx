"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MapPin, Home, Building } from "lucide-react";
import { PaymentLoader } from "@/components/shared/payment-loader";
import { toast } from "sonner";
import { Textarea } from "../ui/textarea";
import { getLocalStorageItem, setLocalStorageItem, STORAGE_KEYS } from "@/lib/storage";

const addressSchema = z.object({
  fullName: z.string()
    .min(2, "Name must be at least 2 characters")
    .max(100, "Name is too long")
    .regex(/^[a-zA-Z\s]+$/, "Name can only contain letters and spaces"),
  email: z.string()
    .email("Please enter a valid email address")
    .toLowerCase(),
  phone: z.string()
    .min(10, "Phone number must be 10 digits")
    .max(10, "Phone number must be 10 digits")
    .regex(/^[6-9]\d{9}$/, "Please enter a valid Indian mobile number"),
  street: z.string()
    .min(10, "Please enter complete street address (minimum 10 characters)")
    .max(200, "Address is too long"),
  landmark: z.string().max(100, "Landmark is too long").optional(),
  city: z.string()
    .min(2, "City name is required")
    .max(50, "City name is too long")
    .regex(/^[a-zA-Z\s]+$/, "City name can only contain letters"),
  state: z.string()
    .min(2, "State name is required")
    .max(50, "State name is too long")
    .regex(/^[a-zA-Z\s]+$/, "State name can only contain letters"),
  zipCode: z.string()
    .length(6, "PIN code must be exactly 6 digits")
    .regex(/^[1-9]\d{5}$/, "Please enter a valid Indian PIN code"),
  addressType: z.enum(["home", "work", "other"]),
});

type AddressInput = z.infer<typeof addressSchema>;

interface DeliveryAddressProps {
  onNext: (data: AddressInput) => void;
  onBack: () => void;
  isProcessing?: boolean;
}

export function DeliveryAddress({ onNext, onBack }: DeliveryAddressProps) {
  const [selectedType, setSelectedType] = useState<"home" | "work" | "other">("home");
  const [isSaving, setIsSaving] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    reset,
    formState: { errors },
  } = useForm<AddressInput>({
    resolver: zodResolver(addressSchema),
    defaultValues: {
      fullName: "",
      addressType: "home",
    },
  });

  // Load saved address from localStorage
  useEffect(() => {
    const savedAddress = getLocalStorageItem<AddressInput>(STORAGE_KEYS.DELIVERY_ADDRESS);
    if (savedAddress) {
      reset(savedAddress);
      setSelectedType(savedAddress.addressType || "home");
    }
  }, [reset]);

  const onSubmit = async (data: AddressInput) => {
    setIsSaving(true);
    
    try {
      // Validate all fields are filled
      if (!data.fullName || !data.email || !data.phone || !data.street || !data.city || !data.state || !data.zipCode) {
        toast.error("Please fill all required fields");
        setIsSaving(false);
        return;
      }

      // Save address to localStorage for persistence
      setLocalStorageItem(STORAGE_KEYS.DELIVERY_ADDRESS, data);
      
      // Show success message
      toast.success("Delivery address saved successfully!", {
        description: "Proceeding to order review...",
      });
      
      // Small delay for better UX
      await new Promise(resolve => setTimeout(resolve, 300));
      
      // Move to next step with data
      onNext(data);
    } catch (error) {
      console.error("Error saving address:", error);
      toast.error("Failed to save address", {
        description: error instanceof Error ? error.message : "Please try again",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const addressTypes = [
    { value: "home", label: "Home", icon: Home },
    { value: "work", label: "Work", icon: Building },
    { value: "other", label: "Other", icon: MapPin },
  ];

  return (
    <div className="max-w-3xl mx-auto">
      <Card className="border-2 border-red-100 dark:border-red-900/30">
        <CardHeader className="bg-gradient-to-r from-red-50 to-orange-50 dark:from-red-900/20 dark:to-orange-900/20">
          <CardTitle className="flex items-center gap-2 text-xl">
            <MapPin className="w-6 h-6 text-red-600" />
            Delivery Address
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {/* Address Type */}
            <div className="space-y-2">
              <Label>Address Type</Label>
              <div className="grid grid-cols-3 gap-3">
                {addressTypes.map((type) => {
                  const Icon = type.icon;
                  return (
                    <button
                      key={type.value}
                      type="button"
                      onClick={() => {
                        setSelectedType(type.value as any);
                        setValue("addressType", type.value as any);
                      }}
                      className={`
                        p-4 rounded-lg border-2 transition-all
                        ${
                          selectedType === type.value
                            ? "border-red-600 bg-red-50 dark:bg-red-900/20"
                            : "border-gray-200 dark:border-gray-700 hover:border-gray-300"
                        }
                      `}
                    >
                      <Icon className={`w-6 h-6 mx-auto mb-2 ${
                        selectedType === type.value ? "text-red-600" : "text-gray-600"
                      }`} />
                      <p className={`text-sm font-medium ${
                        selectedType === type.value ? "text-red-600" : "text-gray-700 dark:text-gray-300"
                      }`}>
                        {type.label}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Contact Details */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="fullName">Full Name *</Label>
                <Input
                  id="fullName"
                  {...register("fullName")}
                  placeholder="Enter your full name"
                  disabled={isSaving}
                  className={errors.fullName ? "border-red-500 focus-visible:ring-red-500" : ""}
                />
                {errors.fullName && (
                  <p className="text-sm text-red-600 font-medium flex items-center gap-1">
                    <span className="text-red-600">⚠</span>
                    {errors.fullName.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email Address *</Label>
                <Input
                  id="email"
                  type="email"
                  {...register("email")}
                  placeholder="Enter your email"
                  disabled={isSaving}
                  className={errors.email ? "border-red-500 focus-visible:ring-red-500" : ""}
                />
                {errors.email && (
                  <p className="text-sm text-red-600 font-medium flex items-center gap-1">
                    <span className="text-red-600">⚠</span>
                    {errors.email.message}
                  </p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Phone Number *</Label>
              <Input
                id="phone"
                type="tel"
                {...register("phone")}
                placeholder="Enter 10-digit mobile number"
                maxLength={10}
                disabled={isSaving}
                className={errors.phone ? "border-red-500 focus-visible:ring-red-500" : ""}
                onChange={(e) => {
                  // Only allow digits
                  e.target.value = e.target.value.replace(/\D/g, '');
                }}
              />
              {errors.phone && (
                <p className="text-sm text-red-600 font-medium flex items-center gap-1">
                  <span className="text-red-600">⚠</span>
                  {errors.phone.message}
                </p>
              )}
              <p className="text-xs text-muted-foreground">Without country code or spaces</p>
            </div>

            {/* Address Details */}
            <div className="space-y-2">
              <Label htmlFor="street">Street Address *</Label>
              <Textarea
                id="street"
                {...register("street")}
                placeholder="Enter complete address (House/Flat No., Building, Street)"
                rows={2}
                disabled={isSaving}
                className={errors.street ? "border-red-500 focus-visible:ring-red-500" : ""}
              />
              {errors.street && (
                <p className="text-sm text-red-600 font-medium flex items-center gap-1">
                  <span className="text-red-600">⚠</span>
                  {errors.street.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="landmark">Landmark (Optional)</Label>
              <Input
                id="landmark"
                {...register("landmark")}
                placeholder="Nearby landmark (optional)"
                disabled={isSaving}
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="city">City *</Label>
                <Input
                  id="city"
                  {...register("city")}
                  placeholder="Enter city"
                  disabled={isSaving}
                  className={errors.city ? "border-red-500 focus-visible:ring-red-500" : ""}
                />
                {errors.city && (
                  <p className="text-sm text-red-600 font-medium flex items-center gap-1">
                    <span className="text-red-600">⚠</span>
                    {errors.city.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="state">State *</Label>
                <Input
                  id="state"
                  {...register("state")}
                  placeholder="Enter state"
                  disabled={isSaving}
                  className={errors.state ? "border-red-500 focus-visible:ring-red-500" : ""}
                />
                {errors.state && (
                  <p className="text-sm text-red-600 font-medium flex items-center gap-1">
                    <span className="text-red-600">⚠</span>
                    {errors.state.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="zipCode">PIN Code *</Label>
                <Input
                  id="zipCode"
                  {...register("zipCode")}
                  placeholder="Enter 6-digit PIN code"
                  maxLength={6}
                  disabled={isSaving}
                  onChange={(e) => {
                    // Only allow digits
                    e.target.value = e.target.value.replace(/\D/g, '');
                  }}
                />
                {errors.zipCode && (
                  <p className="text-sm text-red-600 font-medium">{errors.zipCode.message}</p>
                )}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="grid grid-cols-2 gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={onBack}
                disabled={isSaving}
                className="h-12 text-sm sm:text-base font-semibold"
              >
                Back to Cart
              </Button>
              <Button
                type="submit"
                disabled={isSaving}
                className="h-12 text-sm sm:text-base font-semibold bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-700 hover:to-orange-700"
              >
                {isSaving && <PaymentLoader size="sm" className="mr-2" />}
                Continue to Payment
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
