"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  CheckCircle2,
  Package,
  MapPin,
  CreditCard,
  Calendar,
  Download,
  Home,
  ShoppingCart,
} from "lucide-react";
import { motion } from "framer-motion";

export function OrderConfirmation() {
  const router = useRouter();
  const [orderData, setOrderData] = useState<any>(null);
  const [redirectCountdown, setRedirectCountdown] = useState(10);

  useEffect(() => {
    const lastOrder = localStorage.getItem("lastOrder");
    if (lastOrder) {
      setOrderData(JSON.parse(lastOrder));
    }
  }, []);

  // Auto-redirect countdown timer
  useEffect(() => {
    if (!orderData) return;

    const timer = setInterval(() => {
      setRedirectCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          router.push("/menu");
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [orderData, router]);

  if (!orderData) {
    return (
      <div className="max-w-2xl mx-auto">
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">Loading order details...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { orderId, items, deliveryAddress, grandTotal, paymentMethod, orderDate } =
    orderData;

  return (
    <div className="max-w-4xl mx-auto">
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.5 }}
      >
        {/* Success Header */}
        <Card className="mb-6 border-green-200 dark:border-green-900/30 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20">
          <CardContent className="py-8">
            <div className="text-center space-y-4">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
              >
                <CheckCircle2 className="w-20 h-20 text-green-600 mx-auto drop-shadow-lg" />
              </motion.div>
              <div>
                <h1 className="text-3xl font-bold text-green-600 mb-2">
                  Order Confirmed! 🍽️
                </h1>
                <p className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-1">
                  Your One-Time Meal Order is Confirmed
                </p>
                <p className="text-muted-foreground">
                  Thank you for choosing BHOOKR! Your fresh, healthy meals will be
                  prepared and delivered to your doorstep.
                </p>
              </div>
              <div className="inline-block bg-green-100 dark:bg-green-900/40 px-6 py-3 rounded-lg border-2 border-green-300 dark:border-green-700">
                <p className="text-sm text-muted-foreground">Order ID</p>
                <p className="text-xl font-bold text-green-600">{orderId}</p>
              </div>
              
              {/* Auto-redirect message */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="pt-4"
              >
                <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-100 dark:bg-blue-900/30 rounded-full border border-blue-300 dark:border-blue-700">
                  <ShoppingCart className="w-4 h-4 text-blue-600" />
                  <p className="text-sm text-blue-800 dark:text-blue-200">
                    Redirecting to menu in <span className="font-bold text-lg">{redirectCountdown}</span> seconds...
                  </p>
                </div>
              </motion.div>
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Order Details */}
          <Card>
            <CardContent className="p-6 space-y-6">
              <div>
                <h2 className="text-lg font-bold flex items-center gap-2 mb-4">
                  <Package className="w-5 h-5 text-red-600" />
                  Order Details
                </h2>
                <div className="space-y-3">
                  {items.map((item: any, index: number) => (
                    <div key={index} className="flex justify-between text-sm">
                      <div>
                        <p className="font-medium">{item.planName}</p>
                        <p className="text-muted-foreground">Qty: {item.quantity}</p>
                      </div>
                      <p className="font-semibold">₹{item.total}</p>
                    </div>
                  ))}
                </div>
              </div>

              <Separator />

              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span>₹{orderData.subtotal}</span>
                </div>
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-muted-foreground">Delivery Fee</span>
                  <span>₹{orderData.deliveryFee}</span>
                </div>
                <div className="flex justify-between text-sm mb-3">
                  <span className="text-muted-foreground">GST</span>
                  <span>₹{orderData.tax}</span>
                </div>
                <Separator className="my-3" />
                <div className="flex justify-between font-bold text-lg">
                  <span>Total Paid</span>
                  <span className="text-green-600">₹{grandTotal}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Delivery & Payment Info */}
          <div className="space-y-6">
            <Card>
              <CardContent className="p-6">
                <h2 className="text-lg font-bold flex items-center gap-2 mb-4">
                  <MapPin className="w-5 h-5 text-red-600" />
                  Delivery Address
                </h2>
                <div className="space-y-1 text-sm">
                  <p className="font-semibold">{deliveryAddress.fullName}</p>
                  <p className="text-muted-foreground">{deliveryAddress.phone}</p>
                  <p className="text-muted-foreground">
                    {deliveryAddress.street}
                    {deliveryAddress.landmark && `, ${deliveryAddress.landmark}`}
                  </p>
                  <p className="text-muted-foreground">
                    {deliveryAddress.city}, {deliveryAddress.state} -{" "}
                    {deliveryAddress.zipCode}
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6 space-y-4">
                <div>
                  <h3 className="text-sm font-semibold flex items-center gap-2 mb-2">
                    <CreditCard className="w-4 h-4 text-red-600" />
                    Payment Method
                  </h3>
                  <p className="text-sm text-muted-foreground capitalize">
                    {paymentMethod.replace("_", " ")}
                  </p>
                </div>

                <div>
                  <h3 className="text-sm font-semibold flex items-center gap-2 mb-2">
                    <Calendar className="w-4 h-4 text-red-600" />
                    Order Date
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {new Date(orderDate).toLocaleDateString("en-IN", {
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Action Buttons */}
        <Card className="mt-6">
          <CardContent className="p-6">
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button
                variant="outline"
                className="sm:w-auto h-12 font-semibold"
                onClick={() => {
                  window.print();
                }}
              >
                <Download className="w-4 h-4 mr-2" />
                Download Invoice
              </Button>
              <Button
                variant="outline"
                className="sm:w-auto h-12 font-semibold bg-gradient-to-r from-red-50 to-orange-50 hover:from-red-100 hover:to-orange-100 border-red-200 text-red-700 hover:text-red-800 dark:from-red-900/20 dark:to-orange-900/20"
                onClick={() => router.push("/menu")}
              >
                <Package className="w-4 h-4 mr-2" />
                Order Again
              </Button>
              <Button
                className="sm:w-auto h-12 font-semibold bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-700 hover:to-orange-700 shadow-lg hover:shadow-xl transition-all"
                onClick={() => router.push("/")}
              >
                <Home className="w-4 h-4 mr-2" />
                Back to Home
              </Button>
            </div>
            
            <p className="text-center text-sm text-muted-foreground mt-4">
              You can click &quot;Order Again&quot; now or wait for automatic redirect
            </p>
          </CardContent>
        </Card>

        {/* What's Next */}
        <Card className="mt-6 border-blue-200 dark:border-blue-900/30">
          <CardContent className="p-6">
            <h2 className="text-lg font-bold mb-4">📦 Delivery Timeline</h2>
            <div className="space-y-3">
              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center shrink-0">
                  <span className="text-sm font-bold text-blue-600">1</span>
                </div>
                <div>
                  <p className="font-semibold">Order Confirmed</p>
                  <p className="text-sm text-muted-foreground">
                    Your order has been successfully placed and confirmed
                  </p>
                </div>
              </div>
              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center shrink-0">
                  <span className="text-sm font-bold text-blue-600">2</span>
                </div>
                <div>
                  <p className="font-semibold">Meal Preparation (2-4 hours)</p>
                  <p className="text-sm text-muted-foreground">
                    Our chefs prepare your meals fresh with quality ingredients
                  </p>
                </div>
              </div>
              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center shrink-0">
                  <span className="text-sm font-bold text-blue-600">3</span>
                </div>
                <div>
                  <p className="font-semibold">Out for Delivery</p>
                  <p className="text-sm text-muted-foreground">
                    You&apos;ll receive a tracking notification once your order is dispatched
                  </p>
                </div>
              </div>
              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center shrink-0">
                  <span className="text-sm font-bold text-green-600">✓</span>
                </div>
                <div>
                  <p className="font-semibold">Delivered to You</p>
                  <p className="text-sm text-muted-foreground">
                    Hot, fresh meals at your doorstep. Enjoy your meal!
                  </p>
                </div>
              </div>
            </div>
            <div className="mt-4 p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-900/30">
              <p className="text-sm text-amber-800 dark:text-amber-200">
                <span className="font-semibold">💡 Tip:</span> Track your order status in real-time via the tracking link sent to your email.
              </p>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
