"use client";

import { useState, type FormEvent } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { IndianRupee, X } from "lucide-react";
import {
  PAYMENT_METHOD_OPTIONS,
  PLAN_TYPE_OPTIONS,
  setPipelineStatus,
  setPipelineStatusApi,
} from "@/lib/crm/pipeline";
import { CRM_QUERY_KEYS } from "@/hooks/crm/use-dashboard-data";
import type { CrmRole } from "@/lib/crm/auth";

interface ConvertModalProps {
  email: string;
  name?: string;
  role: CrmRole | null;
  onClose: () => void;
  onSuccess?: () => void;
}

export function ConvertModal({
  email,
  name,
  role,
  onClose,
  onSuccess,
}: ConvertModalProps) {
  const [planType, setPlanType] = useState("standard");
  const [amount, setAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [notes, setNotes] = useState("");
  const [confirming, setConfirming] = useState(false);

  const queryClient = useQueryClient();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!confirming) {
      setConfirming(true);
      return;
    }
    if (!role) return;

    const key = String(email ?? "").toLowerCase().trim();

    // 1. Optimistic React Query cache update (0ms response)
    queryClient.setQueryData(CRM_QUERY_KEYS.pipeline, (old: any) => {
      const data = old?.data ? { ...old.data } : {};
      data[key] = {
        ...data[key],
        email: key,
        status: "converted",
        updatedAt: new Date().toISOString(),
        updatedBy: role,
        planType,
        amount: amount ? Number(amount) : undefined,
        paymentMethod,
        notes: notes.trim() || undefined,
      };
      return { success: true, data };
    });

    // 2. Database update
    const success = await setPipelineStatusApi(email, "converted", role, {
      planType,
      amount: amount ? Number(amount) : undefined,
      paymentMethod,
      notes: notes.trim() || undefined,
    });
    if (success) {
      onSuccess?.();
    }
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl dark:bg-gray-900">
        <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4 dark:border-gray-800">
          <div>
            <h3 className="text-base font-bold text-gray-900 dark:text-white">
              Mark as converted
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {name || email} · database sync
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-1 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 p-5">
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-300">
            ⚠️ This will NOT write to the Subscriptions sheet. The mark is saved in the central CRM database.
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-400">
                Plan type
              </label>
              <select
                value={planType}
                onChange={(e) => setPlanType(e.target.value)}
                disabled={confirming}
                className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-950 dark:text-white"
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
                Amount paid (₹)
              </label>
              <div className="relative">
                <IndianRupee className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <input
                  type="number"
                  inputMode="decimal"
                  min="0"
                  placeholder="0"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  disabled={confirming}
                  className="w-full rounded-lg border border-gray-200 bg-white py-2 pl-9 pr-3 text-sm dark:border-gray-700 dark:bg-gray-950 dark:text-white"
                />
              </div>
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-400">
              Payment method
            </label>
            <select
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value)}
              disabled={confirming}
              className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-950 dark:text-white"
            >
              {PAYMENT_METHOD_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-400">
              Notes (optional)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              disabled={confirming}
              rows={2}
              placeholder="e.g. Paid by cash on 28 May, receipt #1234"
              className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-950 dark:text-white"
            />
          </div>

          {confirming && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-300">
              Confirm: mark <strong>{email}</strong> as converted in the central database? This can be removed later.
            </div>
          )}

          <div className="flex items-center justify-end gap-2 border-t border-gray-200 pt-4 dark:border-gray-800">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200"
            >
              Cancel
            </button>
            <button
              type="submit"
              className={`rounded-lg px-4 py-2 text-sm font-semibold text-white shadow-sm ${
                confirming
                  ? "bg-red-600 hover:bg-red-700"
                  : "bg-[#E31E24] hover:bg-[#C41E3A]"
              }`}
            >
              {confirming ? "Yes, mark as converted" : "Continue"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
