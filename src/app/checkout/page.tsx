"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useCartStore } from "@/store/cart";
import { useAuth } from "@/contexts/AuthContext";
import { Header } from "@/components/layouts/header";
import { Footer } from "@/components/layouts/footer";
import { Container } from "@/components/layouts/container";
import { CheckoutStepper } from "@/components/checkout/checkout-stepper";
import { Button } from "@/components/ui/button";
import { LoadingOverlay } from "@/components/shared/loading-overlay";
import { motion, AnimatePresence } from "framer-motion";
import { DeliveryAddress } from "@/components/checkout/delivery-address";
import { OrderReview } from "@/components/checkout/order-review";
import { PaymentMethod } from "@/components/checkout/payment-method";
import { OrderConfirmation } from "@/components/checkout/order-confirmation";
import { getLocalStorageItem, setLocalStorageItem, STORAGE_KEYS } from "@/lib/storage";
import { toast } from "sonner";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";

export default function CheckoutPage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const { items } = useCartStore();
  const [currentStep, setCurrentStep] = useState(1);
  const [isProcessing, setIsProcessing] = useState(false);
  const [deliveryData, setDeliveryData] = useState<any>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Check authentication only once after loading completes
  useEffect(() => {
    if (!loading) {
      setAuthChecked(true);
      
      // Verify user is authenticated
      if (!user) {
        toast.error("Please sign in to continue", {
          description: "You need to be signed in to checkout",
        });
        // Store current location to redirect back after sign in
        localStorage.setItem('redirectAfterAuth', '/checkout');
        router.replace('/signin');
        return;
      }

      // Load delivery data from localStorage if it exists
      const savedAddress = getLocalStorageItem(STORAGE_KEYS.DELIVERY_ADDRESS);
      if (savedAddress) {
        setDeliveryData(savedAddress);
      }

      // Restore step from localStorage (if user refreshed)
      const savedStep = getLocalStorageItem<number>('checkoutStep');
      if (savedStep && savedStep >= 1 && savedStep <= 3) {
        setCurrentStep(savedStep);
      }
    }
  }, [loading, user, router]);

  // Redirect to cart if empty
  useEffect(() => {
    if (authChecked && items.length === 0) {
      toast.info("Your cart is empty", {
        description: "Add items to cart before checkout",
      });
      router.replace("/cart");
    }
  }, [authChecked, items.length, router]);

  // Save current step to localStorage for persistence
  useEffect(() => {
    if (currentStep >= 1 && currentStep <= 3) {
      setLocalStorageItem('checkoutStep', currentStep);
    }
  }, [currentStep]);

  const handleNextStep = (data?: any) => {
    try {
      if (data) {
        setDeliveryData(data);
      }
      
      // Validate before moving to next step
      if (currentStep === 1 && !data) {
        toast.error("Please complete delivery address");
        return;
      }

      if (currentStep < 3) {
        setCurrentStep(currentStep + 1);
        setError(null); // Clear any previous errors
        // Scroll to top when moving to next step
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    } catch (err) {
      console.error("Error in handleNextStep:", err);
      setError("Failed to proceed. Please try again.");
      toast.error("Something went wrong", {
        description: "Please try again",
      });
    }
  };

  const handlePrevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
      // Scroll to top when moving to previous step
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleEditAddress = () => {
    setCurrentStep(1);
    // Scroll to top when editing address
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Loading state or auth not checked yet
  if (loading || !authChecked) {
    return <LoadingOverlay message="Loading checkout..." size="lg" fullScreen />;
  }

  // Empty cart - will redirect to cart page
  if (items.length === 0) {
    return <LoadingOverlay message="Redirecting to cart..." size="md" fullScreen />;
  }

  const steps = [
    { number: 1, title: "Delivery Address", component: DeliveryAddress },
    { number: 2, title: "Review Order", component: OrderReview },
    { number: 3, title: "Payment", component: PaymentMethod },
  ];

  return (
    <>
      <Header />
      <main className="min-h-screen bg-gradient-to-b from-gray-50 to-white dark:from-gray-900 dark:to-gray-800 py-8 md:py-12">
        <Container>
          {currentStep <= 3 ? (
            <div className="max-w-6xl mx-auto">
              {/* Back to Cart Button */}
              <Button
                variant="ghost"
                onClick={() => router.push("/cart")}
                className="mb-4 hover:bg-red-50 hover:text-red-600"
              >
                ← Back to Cart
              </Button>

              {/* Stepper */}
              <CheckoutStepper currentStep={currentStep} steps={steps} />

              {/* Error Display */}
              {error && (
                <Alert variant="destructive" className="mt-4">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              {/* Content */}
              <div className="mt-8">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={currentStep}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.3 }}
                  >
                    {currentStep === 1 && (
                      <DeliveryAddress
                        onNext={handleNextStep}
                        onBack={() => router.push("/cart")}
                        isProcessing={isProcessing}
                      />
                    )}
                    {currentStep === 2 && (deliveryData || getLocalStorageItem(STORAGE_KEYS.DELIVERY_ADDRESS)) && (
                      <OrderReview
                        deliveryData={deliveryData || getLocalStorageItem(STORAGE_KEYS.DELIVERY_ADDRESS) || {}}
                        onNext={handleNextStep}
                        onBack={handlePrevStep}
                        onEditAddress={handleEditAddress}
                        isProcessing={isProcessing}
                      />
                    )}
                    {currentStep === 3 && (
                      <PaymentMethod
                        onBack={handlePrevStep}
                        isProcessing={isProcessing}
                        setIsProcessing={setIsProcessing}
                      />
                    )}
                  </motion.div>
                </AnimatePresence>
              </div>
            </div>
          ) : (
            <OrderConfirmation/>
          )}
        </Container>
      </main>
      <Footer />
    </>
  );
}
