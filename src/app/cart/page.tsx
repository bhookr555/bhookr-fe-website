"use client";

import { useRouter } from "next/navigation";
import { useCartStore } from "@/store/cart";
import { useAuth } from "@/contexts/AuthContext";
import { Header } from "@/components/layouts/header";
import { Footer } from "@/components/layouts/footer";
import { Container } from "@/components/layouts/container";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Trash2, Plus, Minus, ShoppingBag, ArrowLeft, Info } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { PaymentLoader } from "@/components/shared/payment-loader";
import { CouponInput } from "@/components/shared/coupon-input";
import Image from "next/image";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { getPricingBreakdown } from "@/config/pricing";

export default function CartPage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const { 
    items, 
    removeItem, 
    updateQuantity, 
    getTotalPrice, 
    getSubtotal,
    getDiscount,
    appliedCoupon,
    applyCoupon,
    removeCoupon,
    clearCart 
  } = useCartStore();

  // Calculate pricing using centralized utility
  const pricing = getPricingBreakdown(getTotalPrice());

  const handleQuantityChange = (planId: string, currentQty: number, change: number) => {
    const newQty = currentQty + change;
    if (newQty <= 0) {
      removeItem(planId);
      toast.success("Item removed from cart");
    } else {
      updateQuantity(planId, newQty);
    }
  };

  const handleProceedToCheckout = () => {
    // Wait for auth to load before checking
    if (loading) {
      return; // Don't proceed while loading
    }
    
    // Check if user is authenticated before proceeding to checkout
    if (!user) {
      // Redirect to signin page with callback URL
      router.push("/signin?callbackUrl=/checkout");
      return;
    }
    
    // Proceed to checkout if authenticated
    router.push("/checkout");
  };

  const handleClearCart = () => {
    if (confirm("Are you sure you want to clear your cart?")) {
      clearCart();
      toast.success("Cart cleared");
    }
  };

  // Empty cart state
  if (items.length === 0) {
    return (
      <>
        <Header />
        <main className="min-h-screen bg-gradient-to-b from-gray-50 to-white dark:from-gray-900 dark:to-gray-800 py-8 md:py-12">
          <Container>
            <Card className="max-w-2xl mx-auto">
              <CardContent className="py-16 text-center space-y-6">
                <div className="w-24 h-24 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto">
                  <ShoppingBag className="w-12 h-12 text-gray-400" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                    Your Cart is Empty
                  </h2>
                  <p className="text-muted-foreground">
                    Looks like you haven&apos;t added any items to your cart yet
                  </p>
                </div>
                <Button
                  onClick={() => router.push("/menu")}
                  className="bg-red-600 hover:bg-red-700"
                >
                  Browse Menu
                </Button>
              </CardContent>
            </Card>
          </Container>
        </main>
        <Footer />
      </>
    );
  }

  return (
    <>
      <Header />
      <main className="min-h-screen bg-gradient-to-b from-gray-50 to-white dark:from-gray-900 dark:to-gray-800 py-8 md:py-12">
        <Container>
          {/* Header */}
          <div className="mb-8">
            <Button
              variant="ghost"
              onClick={() => router.push("/menu")}
              className="mb-4 hover:bg-red-50 hover:text-red-600"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Continue Shopping
            </Button>
            <div className="flex items-center justify-between">
              <h1 className="text-3xl md:text-4xl font-bold">Shopping Cart</h1>
              <Button
                variant="ghost"
                onClick={handleClearCart}
                className="text-red-600 hover:bg-red-50"
              >
                Clear Cart
              </Button>
            </div>
          </div>

          <div className="grid lg:grid-cols-3 gap-8">
            {/* Cart Items */}
            <div className="lg:col-span-2 space-y-4">
              {items.map((item) => (
                <motion.div
                  key={item.planId}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -100 }}
                >
                  <Card>
                    <CardContent className="p-4 md:p-6">
                      <div className="flex gap-4">
                        {/* Item Image */}
                        <div className="relative w-24 h-24 md:w-32 md:h-32 bg-gradient-to-br from-red-50 to-orange-50 dark:from-gray-800 dark:to-gray-700 rounded-lg overflow-hidden shrink-0">
                          {item.plan.image ? (
                            <Image
                              src={item.plan.image}
                              alt={item.plan.name}
                              fill
                              className="object-cover"
                              sizes="(max-width: 768px) 96px, 128px"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <span className="text-4xl">🍽️</span>
                            </div>
                          )}
                        </div>

                        {/* Item Details */}
                        <div className="flex-1 min-w-0">
                          <div className="flex justify-between gap-4 mb-2">
                            <h3 className="font-semibold text-lg line-clamp-2">
                              {item.plan.name}
                            </h3>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => removeItem(item.planId)}
                              className="text-red-600 hover:bg-red-50 shrink-0"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>

                          <p className="text-sm text-muted-foreground line-clamp-2 mb-4">
                            {item.plan.description}
                          </p>

                          {/* Features/Tags */}
                          {item.plan.features && item.plan.features.length > 0 && (
                            <div className="flex flex-wrap gap-2 mb-4">
                              {item.plan.features.slice(0, 3).map((feature, idx) => (
                                <span
                                  key={idx}
                                  className="text-xs px-2 py-1 bg-gray-100 dark:bg-gray-800 rounded-full"
                                >
                                  {feature}
                                </span>
                              ))}
                            </div>
                          )}

                          {/* Price and Quantity */}
                          <div className="flex items-center justify-between">
                            <div className="flex items-center border-2 border-red-600 rounded-lg">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-10 w-10 text-red-600 hover:bg-red-50"
                                onClick={() => handleQuantityChange(item.planId, item.quantity, -1)}
                              >
                                <Minus className="h-4 w-4" />
                              </Button>
                              <span className="w-12 text-center font-bold">
                                {item.quantity}
                              </span>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-10 w-10 text-red-600 hover:bg-red-50"
                                onClick={() => handleQuantityChange(item.planId, item.quantity, 1)}
                              >
                                <Plus className="h-4 w-4" />
                              </Button>
                            </div>

                            <div className="text-right">
                              <div className="text-sm text-muted-foreground">
                                ₹{item.plan.price} × {item.quantity}
                              </div>
                              <div className="text-xl font-bold text-red-600">
                                ₹{item.plan.price * item.quantity}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>

            {/* Order Summary */}
            <div className="lg:col-span-1">
              <div className="space-y-4">
                {/* Coupon Input */}
                <CouponInput
                  orderAmount={getSubtotal()}
                  type="menu"
                  userId={user?.uid}
                  appliedCoupon={appliedCoupon}
                  onApplyCoupon={applyCoupon}
                  onRemoveCoupon={removeCoupon}
                />

                {/* Order Summary Card */}
                <Card className="sticky top-24">
                  <CardHeader>
                    <CardTitle>Order Summary</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-3">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Item amount</span>
                        <span className="font-medium">₹{getSubtotal()}</span>
                      </div>
                      
                      {appliedCoupon && getDiscount() > 0 && (
                        <div className="flex justify-between text-sm text-green-600 dark:text-green-400">
                          <span>Discount ({appliedCoupon.code})</span>
                          <span>-₹{getDiscount()}</span>
                        </div>
                      )}
                      
                      <div className="flex justify-between text-sm">
                        <div className="flex items-center gap-1">
                          <span className="text-muted-foreground">GST</span>
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <button className="inline-flex items-center justify-center">
                                  <Info className="w-3.5 h-3.5 text-gray-400 hover:text-gray-600" />
                                </button>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p className="text-xs">5% GST on food</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </div>
                        <span className="font-medium">₹{pricing.itemGST}</span>
                      </div>
                      
                      <div className="flex justify-between text-sm">
                        <div className="flex items-center gap-1">
                          <span className="text-muted-foreground">Delivery charges</span>
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <button className="inline-flex items-center justify-center">
                                  <Info className="w-3.5 h-3.5 text-gray-400 hover:text-gray-600" />
                                </button>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p className="text-xs">₹{pricing.deliveryFee} + 18% GST</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </div>
                        <span className="font-medium">₹{pricing.deliveryFee + pricing.deliveryGST}</span>
                      </div>
                    </div>

                    <Separator />

                    <div className="flex justify-between text-lg font-bold">
                      <span>Total payable</span>
                      <span className="text-red-600">₹{pricing.grandTotal}</span>
                    </div>

                    {appliedCoupon && getDiscount() > 0 && (
                      <div className="bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-lg p-3">
                        <p className="text-sm text-green-800 dark:text-green-200 text-center">
                          🎉 You&apos;re saving ₹{getDiscount()} with this order!
                        </p>
                      </div>
                    )}

                    <Button
                      onClick={handleProceedToCheckout}
                      className="w-full bg-red-600 hover:bg-red-700 text-lg py-6"
                      disabled={loading}
                    >
                      {loading ? (
                        <>
                          <PaymentLoader size="sm" className="mr-2" />
                          Loading...
                        </>
                      ) : (
                        "Proceed to Checkout"
                      )}
                    </Button>

                    {!loading && !user && (
                      <p className="text-xs text-center text-muted-foreground">
                        You&apos;ll be asked to sign in at checkout
                      </p>
                    )}

                    <Button
                      variant="outline"
                      onClick={() => router.push("/menu")}
                      className="w-full"
                    >
                      Continue Shopping
                    </Button>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </Container>
      </main>
      <Footer />
    </>
  );
}
