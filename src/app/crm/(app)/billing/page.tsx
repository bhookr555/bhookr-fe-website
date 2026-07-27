"use client";

import { useCallback, useEffect, useState } from "react";
import {
  AlertCircle,
  ExternalLink,
  RefreshCw,
  Receipt,
  Search,
  Copy,
  Check,
} from "lucide-react";

interface RazorpayInvoice {
  id: string;
  invoice_number: string;
  status: string;
  type: string;
  description: string;
  customer: {
    name?: string;
    email?: string;
    contact?: string;
  };
  line_items: Array<{
    name: string;
    amount: number;
    quantity: number;
    currency: string;
  }>;
  amount: number;
  amount_paid: number;
  amount_due: number;
  currency: string;
  short_url: string;
  date: number;
  expire_by: number | null;
  issued_at: number | null;
  paid_at: number | null;
  created_at: number;
}

type StatusFilter = "all" | "issued" | "paid" | "cancelled" | "expired" | "draft";

const STATUS_STYLES: Record<string, string> = {
  issued: "bg-blue-100 text-blue-800 dark:bg-blue-950/40 dark:text-blue-300",
  paid: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300",
  cancelled: "bg-red-100 text-red-800 dark:bg-red-950/40 dark:text-red-300",
  expired: "bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300",
  draft: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
  partially_paid: "bg-indigo-100 text-indigo-800 dark:bg-indigo-950/40 dark:text-indigo-300",
};

function formatINR(paise: number | undefined | null): string {
  if (!paise && paise !== 0) return "—";
  return `₹${(paise / 100).toLocaleString("en-IN")}`;
}

function formatDate(ts: number | null | undefined): string {
  if (!ts) return "—";
  return new Date(ts * 1000).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatDateTime(ts: number | null | undefined): string {
  if (!ts) return "—";
  return new Date(ts * 1000).toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function CrmBillingPage() {
  const [invoices, setInvoices] = useState<RazorpayInvoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const fetchInvoices = useCallback(async (silent = false) => {
    if (!silent) setRefreshing(true);
    setError(null);
    try {
      const res = await fetch("/api/crm/payment/invoices", { cache: "no-store" });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to fetch invoices");
      }
      setInvoices(data.invoices || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load invoices");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchInvoices();
  }, [fetchInvoices]);

  const filtered = invoices.filter((inv) => {
    if (statusFilter !== "all" && inv.status !== statusFilter) return false;
    if (search.trim()) {
      const haystack = [
        inv.invoice_number,
        inv.customer?.name,
        inv.customer?.email,
        inv.customer?.contact,
        inv.description,
      ]
        .map((v) => String(v ?? ""))
        .join(" ")
        .toLowerCase();
      if (!haystack.includes(search.trim().toLowerCase())) return false;
    }
    return true;
  });

  const counts = {
    all: invoices.length,
    issued: invoices.filter((i) => i.status === "issued").length,
    paid: invoices.filter((i) => i.status === "paid").length,
    cancelled: invoices.filter((i) => i.status === "cancelled").length,
    expired: invoices.filter((i) => i.status === "expired").length,
    draft: invoices.filter((i) => i.status === "draft").length,
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-[#E31E24]">
            Billing
          </p>
          <h1 className="mt-0.5 text-2xl font-bold text-gray-900 dark:text-white">
            {loading ? "Loading…" : `${filtered.length} Razorpay Invoices`}
          </h1>
          <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
            View and manage all Razorpay invoices · no separate login required
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => fetchInvoices()}
            disabled={refreshing}
            className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:opacity-60 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200 dark:hover:bg-gray-800"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
            Refresh
          </button>
          <a
            href="https://dashboard.razorpay.com/app/invoices"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200 dark:hover:bg-gray-800"
          >
            <ExternalLink className="h-4 w-4" />
            Razorpay Dashboard
          </a>
        </div>
      </div>

      {error && (
        <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 dark:border-red-900/40 dark:bg-red-950/30">
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-600 dark:text-red-400" />
          <p className="text-sm text-red-800 dark:text-red-300">{error}</p>
        </div>
      )}

      {/* Filter chips */}
      <div className="flex flex-wrap gap-1.5">
        {(
          [
            { value: "all", label: "All", emoji: "📋" },
            { value: "issued", label: "Issued", emoji: "📤" },
            { value: "paid", label: "Paid", emoji: "✅" },
            { value: "expired", label: "Expired", emoji: "⏰" },
            { value: "cancelled", label: "Cancelled", emoji: "❌" },
            { value: "draft", label: "Draft", emoji: "📝" },
          ] as const
        ).map((chip) => (
          <button
            key={chip.value}
            onClick={() => setStatusFilter(chip.value)}
            className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium transition ${
              statusFilter === chip.value
                ? "bg-gray-900 text-white dark:bg-white dark:text-gray-900"
                : "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300"
            }`}
          >
            <span>{chip.emoji}</span>
            <span>{chip.label}</span>
            <span
              className={`rounded-full px-1.5 py-0 text-[10px] font-bold ${
                statusFilter === chip.value
                  ? "bg-white/20"
                  : "bg-white/60 dark:bg-gray-900/60"
              }`}
            >
              {counts[chip.value]}
            </span>
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name, email, invoice number…"
          className="w-full rounded-lg border border-gray-200 bg-white py-2 pl-10 pr-3 text-sm text-gray-900 placeholder:text-gray-400 focus:border-[#E31E24] focus:outline-none focus:ring-1 focus:ring-[#E31E24] dark:border-gray-800 dark:bg-gray-900 dark:text-white sm:max-w-md"
        />
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900">
        <div className="overflow-x-auto">
          <table className="min-w-full border-collapse text-sm">
            <thead className="sticky top-0 bg-gray-50 dark:bg-gray-950">
              <tr>
                <th className="border-b border-gray-200 px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-500 dark:border-gray-800 dark:text-gray-400">
                  Invoice #
                </th>
                <th className="border-b border-gray-200 px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-500 dark:border-gray-800 dark:text-gray-400">
                  Customer
                </th>
                <th className="border-b border-gray-200 px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-500 dark:border-gray-800 dark:text-gray-400">
                  Description
                </th>
                <th className="border-b border-gray-200 px-3 py-2 text-right text-[11px] font-semibold uppercase tracking-wider text-gray-500 dark:border-gray-800 dark:text-gray-400">
                  Amount
                </th>
                <th className="border-b border-gray-200 px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-500 dark:border-gray-800 dark:text-gray-400">
                  Status
                </th>
                <th className="border-b border-gray-200 px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-500 dark:border-gray-800 dark:text-gray-400">
                  Date
                </th>
                <th className="border-b border-gray-200 px-3 py-2 text-right text-[11px] font-semibold uppercase tracking-wider text-gray-500 dark:border-gray-800 dark:text-gray-400">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-3 py-12 text-center text-sm text-gray-500">
                    <div className="flex items-center justify-center gap-2">
                      <RefreshCw className="h-4 w-4 animate-spin" />
                      Loading invoices from Razorpay…
                    </div>
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-3 py-12 text-center text-sm text-gray-500">
                    <Receipt className="mx-auto mb-2 h-8 w-8 text-gray-300" />
                    {invoices.length === 0
                      ? "No invoices found in Razorpay."
                      : "No invoices match your filters."}
                  </td>
                </tr>
              ) : (
                filtered.map((inv) => (
                  <tr
                    key={inv.id}
                    className="odd:bg-white even:bg-gray-50 hover:bg-red-50/40 dark:odd:bg-gray-900 dark:even:bg-gray-950 dark:hover:bg-red-950/20"
                  >
                    <td className="whitespace-nowrap border-b border-gray-100 px-3 py-2.5 dark:border-gray-800">
                      <span className="font-mono text-xs font-bold text-gray-900 dark:text-white">
                        #{inv.invoice_number || "—"}
                      </span>
                    </td>
                    <td className="border-b border-gray-100 px-3 py-2.5 dark:border-gray-800">
                      <div className="max-w-[200px]">
                        <p className="truncate text-sm font-medium text-gray-900 dark:text-white">
                          {inv.customer?.name || "—"}
                        </p>
                        <p className="truncate text-xs text-gray-500 dark:text-gray-400">
                          {inv.customer?.email || ""}
                        </p>
                        {inv.customer?.contact && (
                          <p className="text-xs text-gray-400">
                            {inv.customer.contact}
                          </p>
                        )}
                      </div>
                    </td>
                    <td className="border-b border-gray-100 px-3 py-2.5 dark:border-gray-800">
                      <p className="max-w-[200px] truncate text-xs text-gray-700 dark:text-gray-300">
                        {inv.description || inv.line_items?.[0]?.name || "—"}
                      </p>
                    </td>
                    <td className="whitespace-nowrap border-b border-gray-100 px-3 py-2.5 text-right dark:border-gray-800">
                      <p className="text-sm font-semibold text-gray-900 dark:text-white">
                        {formatINR(inv.amount)}
                      </p>
                      {inv.status === "paid" && inv.amount_paid > 0 && (
                        <p className="text-[10px] text-emerald-600 dark:text-emerald-400">
                          Paid {formatINR(inv.amount_paid)}
                        </p>
                      )}
                      {inv.amount_due > 0 && inv.status !== "paid" && (
                        <p className="text-[10px] text-red-500">
                          Due {formatINR(inv.amount_due)}
                        </p>
                      )}
                    </td>
                    <td className="whitespace-nowrap border-b border-gray-100 px-3 py-2.5 dark:border-gray-800">
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium capitalize ${
                          STATUS_STYLES[inv.status] || STATUS_STYLES.draft
                        }`}
                      >
                        {inv.status.replace("_", " ")}
                      </span>
                    </td>
                    <td className="whitespace-nowrap border-b border-gray-100 px-3 py-2.5 dark:border-gray-800">
                      <div className="text-xs text-gray-600 dark:text-gray-300">
                        <p>{formatDate(inv.date || inv.created_at)}</p>
                        {inv.paid_at && (
                          <p className="text-emerald-600 dark:text-emerald-400">
                            Paid {formatDateTime(inv.paid_at)}
                          </p>
                        )}
                        {inv.expire_by && !inv.paid_at && (
                          <p className="text-gray-400">
                            Exp {formatDate(inv.expire_by)}
                          </p>
                        )}
                      </div>
                    </td>
                    <td className="whitespace-nowrap border-b border-gray-100 px-3 py-2.5 text-right dark:border-gray-800">
                      <div className="flex items-center justify-end gap-1.5">
                        {inv.short_url && (
                          <button
                            onClick={() => copyToClipboard(inv.short_url, inv.id)}
                            className="inline-flex items-center gap-1 rounded-md border border-gray-200 bg-white px-2 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200 dark:hover:bg-gray-800"
                            title="Copy payment link"
                          >
                            {copiedId === inv.id ? (
                              <>
                                <Check className="h-3 w-3 text-emerald-500" />
                                Copied
                              </>
                            ) : (
                              <>
                                <Copy className="h-3 w-3" />
                                Link
                              </>
                            )}
                          </button>
                        )}
                        {inv.short_url && (
                          <a
                            href={inv.short_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 rounded-md border border-gray-200 px-2 py-1 text-xs font-semibold text-[#E31E24] hover:bg-red-50 dark:border-gray-700 dark:hover:bg-red-950/30"
                            title="Open payment page"
                          >
                            Open <ExternalLink className="h-3 w-3" />
                          </a>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
