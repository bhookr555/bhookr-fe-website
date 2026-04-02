"use client";

import { useCartStore } from "@/store/cart";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ShoppingBag, MapPin, Edit } from "lucide-react";
import { motion } from "framer-motion";
import { getPricingBreakdown } from "@/config/pricing";
import { toast } from "sonner";

interface OrderReviewProps {
  deliveryData: {
    fullName: string;
    phone: string;
    email?: string;
    street: string;
    landmark?: string;
    city: string;
    state: string;
    zipCode: string;
    addressType?: string;
  };
  onNext: () => void;
  onBack: () => void;
  onEditAddress: () => void;
  isProcessing: boolean;
}

export function OrderReview({
  deliveryData,
  onNext,
  onBack,
  onEditAddress,
  isProcessing,
}: OrderReviewProps) {
  const { items, getTotalPrice, getItemCount } = useCartStore();

  const totalPrice = getTotalPrice();
  const itemCount = getItemCount();
  const pricing = getPricingBreakdown(totalPrice);
  const { deliveryFee, grandTotal } = pricing;

  // Validate delivery data
  const isValidDeliveryData = () => {
    return (
      deliveryData &&
      deliveryData.fullName &&
      deliveryData.phone &&
      deliveryData.street &&
      deliveryData.city &&
      deliveryData.state &&
      deliveryData.zipCode
    );
  };

  const handleProceedToPayment = () => {
    if (!isValidDeliveryData()) {
      toast.error("Invalid delivery information", {
        description: "Please go back and complete your address",
      });
      return;
    }

    if (items.length === 0) {
      toast.error("Your cart is empty", {
        description: "Please add items to cart",
      });
      return;
    }

    onNext();
  };

  return (
    <div className="max-w-4xl mx-auto">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-6"
      >
        {/* Delivery Address Card */}
        <Card className="border-2">
          <CardHeader className="bg-gradient-to-r from-red-50 to-orange-50 dark:from-red-900/20 dark:to-orange-900/20">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-xl">
                <MapPin className="w-6 h-6 text-red-600" />
                Delivery Address
              </CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={onEditAddress}
                className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
              >
                <Edit className="w-4 h-4 mr-1" />
                Edit
              </Button>
            </div>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="space-y-2">
              <p className="font-semibold text-lg">{deliveryData.fullName}</p>
              <p className="text-muted-foreground">{deliveryData.phone}</p>
              <p className="text-muted-foreground">
                {deliveryData.street}
                {deliveryData.landmark && `, ${deliveryData.landmark}`}
              </p>
              <p className="text-muted-foreground">
                {deliveryData.city}, {deliveryData.state} - {deliveryData.zipCode}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Order Items Card */}
        <Card className="border-2">
          <CardHeader className="bg-gradient-to-r from-red-50 to-orange-50 dark:from-red-900/20 dark:to-orange-900/20">
            <CardTitle className="flex items-center gap-2 text-xl">
              <ShoppingBag className="w-6 h-6 text-red-600" />
              Order Items ({itemCount} {itemCount === 1 ? "item" : "items"})
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6 space-y-4">
            {items.map((item, index) => (
              <div key={item.planId}>
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <h4 className="font-semibold">{item.plan.name}</h4>
                    <p className="text-sm text-muted-foreground mt-1">
                      ₹{item.plan.price} × {item.quantity}
                    </p>
                  </div>
                  <p className="font-semibold">
                    ₹{item.plan.price * item.quantity}
                  </p>
                </div>
                {index < items.length - 1 && <Separator className="my-4" />}
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Price Summary Card */}
        <Card className="border-2 border-red-100 dark:border-red-900/30">
          <CardHeader className="bg-gradient-to-r from-red-50 to-orange-50 dark:from-red-900/20 dark:to-orange-900/20">
            <CardTitle>Price Summary</CardTitle>
          </CardHeader>
          <CardContent className="pt-6 space-y-4">
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <div>
                  <p className="text-muted-foreground">Item Amount</p>
                  <p className="text-xs text-muted-foreground">
                    {itemCount} {itemCount === 1 ? "item" : "items"}
                  </p>
                </div>
                <span className="font-medium">₹{totalPrice}</span>
              </div>

              <div className="flex justify-between text-sm">
                <p className="text-muted-foreground flex items-center gap-1">
                  GST
                  <span className="text-xs bg-gray-100 dark:bg-gray-700 px-1.5 py-0.5 rounded" title="5% GST on food">
                    ⓘ
                  </span>
                </p>
                <span className="font-medium">₹{pricing.itemGST}</span>
              </div>

              <div className="flex justify-between text-sm">
                <p className="text-muted-foreground flex items-center gap-1">
                  Delivery Charges
                  <span className="text-xs bg-gray-100 dark:bg-gray-700 px-1.5 py-0.5 rounded cursor-help" title={`₹${deliveryFee} + 18% GST`}>
                    ⓘ
                  </span>
                </p>
                <span className="font-medium">₹{deliveryFee + pricing.deliveryGST}</span>
              </div>
            </div>

            <Separator />

            <div className="flex justify-between text-xl font-bold">
              <span>Total Payable</span>
              <span className="text-red-600">₹{grandTotal}</span>
            </div>

            <div className="pt-4 space-y-3">
              <Button
                onClick={handleProceedToPayment}
                disabled={isProcessing || !isValidDeliveryData()}
                className="w-full h-12 bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-700 hover:to-orange-700 text-base font-semibold"
              >
                {isProcessing && <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                  className="w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2"
                />}
                Proceed to Payment
              </Button>
              <Button
                onClick={onBack}
                variant="outline"
                className="w-full h-12"
                disabled={isProcessing}
              >
                Back to Delivery Address
              </Button>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
