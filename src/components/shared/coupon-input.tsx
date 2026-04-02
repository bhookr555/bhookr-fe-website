"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tag, X, Loader2, CheckCircle2, AlertCircle, Percent } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import type { AppliedCoupon, CouponValidationResponse } from "@/types/coupon";

interface CouponInputProps {
  orderAmount: number;
  type: "menu" | "subscription";
  userId?: string;
  appliedCoupon: AppliedCoupon | null;
  onApplyCoupon: (coupon: AppliedCoupon) => void;
  onRemoveCoupon: () => void;
  className?: string;
}

export function CouponInput({
  orderAmount,
  type,
  userId,
  appliedCoupon,
  onApplyCoupon,
  onRemoveCoupon,
  className = "",
}: CouponInputProps) {
  const [couponCode, setCouponCode] = useState("");
  const [isValidating, setIsValidating] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  const handleApplyCoupon = async () => {
    if (!couponCode.trim()) {
      toast.error("Please enter a coupon code");
      return;
    }

    if (orderAmount <= 0) {
      toast.error("Add items to your cart first");
      return;
    }

    setIsValidating(true);
    setValidationError(null);

    try {
      const response = await fetch("/api/coupons/validate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          code: couponCode.toUpperCase(),
          orderAmount,
          type,
          userId,
        }),
      });

      const data: CouponValidationResponse = await response.json();

      if (data.valid && data.coupon && data.discountAmount !== undefined && data.finalAmount !== undefined) {
        const appliedCoupon: AppliedCoupon = {
          code: data.coupon.code,
          type: data.coupon.type,
          discountAmount: data.discountAmount,
          originalAmount: orderAmount,
          finalAmount: data.finalAmount,
        };

        onApplyCoupon(appliedCoupon);
        
        toast.success("Coupon applied successfully!", {
          description: `You saved ₹${data.discountAmount}`,
        });
        
        setCouponCode("");
      } else {
        setValidationError(data.error || "Invalid coupon code");
        toast.error(data.error || "Invalid coupon code");
      }
    } catch (error) {
      console.error("Error validating coupon:", error);
      setValidationError("Failed to validate coupon. Please try again.");
      toast.error("Failed to validate coupon");
    } finally {
      setIsValidating(false);
    }
  };

  const handleRemoveCoupon = () => {
    onRemoveCoupon();
    setCouponCode("");
    setValidationError(null);
    toast.info("Coupon removed");
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !appliedCoupon) {
      handleApplyCoupon();
    }
  };

  return (
    <div className={className}>
      <AnimatePresence mode="wait">
        {appliedCoupon ? (
          // Applied Coupon Display
          <motion.div
            key="applied"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            transition={{ duration: 0.2 }}
          >
            <Card className="border-green-200 bg-green-50 dark:bg-green-950 dark:border-green-800">
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 flex-1">
                    <div className="w-10 h-10 rounded-full bg-green-500 dark:bg-green-600 flex items-center justify-center shrink-0">
                      <CheckCircle2 className="w-5 h-5 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant="secondary" className="bg-green-600 text-white hover:bg-green-700">
                          {appliedCoupon.code}
                        </Badge>
                        {appliedCoupon.type === "percentage" && (
                          <Percent className="w-4 h-4 text-green-600 dark:text-green-400" />
                        )}
                      </div>
                      <p className="text-sm font-medium text-green-900 dark:text-green-100">
                        Coupon Applied Successfully!
                      </p>
                      <p className="text-sm text-green-700 dark:text-green-300 mt-1">
                        You saved <span className="font-bold">₹{appliedCoupon.discountAmount}</span>
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleRemoveCoupon}
                    className="text-green-700 hover:bg-green-100 dark:text-green-300 dark:hover:bg-green-900 shrink-0"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ) : (
          // Coupon Input Form
          <motion.div
            key="input"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            transition={{ duration: 0.2 }}
          >
            <Card>
              <CardContent className="p-4">
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Tag className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm font-medium">Have a coupon code?</span>
                  </div>
                  
                  <div className="flex gap-2">
                    <div className="flex-1">
                      <Input
                        type="text"
                        placeholder="Enter coupon code"
                        value={couponCode}
                        onChange={(e) => {
                          setCouponCode(e.target.value.toUpperCase());
                          setValidationError(null);
                        }}
                        onKeyPress={handleKeyPress}
                        disabled={isValidating}
                        className="uppercase"
                        maxLength={20}
                      />
                    </div>
                    <Button
                      onClick={handleApplyCoupon}
                      disabled={isValidating || !couponCode.trim()}
                      className="bg-red-600 hover:bg-red-700 shrink-0"
                    >
                      {isValidating ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Applying
                        </>
                      ) : (
                        "Apply"
                      )}
                    </Button>
                  </div>

                  {validationError && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="flex items-start gap-2 text-sm text-red-600 dark:text-red-400"
                    >
                      <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                      <span>{validationError}</span>
                    </motion.div>
                  )}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
