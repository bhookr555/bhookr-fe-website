"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle2, Download, Home, Calendar, IndianRupee } from "lucide-react";
import { motion } from "framer-motion";
import { format } from "date-fns";
import type { InvoiceData } from "@/types/subscription";
import Link from "next/link";

interface PaymentSuccessProps {
  invoiceData: InvoiceData;
  onPrintInvoice: () => void;
  onReset: () => void;
}

export function PaymentSuccess({ invoiceData, onPrintInvoice, onReset }: PaymentSuccessProps) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4 }}
      className="w-full"
    >
      <Card className="border-2 shadow-lg overflow-hidden">
        {/* Success Header */}
        <div className="bg-linear-to-r from-green-500 to-emerald-600 p-8 text-center">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
            className="inline-block"
          >
            <CheckCircle2 className="w-20 h-20 text-white mx-auto mb-4" />
          </motion.div>
          <h2 className="text-3xl font-bold text-white mb-2">Subscription Activated! 🎉</h2>
          <p className="text-green-100 text-lg font-medium">
            Welcome to Your Healthy Lifestyle Journey
          </p>
          {invoiceData.startDate && (
            <p className="text-green-50 text-sm mt-2">
              Your personalized meal plan starts from {format(invoiceData.startDate, "PPP")}
            </p>
          )}
        </div>

        <CardContent className="p-6 space-y-6">
          {/* Subscription Summary */}
          <div className="bg-gray-50 rounded-lg p-5 space-y-4">
            <h3 className="font-bold text-lg text-gray-900 mb-4">Subscription Summary</h3>
            
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Invoice Number</span>
                <span className="font-semibold text-gray-900">{invoiceData.invoiceNumber}</span>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Plan</span>
                <span className="font-semibold text-gray-900">{invoiceData.planName}</span>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Duration</span>
                <span className="font-semibold text-gray-900">{invoiceData.duration}</span>
              </div>
              
              {invoiceData.startDate && (
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Start Date</span>
                  <span className="font-semibold text-gray-900">
                    {format(invoiceData.startDate, "PPP")}
                  </span>
                </div>
              )}
              
              <div className="border-t pt-3 flex justify-between items-center">
                <span className="text-gray-600">Subscription Amount</span>
                <span className="font-semibold text-gray-900">
                  ₹{(invoiceData.subscriptionAmount ?? 0).toLocaleString()}
                </span>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-gray-600">GST (5%)</span>
                <span className="font-semibold text-gray-900">
                  ₹{(invoiceData.subscriptionGST ?? 0).toLocaleString()}
                </span>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Delivery Charges</span>
                <span className="font-semibold text-gray-900">
                  ₹{(invoiceData.deliveryCharges ?? 0).toLocaleString()}
                </span>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Delivery GST (18%)</span>
                <span className="font-semibold text-gray-900">
                  ₹{(invoiceData.deliveryGST ?? 0).toLocaleString()}
                </span>
              </div>
              
              <div className="border-t-2 pt-3 flex justify-between items-center">
                <span className="text-lg font-bold text-gray-900">Total Paid</span>
                <span className="text-2xl font-bold text-green-600">
                  ₹{invoiceData.totalAmount.toLocaleString()}
                </span>
              </div>
            </div>
          </div>

          {/* Payment Details */}
          <div className="bg-blue-50 rounded-lg p-4 space-y-2">
            <div className="flex items-center gap-2 text-blue-900">
              <IndianRupee className="w-4 h-4" />
              <span className="font-semibold">Payment Method:</span>
              <span>{invoiceData.paymentMethod}</span>
            </div>
            <div className="flex items-center gap-2 text-blue-900">
              <Calendar className="w-4 h-4" />
              <span className="font-semibold">Transaction ID:</span>
              <span className="text-sm">{invoiceData.paymentId}</span>
            </div>
          </div>

          {/* Customer Details */}
          <div className="text-sm text-gray-600 space-y-1">
            <p><span className="font-semibold">Name:</span> {invoiceData.customerName}</p>
            <p><span className="font-semibold">Email:</span> {invoiceData.email}</p>
            <p><span className="font-semibold">Phone:</span> {invoiceData.phone}</p>
          </div>

          {/* Action Buttons */}
          <div className="space-y-3 pt-4">
            <Button
              onClick={onPrintInvoice}
              className="w-full h-12 text-base font-semibold bg-linear-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800"
            >
              <Download className="w-5 h-5 mr-2" />
              Download Invoice
            </Button>
            
            <Link href="/" className="block">
              <Button
                variant="outline"
                className="w-full h-12 text-base font-semibold"
                onClick={onReset}
              >
                <Home className="w-5 h-5 mr-2" />
                Back to Home
              </Button>
            </Link>
          </div>

          {/* Subscription Benefits */}
          <div className="bg-gradient-to-r from-purple-50 to-pink-50 border border-purple-200 rounded-lg p-5">
            <h3 className="font-bold text-purple-900 mb-3 text-lg">🌟 Your Subscription Benefits</h3>
            <ul className="space-y-2 text-sm text-purple-800">
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 mt-0.5 flex-shrink-0 text-green-600" />
                <span><strong>Daily Fresh Meals:</strong> Delivered to your doorstep every day</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 mt-0.5 flex-shrink-0 text-green-600" />
                <span><strong>Personalized Plan:</strong> Customized to your health goals and preferences</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 mt-0.5 flex-shrink-0 text-green-600" />
                <span><strong>Expert Support:</strong> Nutritionist consultation available</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 mt-0.5 flex-shrink-0 text-green-600" />
                <span><strong>Flexible Options:</strong> Pause or modify your plan anytime</span>
              </li>
            </ul>
          </div>

          {/* Info Message */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-800">
              <span className="font-semibold">📧 What&apos;s Next:</span> You&apos;ll receive a detailed email with your meal delivery schedule, nutritionist contact, and subscription management portal access.
            </p>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
