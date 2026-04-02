"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { Header } from "@/components/layouts/header";
import { Footer } from "@/components/layouts/footer";
import { LoadingOverlay } from "@/components/shared/loading-overlay";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { CancelSubscriptionDialog } from "@/components/dialogs/cancel-subscription-dialog";
import { 
  CreditCard, 
  Package, 
  CheckCircle2, 
  XCircle, 
  Clock,
  ArrowRight,
  RefreshCw,
  AlertCircle
} from "lucide-react";
import Link from "next/link";
import { motion } from "framer-motion";
import { toast } from "sonner";

interface Subscription {
  id: string;
  planName: string;
  planType: "weekly" | "monthly";
  price: number;
  status: "active" | "cancelled" | "expired" | "pending";
  startDate: any;
  endDate: any;
  nextBillingDate?: any;
  autoRenew: boolean;
  deliveryDays: string[];
  preferredSlot: string;
  createdAt: any;
  [key: string]: any;
}

export default function MySubscriptionPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [selectedSubscription, setSelectedSubscription] = useState<Subscription | null>(null);
  const [cancelling, setCancelling] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/signin?redirect=/my-subscription");
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (user) {
      fetchSubscriptions();
    }
  }, [user]);

  const fetchSubscriptions = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/subscription/my-subscriptions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ userId: user?.uid }),
      });

      const data = await response.json();
      
      if (data.success) {
        console.log('[MY-SUBSCRIPTIONS] Raw data received:', data.subscriptions);
        console.log('[MY-SUBSCRIPTIONS] Subscription count:', data.subscriptions.length);
        
        // Production-ready: Filter out stale pending subscriptions (older than 2 minutes)
        const PENDING_EXPIRY_TIME = 2 * 60 * 1000; // 2 minutes
        const now = Date.now();
        
        const filteredSubscriptions = data.subscriptions.filter((sub: Subscription) => {
          // Log subscription details for debugging
          console.log('[MY-SUBSCRIPTIONS] Subscription:', {
            id: sub.id,
            status: sub.status,
            planName: sub.planName,
            orderId: sub.orderId,
          });
          
          // Filter logic: Hide stale pending subscriptions
          if (sub.status === 'pending') {
            try {
              const createdAt = sub.createdAt?.toDate ? sub.createdAt.toDate() : new Date(sub.createdAt);
              const age = now - createdAt.getTime();
              const isStale = age > PENDING_EXPIRY_TIME;
              
              if (isStale) {
                console.log('[MY-SUBSCRIPTIONS] Filtering out stale pending subscription:', {
                  id: sub.id,
                  createdAt: createdAt.toISOString(),
                  ageMinutes: Math.round(age / 60000)
                });
                return false; // Don't show stale pending subscriptions
              }
            } catch (e) {
              console.warn('[MY-SUBSCRIPTIONS] Error parsing date for subscription:', sub.id, e);
              // If we can't parse the date, assume it's old and filter it out
              return false;
            }
          }
          
          return true; // Show active, cancelled, expired, and recent pending subscriptions
        });
        
        // Remove duplicates by subscription ID
        const uniqueSubscriptions = Array.from(
          new Map(filteredSubscriptions.map((sub: Subscription) => [sub.id, sub])).values()
        ) as Subscription[];
        
        console.log('[MY-SUBSCRIPTIONS] After filtering and deduplication:', {
          original: data.subscriptions.length,
          filtered: uniqueSubscriptions.length,
          statuses: uniqueSubscriptions.map(s => ({ id: s.id, status: s.status }))
        });
        
        setSubscriptions(uniqueSubscriptions);
      } else {
        toast.error("Failed to fetch subscriptions");
      }
    } catch (error) {
      console.error("Error fetching subscriptions:", error);
      toast.error("Failed to load subscriptions");
    } finally {
      setLoading(false);
    }
  };

  const handleCancelClick = (subscription: Subscription) => {
    setSelectedSubscription(subscription);
    setCancelDialogOpen(true);
  };

  const handleCancelConfirm = async (reason?: string) => {
    if (!selectedSubscription) return;

    console.log('[CANCEL] Attempting to cancel subscription:', {
      id: selectedSubscription.id,
      planName: selectedSubscription.planName,
      status: selectedSubscription.status,
      fullSubscription: selectedSubscription
    });

    try {
      setCancelling(true);
      const response = await fetch("/api/subscription/cancel", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          subscriptionId: selectedSubscription.id,
          reason,
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        toast.success("Subscription cancelled successfully");
        // Refresh subscriptions
        await fetchSubscriptions();
        setCancelDialogOpen(false);
        setSelectedSubscription(null);
      } else {
        toast.error(data.error || "Failed to cancel subscription");
      }
    } catch (error) {
      console.error("Error cancelling subscription:", error);
      toast.error("Failed to cancel subscription");
    } finally {
      setCancelling(false);
    }
  };

  const formatDate = (date: any) => {
    if (!date) return "N/A";
    
    try {
      let dateObj: Date;
      
      // Handle Firestore Timestamp with toDate method
      if (date?.toDate && typeof date.toDate === 'function') {
        dateObj = date.toDate();
      } 
      // Handle Firestore Timestamp object with _seconds property (from API)
      else if (date?._seconds !== undefined) {
        dateObj = new Date(date._seconds * 1000);
      }
      // Handle Firestore Timestamp object with seconds property (direct from Firestore)
      else if (date?.seconds !== undefined) {
        dateObj = new Date(date.seconds * 1000);
      }
      // Handle ISO string or Date object
      else {
        dateObj = new Date(date);
      }
      
      // Check if date is valid
      if (isNaN(dateObj.getTime())) {
        return "N/A";
      }
      
      return dateObj.toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });
    } catch (error) {
      console.error('Error formatting date:', error, date);
      return "N/A";
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300";
      case "cancelled":
        return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300";
      case "expired":
        return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300";
      case "pending":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "active":
        return <CheckCircle2 className="w-4 h-4" />;
      case "cancelled":
        return <XCircle className="w-4 h-4" />;
      case "expired":
        return <Clock className="w-4 h-4" />;
      case "pending":
        return <AlertCircle className="w-4 h-4" />;
      default:
        return <Clock className="w-4 h-4" />;
    }
  };

  if (authLoading || loading) {
    return (
      <div className="flex min-h-screen flex-col">
        <Header />
        <div className="flex-1 bg-gradient-to-b from-red-50 to-white dark:from-gray-900 dark:to-gray-800 flex items-center justify-center">
          <LoadingOverlay message="Loading your subscriptions..." size="lg" fullScreen={false} />
        </div>
        <Footer />
      </div>
    );
  }

  const activeSubscriptions = subscriptions.filter(sub => sub.status === "active");
  const pendingSubscriptions = subscriptions.filter(sub => sub.status === "pending");
  const inactiveSubscriptions = subscriptions.filter(sub => sub.status !== "active" && sub.status !== "pending");

  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1 bg-gradient-to-b from-red-50 to-white dark:from-gray-900 dark:to-gray-800 py-12">
        <div className="container mx-auto px-4 max-w-6xl">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-12"
        >
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-white mb-4">
            My Subscriptions
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-400">
            Manage your meal subscription plans
          </p>
        </motion.div>

        {/* No Subscriptions */}
        {subscriptions.length === 0 && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.1 }}
          >
            <Card className="text-center py-16 border-2 border-dashed">
              <CardContent className="space-y-6">
                <div className="w-20 h-20 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center mx-auto">
                  <Package className="w-10 h-10 text-[#E31E24]" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                    No Active Subscriptions
                  </h2>
                  <p className="text-gray-600 dark:text-gray-400 mb-6 max-w-md mx-auto">
                    You don&apos;t have any subscription plans yet. Start your journey to convenient, 
                    delicious meals delivered right to your door.
                  </p>
                  <Button 
                    asChild
                    size="lg"
                    className="bg-[#E31E24] hover:bg-[#C41E3A] text-white"
                  >
                    <Link href="/subscribe">
                      Browse Subscription Plans
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Active Subscriptions */}
        {activeSubscriptions.length > 0 && (
          <div className="mb-12">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
              <CheckCircle2 className="w-6 h-6 text-green-600" />
              Active Subscriptions
            </h2>
            <div className="grid gap-6 md:grid-cols-2">
              {activeSubscriptions.map((subscription, index) => (
                <motion.div
                  key={subscription.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <Card className="border-2 border-green-200 dark:border-green-800 shadow-lg hover:shadow-xl transition-shadow">
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div>
                          <CardTitle className="text-2xl mb-2">
                            {subscription.planName}
                          </CardTitle>
                          <CardDescription>
                            {subscription.planType === "weekly" ? "Weekly Plan" : "Monthly Plan"}
                          </CardDescription>
                        </div>
                        <Badge className={`${getStatusColor(subscription.status)} flex items-center gap-1`}>
                          {getStatusIcon(subscription.status)}
                          {subscription.status.charAt(0).toUpperCase() + subscription.status.slice(1)}
                        </Badge>
                      </div>
                    </CardHeader>
                    
                    <CardContent className="space-y-4">
                      <Separator />
                      
                      {/* Price */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                          <CreditCard className="w-4 h-4" />
                          <span>Price</span>
                        </div>
                        <span className="text-2xl font-bold text-[#E31E24]">
                          ₹{subscription.price}
                        </span>
                      </div>

                      {/* Dates */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-gray-600 dark:text-gray-400">Start Date</span>
                          <span className="font-medium">{formatDate(subscription.startDate)}</span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-gray-600 dark:text-gray-400">End Date</span>
                          <span className="font-medium">{formatDate(subscription.endDate)}</span>
                        </div>
                        {subscription.nextBillingDate && (
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-gray-600 dark:text-gray-400">Next Billing</span>
                            <span className="font-medium">{formatDate(subscription.nextBillingDate)}</span>
                          </div>
                        )}
                      </div>

                      {/* Delivery Info */}
                      {subscription.deliveryDays && subscription.deliveryDays.length > 0 && (
                        <div>
                          <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">Delivery Days</p>
                          <div className="flex flex-wrap gap-2">
                            {subscription.deliveryDays.map((day: string) => (
                              <Badge key={day} variant="outline">
                                {day}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}

                      {subscription.preferredSlot && (
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-gray-600 dark:text-gray-400">Time Slot</span>
                          <span className="font-medium">{subscription.preferredSlot}</span>
                        </div>
                      )}
                    </CardContent>

                    <CardFooter className="flex justify-center">
                      <Button 
                        variant="outline" 
                        className="w-full text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950"
                        onClick={() => handleCancelClick(subscription)}
                        disabled={cancelling}
                      >
                        Cancel Plan
                      </Button>
                    </CardFooter>
                  </Card>
                </motion.div>
              ))}
            </div>
          </div>
        )}

        {/* Pending Subscriptions - Only recent (within 30 minutes) */}
        {pendingSubscriptions.length > 0 && (
          <div className="mb-12">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
              <AlertCircle className="w-6 h-6 text-yellow-600" />
              Payment Incomplete
            </h2>
            <div className="grid gap-6 md:grid-cols-2">
              {pendingSubscriptions.map((subscription, index) => (
                <motion.div
                  key={subscription.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <Card className="border-2 border-yellow-200 dark:border-yellow-800">
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div>
                          <CardTitle className="text-xl">
                            {subscription.planName}
                          </CardTitle>
                          <CardDescription>
                            {subscription.planType === "weekly" ? "Weekly Plan" : "Monthly Plan"}
                          </CardDescription>
                        </div>
                        <Badge className={`${getStatusColor(subscription.status)} flex items-center gap-1`}>
                          {getStatusIcon(subscription.status)}
                          Payment Incomplete
                        </Badge>
                      </div>
                    </CardHeader>
                    
                    <CardContent className="space-y-3">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-600 dark:text-gray-400">Duration</span>
                        <span className="font-medium">
                          {subscription.startDate && subscription.endDate 
                            ? `${formatDate(subscription.startDate)} - ${formatDate(subscription.endDate)}`
                            : 'N/A - N/A'
                          }
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-600 dark:text-gray-400">Price</span>
                        <span className="font-medium">₹{subscription.price}</span>
                      </div>
                      <div className="mt-3 p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                        <p className="text-sm text-yellow-800 dark:text-yellow-200 flex items-center gap-2">
                          <AlertCircle className="w-4 h-4 flex-shrink-0" />
                          Payment was not completed. This will be removed shortly.
                        </p>
                      </div>
                    </CardContent>
                    
                    <CardFooter>
                      <Button 
                        asChild
                        className="w-full bg-[#E31E24] hover:bg-[#C41E3A] text-white"
                      >
                        <Link href="/subscribe">
                          Start New Subscription
                          <ArrowRight className="w-4 h-4 ml-2" />
                        </Link>
                      </Button>
                    </CardFooter>
                  </Card>
                </motion.div>
              ))}
            </div>
          </div>
        )}

        {/* Inactive Subscriptions */}
        {inactiveSubscriptions.length > 0 && (
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
              <Clock className="w-6 h-6 text-gray-600" />
              Past Subscriptions
            </h2>
            <div className="grid gap-6 md:grid-cols-2">
              {inactiveSubscriptions.map((subscription, index) => (
                <motion.div
                  key={subscription.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <Card className="opacity-75 hover:opacity-100 transition-opacity">
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div>
                          <CardTitle className="text-xl">
                            {subscription.planName}
                          </CardTitle>
                          <CardDescription>
                            {subscription.planType === "weekly" ? "Weekly Plan" : "Monthly Plan"}
                          </CardDescription>
                        </div>
                        <Badge className={getStatusColor(subscription.status)}>
                          {getStatusIcon(subscription.status)}
                          {subscription.status.charAt(0).toUpperCase() + subscription.status.slice(1)}
                        </Badge>
                      </div>
                    </CardHeader>
                    
                    <CardContent className="space-y-3">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-600 dark:text-gray-400">Duration</span>
                        <span className="font-medium">
                          {subscription.startDate && subscription.endDate 
                            ? `${formatDate(subscription.startDate)} - ${formatDate(subscription.endDate)}`
                            : 'N/A - N/A'
                          }
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-600 dark:text-gray-400">Price</span>
                        <span className="font-medium">₹{subscription.price}</span>
                      </div>
                      {subscription.status === 'pending' && (
                        <div className="mt-2 p-2 bg-yellow-50 dark:bg-yellow-900/20 rounded text-xs text-yellow-800 dark:text-yellow-200">
                          ⏳ Payment pending. This subscription will be activated once payment is confirmed.
                        </div>
                      )}
                    </CardContent>

                    <CardFooter>
                      <Button 
                        asChild
                        variant="outline"
                        className="w-full"
                      >
                        <Link href="/subscribe">
                          <RefreshCw className="w-4 h-4 mr-2" />
                          Resubscribe
                        </Link>
                      </Button>
                    </CardFooter>
                  </Card>
                </motion.div>
              ))}
            </div>
          </div>
        )}

        {/* Add New Subscription CTA - Hidden */}
      </div>
    </main>
    <Footer />

    {/* Cancel Subscription Dialog */}
    <CancelSubscriptionDialog
      open={cancelDialogOpen}
      onOpenChange={setCancelDialogOpen}
      onConfirm={handleCancelConfirm}
      subscriptionName={selectedSubscription?.planName || ""}
      isLoading={cancelling}
    />
  </div>
  );
}

