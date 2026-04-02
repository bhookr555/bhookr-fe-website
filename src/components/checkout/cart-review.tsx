"use client";

import { useCartStore } from "@/store/cart";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Trash2, Plus, Minus, ShoppingBag } from "lucide-react";
import { motion } from "framer-motion";
import { getPricingBreakdown } from "@/config/pricing";

interface CartReviewProps {
  onNext: () => void;
  isProcessing: boolean;
}

export function CartReview({ onNext, isProcessing }: CartReviewProps) {
  const { items, removeItem, updateQuantity, getTotalPrice, getItemCount } =
    useCartStore();

  const totalPrice = getTotalPrice();
  const itemCount = getItemCount();
  const pricing = getPricingBreakdown(totalPrice);
  const { deliveryFee, grandTotal } = pricing;

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      {/* Cart Items */}
      <div className="lg:col-span-2 space-y-4">
        <Card>
          <CardHeader className="bg-gradient-to-r from-red-50 to-orange-50 dark:from-red-900/20 dark:to-orange-900/20">
            <CardTitle className="flex items-center gap-2 text-xl">
              <ShoppingBag className="w-6 h-6 text-red-600" />
              Your Cart ({itemCount} {itemCount === 1 ? "item" : "items"})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 pt-6">
            {items.map((item, index) => (
              <motion.div
                key={item.planId}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <div className="flex gap-4 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                  {/* Item Image */}
                  <div className="relative w-20 h-20 sm:w-24 sm:h-24 rounded-lg overflow-hidden flex-shrink-0 bg-gradient-to-br from-red-100 to-orange-100 dark:from-red-900/20 dark:to-orange-900/20">
                    <div className="w-full h-full flex items-center justify-center">
                      <ShoppingBag className="w-8 h-8 text-red-600" />
                    </div>
                  </div>

                  {/* Item Details */}
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-base sm:text-lg">
                      {item.plan.name}
                    </h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      ₹{item.plan.price} per meal
                    </p>

                    {/* Quantity Controls */}
                    <div className="flex items-center gap-3 mt-3">
                      <div className="flex items-center border rounded-lg">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() =>
                            updateQuantity(
                              item.planId,
                              Math.max(1, item.quantity - 1)
                            )
                          }
                        >
                          <Minus className="w-4 h-4" />
                        </Button>
                        <span className="w-12 text-center font-semibold">
                          {item.quantity}
                        </span>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() =>
                            updateQuantity(item.planId, item.quantity + 1)
                          }
                        >
                          <Plus className="w-4 h-4" />
                        </Button>
                      </div>

                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
                        onClick={() => removeItem(item.planId)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>

                  {/* Item Total */}
                  <div className="text-right">
                    <p className="font-bold text-lg">
                      ₹{item.plan.price * item.quantity}
                    </p>
                  </div>
                </div>
                {index < items.length - 1 && <Separator className="my-4" />}
              </motion.div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Order Summary */}
      <div>
        <Card className="sticky top-4 border-2 border-red-100 dark:border-red-900/30">
          <CardHeader className="bg-gradient-to-r from-red-50 to-orange-50 dark:from-red-900/20 dark:to-orange-900/20">
            <CardTitle>Order Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 pt-6">
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

            <div className="flex justify-between text-lg font-bold">
              <span>Total Payable</span>
              <span className="text-red-600">₹{grandTotal}</span>
            </div>

            <Button
              onClick={onNext}
              disabled={isProcessing}
              className="w-full h-12 bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-700 hover:to-orange-700 text-base font-semibold"
            >
              Proceed to Delivery
            </Button>

            <div className="text-center">
              <Button
                variant="link"
                onClick={() => (window.location.href = "/menu")}
                className="text-sm"
              >
                Continue Shopping
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
