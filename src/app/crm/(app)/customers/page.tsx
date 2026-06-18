"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AlertCircle, RefreshCw } from "lucide-react";
import {
  aggregateByCustomer,
  formatINR,
  type CustomerAggregate,
  type SubscriptionRow,
  type SubscriptionsApiResponse,
} from "@/lib/crm/subscriptions";
import { formatTimestamp, humanize } from "@/lib/crm/leads";

const REFRESH_INTERVAL_MS = 60_000;

type SortBy = "recent" | "spent-high" | "spent-low" | "name" | "count";

const SORT_OPTIONS: { value: SortBy; label: string }[] = [
  { value: "recent", label: "Most recent" },
  { value: "spent-high", label: "Spent: high → low" },
  { value: "spent-low", label: "Spent: low → high" },
  { value: "count", label: "Subscriptions count" },
  { value: "name", label: "Name A–Z" },
];

const STATUS_OPTIONS = [
  { value: "all", label: "All customers" },
  { value: "active", label: "Active only" },
  { value: "expired", label: "Expired" },
  { value: "cancelled", label: "Cancelled" },
];

function tsValue(v: string | null | undefined): number {
  if (!v) return 0;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? 0 : d.getTime();
}

function statusBadge(status: string): React.ReactNode {
  const s = String(status || "").toLowerCase();
  const styles: Record<string, string> = {
    active: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300",
    expired: "bg-gray-200 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
    cancelled: "bg-red-100 text-red-800 dark:bg-red-950/40 dark:text-red-300",
  };
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium capitalize ${styles[s] ?? styles.expired}`}
    >
      {humanize(s) || "—"}
    </span>
  );
}

export default function CrmCustomersPage() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortBy, setSortBy] = useState<SortBy>("recent");

  const [rows, setRows] = useState<SubscriptionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchData = useCallback(async (silent = false, force = false) => {
    if (!silent) setRefreshing(true);
    setError(null);
    try {
      const url = force ? "/api/crm/subscriptions?refresh=true" : "/api/crm/subscriptions";
      const res = await fetch(url, { cache: "no-store" });
      const data = (await res.json()) as SubscriptionsApiResponse;
      if (!res.ok || !data.success) {
        throw new Error(data.error || `Request failed: ${res.status}`);
      }
      setRows(Array.isArray(data.rows) ? data.rows : []);
      setLastUpdated(new Date());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load customers");
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

  const customers = useMemo<CustomerAggregate[]>(() => aggregateByCustomer(rows), [rows]);

  const filtered = useMemo(() => {
    const matching = customers.filter((c) => {
      if (statusFilter !== "all" && c.currentStatus.toLowerCase() !== statusFilter) {
        return false;
      }
      if (search.trim()) {
        const haystack = [c.name, c.email, c.phoneNumber, c.city]
          .map((v) => String(v ?? ""))
          .join(" ")
          .toLowerCase();
        if (!haystack.includes(search.trim().toLowerCase())) return false;
      }
      return true;
    });

    const sorted = [...matching];
    if (sortBy === "recent") sorted.sort((a, b) => tsValue(b.latestPaidAt) - tsValue(a.latestPaidAt));
    else if (sortBy === "spent-high") sorted.sort((a, b) => b.totalSpent - a.totalSpent);
    else if (sortBy === "spent-low") sorted.sort((a, b) => a.totalSpent - b.totalSpent);
    else if (sortBy === "count") sorted.sort((a, b) => b.subscriptionCount - a.subscriptionCount);
    else if (sortBy === "name") sorted.sort((a, b) => a.name.localeCompare(b.name, "en", { sensitivity: "base" }));
    return sorted;
  }, [customers, search, statusFilter, sortBy]);

  const totalRevenue = useMemo(
    () => filtered.reduce((sum, c) => sum + c.totalSpent, 0),
    [filtered]
  );

  const activeCount = useMemo(
    () => customers.filter((c) => c.currentStatus.toLowerCase() === "active").length,
    [customers]
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-[#E31E24]">
            Customers
          </p>
          <h1 className="mt-0.5 text-2xl font-bold text-gray-900 dark:text-white">
            {loading ? "Loading…" : `${filtered.length} of ${customers.length} customers`}
          </h1>
          {!loading && (
            <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
              {activeCount} active · {formatINR(totalRevenue)} from current view · last updated{" "}
              {lastUpdated?.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
            </p>
          )}
        </div>
        <button
          onClick={() => fetchData(false, true)}
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
              Couldn&apos;t load customers
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
          placeholder="Search name, email, phone, city…"
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
                <th className="whitespace-nowrap border-b border-gray-200 px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-500 dark:border-gray-800 dark:text-gray-400" style={{ minWidth: "160px" }}>Customer</th>
                <th className="whitespace-nowrap border-b border-gray-200 px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-500 dark:border-gray-800 dark:text-gray-400" style={{ minWidth: "220px" }}>Email</th>
                <th className="whitespace-nowrap border-b border-gray-200 px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-500 dark:border-gray-800 dark:text-gray-400" style={{ minWidth: "140px" }}>Phone</th>
                <th className="whitespace-nowrap border-b border-gray-200 px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-500 dark:border-gray-800 dark:text-gray-400" style={{ minWidth: "100px" }}>City</th>
                <th className="whitespace-nowrap border-b border-gray-200 px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-500 dark:border-gray-800 dark:text-gray-400" style={{ minWidth: "100px" }}>Status</th>
                <th className="whitespace-nowrap border-b border-gray-200 px-3 py-2 text-right text-[11px] font-semibold uppercase tracking-wider text-gray-500 dark:border-gray-800 dark:text-gray-400" style={{ minWidth: "80px" }}>Subs</th>
                <th className="whitespace-nowrap border-b border-gray-200 px-3 py-2 text-right text-[11px] font-semibold uppercase tracking-wider text-gray-500 dark:border-gray-800 dark:text-gray-400" style={{ minWidth: "120px" }}>Total Spent</th>
                <th className="whitespace-nowrap border-b border-gray-200 px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-500 dark:border-gray-800 dark:text-gray-400" style={{ minWidth: "200px" }}>Latest Plan</th>
                <th className="whitespace-nowrap border-b border-gray-200 px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-500 dark:border-gray-800 dark:text-gray-400" style={{ minWidth: "150px" }}>Last Paid</th>
                <th className="whitespace-nowrap border-b border-gray-200 px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-500 dark:border-gray-800 dark:text-gray-400" style={{ minWidth: "150px" }}>First Paid</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={11} className="px-3 py-12 text-center text-sm text-gray-500">Loading customers…</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={11} className="px-3 py-12 text-center text-sm text-gray-500">
                  {customers.length === 0 ? "No paying customers yet." : "No customers match your filters."}
                </td></tr>
              ) : (
                filtered.map((c, idx) => (
                  <tr key={c.email} className="odd:bg-white even:bg-gray-50 hover:bg-red-50/40 dark:odd:bg-gray-900 dark:even:bg-gray-950 dark:hover:bg-red-950/20">
                    <td className="border-b border-gray-100 px-3 py-2 text-xs text-gray-400 dark:border-gray-800">{idx + 1}</td>
                    <td className="whitespace-nowrap border-b border-gray-100 px-3 py-2 font-medium text-gray-900 dark:border-gray-800 dark:text-white">{c.name || "—"}</td>
                    <td className="whitespace-nowrap border-b border-gray-100 px-3 py-2 text-gray-700 dark:border-gray-800 dark:text-gray-200">{c.email}</td>
                    <td className="whitespace-nowrap border-b border-gray-100 px-3 py-2 text-gray-700 dark:border-gray-800 dark:text-gray-200">{c.phoneNumber || <span className="text-gray-300 dark:text-gray-600">—</span>}</td>
                    <td className="whitespace-nowrap border-b border-gray-100 px-3 py-2 text-gray-700 dark:border-gray-800 dark:text-gray-200">{c.city || <span className="text-gray-300 dark:text-gray-600">—</span>}</td>
                    <td className="whitespace-nowrap border-b border-gray-100 px-3 py-2 dark:border-gray-800">{statusBadge(c.currentStatus)}</td>
                    <td className="whitespace-nowrap border-b border-gray-100 px-3 py-2 text-right text-gray-700 dark:border-gray-800 dark:text-gray-200">{c.subscriptionCount}</td>
                    <td className="whitespace-nowrap border-b border-gray-100 px-3 py-2 text-right font-semibold text-gray-900 dark:border-gray-800 dark:text-white">{formatINR(c.totalSpent)}</td>
                    <td className="whitespace-nowrap border-b border-gray-100 px-3 py-2 text-gray-700 dark:border-gray-800 dark:text-gray-200">{humanize(c.latestPlan) || <span className="text-gray-300 dark:text-gray-600">—</span>}</td>
                    <td className="whitespace-nowrap border-b border-gray-100 px-3 py-2 text-gray-700 dark:border-gray-800 dark:text-gray-200">{formatTimestamp(c.latestPaidAt)}</td>
                    <td className="whitespace-nowrap border-b border-gray-100 px-3 py-2 text-gray-700 dark:border-gray-800 dark:text-gray-200">{formatTimestamp(c.firstPaidAt)}</td>
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
