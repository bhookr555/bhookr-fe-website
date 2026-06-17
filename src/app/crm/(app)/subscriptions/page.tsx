"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AlertCircle, RefreshCw } from "lucide-react";
import {
  SUBSCRIPTION_COLUMNS,
  formatINR,
  type SubscriptionRow,
  type SubscriptionsApiResponse,
} from "@/lib/crm/subscriptions";
import { formatTimestamp, humanize } from "@/lib/crm/leads";

const REFRESH_INTERVAL_MS = 60_000;

const STATUS_OPTIONS = [
  { value: "all", label: "All subscriptions" },
  { value: "active", label: "Active" },
  { value: "expired", label: "Expired" },
  { value: "cancelled", label: "Cancelled" },
];

const PAYMENT_OPTIONS = [
  { value: "all", label: "All payments" },
  { value: "success", label: "Success" },
  { value: "failed", label: "Failed" },
  { value: "pending", label: "Pending" },
];

type SortBy = "newest" | "oldest" | "amount-high" | "amount-low";

const SORT_OPTIONS: { value: SortBy; label: string }[] = [
  { value: "newest", label: "Newest first" },
  { value: "oldest", label: "Oldest first" },
  { value: "amount-high", label: "Amount: high → low" },
  { value: "amount-low", label: "Amount: low → high" },
];

function tsValue(v: string | number | null | undefined): number {
  if (v === null || v === undefined || v === "") return 0;
  const d = new Date(v as string | number);
  return Number.isNaN(d.getTime()) ? 0 : d.getTime();
}

function renderCell(row: SubscriptionRow, key: keyof SubscriptionRow): React.ReactNode {
  const value = row[key];

  if (key === "timestamp" || key === "subscriptionStartDate" || key === "paymentTimestamp") {
    return formatTimestamp(value as string);
  }

  if (key === "amountPaid") {
    return <span className="font-semibold">{formatINR(value as number)}</span>;
  }

  if (key === "paymentStatus") {
    const s = String(value || "").toLowerCase();
    const styles: Record<string, string> = {
      success: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300",
      failed: "bg-red-100 text-red-800 dark:bg-red-950/40 dark:text-red-300",
      pending: "bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300",
    };
    return (
      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium capitalize ${styles[s] ?? styles.pending}`}>
        {s || "—"}
      </span>
    );
  }

  if (key === "status") {
    const s = String(value || "").toLowerCase();
    const styles: Record<string, string> = {
      active: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300",
      expired: "bg-gray-200 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
      cancelled: "bg-red-100 text-red-800 dark:bg-red-950/40 dark:text-red-300",
    };
    return (
      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium capitalize ${styles[s] ?? styles.expired}`}>
        {humanize(s) || "—"}
      </span>
    );
  }

  if (key === "subscriptionType" || key === "paymentMethod" || key === "plan") {
    return humanize(value as string) || <span className="text-gray-300 dark:text-gray-600">—</span>;
  }

  return value === null || value === undefined || value === "" ? (
    <span className="text-gray-300 dark:text-gray-600">—</span>
  ) : (
    String(value)
  );
}

export default function CrmSubscriptionsPage() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [paymentFilter, setPaymentFilter] = useState("all");
  const [sortBy, setSortBy] = useState<SortBy>("newest");

  const [rows, setRows] = useState<SubscriptionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchData = useCallback(async (silent = false) => {
    if (!silent) setRefreshing(true);
    setError(null);
    try {
      const res = await fetch("/api/crm/subscriptions", { cache: "no-store" });
      const data = (await res.json()) as SubscriptionsApiResponse;
      if (!res.ok || !data.success) {
        throw new Error(data.error || `Request failed: ${res.status}`);
      }
      setRows(Array.isArray(data.rows) ? data.rows : []);
      setLastUpdated(new Date());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load subscriptions");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    const interval = setInterval(() => {
      if (typeof document !== "undefined" && document.visibilityState === "visible") {
        fetchData(true);
      }
    }, REFRESH_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [fetchData]);

  const filtered = useMemo(() => {
    const matching = rows.filter((row) => {
      if (statusFilter !== "all" && String(row.status).toLowerCase() !== statusFilter) {
        return false;
      }
      if (paymentFilter !== "all" && String(row.paymentStatus).toLowerCase() !== paymentFilter) {
        return false;
      }
      if (search.trim()) {
        const haystack = [row.name, row.email, row.phoneNumber, row.orderId]
          .map((v) => String(v ?? ""))
          .join(" ")
          .toLowerCase();
        if (!haystack.includes(search.trim().toLowerCase())) return false;
      }
      return true;
    });

    const sorted = [...matching];
    if (sortBy === "newest") sorted.sort((a, b) => tsValue(b.timestamp) - tsValue(a.timestamp));
    else if (sortBy === "oldest") sorted.sort((a, b) => tsValue(a.timestamp) - tsValue(b.timestamp));
    else if (sortBy === "amount-high") sorted.sort((a, b) => Number(b.amountPaid || 0) - Number(a.amountPaid || 0));
    else if (sortBy === "amount-low") sorted.sort((a, b) => Number(a.amountPaid || 0) - Number(b.amountPaid || 0));
    return sorted;
  }, [rows, search, statusFilter, paymentFilter, sortBy]);

  const totalRevenue = useMemo(
    () =>
      filtered.reduce((sum, r) => {
        const n = Number(r.amountPaid);
        return sum + (Number.isFinite(n) ? n : 0);
      }, 0),
    [filtered]
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-[#E31E24]">
            Subscriptions
          </p>
          <h1 className="mt-0.5 text-2xl font-bold text-gray-900 dark:text-white">
            {loading ? "Loading…" : `${filtered.length} of ${rows.length} · ${formatINR(totalRevenue)}`}
          </h1>
          {lastUpdated && !loading && (
            <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
              Live from Google Sheet · last updated{" "}
              {lastUpdated.toLocaleTimeString("en-IN", {
                hour: "2-digit", minute: "2-digit", second: "2-digit",
              })}
            </p>
          )}
        </div>
        <button
          onClick={() => fetchData()}
          disabled={refreshing}
          className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:opacity-60 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200 dark:hover:bg-gray-800"
        >
          <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      {error && (
        <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 dark:border-red-900/40 dark:bg-red-950/30">
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-600 dark:text-red-400" />
          <div className="text-sm">
            <p className="font-semibold text-red-900 dark:text-red-200">
              Couldn&apos;t load subscriptions
            </p>
            <p className="mt-0.5 text-red-800 dark:text-red-300/80">{error}</p>
          </div>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search name, email, phone, order ID…"
          className="flex-1 min-w-[200px] rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-[#E31E24] focus:outline-none focus:ring-1 focus:ring-[#E31E24] dark:border-gray-800 dark:bg-gray-900 dark:text-white sm:max-w-sm"
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm dark:border-gray-800 dark:bg-gray-900 dark:text-white"
        >
          {STATUS_OPTIONS.map((opt) => (<option key={opt.value} value={opt.value}>{opt.label}</option>))}
        </select>
        <select
          value={paymentFilter}
          onChange={(e) => setPaymentFilter(e.target.value)}
          className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm dark:border-gray-800 dark:bg-gray-900 dark:text-white"
        >
          {PAYMENT_OPTIONS.map((opt) => (<option key={opt.value} value={opt.value}>{opt.label}</option>))}
        </select>
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as SortBy)}
          className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm dark:border-gray-800 dark:bg-gray-900 dark:text-white"
        >
          {SORT_OPTIONS.map((opt) => (<option key={opt.value} value={opt.value}>Sort: {opt.label}</option>))}
        </select>
      </div>

      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900">
        <div className="overflow-x-auto">
          <table className="min-w-full border-collapse text-sm">
            <thead className="sticky top-0 bg-gray-50 dark:bg-gray-950">
              <tr>
                <th className="border-b border-gray-200 px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-500 dark:border-gray-800 dark:text-gray-400">#</th>
                {SUBSCRIPTION_COLUMNS.map((col) => (
                  <th
                    key={col.key}
                    style={{ minWidth: col.width }}
                    className="whitespace-nowrap border-b border-gray-200 px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-500 dark:border-gray-800 dark:text-gray-400"
                  >
                    {col.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={SUBSCRIPTION_COLUMNS.length + 1} className="px-3 py-12 text-center text-sm text-gray-500">Loading subscriptions from Google Sheet…</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={SUBSCRIPTION_COLUMNS.length + 1} className="px-3 py-12 text-center text-sm text-gray-500">
                  {rows.length === 0 ? "No subscriptions yet." : "No subscriptions match your filters."}
                </td></tr>
              ) : (
                filtered.map((row, idx) => (
                  <tr key={`${row.orderId}-${idx}`} className="odd:bg-white even:bg-gray-50 hover:bg-red-50/40 dark:odd:bg-gray-900 dark:even:bg-gray-950 dark:hover:bg-red-950/20">
                    <td className="border-b border-gray-100 px-3 py-2 text-xs text-gray-400 dark:border-gray-800">{idx + 1}</td>
                    {SUBSCRIPTION_COLUMNS.map((col) => (
                      <td key={col.key} className="whitespace-nowrap border-b border-gray-100 px-3 py-2 text-gray-700 dark:border-gray-800 dark:text-gray-200">
                        {renderCell(row, col.key)}
                      </td>
                    ))}
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
