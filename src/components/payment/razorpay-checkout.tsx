/**
 * Razorpay Checkout Component
 * 
 * This component integrates Razorpay's checkout UI for payment processing.
 * 
 * Flow:
 * 1. Create order on backend
 * 2. Initialize Razorpay checkout
 * 3. Handle payment response
 * 4. Verify payment on backend
 * 5. Show success/error
 */

"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { PaymentLoader } from "@/components/shared/payment-loader";
import { useAuth } from "@/contexts/AuthContext";
import logger from "@/lib/logger";
import { Shield, Lock } from "lucide-react";

// Razorpay types
declare global {
  interface Window {
    Razorpay: any;
  }
}

interface RazorpayCheckoutProps {
  amount: number;
  orderType?: 'menu' | 'subscription';
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  items: Array<{
    planId: string;
    name: string;
    price: number;
    quantity: number;
  }>;
  deliveryAddress: {
    fullName: string;
    phone: string;
    address: string;
    city: string;
    state: string;
    pinCode: string;
  };
  onSuccess?: (orderId: string, paymentId: string) => void;
  onError?: (error: string) => void;
  disabled?: boolean;
  className?: string;
}

export function RazorpayCheckout({
  amount,
  orderType = 'menu',
  customerName,
  customerEmail,
  customerPhone,
  items,
  deliveryAddress,
  onSuccess,
  onError,
  disabled = false,
  className = "",
}: RazorpayCheckoutProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(false);

  /**
   * Load Razorpay script
   */
  const loadRazorpayScript = (): Promise<boolean> => {
    return new Promise((resolve) => {
      // Check if already loaded
      if (window.Razorpay) {
        resolve(true);
        return;
      }

      const script = document.createElement("script");
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.async = true;
      script.onload = () => {
        resolve(true);
      };
      script.onerror = () => {
        resolve(false);
      };
      document.body.appendChild(script);
    });
  };

  /**
   * Initiate Razorpay payment
   */
  const initiatePayment = async () => {
    setLoading(true);

    try {
      // Check authentication
      if (!user) {
        throw new Error("Please sign in to complete payment");
      }

      // 1. Load Razorpay script
      const scriptLoaded = await loadRazorpayScript();
      if (!scriptLoaded) {
        throw new Error("Failed to load Razorpay. Please check your internet connection.");
      }

      // 2. Get Firebase ID token
      const idToken = await user.getIdToken();

      // 3. Get CSRF token
      const csrfResponse = await fetch("/api/csrf");
      const { token: csrfToken } = await csrfResponse.json();

      // 4. Create order on backend
      logger.info("[Razorpay] Creating order", {
        amount,
        customerEmail,
        itemCount: items.length,
      });

      // Sanitize phone numbers (remove spaces, dashes, country codes)
      const sanitizePhone = (phone: string): string => {
        if (!phone) return "";
        // Remove all non-digits
        const cleaned = phone.replace(/\D/g, "");
        // If starts with 91, remove it (country code)
        if (cleaned.startsWith("91") && cleaned.length === 12) {
          return cleaned.substring(2);
        }
        return cleaned;
      };

      // Sanitize and validate data
      const sanitizedCustomerPhone = sanitizePhone(customerPhone);
      const sanitizedDeliveryPhone = sanitizePhone(deliveryAddress.phone);
      const sanitizedPinCode = deliveryAddress.pinCode.replace(/\D/g, ""); // Remove non-digits

      // Validate required fields
      if (!customerName || customerName.trim() === "") {
        throw new Error("Customer name is required");
      }
      if (!customerEmail || customerEmail.trim() === "") {
        throw new Error("Customer email is required");
      }
      if (!deliveryAddress.fullName || deliveryAddress.fullName.trim() === "") {
        throw new Error("Delivery full name is required");
      }
      if (!sanitizedDeliveryPhone || sanitizedDeliveryPhone.length !== 10) {
        throw new Error("Please enter a valid 10-digit phone number for delivery");
      }
      if (!deliveryAddress.address || deliveryAddress.address.trim().length < 5) {
        throw new Error("Please enter a complete delivery address (minimum 5 characters)");
      }
      if (!deliveryAddress.city || deliveryAddress.city.trim() === "") {
        throw new Error("Delivery city is required");
      }
      if (!deliveryAddress.state || deliveryAddress.state.trim() === "") {
        throw new Error("Delivery state is required");
      }
      if (!sanitizedPinCode || sanitizedPinCode.length !== 6) {
        throw new Error("Please enter a valid 6-digit PIN code");
      }

      const orderResponse = await fetch("/api/payment/razorpay/create-order", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${idToken}`,
          "X-CSRF-Token": csrfToken,
        },
        credentials: "include",
        body: JSON.stringify({
          amount,
          orderType,
          customerName: customerName.trim(),
          customerEmail: customerEmail.trim(),
          customerPhone: sanitizedCustomerPhone,
          items,
          deliveryAddress: {
            fullName: deliveryAddress.fullName.trim(),
            phone: sanitizedDeliveryPhone,
            address: deliveryAddress.address.trim(),
            city: deliveryAddress.city.trim(),
            state: deliveryAddress.state.trim(),
            pinCode: sanitizedPinCode,
          },
        }),
      });

      if (!orderResponse.ok) {
        const errorData = await orderResponse.json();
        logger.error("[Razorpay] Order creation failed", new Error(errorData.error || "Failed to create order"), {
          status: orderResponse.status,
          errorData,
          sentData: {
            amount,
            customerName,
            customerEmail,
            customerPhone,
            itemCount: items.length,
            deliveryAddress
          }
        });
        throw new Error(errorData.error || "Failed to create order");
      }

      const orderData = await orderResponse.json();
      
      logger.info("[Razorpay] Order created", {
        orderId: orderData.orderId,
        razorpayOrderId: orderData.razorpayOrderId,
      });

      // 4. Initialize Razorpay checkout
      const options = {
        key: orderData.keyId,
        amount: orderData.amount,
        currency: orderData.currency,
        name: "Bhookr",
        description: `Payment for ${items.length} item(s)`,
        order_id: orderData.razorpayOrderId,
        prefill: {
          name: customerName,
          email: customerEmail,
          contact: customerPhone,
        },
        theme: {
          color: "#10b981", // Your brand color
        },
        modal: {
          ondismiss: () => {
            setLoading(false);
            toast.info("Payment cancelled");
          },
        },
        handler: async (response: any) => {
          // 5. Payment successful - verify on backend
          // Show blocking overlay during verification
          setVerifying(true);
          setLoading(false); // Hide button loading state
          
          try {
            logger.info("[Razorpay] Payment completed, verifying...", {
              orderId: orderData.orderId,
              razorpayPaymentId: response.razorpay_payment_id,
            });

            // Get fresh ID token for verification
            const verifyIdToken = await user.getIdToken();

            const verifyResponse = await fetch("/api/payment/razorpay/verify", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${verifyIdToken}`,
              },
              credentials: "include",
              body: JSON.stringify({
                orderId: orderData.orderId,
                razorpayOrderId: response.razorpay_order_id,
                razorpayPaymentId: response.razorpay_payment_id,
                razorpaySignature: response.razorpay_signature,
              }),
            });

            const verifyData = await verifyResponse.json();

            // Check if the response was successful or requires manual review
            if (!verifyResponse.ok) {
              // Handle manual review case (status 202)
              if (verifyResponse.status === 202) {
                logger.info('[Razorpay] Payment under review', {
                  orderId: orderData.orderId,
                  status: verifyData.status,
                });
                
                toast.info(
                  verifyData.message || 
                  'Your payment was received and is under review. You will receive confirmation within 24 hours.',
                  { duration: 8000 }
                );
                
                // Consider this as a success for navigation purposes
                onSuccess?.(orderData.orderId, response.razorpay_payment_id);
                return;
              }
              
              // Handle error response
              const errorMessage = verifyData.error || verifyData.message || "Payment verification failed";
              logger.error("[Razorpay] Payment verification API error", new Error(errorMessage), {
                status: verifyResponse.status,
                responseData: verifyData,
              });
              throw new Error(errorMessage);
            }

            if (verifyData.verified) {
              logger.info("[Razorpay] Payment verified successfully", {
                orderId: orderData.orderId,
                paymentId: response.razorpay_payment_id,
              });

              toast.success("Payment successful!");
              onSuccess?.(orderData.orderId, response.razorpay_payment_id);
            } else {
              throw new Error(verifyData.error || "Payment verification failed");
            }
          } catch (verifyError: any) {
            logger.error("[Razorpay] Payment verification failed", verifyError);
            
            // Show user-friendly error message
            const errorMessage = verifyError.message || "Payment verification failed. Please try again or contact support.";
            toast.error(errorMessage);
            onError?.(errorMessage);
          } finally {
            setVerifying(false);
          }
        },
      };

      const razorpay = new window.Razorpay(options);
      
      razorpay.on("payment.failed", (response: any) => {
        logger.error("[Razorpay] Payment failed", new Error(response.error.description));
        setLoading(false);
        toast.error(response.error.description || "Payment failed");
        onError?.(response.error.description);
      });

      razorpay.open();
    } catch (error: any) {
      logger.error("[Razorpay] Payment initiation error", error);
      setLoading(false);
      toast.error(error.message || "Failed to initiate payment");
      onError?.(error.message);
    }
  };

  return (
    <>
      {/* Blocking Overlay During Verification */}
      {verifying && (
        <div className="fixed inset-0 z-9999 flex items-center justify-center bg-black/80 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl p-8 max-w-md w-full mx-4 border-2 border-green-500/20">
            <div className="text-center space-y-6">
              {/* Animated Icon */}
              <div className="relative mx-auto w-24 h-24">
                <div className="absolute inset-0 rounded-full bg-green-500/20 animate-ping"></div>
                <div className="relative flex items-center justify-center w-24 h-24 rounded-full bg-linear-to-br from-green-500 to-emerald-600 shadow-lg">
                  <Shield className="w-12 h-12 text-white animate-pulse" />
                </div>
              </div>

              {/* Main Message */}
              <div className="space-y-2">
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white">
                  Verifying Payment
                </h3>
                <p className="text-gray-600 dark:text-gray-300 text-lg">
                  Please wait while we confirm your payment...
                </p>
              </div>

              {/* Loader */}
              <div className="flex justify-center">
                <PaymentLoader size="lg" />
              </div>

              {/* Security Messages */}
              <div className="space-y-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                  <Lock className="w-4 h-4 text-green-600" />
                  <span>Secure transaction in progress</span>
                </div>
                <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-3">
                  <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
                    ⚠️ Do not close this window or press back
                  </p>
                  <p className="text-xs text-amber-700 dark:text-amber-300 mt-1">
                    Your payment is being processed
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Payment Button */}
      <Button
        onClick={initiatePayment}
        disabled={disabled || loading || verifying}
        className={className}
        size="lg"
      >
        {loading ? (
          <span className="flex items-center gap-2">
            <PaymentLoader size="sm" />
            Processing...
          </span>
        ) : verifying ? (
          <span className="flex items-center gap-2">
            <PaymentLoader size="sm" />
            Verifying...
          </span>
        ) : (
          `Pay ₹${amount.toLocaleString()}`
        )}
      </Button>
    </>
  );
}
