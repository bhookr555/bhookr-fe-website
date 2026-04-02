"use client";

import { useState, useMemo } from "react";
import { useCartStore } from "@/store/cart";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { RazorpayCheckout } from "@/components/payment/razorpay-checkout";
import {
  CreditCard,
  Shield,
  CheckCircle2,
} from "lucide-react";
import { PaymentLoader } from "@/components/shared/payment-loader";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { getPricingBreakdown } from "@/config/pricing";
import { getLocalStorageItem, STORAGE_KEYS } from "@/lib/storage";

interface PaymentMethodProps {
  onBack: () => void;
  isProcessing: boolean;
  setIsProcessing: (value: boolean) => void;
}

export function PaymentMethod({
  onBack,
  isProcessing,
  setIsProcessing,
}: PaymentMethodProps) {
  const { items, getTotalPrice, clearCart } = useCartStore();
  const [selectedMethod, setSelectedMethod] = useState<string>("online");
  const [paymentStep, setPaymentStep] = useState<"select" | "processing" | "complete" | "error">("select");
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [retryCount, setRetryCount] = useState(0);

  const totalPrice = getTotalPrice();
  const pricing = getPricingBreakdown(totalPrice);
  const { deliveryFee, grandTotal } = pricing;
  
  // Memoize delivery address to avoid repeated localStorage parsing
  const deliveryAddress = useMemo(() => 
    getLocalStorageItem<any>(STORAGE_KEYS.DELIVERY_ADDRESS) || {},
    []
  );

  // Validate delivery address before allowing payment
  const validateDeliveryAddress = (): boolean => {
    if (!deliveryAddress.fullName || !deliveryAddress.email || !deliveryAddress.phone) {
      toast.error("Delivery address is incomplete", {
        description: "Please go back and fill all required fields",
      });
      return false;
    }
    if (!deliveryAddress.street || !deliveryAddress.city || !deliveryAddress.state || !deliveryAddress.zipCode) {
      toast.error("Delivery address is incomplete", {
        description: "Please go back and complete your address",
      });
      return false;
    }
    return true;
  };

  const paymentMethods = [
    {
      id: "online",
      name: "Pay Online",
      icon: CreditCard,
      description: "UPI, Cards, NetBanking & More",
      popular: true,
      badge: "Powered by Razorpay"
    },
  ];

  const handlePayment = async () => {
    // Validate delivery address first
    if (!validateDeliveryAddress()) {
      return;
    }

    // All payments are online via Razorpay
    // The RazorpayCheckout component will handle the actual payment flow
  };

  const handleRetry = () => {
    setRetryCount(retryCount + 1);
    setErrorMessage("");
    setPaymentStep("select");
    setIsProcessing(false);
  };

  if (paymentStep === "processing") {
    return (
      <div className="max-w-2xl mx-auto">
        <Card className="border-blue-200 dark:border-blue-900/30">
          <CardContent className="py-16">
            <div className="text-center space-y-6">
              <PaymentLoader size="lg" />
              <div>
                <h3 className="text-2xl font-bold mb-2 text-blue-600">Processing Payment</h3>
                <p className="text-muted-foreground text-lg">
                  Please wait while we process your payment securely...
                </p>
                <p className="text-sm text-muted-foreground mt-2">
                  Do not close this window or press the back button
                </p>
              </div>
              <div className="inline-flex items-center justify-center gap-2 text-sm text-muted-foreground bg-gray-50 dark:bg-gray-800 py-3 px-6 rounded-full">
                <Shield className="w-5 h-5 text-green-600" />
                <span className="font-medium">256-bit SSL Encrypted</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (paymentStep === "complete") {
    return (
      <div className="max-w-2xl mx-auto">
        <Card className="border-green-200 dark:border-green-900/30 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20">
          <CardContent className="py-16">
            <div className="text-center space-y-6">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 200 }}
              >
                <CheckCircle2 className="w-24 h-24 text-green-600 mx-auto drop-shadow-2xl" />
              </motion.div>
              <div>
                <h3 className="text-3xl font-bold mb-3 text-green-600">Payment Successful! 🎉</h3>
                <p className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-2">
                  Your order has been placed successfully
                </p>
                <p className="text-muted-foreground">
                  Redirecting to order confirmation...
                </p>
              </div>
              <div className="inline-flex items-center gap-2 px-6 py-3 bg-white dark:bg-gray-800 rounded-full shadow-lg">
                <CheckCircle2 className="w-5 h-5 text-green-600" />
                <span className="font-semibold text-green-600">Transaction Complete</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (paymentStep === "error") {
    return (
      <div className="max-w-2xl mx-auto">
        <Card className="border-red-200 dark:border-red-900/30 bg-gradient-to-br from-red-50 to-orange-50 dark:from-red-900/20 dark:to-orange-900/20">
          <CardContent className="py-16">
            <div className="text-center space-y-6">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 200 }}
              >
                <div className="w-24 h-24 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center mx-auto">
                  <CreditCard className="w-12 h-12 text-red-600" />
                </div>
              </motion.div>
              <div>
                <h3 className="text-3xl font-bold mb-3 text-red-600">Payment Failed</h3>
                <p className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-2">
                  {errorMessage || "Something went wrong with your payment"}
                </p>
                <p className="text-muted-foreground">
                  Don&apos;t worry, your items are still in the cart.
                </p>
                {retryCount > 0 && (
                  <p className="text-sm text-muted-foreground mt-2">
                    Retry attempt {retryCount}
                  </p>
                )}
              </div>
              <div className="space-y-3">
                <Button
                  onClick={handleRetry}
                  className="w-full h-12 bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-700 hover:to-orange-700 font-semibold"
                >
                  Retry Payment
                </Button>
                <Button
                  onClick={onBack}
                  variant="outline"
                  className="w-full h-12"
                >
                  Change Payment Method
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      {/* Payment Methods */}
      <div className="lg:col-span-2">
        <Card className="border-2 border-red-100 dark:border-red-900/30">
          <CardHeader className="bg-gradient-to-r from-red-50 to-orange-50 dark:from-red-900/20 dark:to-orange-900/20">
            <CardTitle className="text-xl">Select Payment Method</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 pt-6">
            {paymentMethods.map((method) => {
              const Icon = method.icon;
              return (
                <button
                  key={method.id}
                  onClick={() => setSelectedMethod(method.id)}
                  disabled={isProcessing}
                  className={`
                    w-full p-4 rounded-lg border-2 transition-all text-left
                    ${
                      selectedMethod === method.id
                        ? "border-red-600 bg-red-50 dark:bg-red-900/20"
                        : "border-gray-200 dark:border-gray-700 hover:border-gray-300"
                    }
                    ${isProcessing ? "opacity-50 cursor-not-allowed" : ""}
                  `}
                >
                  <div className="flex items-center gap-4">
                    <div
                      className={`
                      w-12 h-12 rounded-full flex items-center justify-center
                      ${
                        selectedMethod === method.id
                          ? "bg-red-100 dark:bg-red-900/30"
                          : "bg-gray-100 dark:bg-gray-800"
                      }
                    `}
                    >
                      <Icon
                        className={`w-6 h-6 ${
                          selectedMethod === method.id
                            ? "text-red-600"
                            : "text-gray-600"
                        }`}
                      />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold">{method.name}</h3>
                        {method.popular && (
                          <span className="px-2 py-0.5 text-xs font-medium bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 rounded-full">
                            Popular
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {method.description}
                      </p>
                      {method.badge && (
                        <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                          <Shield className="w-3 h-3" />
                          {method.badge}
                        </p>
                      )}
                    </div>
                    <div
                      className={`
                      w-5 h-5 rounded-full border-2 flex items-center justify-center
                      ${
                        selectedMethod === method.id
                          ? "border-red-600 bg-red-600"
                          : "border-gray-300"
                      }
                    `}
                    >
                      {selectedMethod === method.id && (
                        <div className="w-2 h-2 rounded-full bg-white" />
                      )}
                    </div>
                  </div>
                </button>
              );
            })}

            {/* Security Badge */}
            <div className="flex items-center justify-center gap-4 pt-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Shield className="w-4 h-4 text-green-600" />
                <span>Secure Payment</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <CheckCircle2 className="w-4 h-4 text-green-600" />
                <span>256-bit Encryption</span>
              </div>
            </div>
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
                    {items.length} {items.length === 1 ? "item" : "items"}
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

            <div className="grid grid-cols-2 gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={onBack}
                disabled={isProcessing}
                className="h-12"
              >
                Back
              </Button>
              {selectedMethod === "online" ? (
                <RazorpayCheckout
                  amount={grandTotal}
                  orderType="menu"
                  customerName={deliveryAddress.fullName || "Guest"}
                  customerEmail={deliveryAddress.email || "guest@example.com"}
                  customerPhone={deliveryAddress.phone || ""}
                  items={items.map((item) => ({
                    planId: item.planId,
                    name: item.plan.name,
                    price: item.plan.price,
                    quantity: item.quantity,
                  }))}
                  deliveryAddress={{
                    fullName: deliveryAddress.fullName || "",
                    phone: deliveryAddress.phone || "",
                    address: deliveryAddress.street || "",
                    city: deliveryAddress.city || "",
                    state: deliveryAddress.state || "",
                    pinCode: deliveryAddress.zipCode || "",
                  }}
                  onSuccess={(orderId, paymentId) => {
                    // Clear cart on successful payment
                    clearCart();
                    
                    toast.success("Payment successful!", {
                      description: "Redirecting to confirmation page...",
                    });
                    
                    // Store order ID for confirmation page
                    localStorage.setItem('pendingOrderId', orderId);
                    localStorage.setItem('lastPaymentId', paymentId);
                    
                    // Small delay for better UX
                    setTimeout(() => {
                      window.location.href = `/payment/result?orderId=${orderId}`;
                    }, 500);
                  }}
                  onError={(error) => {
                    console.error("Payment error:", error);
                    setPaymentStep("error");
                    setErrorMessage(error || "Payment failed. Please try again.");
                    toast.error("Payment Failed", {
                      description: error || "Please try again or contact support",
                    });
                  }}
                  disabled={isProcessing || !validateDeliveryAddress()}
                  className="h-12 bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-700 hover:to-orange-700 font-semibold"
                />
              ) : (
                <Button
                  onClick={handlePayment}
                  disabled={isProcessing}
                  className="h-12 bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-700 hover:to-orange-700 font-semibold"
                >
                  {isProcessing && <PaymentLoader size="sm" className="mr-2" />}
                  Place Order
                </Button>
              )}
            </div>

            <p className="text-xs text-center text-muted-foreground">
              By proceeding, you agree to our Terms & Conditions
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
