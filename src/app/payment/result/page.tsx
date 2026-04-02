/**
 * Payment Result Page
 * 
 * This page handles the redirect from payment gateway.
 * It verifies the payment status from backend and shows comprehensive order confirmation.
 * 
 * URL: /payment/result?orderId={orderId}
 * 
 * ⚠️ IMPORTANT: Never trust URL parameters. Always verify from backend.
 */

"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useCartStore } from "@/store/cart";
import { useGoogleSheets } from "@/hooks/use-google-sheets";
import { Header } from "@/components/layouts/header";
import { Footer } from "@/components/layouts/footer";
import { Container } from "@/components/layouts/container";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import {
  CheckCircle2,
  XCircle,
  Loader2,
  ArrowRight,
  RotateCw,
  Package,
  Clock,
  Download,
  MapPin,
  Calendar,
  Receipt,
  User,
  Phone,
  CreditCard,
} from "lucide-react";
import { motion } from "framer-motion";
import { format } from "date-fns";
import logger from "@/lib/logger";
import { browserDevLogger } from "@/lib/dev-logger";
import Confetti from "react-confetti";
import { printInvoice } from "@/lib/invoice";
import type { InvoiceData } from "@/types/subscription";
import type { SubscriptionData } from "@/lib/google-sheets";

type PaymentStatus = "PENDING" | "PAID" | "FAILED" | "EXPIRED";

interface OrderItem {
  planId: string;
  name: string;
  price: number;
  quantity: number;
}

interface DeliveryAddress {
  fullName: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  pinCode: string;
}

interface PaymentResult {
  orderId: string;
  status: PaymentStatus;
  orderType?: 'menu' | 'subscription';
  amount: number;
  transactionId?: string;
  paymentMethod?: string;
  paidAt?: string;
  message?: string;
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
  items?: OrderItem[];
  deliveryAddress?: DeliveryAddress;
  // Menu items pricing breakdown
  itemAmount?: number;
  itemGST?: number;
  deliveryBase?: number;
  deliveryGST?: number;
  deliveryCharges?: number;
  // Subscription pricing breakdown
  subscriptionAmount?: number;
  gstAmount?: number;
  startDate?: string;
  duration?: string;
  // Email delivery status
  emailDelivery?: {
    sent: boolean;
    messageId?: string;
    recipient?: string;
    error?: string;
  };
}

function PaymentResultContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { clearCart } = useCartStore();
  const { submitSubscription } = useGoogleSheets();
  
  const [isVerifying, setIsVerifying] = useState(true);
  const [result, setResult] = useState<PaymentResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [showConfetti, setShowConfetti] = useState(false);
  
  const orderId = searchParams.get("orderId");

  /**
   * Submit subscription to Google Sheets after successful payment
   */
  const submitSubscriptionToSheet = async (paymentResult: PaymentResult) => {
    try {
      // Only submit for subscription orders
      if (paymentResult.orderType !== 'subscription') {
        console.log('⏭️ Skipping Google Sheets submission - not a subscription order');
        return;
      }

      console.log('📊 Submitting subscription to Google Sheets...');

      // Get form data from localStorage (saved during subscription flow)
      const savedFormData = localStorage.getItem('subscriptionFormData');
      if (!savedFormData) {
        console.warn('⚠️ No subscription form data found in localStorage');
        return;
      }

      console.log('📦 Retrieved form data from localStorage');
      const formData = JSON.parse(savedFormData);
      console.log('📋 Form data structure:', {
        hasPersonalInfo: !!formData.personalInfo,
        hasPhysicalInfo: !!formData.physicalInfo,
        hasPlanSelection: !!formData.planSelection,
        planType: formData.planSelection?.planType
      });

      // Helper: Convert plan type to meal plans (fallback only)
      const getPlanMeals = (planType: string): string[] => {
        switch (planType) {
          case 'lite':
            return ['Breakfast'];
          case 'standard':
            return ['Breakfast', 'Lunch'];
          case 'elite':
            return ['Breakfast', 'Lunch', 'Dinner'];
          default:
            return [];
        }
      };

      // Use actual selected meals if available, otherwise fallback to plan type
      const selectedMeals = formData.planSelection?.selectedMeals;
      const planType = formData.planSelection?.planType || '';
      const mealPlans = selectedMeals && selectedMeals.length > 0
        ? selectedMeals
        : getPlanMeals(planType);

      // Prepare subscription data
      const subscriptionData: SubscriptionData = {
        name: paymentResult.customerName || formData.personalInfo?.fullName || '',
        email: paymentResult.customerEmail || formData.personalInfo?.email || '',
        phoneNumber: paymentResult.customerPhone || formData.personalInfo?.phoneNumber || '',
        age: formData.personalInfo?.age || 0,
        gender: formData.physicalInfo?.gender || '',
        height: formData.physicalInfo?.height || 0,
        weight: formData.physicalInfo?.weight || 0,
        goal: formData.goalSelection?.goal || '',
        diet: formData.dietSelection?.dietType || '',
        foodPreference: formData.foodPreferenceSelection?.foodPreference || '',
        physicalState: formData.activityAndDuration?.activityLevel || '',
        subscriptionType: formData.activityAndDuration?.duration || paymentResult.duration || '',
        plan: mealPlans,
        subscriptionStartDate: formData.planSelection?.startDate || paymentResult.startDate || '',
        
        // Payment details
        paymentStatus: paymentResult.status === 'PAID' ? 'success' : 
                       paymentResult.status === 'FAILED' ? 'failed' : 'pending',
        transactionId: paymentResult.transactionId || '',
        orderId: paymentResult.orderId,
        amountPaid: paymentResult.amount,
        paymentMethod: paymentResult.paymentMethod || 'online',
        paymentTimestamp: paymentResult.paidAt || new Date().toISOString(),
        status: 'active',
      };

      console.log('📝 Subscription data prepared for Google Sheets:', {
        email: subscriptionData.email,
        name: subscriptionData.name,
        plan: subscriptionData.plan,
        planType: formData.planSelection?.planType,
        selectedMeals: formData.planSelection?.selectedMeals,
        orderId: subscriptionData.orderId,
        amount: subscriptionData.amountPaid
      });

      // Submit to Google Sheets
      const success = await submitSubscription(subscriptionData);
      
      if (success) {
        console.log('✅ Subscription submitted to Google Sheets successfully');
        // Clear form data from localStorage after successful submission
        localStorage.removeItem('subscriptionFormData');
      } else {
        console.warn('⚠️ Subscription submission to Google Sheets failed (non-blocking)');
      }
    } catch (error) {
      console.error('❌ Error submitting subscription to Google Sheets:', error);
      // Don't throw - this is a non-critical operation
    }
  };

  /**
   * Safely format date - handles invalid dates and Firestore timestamps
   */
  const formatSafeDate = (dateValue: any, formatStr: string = "dd MMM yyyy, hh:mm a"): string => {
    try {
      if (!dateValue) return format(new Date(), formatStr);
      
      // Handle Firestore Timestamp
      const date = dateValue.toDate ? dateValue.toDate() : new Date(dateValue);
      
      // Check if date is valid
      if (isNaN(date.getTime())) {
        return format(new Date(), formatStr);
      }
      
      return format(date, formatStr);
    } catch (error) {
      console.error('[Payment Result] Date formatting error:', error);
      return format(new Date(), formatStr);
    }
  };
  
  /**
   * Handle invoice download
   */
  const handleDownloadInvoice = () => {
    if (!result) return;

    try {
      // Determine if it's a subscription or menu order
      const isSubscription = result.orderType === 'subscription' || !!(result.startDate || result.duration);
      
      let invoiceData: InvoiceData;
      
      if (isSubscription) {
        // Subscription invoice
        const subscriptionAmount = result.subscriptionAmount || result.amount * 0.85;
        const deliveryCharges = result.deliveryCharges || result.amount * 0.15;
        const subscriptionGST = subscriptionAmount * 0.05; // 5% GST on subscription
        const deliveryGST = deliveryCharges * 0.18; // 18% GST on delivery

        invoiceData = {
          invoiceNumber: result.orderId.slice(0, 8).toUpperCase(),
          orderDate: parseInvoiceDate(result.paidAt),
          customerName: result.customerName || "Customer",
          email: result.customerEmail || "",
          phone: result.customerPhone || "",
          planName: result.items?.[0]?.name || "Meal Subscription Plan",
          duration: result.duration || "Monthly",
          startDate: parseInvoiceDate(result.startDate),
          subscriptionAmount,
          subscriptionGST,
          deliveryCharges,
          deliveryGST,
          totalAmount: result.amount,
          paymentMethod: result.paymentMethod || "Online",
          paymentId: result.transactionId || result.orderId,
          isSubscription: true,
        };
      } else {
        // Menu items invoice
        const itemAmount = result.itemAmount || result.items?.reduce((sum, item) => sum + (item.price * item.quantity), 0) || 0;
        const itemGST = result.itemGST || Math.round(itemAmount * 0.05);
        const deliveryBase = result.deliveryBase || 99;
        const deliveryGST = result.deliveryGST || Math.round(deliveryBase * 0.18);
        
        invoiceData = {
          invoiceNumber: result.orderId.slice(0, 8).toUpperCase(),
          orderDate: parseInvoiceDate(result.paidAt),
          customerName: result.customerName || "Customer",
          email: result.customerEmail || "",
          phone: result.customerPhone || "",
          items: result.items || [],
          itemAmount,
          itemGST,
          deliveryBase,
          deliveryGST,
          totalAmount: result.amount,
          paymentMethod: result.paymentMethod || "Online",
          paymentId: result.transactionId || result.orderId,
          isSubscription: false,
        };
      }

      printInvoice(invoiceData);
      logger.info("[Payment Result] Invoice downloaded", { orderId: result.orderId });
    } catch (error) {
      logger.error(
        "[Payment Result] Invoice download failed",
        error instanceof Error ? error : new Error(String(error)),
        { orderId: result?.orderId }
      );
      alert("Failed to download invoice. Please try again.");
    }
  };

  // Safely parse dates for invoice
  const parseInvoiceDate = (dateValue: any): Date => {
    try {
      if (!dateValue) return new Date();
      const date = dateValue.toDate ? dateValue.toDate() : new Date(dateValue);
      return isNaN(date.getTime()) ? new Date() : date;
    } catch {
      return new Date();
    }
  };

  /**
   * Verify payment status from backend
   */
  const verifyPayment = async (orderId: string) => {
    try {
      setIsVerifying(true);
      setError(null);
      
      logger.info('[Payment Result] Verifying payment', { orderId });
      
      const response = await fetch(`/api/payment/verify?orderId=${orderId}`);
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to verify payment');
      }
      
      logger.info('[Payment Result] Payment verified', {
        orderId,
        status: data.status,
      });
      
      // Log email delivery status in development
      if (data.emailDelivery) {
        browserDevLogger.emailDelivery(data.emailDelivery);
      }
      
      setResult(data);
      
      // Clear cart if payment is successful
      if (data.status === 'PAID') {
        clearCart();
        setShowConfetti(true);
        
        // Submit subscription to Google Sheets (non-blocking)
        submitSubscriptionToSheet(data).catch(err => {
          console.error('Failed to submit subscription to Google Sheets:', err);
          // Don't show error to user - this is background tracking
        });
        
        // Hide confetti after 5 seconds
        setTimeout(() => setShowConfetti(false), 5000);
      }
      
    } catch (error) {
      logger.error(
        '[Payment Result] Verification failed',
        error instanceof Error ? error : new Error(String(error)),
        { orderId }
      );
      
      setError(
        error instanceof Error
          ? error.message
          : 'Failed to verify payment. Please try again.'
      );
    } finally {
      setIsVerifying(false);
    }
  };
  
  /**
   * Initial verification on page load
   */
  useEffect(() => {
    console.log('[Payment Result] Page mounted, orderId from URL:', orderId);
    
    // Check URL parameter first
    if (orderId) {
      console.log('[Payment Result] Verifying order from URL:', orderId);
      verifyPayment(orderId);
      return;
    }
    
    // Check localStorage for pending order
    const pendingOrderId = localStorage.getItem('pendingOrderId');
    console.log('[Payment Result] Pending order ID from localStorage:', pendingOrderId);
    
    if (pendingOrderId) {
      console.log('[Payment Result] Verifying order from localStorage:', pendingOrderId);
      verifyPayment(pendingOrderId);
      localStorage.removeItem('pendingOrderId');
      return;
    }
    
    // No order ID found
    console.error('[Payment Result] No order ID found in URL or localStorage');
    setError('Order ID not found. Please check your email for order details.');
    setIsVerifying(false);
  }, [orderId]);
  
  /**
   * Retry verification
   */
  const handleRetry = () => {
    if (orderId) {
      setRetryCount(retryCount + 1);
      verifyPayment(orderId);
    }
  };
  
  /**
   * Render loading state
   */
  if (isVerifying) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <Container className="flex-1 flex items-center justify-center py-12">
          <Card className="w-full max-w-md">
            <CardContent className="pt-6">
              <div className="flex flex-col items-center space-y-4 text-center">
                <div className="relative">
                  <Loader2 className="h-16 w-16 animate-spin text-primary" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Package className="h-8 w-8 text-primary/50" />
                  </div>
                </div>
                <div>
                  <h2 className="text-2xl font-bold">Verifying Payment</h2>
                  <p className="text-muted-foreground mt-2">
                    Please wait while we confirm your payment...
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </Container>
        <Footer />
      </div>
    );
  }
  
  /**
   * Render error state
   */
  if (error) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <Container className="flex-1 flex items-center justify-center py-12">
          <Card className="w-full max-w-md">
            <CardContent className="pt-6">
              <div className="flex flex-col items-center space-y-4 text-center">
                <div className="w-16 h-16 rounded-full bg-yellow-100 flex items-center justify-center">
                  <Clock className="h-8 w-8 text-yellow-600" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold">Verification Pending</h2>
                  <p className="text-muted-foreground mt-2">{error}</p>
                </div>
                <Alert>
                  <AlertDescription>
                    If you have completed the payment, please wait a few moments and retry verification.
                    Order details will be sent to your email.
                  </AlertDescription>
                </Alert>
                <div className="flex gap-3 w-full">
                  <Button onClick={handleRetry} className="flex-1">
                    <RotateCw className="mr-2 h-4 w-4" />
                    Retry Verification
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => router.push(result?.orderType === 'subscription' ? '/my-subscription' : '/menu')}
                    className="flex-1"
                  >
                    {result?.orderType === 'subscription' ? 'View Subscription' : 'Back to Menu'}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </Container>
        <Footer />
      </div>
    );
  }
  
  /**
   * Render success state with comprehensive order confirmation
   */
  if (result?.status === 'PAID') {
    return (
      <div className="min-h-screen flex flex-col bg-gradient-to-b from-green-50/50 to-background">
        {showConfetti && <Confetti recycle={false} numberOfPieces={500} />}
        <Header />
        <Container className="flex-1 py-8 md:py-12">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="max-w-4xl mx-auto space-y-6"
          >
            {/* Success Banner */}
            <Card className="border-green-200 bg-gradient-to-r from-green-50 to-emerald-50">
              <CardContent className="pt-6">
                <div className="flex flex-col md:flex-row items-center gap-4 text-center md:text-left">
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
                    className="shrink-0 w-16 h-16 rounded-full bg-green-500 flex items-center justify-center shadow-lg"
                  >
                    <CheckCircle2 className="h-10 w-10 text-white" />
                  </motion.div>
                  
                  <div className="flex-1">
                    <h1 className="text-3xl md:text-4xl font-bold text-green-700">
                      {result.orderType === 'subscription' || result.startDate || result.duration ? "Subscription Activated!" : "Order Confirmed!"}
                    </h1>
                    <p className="text-lg text-green-600 mt-1">
                      {result.orderType === 'subscription' || result.startDate || result.duration 
                        ? "Thank you! Your healthy meal subscription is now active."
                        : "Thank you! Your one-time meal order has been confirmed."}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Order Summary Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Receipt className="h-5 w-5" />
                  Order Summary
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Order Info Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Order ID</p>
                    <p className="font-mono font-semibold">
                      {result.orderId.slice(0, 12)}...
                    </p>
                  </div>
                  
                  {result.transactionId && (
                    <div className="space-y-1">
                      <p className="text-sm text-muted-foreground">Transaction ID</p>
                      <p className="font-mono text-sm">
                        {result.transactionId.slice(0, 16)}...
                      </p>
                    </div>
                  )}
                  
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Order Date</p>
                    <p className="font-semibold">
                      {formatSafeDate(result.paidAt, "dd MMM yyyy, hh:mm a")}
                    </p>
                  </div>
                  
                  {result.paymentMethod && (
                    <div className="space-y-1">
                      <p className="text-sm text-muted-foreground">Payment Method</p>
                      <div className="flex items-center gap-2">
                        <CreditCard className="h-4 w-4 text-primary" />
                        <p className="font-semibold">{result.paymentMethod}</p>
                      </div>
                    </div>
                  )}
                </div>

                <Separator />

                {/* Customer Details */}
                {result.customerName && (
                  <>
                    <div>
                      <h3 className="font-semibold mb-3 flex items-center gap-2">
                        <User className="h-4 w-4" />
                        Customer Details
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                        <div>
                          <p className="text-muted-foreground">Name</p>
                          <p className="font-medium">{result.customerName}</p>
                        </div>
                        {result.customerEmail && (
                          <div>
                            <p className="text-muted-foreground">Email</p>
                            <p className="font-medium">{result.customerEmail}</p>
                          </div>
                        )}
                        {result.customerPhone && (
                          <div>
                            <p className="text-muted-foreground">Phone</p>
                            <p className="font-medium">{result.customerPhone}</p>
                          </div>
                        )}
                      </div>
                    </div>
                    <Separator />
                  </>
                )}

                {/* Delivery Address */}
                {result.deliveryAddress && (
                  <>
                    <div>
                      <h3 className="font-semibold mb-3 flex items-center gap-2">
                        <MapPin className="h-4 w-4" />
                        Delivery Address
                      </h3>
                      <div className="bg-muted/50 p-4 rounded-lg space-y-1 text-sm">
                        <p className="font-medium">{result.deliveryAddress.fullName}</p>
                        <p className="text-muted-foreground">{result.deliveryAddress.address}</p>
                        <p className="text-muted-foreground">
                          {result.deliveryAddress.city}, {result.deliveryAddress.state} - {result.deliveryAddress.pinCode}
                        </p>
                        <p className="text-muted-foreground flex items-center gap-1">
                          <Phone className="h-3 w-3" />
                          {result.deliveryAddress.phone}
                        </p>
                      </div>
                    </div>
                    <Separator />
                  </>
                )}

                {/* Order Items */}
                {result.items && result.items.length > 0 && (
                  <>
                    <div>
                      <h3 className="font-semibold mb-3 flex items-center gap-2">
                        <Package className="h-4 w-4" />
                        {result.orderType === 'subscription' || result.startDate || result.duration ? "Subscription Details" : "Order Items"}
                      </h3>
                      <div className="space-y-3">
                        {result.items.map((item, index) => (
                          <div
                            key={index}
                            className="flex justify-between items-center bg-muted/50 p-4 rounded-lg"
                          >
                            <div>
                              <p className="font-medium">{item.name}</p>
                              {result.duration && (
                                <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                                  <Calendar className="h-3 w-3" />
                                  Duration: {result.duration}
                                </p>
                              )}
                              {result.startDate && (
                                <p className="text-sm text-muted-foreground mt-1">
                                  Starts: {formatSafeDate(result.startDate, "dd MMM yyyy")}
                                </p>
                              )}
                            </div>
                            <div className="text-right">
                              <p className="font-semibold text-lg">₹{item.price.toLocaleString()}</p>
                              {item.quantity > 1 && (
                                <p className="text-sm text-muted-foreground">Qty: {item.quantity}</p>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                    <Separator />
                  </>
                )}

                {/* Payment Breakdown */}
                <div>
                  <h3 className="font-semibold mb-3">Payment Breakdown</h3>
                  <div className="space-y-2">
                    {result.orderType === 'subscription' || result.subscriptionAmount ? (
                      // Subscription breakdown
                      <>
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Subscription Amount</span>
                          <span>₹{(result.subscriptionAmount || result.amount * 0.85).toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <div className="flex items-center gap-1">
                            <span className="text-muted-foreground">GST on Food</span>
                            <span className="text-xs bg-gray-100 dark:bg-gray-700 px-1.5 py-0.5 rounded" title="5% GST on food">
                              ⓘ
                            </span>
                          </div>
                          <span>₹{((result.subscriptionAmount || result.amount * 0.85) * 0.05).toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Delivery Charges (Base)</span>
                          <span>₹{(result.deliveryCharges || result.amount * 0.15).toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <div className="flex items-center gap-1">
                            <span className="text-muted-foreground">GST on Delivery</span>
                            <span className="text-xs bg-gray-100 dark:bg-gray-700 px-1.5 py-0.5 rounded" title="18% GST on delivery">
                              ⓘ
                            </span>
                          </div>
                          <span>₹{((result.deliveryCharges || result.amount * 0.15) * 0.18).toFixed(2)}</span>
                        </div>
                      </>
                    ) : (
                      // Menu items breakdown
                      <>
                        <div className="flex justify-between text-sm">
                          <div>
                            <p className="text-muted-foreground">Item Amount</p>
                            <p className="text-xs text-muted-foreground">
                              {result.items?.length || 0} {result.items?.length === 1 ? 'item' : 'items'}
                            </p>
                          </div>
                          <span>₹{(result.itemAmount || 0).toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <div className="flex items-center gap-1">
                            <span className="text-muted-foreground">GST on Food</span>
                            <span className="text-xs bg-gray-100 dark:bg-gray-700 px-1.5 py-0.5 rounded" title="5% GST on food">
                              ⓘ
                            </span>
                          </div>
                          <span>₹{(result.itemGST || 0).toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <div className="flex items-center gap-1">
                            <span className="text-muted-foreground">Delivery Charges</span>
                            <span className="text-xs bg-gray-100 dark:bg-gray-700 px-1.5 py-0.5 rounded cursor-help" title={`₹${result.deliveryBase || 99} base + 18% GST`}>
                              ⓘ
                            </span>
                          </div>
                          <span>₹{((result.deliveryBase || 99) + (result.deliveryGST || Math.round((result.deliveryBase || 99) * 0.18))).toLocaleString()}</span>
                        </div>
                      </>
                    )}
                    <Separator />
                    <div className="flex justify-between items-center pt-2">
                      <span className="font-bold text-lg">Total Amount Paid</span>
                      <span className="font-bold text-2xl text-green-600">
                        ₹{result.amount.toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Confirmation Alert */}
            <Alert className="border-green-200 bg-green-50/50">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-900">
                Your order has been confirmed! Order ID: <strong>{orderId}</strong>
                {result.orderType === 'subscription' ? '. You can view and manage your subscription anytime from your dashboard.' : '.'}
              </AlertDescription>
            </Alert>

            {/* Action Buttons */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <Button
                onClick={handleDownloadInvoice}
                variant="outline"
                size="lg"
                className="w-full"
              >
                <Download className="mr-2 h-5 w-5" />
                Download Invoice
              </Button>
              
              <Button
                onClick={() => router.push(result.orderType === 'subscription' ? '/my-subscription' : '/menu')}
                size="lg"
                className="w-full"
              >
                <Package className="mr-2 h-5 w-5" />
                {result.orderType === 'subscription' ? 'View Subscription' : 'Order More Items'}
              </Button>
              
              <Button
                variant="outline"
                onClick={() => router.push('/')}
                size="lg"
                className="w-full"
              >
                Back to Home
              </Button>
            </div>

            {/* Additional Info */}
            <Card className="bg-muted/30">
              <CardContent className="pt-6">
                <h3 className="font-semibold mb-3">
                  {result.orderType === 'subscription' || result.startDate || result.duration ? "What happens next?" : "📦 Delivery Timeline"}
                </h3>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  {result.orderType === 'subscription' || result.startDate || result.duration ? (
                    // Subscription flow
                    <>
                      <li className="flex items-start gap-2">
                        <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 shrink-0" />
                        <span>Your subscription is now active and will start on the selected date</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 shrink-0" />
                        <span>You&apos;ll receive meal plans and delivery schedules via email</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 shrink-0" />
                        <span>Track your orders and manage preferences in &quot;My Subscriptions&quot;</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 shrink-0" />
                        <span>Our team will contact you 24 hours before your first delivery</span>
                      </li>
                    </>
                  ) : (
                    // One-time order flow
                    <>
                      <li className="flex items-start gap-2">
                        <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 shrink-0" />
                        <span><strong>Order Confirmed:</strong> Your order has been successfully placed</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <Clock className="h-4 w-4 text-blue-600 mt-0.5 shrink-0" />
                        <span><strong>Meal Preparation (2-4 hours):</strong> Fresh meals prepared with quality ingredients</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <Package className="h-4 w-4 text-orange-600 mt-0.5 shrink-0" />
                        <span><strong>Out for Delivery:</strong> You&apos;ll receive tracking notification once dispatched</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 shrink-0" />
                        <span><strong>Delivered:</strong> Hot, fresh meals at your doorstep. Enjoy!</span>
                      </li>
                    </>
                  )}
                </ul>
                <p className="mt-4 text-sm font-medium">
                  Need help? Contact us at{" "}
                  <a href="mailto:support@bhookr.com" className="text-primary hover:underline">
                    support@bhookr.com
                  </a>{" "}
                  or call{" "}
                  <a href="tel:+911234567890" className="text-primary hover:underline">
                    +91 1234567890
                  </a>
                </p>
                
                {/* Email Delivery Status - Development Only */}
                {process.env.NODE_ENV === 'development' && result.emailDelivery && (
                  <Alert className={`mt-4 ${result.emailDelivery.sent ? 'border-green-500 bg-green-50' : 'border-amber-500 bg-amber-50'}`}>
                    <AlertDescription className="text-sm">
                      <div className="flex items-center gap-2 font-semibold mb-1">
                        {result.emailDelivery.sent ? '✅' : '⚠️'} Email Confirmation {result.emailDelivery.sent ? 'Sent' : 'Status'}
                      </div>
                      {result.emailDelivery.sent ? (
                        <div className="space-y-1 text-xs">
                          <div>📧 Recipient: {result.emailDelivery.recipient}</div>
                          <div>🆔 Message ID: {result.emailDelivery.messageId?.slice(0, 20)}...</div>
                          <div>📬 Check inbox (and spam folder)</div>
                        </div>
                      ) : (
                        <div className="text-xs">
                          {result.emailDelivery.error}
                        </div>
                      )}
                    </AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </Container>
        <Footer />
      </div>
    );
  }
  
  /**
   * Render failure state
   */
  if (result?.status === 'FAILED') {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <Container className="flex-1 flex items-center justify-center py-12">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="w-full max-w-md"
          >
            <Card>
              <CardContent className="pt-6">
                <div className="flex flex-col items-center space-y-4 text-center">
                  {/* Error Icon */}
                  <div className="w-20 h-20 rounded-full bg-red-100 flex items-center justify-center">
                    <XCircle className="h-12 w-12 text-red-600" />
                  </div>
                  
                  {/* Error Message */}
                  <div>
                    <h2 className="text-3xl font-bold text-red-600">
                      Payment Failed
                    </h2>
                    <p className="text-muted-foreground mt-2">
                      {result.message || 'Your payment could not be processed'}
                    </p>
                  </div>
                  
                  {/* Order Details */}
                  <Card className="w-full bg-muted/50">
                    <CardContent className="pt-4 space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Order ID</span>
                        <span className="font-mono font-medium">
                          {result.orderId.slice(0, 8)}...
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Amount</span>
                        <span className="font-medium">₹{result.amount.toFixed(2)}</span>
                      </div>
                    </CardContent>
                  </Card>
                  
                  {/* Help Alert */}
                  <Alert>
                    <AlertDescription className="text-sm">
                      If amount was deducted from your account, it will be refunded within 5-7 business days.
                      For help, contact support@bhookr.com
                    </AlertDescription>
                  </Alert>
                  
                  {/* Action Buttons */}
                  <div className="flex flex-col gap-3 w-full mt-4">
                    <Button
                      onClick={() => router.push('/checkout')}
                      className="w-full"
                      size="lg"
                    >
                      Try Again
                      <ArrowRight className="ml-2 h-5 w-5" />
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => router.push('/')}
                      className="w-full"
                    >
                      Back to Home
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </Container>
        <Footer />
      </div>
    );
  }
  
  /**
   * Render expired state
   */
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <Container className="flex-1 flex items-center justify-center py-12">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center space-y-4 text-center">
              <div className="w-16 h-16 rounded-full bg-yellow-100 flex items-center justify-center">
                <Clock className="h-8 w-8 text-yellow-600" />
              </div>
              <div>
                <h2 className="text-2xl font-bold">Payment Link Expired</h2>
                <p className="text-muted-foreground mt-2">
                  This payment link has expired. Please create a new order.
                </p>
              </div>
              <Button onClick={() => router.push('/checkout')} className="w-full">
                Create New Order
              </Button>
            </div>
          </CardContent>
        </Card>
      </Container>
      <Footer />
    </div>
  );
}

export default function PaymentResultPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      }
    >
      <PaymentResultContent />
    </Suspense>
  );
}
