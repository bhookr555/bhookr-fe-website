"use client";

import { useState, type FormEvent } from "react";
import { Copy, IndianRupee, Share2, X, Check, ExternalLink } from "lucide-react";
import { PLAN_TYPE_OPTIONS } from "@/lib/crm/pipeline";
import { toast } from "sonner";

interface PaymentLinkModalProps {
  email: string;
  name: string;
  phone: string;
  onClose: () => void;
}

export function PaymentLinkModal({
  email,
  name,
  phone,
  onClose,
}: PaymentLinkModalProps) {
  const [planType, setPlanType] = useState("custom");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [shortUrl, setShortUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!amount || Number(amount) <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/crm/payment/create-link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          name,
          phone,
          amount: Number(amount),
          planType,
          description: description.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (data.success && data.shortUrl) {
        setShortUrl(data.shortUrl);
        toast.success("Payment link generated successfully!");
      } else {
        toast.error(data.error || "Failed to generate payment link");
      }
    } catch (err) {
      console.error(err);
      toast.error("An error occurred while generating the payment link");
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async () => {
    if (!shortUrl) return;
    try {
      await navigator.clipboard.writeText(shortUrl);
      setCopied(true);
      toast.success("Link copied to clipboard!");
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      toast.error("Failed to copy link");
    }
  };

  const handleWhatsAppShare = () => {
    if (!shortUrl) return;
    const selectedPlanLabel = PLAN_TYPE_OPTIONS.find((p) => p.value === planType)?.label || "Meals subscription";
    const textMessage = `Hello ${name || "there"},\n\nHere is your unique payment link for the Bhookr fresh meal subscription (${selectedPlanLabel}):\n👉 ${shortUrl}\n\nPlease click to complete the secure payment.\n\nThank you,\nTeam Bhookr`;
    
    // Clean phone number (remove non-digits)
    const cleanedPhone = phone.replace(/\D/g, "");
    const whatsappPhone = cleanedPhone.length === 10 ? `91${cleanedPhone}` : cleanedPhone;
    
    const whatsappUrl = `https://wa.me/${whatsappPhone}?text=${encodeURIComponent(textMessage)}`;
    window.open(whatsappUrl, "_blank");
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl dark:bg-gray-900 overflow-hidden">
        <div className="flex items-center justify-between border-b border-gray-250 px-5 py-4 dark:border-gray-800">
          <div>
            <h3 className="text-base font-bold text-gray-900 dark:text-white">
              Generate Payment Link
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {name || "Customer"} · {email}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-1 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {!shortUrl ? (
          <form onSubmit={handleSubmit} className="p-5 space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-400">
                  Plan type
                </label>
                <select
                  value={planType}
                  onChange={(e) => setPlanType(e.target.value)}
                  disabled={loading}
                  className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-950 dark:text-white outline-none focus:ring-1 focus:ring-red-500 focus:border-red-500"
                >
                  {PLAN_TYPE_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-400">
                  Amount (₹)
                </label>
                <div className="relative">
                  <IndianRupee className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                  <input
                    type="number"
                    inputMode="decimal"
                    min="1"
                    required
                    placeholder="500"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    disabled={loading}
                    className="w-full rounded-lg border border-gray-200 bg-white py-2 pl-9 pr-3 text-sm dark:border-gray-700 dark:bg-gray-950 dark:text-white outline-none focus:ring-1 focus:ring-red-500 focus:border-red-500"
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-400">
                Custom Notes / Description (optional)
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                disabled={loading}
                rows={2}
                placeholder="e.g. Standard 2 meals monthly subscription"
                className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-950 dark:text-white outline-none focus:ring-1 focus:ring-red-500 focus:border-red-500"
              />
            </div>

            <div className="rounded-lg bg-gray-50 p-3 text-xs text-gray-500 dark:bg-gray-950 dark:text-gray-400">
              Note: This will generate a unique link via Razorpay. An automated Email and SMS will be sent to the customer automatically by Razorpay.
            </div>

            <div className="flex items-center justify-end gap-2 border-t border-gray-250 pt-4 dark:border-gray-800">
              <button
                type="button"
                onClick={onClose}
                disabled={loading}
                className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200 hover:bg-gray-50 transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="rounded-lg bg-[#E31E24] hover:bg-[#C41E3A] px-4 py-2 text-sm font-semibold text-white shadow-sm disabled:opacity-50 transition"
              >
                {loading ? "Generating..." : "Generate Link"}
              </button>
            </div>
          </form>
        ) : (
          <div className="p-5 space-y-5">
            <div className="text-center py-2">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-green-100 dark:bg-green-950/30">
                <Check className="h-6 w-6 text-green-600 dark:text-green-400" />
              </div>
              <h4 className="mt-3 text-sm font-semibold text-gray-900 dark:text-white">
                Unique Link Generated!
              </h4>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Link is ready to be shared with {name || email}.
              </p>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-400">
                Payment URL
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  readOnly
                  value={shortUrl}
                  className="flex-1 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-950 dark:text-white select-all outline-none"
                />
                <button
                  onClick={handleCopy}
                  className="inline-flex items-center justify-center rounded-lg border border-gray-200 bg-white p-2 text-gray-600 hover:bg-gray-50 hover:text-gray-900 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 dark:hover:bg-gray-800 transition"
                  title="Copy link"
                >
                  {copied ? (
                    <Check className="h-4 w-4 text-green-600" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                type="button"
                onClick={handleWhatsAppShare}
                className="flex items-center justify-center gap-2 rounded-lg bg-green-600 hover:bg-green-700 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition"
              >
                <Share2 className="h-4 w-4" />
                Share on WhatsApp
              </button>
              <a
                href={shortUrl}
                target="_blank"
                rel="noreferrer"
                className="flex items-center justify-center gap-2 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 px-4 py-2.5 text-sm font-semibold text-gray-700 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200 transition"
              >
                <ExternalLink className="h-4 w-4" />
                Open Link
              </a>
            </div>

            <div className="flex justify-end border-t border-gray-250 pt-4 dark:border-gray-800">
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg bg-gray-900 hover:bg-gray-800 text-white dark:bg-gray-200 dark:hover:bg-gray-100 dark:text-gray-900 px-4 py-2 text-sm font-semibold transition"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
