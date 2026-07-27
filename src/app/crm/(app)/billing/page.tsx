"use client";

import { useEffect } from "react";
import { ExternalLink, Receipt } from "lucide-react";

export default function CrmBillingPage() {
  const razorpayInvoicesUrl = "https://dashboard.razorpay.com/app/invoices";

  useEffect(() => {
    // Redirect directly to Razorpay Invoices Dashboard
    window.location.href = razorpayInvoicesUrl;
  }, []);

  return (
    <div className="flex min-h-[400px] flex-col items-center justify-center rounded-2xl border border-gray-200 bg-white p-8 text-center shadow-sm dark:border-gray-800 dark:bg-gray-900">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-red-50 text-[#E31E24] dark:bg-red-950/40 dark:text-red-400">
        <Receipt className="h-8 w-8" />
      </div>

      <h1 className="mt-4 text-xl font-bold text-gray-900 dark:text-white">
        Redirecting to Razorpay Invoices…
      </h1>
      <p className="mt-1 max-w-md text-sm text-gray-500 dark:text-gray-400">
        Opening your official Razorpay Invoices Dashboard directly.
      </p>

      <a
        href={razorpayInvoicesUrl}
        className="mt-6 inline-flex items-center gap-2 rounded-xl bg-[#E31E24] px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#C41E3A] active:bg-[#A01828]"
      >
        <ExternalLink className="h-4 w-4" />
        Open Razorpay Invoices
      </a>
    </div>
  );
}
