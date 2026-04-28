"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { useSubscriptionStore } from "@/store/subscription";
import { useCsrfToken } from "@/hooks/useCsrfToken";
import { useGoogleSheets } from "@/hooks/use-google-sheets";
import { Header } from "@/components/layouts/header";
import { Footer } from "@/components/layouts/footer";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent } from "@/components/ui/card";
import { PersonalInfoStep } from "@/components/subscription/personal-info-step";
import { PhysicalInfoStep } from "@/components/subscription/physical-info-step";
import { GoalSelectionStep } from "@/components/subscription/goal-selection-step";
import { DietSelectionStep } from "@/components/subscription/diet-selection-step";
import { FoodPreferenceStep } from "@/components/subscription/food-preference-step";
import { ActivityAndDurationStep } from "@/components/subscription/activity-duration-step";
import { PlanSelectionStep } from "@/components/subscription/plan-selection-step";
import { SubscriptionReviewStep } from "@/components/subscription/subscription-review-step";
import { BillingDetailsStep } from "@/components/subscription/billing-details-step";
import { PaymentSuccess } from "@/components/subscription/payment-success";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";
import { PaymentLoader } from "@/components/shared/payment-loader";
import { motion, AnimatePresence } from "framer-motion";
import { calculateSubscriptionPrice } from "@/constants/subscription";
import { getSubscriptionDeliveryFee } from "@/config/pricing";
import { printInvoice } from "@/lib/invoice";
import { convertToLeadData } from "@/lib/validators/subscription";
import { toast } from "sonner";
import { Shield, Lock } from "lucide-react";
import type { InvoiceData } from "@/types/subscription";
import type {
  PersonalInfoFormData,
  PhysicalInfoFormData,
  GoalSelectionFormData,
  DietSelectionFormData,
  FoodPreferenceFormData,
  ActivityAndDurationFormData,
  PlanSelectionFormData,
  BillingDetailsFormData,
} from "@/lib/validators/subscription";

const STEP_TITLES = [
  "Personal Info",
  "Physical Info",
  "Goals",
  "Diet",
  "Food Preferences",
  "Activity Level",
  "Plan Selection",
  "Billing Details",
  "Review Subscription",
];

export default function SubscriptionPage() {
  const { user } = useAuth();
  const router = useRouter();
  const { 
    currentStep, 
    formData, 
    appliedCoupon,
    updateFormData, 
    setCurrentStep, 
    previousStep, 
    resetForm, 
    getTotalSteps 
  } = useSubscriptionStore();
  const { getToken: getCsrfToken } = useCsrfToken();
  const { submitLead, isSubmitting: isSubmittingLead } = useGoogleSheets();

  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [isVerifyingPayment, setIsVerifyingPayment] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [invoiceData, setInvoiceData] = useState<InvoiceData | null>(null);
  const [error, setError] = useState<string | null>(null);

  const totalSteps = getTotalSteps();
  const progressPercentage = ((currentStep + 1) / totalSteps) * 100;

  const handlePlanSelectionNext = async (data: PlanSelectionFormData) => {
    updateFormData({ planSelection: data });
    
    // Step 7 completed - Submit lead to Google Sheets
    console.log('📝 Step 7 completed - Submitting lead to Google Sheets...');
    console.log('📋 Form data being submitted:', {
      personalInfo: formData.personalInfo,
      physicalInfo: formData.physicalInfo,
      planSelection: data,
      selectedMeals: data.selectedMeals
    });
    
    try {
      // Convert form data to lead format
      const leadData = convertToLeadData({
        personalInfo: formData.personalInfo,
        physicalInfo: formData.physicalInfo,
        goalSelection: formData.goalSelection,
        dietSelection: formData.dietSelection,
        foodPreferenceSelection: formData.foodPreferenceSelection,
        activityAndDuration: formData.activityAndDuration,
        planSelection: data, // Use the newly submitted data
      });

      console.log('🔄 Converted lead data:', leadData);
      console.log('🍽️ Selected meals:', leadData.plan);

      // Submit to Google Sheets (non-blocking)
      const success = await submitLead({
        ...leadData,
        status: 'lead',
        lastStepCompleted: 7,
        checkoutVisited: false,
      });

      if (success) {
        console.log('✅ Lead submitted successfully');
        toast.success('Your information has been saved', {
          description: 'Proceeding to checkout...',
        });
      } else {
        console.warn('⚠️ Lead submission returned false (but allowing user to continue)');
      }

      // Save form data to localStorage for later subscription tracking
      const completeFormData = {
        personalInfo: formData.personalInfo,
        physicalInfo: formData.physicalInfo,
        goalSelection: formData.goalSelection,
        dietSelection: formData.dietSelection,
        foodPreferenceSelection: formData.foodPreferenceSelection,
        activityAndDuration: formData.activityAndDuration,
        planSelection: data,
      };
      localStorage.setItem('subscriptionFormData', JSON.stringify(completeFormData));
      console.log('💾 Form data saved to localStorage for payment tracking');
      
    } catch (error) {
      console.error('❌ Failed to submit lead:', error);
      // Don't block user from proceeding even if tracking fails
    }
    
    setCurrentStep(currentStep + 1);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleActivityDurationNext = (data: ActivityAndDurationFormData) => {
    updateFormData({ activityAndDuration: data });
    setCurrentStep(currentStep + 1);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

 const handlePersonalInfoNext = async (data: PersonalInfoFormData) => {
  const updatedData = user ? { ...data, userId: user.uid } : data;
  updateFormData({ personalInfo: updatedData });

  // ✅ NEW: Submit partial lead to Google Sheets immediately after Step 1
  try {
    await submitLead({
      name: updatedData.fullName,
      email: updatedData.email,
      phoneNumber: updatedData.phoneNumber,
      age: updatedData.age,
      gender: updatedData.gender || '',
      height: 0,
      weight: 0,
      goal: '',
      diet: '',
      foodPreference: '',
      physicalState: '',
      subscriptionType: '',
      plan: '',
      subscriptionStartDate: new Date().toISOString().split('T')[0],
      status: 'partial_lead',
      lastStepCompleted: 1,
      checkoutVisited: false,
    });
    console.log('✅ Partial lead saved from Step 1');
  } catch (error) {
    console.error('❌ Step 1 lead save failed (non-blocking):', error);
    // User is NOT blocked — form continues regardless
  }

  setCurrentStep(currentStep + 1);
  window.scrollTo({ top: 0, behavior: 'smooth' });
};

  const handlePhysicalInfoNext = (data: PhysicalInfoFormData) => {
    updateFormData({ physicalInfo: data });
    setCurrentStep(currentStep + 1);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleGoalNext = (data: GoalSelectionFormData) => {
    updateFormData({ goalSelection: data });
    setCurrentStep(currentStep + 1);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDietNext = (data: DietSelectionFormData) => {
    updateFormData({ dietSelection: data });
    setCurrentStep(currentStep + 1);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleFoodPreferenceNext = (data: FoodPreferenceFormData) => {
    updateFormData({ foodPreferenceSelection: data });
    setCurrentStep(currentStep + 1);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleBillingNext = (data: BillingDetailsFormData) => {
    // Validate all previous steps are completed before proceeding to review
    const isValid = validateAllSteps();
    
    if (!isValid) {
      toast.error("Please complete all previous steps before reviewing your subscription");
      return;
    }
    
    // Update form data
    updateFormData({ billingDetails: data });
    setCurrentStep(currentStep + 1);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Validation function to check all required fields
  const validateAllSteps = (): boolean => {
    const errors: string[] = [];
    
    // Step 0: Personal Info
    if (!formData.personalInfo?.fullName || !formData.personalInfo?.email || 
        !formData.personalInfo?.phoneNumber || !formData.personalInfo?.age) {
      errors.push("Personal Information is incomplete");
    }
    
    // Step 1: Physical Info
    if (!formData.physicalInfo?.gender || !formData.physicalInfo?.height || 
        !formData.physicalInfo?.weight) {
      errors.push("Physical Information is incomplete");
    }
    
    // Step 2: Goal Selection
    if (!formData.goalSelection?.goal) {
      errors.push("Goal Selection is incomplete");
    }
    
    // Step 3: Diet Selection
    if (!formData.dietSelection?.dietType) {
      errors.push("Diet Selection is incomplete");
    }
    
    // Step 4: Food Preference
    if (!formData.foodPreferenceSelection?.foodPreference) {
      errors.push("Food Preference is incomplete");
    }
    
    // Step 5: Activity and Duration
    if (!formData.activityAndDuration?.activityLevel || 
        !formData.activityAndDuration?.duration) {
      errors.push("Activity and Duration is incomplete");
    }
    
    // Step 6: Plan Selection
    if (!formData.planSelection?.planType || !formData.planSelection?.startDate) {
      errors.push("Plan Selection is incomplete");
    }
    
    // Step 7: Billing Details (checked in handler)
    
    if (errors.length > 0) {
      toast.error(errors.join(", "));
      return false;
    }
    
    return true;
  };

  const handleReviewNext = async () => {
    // Check if user is authenticated before proceeding to payment
    if (!user) {
      // Redirect to signin page with callback to return to subscribe page
      router.push("/signin?callbackUrl=/subscribe");
      return;
    }

    // Process payment with billing details
    await processPayment(formData.billingDetails!);
  };

  // Load Razorpay script
  const loadRazorpayScript = (): Promise<boolean> => {
    return new Promise((resolve) => {
      // Check if already loaded
      if ((window as any).Razorpay) {
        resolve(true);
        return;
      }

      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.async = true;
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  // Helper function to save subscription data before payment redirect
  const saveSubscriptionBeforePayment = async (
    billingData: BillingDetailsFormData,
    orderId: string,
    totalAmount: number,
    subscriptionAmount: number,
    subscriptionGST: number,
    deliveryCharges: number,
    deliveryGST: number
  ) => {
    const requestBody = {
      orderId,
      formData: {
        personalInfo: {
          email: formData.personalInfo!.email,
          name: formData.personalInfo!.fullName,
          phone: formData.personalInfo!.phoneNumber,
        },
        physicalInfo: {
          age: formData.personalInfo!.age,
          weight: formData.physicalInfo?.weight,
          height: formData.physicalInfo?.height,
        },
        goalSelection: {
          goals: formData.goalSelection?.goal ? [formData.goalSelection.goal] : [],
        },
        dietSelection: {
          dietType: formData.dietSelection?.dietType,
        },
        foodPreferenceSelection: {
          preferences: formData.foodPreferenceSelection?.foodPreference ? [formData.foodPreferenceSelection.foodPreference] : [],
        },
        activityAndDuration: {
          activityLevel: formData.activityAndDuration!.activityLevel,
          duration: formData.activityAndDuration!.duration!,
        },
        planSelection: {
          planType: formData.planSelection!.planType!,
          mealType: "custom",
          deliveryDays: [],
          preferredSlot: "morning",
          startDate: formData.planSelection?.startDate 
            ? (typeof formData.planSelection.startDate === 'string' 
                ? formData.planSelection.startDate 
                : formData.planSelection.startDate.toISOString())
            : new Date().toISOString(),
        },
        billingDetails: billingData,
      },
      invoiceData: {
        totalAmount,
        subscriptionAmount,
        subscriptionGST,
        deliveryCharges,
        deliveryGST,
      },
    };
    
    console.log('📤 Sending subscription data:', {
      orderId,
      totalAmount,
      subscriptionAmount,
      subscriptionGST,
      deliveryCharges,
      deliveryGST,
    });
    
    // Add timeout to prevent hanging (30 seconds)
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);
    
    try {
      const response = await fetch("/api/subscription", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);

      // Handle successful response (200 or 201)
      if (response.ok) {
        const result = await response.json();
        console.log('✓ Subscription saved/exists:', result);
        return result;
      }

      // Handle error responses
      let errorData;
      const responseText = await response.text();
      
      try {
        errorData = JSON.parse(responseText);
      } catch {
        errorData = { error: responseText || 'Unknown error' };
      }
      
      console.error('Failed to save subscription:', {
        status: response.status,
        statusText: response.statusText,
        error: errorData,
        responseBody: responseText
      });
      
      // Handle 409 Conflict - User already has an active subscription
      if (response.status === 409) {
        const errorMsg = errorData.error || "You already have an active subscription";
        console.warn('⚠️ Duplicate subscription attempt:', {
          message: errorMsg,
          existingSubscription: errorData.existingSubscription
        });
        
        // Create a specific error for duplicate subscription
        const error = new Error(errorMsg);
        (error as any).code = 'DUPLICATE_SUBSCRIPTION';
        (error as any).existingSubscription = errorData.existingSubscription;
        throw error;
      }
      
      // Handle other errors
      toast.error(errorData.error || "Failed to save subscription data");
      throw new Error(errorData.error || "Failed to save subscription data");
    } catch (error) {
      clearTimeout(timeoutId);
      
      // Handle timeout/abort
      if (error instanceof Error && error.name === 'AbortError') {
        console.error('❌ Subscription save timeout (30s)');
        toast.error("Request timeout. Please check your connection and try again.");
        throw new Error("Subscription save timeout. Please try again.");
      }
      
      // Re-throw other errors
      throw error;
    }
  };
  const processPayment = async (billingData: BillingDetailsFormData, retryCount = 0) => {
    setIsProcessingPayment(true);
    setError(null);

    try {
      console.log('🚀 Starting payment process...', retryCount > 0 ? `(Retry ${retryCount})` : '');
      
      // Get Firebase ID token for authentication
      if (!user) {
        throw new Error("User not authenticated");
      }
      
      console.log('🔑 Getting Firebase ID token...');
      const idToken = await user.getIdToken(true); // Force refresh token
      console.log('✓ ID token obtained');
      
      // Calculate pricing
      const planType = formData.planSelection!.planType!;
      const duration = formData.activityAndDuration!.duration!;
      const dietType = formData.dietSelection?.dietType || 'balanced_meal';
      const foodPreference = formData.foodPreferenceSelection?.foodPreference || 'veg';
      const pricing = calculateSubscriptionPrice(planType, duration, dietType, foodPreference);

      // Apply coupon discount to item amount first
      const couponDiscount = appliedCoupon?.discountAmount || 0;
      const discountedItemAmount = Math.max(0, pricing.itemAmount - couponDiscount);
      
      // GST on discounted food price (5%)
      const subscriptionGST = Math.round(discountedItemAmount * 0.05);
      
      // Calculate delivery charges based on plan type
      const deliveryBase = getSubscriptionDeliveryFee(planType, duration);
      const deliveryGST = Math.round(deliveryBase * 0.18); // 18% GST on delivery
      const deliveryCharges = deliveryBase + deliveryGST;
      
      // Total payable
      const totalAmount = discountedItemAmount + subscriptionGST + deliveryCharges;

      // Generate order ID
      const orderId = `ORDER-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
      
      console.log('💰 Payment details:', { 
        orderId, 
        amount: totalAmount,
        itemAmount: pricing.itemAmount,
        discountedItemAmount,
        couponDiscount,
        couponCode: appliedCoupon?.code,
        subscriptionGST, 
        deliveryBase,
        deliveryGST,
        deliveryCharges 
      });

      // Get CSRF token (optional - Bearer auth provides CSRF protection)
      console.log('🔒 Fetching CSRF token...');
      const csrfToken = await getCsrfToken(true).catch(() => '');
      
      if (csrfToken) {
        console.log('✓ CSRF token obtained');
      } else {
        console.log('ℹ️ CSRF token not available - using Bearer auth only');
      }

      // Initiate Razorpay payment
      console.log('💳 Initiating Razorpay payment...');
      console.log('Request payload:', {
        orderId: orderId,
        amount: totalAmount,
        userPhone: formData.personalInfo!.phoneNumber,
        userEmail: formData.personalInfo!.email,
        userName: formData.personalInfo!.fullName,
      });
      
      // Save subscription data first before payment
      console.log('💾 Saving subscription data...');
      try {
        const saveStartTime = Date.now();
        const saveResult = await saveSubscriptionBeforePayment(billingData, orderId, totalAmount, discountedItemAmount, subscriptionGST, deliveryBase, deliveryGST);
        const saveDuration = Date.now() - saveStartTime;
        console.log(`✓ Subscription data saved in ${saveDuration}ms:`, saveResult.message || 'Success');
        
        // If subscription already existed for this order, we can continue
        if (saveResult.message?.includes('already exists')) {
          console.log('ℹ️ Using existing subscription for this order');
        }
      } catch (saveError: any) {
        // Handle duplicate subscription error specifically
        if (saveError.code === 'DUPLICATE_SUBSCRIPTION') {
          const existingSub = saveError.existingSubscription;
          const planName = existingSub?.planName || 'an active plan';
          
          console.log('⚠️ Duplicate subscription detected:', existingSub);
          
          // Show error with action button to view existing subscription
          toast.error(`You already have ${planName}`, {
            description: 'Cancel your current subscription before purchasing a new one.',
            duration: 10000,
            action: {
              label: 'View Subscriptions',
              onClick: () => router.push('/my-subscription'),
            },
          });
          
          setIsProcessingPayment(false);
          setError('You already have an active subscription. Please cancel it before creating a new one.');
          return; // Stop the payment flow
        }
        
        // Handle other errors
        console.error('❌ Save subscription error:', saveError);
        const errorMessage = saveError instanceof Error ? saveError.message : 'Failed to save subscription';
        console.error('❌ Subscription save failed:', errorMessage);
        
        toast.error('Failed to create subscription', {
          description: errorMessage,
          duration: 5000,
        });
        
        setIsProcessingPayment(false);
        setError(errorMessage);
        throw saveError;
      }
      
      // Create Razorpay order with timeout
      console.log('💳 Creating Razorpay order...');
      const orderController = new AbortController();
      const orderTimeoutId = setTimeout(() => orderController.abort(), 30000);
      
      const paymentResponse = await fetch("/api/payment/razorpay/create-order", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${idToken}`,
          ...(csrfToken ? { "X-CSRF-Token": csrfToken } : {}),
        },
        body: JSON.stringify({
          orderId: orderId, // Pass the same orderId used for subscription
          amount: totalAmount,
          orderType: 'subscription', // Mark as subscription order
          customerName: formData.personalInfo!.fullName,
          customerEmail: formData.personalInfo!.email,
          customerPhone: formData.personalInfo!.phoneNumber,
          items: [{
            planId: planType,
            name: `${planType.charAt(0).toUpperCase() + planType.slice(1)} Plan - ${duration}`,
            price: totalAmount,
            quantity: 1,
          }],
          deliveryAddress: {
            fullName: formData.personalInfo!.fullName,
            phone: formData.personalInfo!.phoneNumber,
            address: billingData.address,
            city: billingData.city,
            state: billingData.state,
            pinCode: billingData.zipCode,
          },
          // Add subscription-specific fields
          startDate: formData.planSelection?.startDate 
            ? (typeof formData.planSelection.startDate === 'string' 
                ? formData.planSelection.startDate 
                : formData.planSelection.startDate.toISOString())
            : new Date().toISOString(),
          duration: duration,
        }),
        signal: orderController.signal,
      });
      
      clearTimeout(orderTimeoutId);

      console.log('📊 Payment response:', {
        status: paymentResponse.status,
        statusText: paymentResponse.statusText,
        ok: paymentResponse.ok,
        headers: Object.fromEntries(paymentResponse.headers.entries())
      });

      if (!paymentResponse.ok) {
        let errorData;
        let responseText = '';
        try {
          responseText = await paymentResponse.text();
          console.log('Response text:', responseText);
          errorData = JSON.parse(responseText);
        } catch (e) {
          console.error('Failed to parse error response:', e);
          errorData = { 
            error: responseText || `HTTP ${paymentResponse.status}: ${paymentResponse.statusText}` 
          };
        }
        
        console.error('❌ Payment initiation failed:', { 
          status: paymentResponse.status, 
          statusText: paymentResponse.statusText,
          data: errorData,
          responseText 
        });
        
        // Handle authentication errors
        if (paymentResponse.status === 403 || paymentResponse.status === 401) {
          console.log('⚠️ Authentication failed, refreshing token...');
          
          if (retryCount < 1) {
            setIsProcessingPayment(false);
            await new Promise(resolve => setTimeout(resolve, 1000));
            return processPayment(billingData, retryCount + 1);
          }
          
          throw new Error('Authentication failed. Please sign in again and try again.');
        }
        
        throw new Error(errorData.error || `Payment failed with status ${paymentResponse.status}`);
      }

      const paymentData = await paymentResponse.json();
      console.log('✓ Razorpay order created:', { 
        orderId: paymentData.orderId, 
        razorpayOrderId: paymentData.razorpayOrderId 
      });

      // Load Razorpay script
      const isScriptLoaded = await loadRazorpayScript();
      if (!isScriptLoaded) {
        throw new Error('Failed to load Razorpay payment gateway. Please check your internet connection.');
      }

      // Initialize Razorpay checkout
      const options = {
        key: paymentData.keyId,
        amount: paymentData.amount,
        currency: paymentData.currency,
        name: 'Bhookr',
        description: `${planType.charAt(0).toUpperCase() + planType.slice(1)} Plan - ${duration}`,
        order_id: paymentData.razorpayOrderId,
        prefill: {
          name: formData.personalInfo!.fullName,
          email: formData.personalInfo!.email,
          contact: formData.personalInfo!.phoneNumber,
        },
        theme: {
          color: '#10b981', // Bhookr brand color
        },
        handler: async function (response: any) {
          console.log('✓ Payment successful, verifying...');
          
          // Show blocking overlay during verification
          setIsVerifyingPayment(true);
          setIsProcessingPayment(false); // Hide the processing state
          
          try {
            // Verify payment on backend
            const verifyResponse = await fetch('/api/payment/razorpay/verify', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${idToken}`,
              },
              body: JSON.stringify({
                orderId: paymentData.orderId,
                razorpayOrderId: response.razorpay_order_id,
                razorpayPaymentId: response.razorpay_payment_id,
                razorpaySignature: response.razorpay_signature,
              }),
            });

            if (!verifyResponse.ok) {
              // Get the actual error response
              const responseText = await verifyResponse.text();
              let errorData: any;
              
              try {
                errorData = JSON.parse(responseText);
              } catch {
                errorData = { error: responseText || 'Unknown error' };
              }
              
              console.error('Verification failed:', {
                status: verifyResponse.status,
                statusText: verifyResponse.statusText,
                error: errorData,
                responseText: responseText.substring(0, 500), // First 500 chars
              });
              
              throw new Error(errorData.error || errorData.message || 'Payment verification failed');
            }

            await verifyResponse.json();
            console.log('✓ Payment verified successfully');

            // Clear form data after successful subscription
            resetForm();

            // Redirect to order confirmation page
            console.log('[Subscribe] Redirecting to confirmation page:', paymentData.orderId);
            localStorage.setItem('pendingOrderId', paymentData.orderId);
            window.location.href = `/payment/result?orderId=${paymentData.orderId}`;
          } catch (error) {
            console.error('Payment verification error:', error);
            setIsVerifyingPayment(false);
            setError('Payment verification failed. Please contact support.');
            toast.error('Payment verification failed. Please contact support.');
          }
        },
        modal: {
          ondismiss: function() {
            console.log('Payment cancelled by user');
            setIsProcessingPayment(false);
            setError('Payment was cancelled. Please try again.');
          }
        }
      };

      const razorpay = new (window as any).Razorpay(options);
      razorpay.open();
      
      // Don't set processing to false here, wait for handler or dismiss

    } catch (err) {
      console.error('Payment process error:', err);
      const errorMessage = err instanceof Error ? err.message : "Payment failed. Please try again.";
      const errorName = err instanceof Error ? err.name : '';
      
      // Handle timeout errors
      if (errorName === 'AbortError') {
        console.error('❌ Request timeout');
        setError('Request timeout. Please check your connection and try again.');
        toast.error('Request timeout. Please try again.', { duration: 5000 });
        setIsProcessingPayment(false);
        return;
      }
      
      // Don't show toast if it's a duplicate subscription error (already shown above)
      if (!errorMessage.includes('already have an active subscription')) {
        // User-friendly error messages
        if (errorMessage.includes('CSRF token')) {
          setError('Security token expired. Please refresh the page and try again.');
        } else if (errorMessage.includes('Authentication required')) {
          setError('Please sign in to continue with payment.');
        } else if (errorMessage.includes('403')) {
          setError('Security verification failed. Please refresh the page.');
        } else if (errorMessage.includes('timeout')) {
          setError('Request timeout. Please check your connection and try again.');
        } else {
          setError(errorMessage);
        }
      } else {
        // For duplicate subscription, just set a generic error
        setError('Unable to proceed with payment. Please check your subscriptions.');
      }
    } finally {
      setIsProcessingPayment(false);
    }
  };

  const handlePrintInvoice = () => {
    if (invoiceData) {
      printInvoice(invoiceData);
    }
  };

  const handleReset = () => {
    resetForm();
    setPaymentSuccess(false);
    setInvoiceData(null);
    router.push("/");
  };

  const handleBack = () => {
    setError(null);
    previousStep();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleGoToStep = (step: number) => {
    // Allow going to current or previous steps, not forward
    if (step <= currentStep) {
      setCurrentStep(step);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else if (step === 8) {
      // If trying to jump to review step, validate all previous steps
      const isValid = validateAllSteps();
      if (!isValid) {
        toast.error("Please complete all steps before reviewing your subscription");
        return;
      }
      setCurrentStep(step);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  // Show verification overlay during payment verification
  if (isVerifyingPayment) {
    return (
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
    );
  }

  // Show loading during payment processing
  if (isProcessingPayment) {
    return (
      <div className="flex min-h-screen flex-col">
        <Header />
        <main className="flex-1 bg-linear-to-br from-red-50 via-white to-orange-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 flex items-center justify-center px-4">
          <Card className="border-2 shadow-2xl w-full max-w-md dark:bg-gray-800 dark:border-gray-700 animate-in fade-in zoom-in duration-500">
            <CardContent className="p-10 text-center">
              <div className="flex flex-col items-center space-y-6">
                <div className="relative">
                  <div className="absolute inset-0 bg-red-500/10 dark:bg-red-400/10 rounded-full blur-2xl animate-pulse" />
                  <PaymentLoader size="lg" />
                </div>
                <div className="space-y-2">
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white animate-pulse">
                    Processing Payment
                  </h2>
                  <p className="text-gray-600 dark:text-gray-300 text-sm">
                    Please wait while we process your payment through Razorpay...
                  </p>
                  <p className="text-gray-500 dark:text-gray-400 text-xs mt-2">
                    This may take a few moments. Do not close this window.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </main>
        <Footer />
      </div>
    );
  }

  // Show success screen
  if (paymentSuccess && invoiceData) {
    return (
      <div className="flex min-h-screen flex-col">
        <Header />
        <main className="flex-1 bg-linear-to-br from-green-50 via-white to-emerald-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 py-8 px-4">
          <div className="container max-w-2xl mx-auto">
            <PaymentSuccess
              invoiceData={invoiceData}
              onPrintInvoice={handlePrintInvoice}
              onReset={handleReset}
            />
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1 bg-linear-to-br from-red-50 via-white to-orange-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 py-8 px-4">
        <div className="container mx-auto max-w-4xl">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-8"
          >
            <h1 className="text-3xl sm:text-4xl font-bold bg-linear-to-r from-red-600 to-orange-600 dark:from-red-500 dark:to-orange-500 bg-clip-text text-transparent mb-2">
              Start Your Subscription
            </h1>
            <p className="text-gray-600 dark:text-gray-300 text-lg">
              Step {currentStep + 1} of {totalSteps}: {STEP_TITLES[currentStep]}
            </p>
          </motion.div>

          {/* Progress Bar */}
          <div className="mb-8">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Progress: {Math.round(progressPercentage)}%
              </span>
              <span className="text-xs text-gray-500 dark:text-gray-400">
                Step {currentStep + 1} of {totalSteps}
              </span>
            </div>
            <Progress value={progressPercentage} className="h-3" />
          </div>

          {/* Step Navigation Breadcrumb */}
          <div className="mb-8 overflow-x-auto">
            <div className="flex items-center justify-between min-w-max px-4">
              {STEP_TITLES.map((title, index) => (
                <div key={index} className="flex items-center">
                  <button
                    onClick={() => handleGoToStep(index)}
                    disabled={index > currentStep}
                    className={`
                      flex flex-col items-center group transition-all
                      ${index <= currentStep ? 'cursor-pointer hover:scale-105' : 'cursor-not-allowed opacity-50'}
                    `}
                    type="button"
                  >
                    <div
                      className={`
                        w-10 h-10 rounded-full flex items-center justify-center font-semibold text-sm
                        transition-all duration-300 border-2
                        ${index < currentStep 
                          ? 'bg-green-500 border-green-600 text-white group-hover:bg-green-600 group-hover:shadow-lg' 
                          : index === currentStep 
                          ? 'bg-red-500 border-red-600 text-white ring-2 ring-red-300 ring-offset-2' 
                          : 'bg-gray-200 border-gray-300 text-gray-500 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-400'
                        }
                      `}
                    >
                      {index < currentStep ? (
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      ) : (
                        index + 1
                      )}
                    </div>
                    <span
                      className={`
                        mt-2 text-xs font-medium text-center max-w-25 leading-tight
                        ${index <= currentStep ? 'text-gray-900 dark:text-white' : 'text-gray-400 dark:text-gray-500'}
                        ${index < currentStep ? 'group-hover:text-red-600 dark:group-hover:text-red-400' : ''}
                      `}
                    >
                      {title}
                    </span>
                  </button>
                  {index < STEP_TITLES.length - 1 && (
                    <div
                      className={`
                        w-8 sm:w-12 h-1 mx-2 transition-all duration-300
                        ${index < currentStep ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-600'}
                      `}
                    />
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Error Alert */}
          {error && (
            <Alert variant="destructive" className="mb-6">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="flex items-center justify-between">
                <span>{error}</span>
                {error.includes('already have an active subscription') && (
                  <button
                    onClick={() => router.push('/my-subscription')}
                    className="ml-4 px-3 py-1 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-md transition-colors"
                  >
                    View My Subscriptions
                  </button>
                )}
              </AlertDescription>
            </Alert>
          )}

          {/* Form Steps */}
          <AnimatePresence mode="wait">
            {currentStep === 0 && (
              <PersonalInfoStep
                key="personal"
                defaultValues={formData.personalInfo}
                onNext={handlePersonalInfoNext}
                onBack={currentStep > 0 ? handleBack : undefined}
              />
            )}
            {currentStep === 1 && (
              <PhysicalInfoStep
                key="physical"
                defaultValues={formData.physicalInfo}
                onNext={handlePhysicalInfoNext}
                onBack={handleBack}
              />
            )}
            {currentStep === 2 && (
              <GoalSelectionStep
                key="goal"
                defaultValues={formData.goalSelection}
                onNext={handleGoalNext}
                onBack={handleBack}
              />
            )}
            {currentStep === 3 && (
              <DietSelectionStep
                key="diet"
                defaultValues={formData.dietSelection}
                goal={formData.goalSelection?.goal}
                onNext={handleDietNext}
                onBack={handleBack}
              />
            )}
            {currentStep === 4 && (
              <FoodPreferenceStep
                key="food"
                defaultValues={formData.foodPreferenceSelection}
                dietType={formData.dietSelection?.dietType}
                onNext={handleFoodPreferenceNext}
                onBack={handleBack}
              />
            )}
            {currentStep === 5 && (
              <ActivityAndDurationStep
                key="activity"
                defaultValues={formData.activityAndDuration}
                goal={formData.goalSelection?.goal}
                dietType={formData.dietSelection?.dietType}
                onNext={handleActivityDurationNext}
                onBack={handleBack}
              />
            )}
            {currentStep === 6 && (
              <PlanSelectionStep
                key="plan"
                defaultValues={formData.planSelection}
                duration={formData.activityAndDuration?.duration || "monthly"}
                dietType={formData.dietSelection?.dietType}
                foodPreference={formData.foodPreferenceSelection?.foodPreference}
                onNext={handlePlanSelectionNext}
                onBack={handleBack}
                isSubmitting={isSubmittingLead}
              />
            )}
            {currentStep === 7 && (
              <BillingDetailsStep
                key="billing"
                defaultValues={formData.billingDetails}
                onNext={handleBillingNext}
                onBack={handleBack}
              />
            )}
            {currentStep === 8 && (
              <SubscriptionReviewStep
                key="review"
                formData={formData}
                onNext={handleReviewNext}
                onBack={handleBack}
              />
            )}
          </AnimatePresence>
        </div>
      </main>
      <Footer />
    </div>
  );
}
