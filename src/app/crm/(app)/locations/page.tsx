"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import {
  AlertCircle,
  Calendar,
  MapPin,
  RefreshCw,
  ShoppingBag,
  Users,
} from "lucide-react";
import {
  type SubscriptionRow,
  type SubscriptionsApiResponse,
  formatINR,
} from "@/lib/crm/subscriptions";
import type { OrderRow, OrdersApiResponse } from "@/lib/crm/orders";
import { aggregateLocations, type LocationCluster } from "@/lib/crm/locations";

const LocationsMap = dynamic(() => import("@/components/crm/locations-map"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center text-sm text-gray-500">
      Loading map…
    </div>
  ),
});

type DateFilter = "today" | "all" | "specific";

function localDateString(input: Date | string | number | null | undefined): string {
  if (input === null || input === undefined || input === "") return "";
  const d = input instanceof Date ? input : new Date(input);
  if (Number.isNaN(d.getTime())) return "";
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

export default function CrmLocationsPage() {
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [subs, setSubs] = useState<SubscriptionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const [dateMode, setDateMode] = useState<DateFilter>("all");
  const [specificDate, setSpecificDate] = useState<string>("");
  const [todayStr, setTodayStr] = useState<string>("");

  const [highlightedPincode, setHighlightedPincode] = useState<string | null>(null);

  const fetchAll = useCallback(async (silent = false) => {
    if (!silent) setRefreshing(true);
    setError(null);
    try {
      const [ordersRes, subsRes] = await Promise.all([
        fetch("/api/crm/orders", { cache: "no-store" }),
        fetch("/api/crm/subscriptions", { cache: "no-store" }),
      ]);
      const ordersData = (await ordersRes.json()) as OrdersApiResponse;
      const subsData = (await subsRes.json()) as SubscriptionsApiResponse;
      if (!ordersRes.ok || !ordersData.success) {
        throw new Error(ordersData.error || "Orders request failed");
      }
      setOrders(Array.isArray(ordersData.rows) ? ordersData.rows : []);
      setSubs(subsData.success && Array.isArray(subsData.rows) ? subsData.rows : []);
      setLastUpdated(new Date());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load locations");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
    setTodayStr(localDateString(new Date()));
  }, [fetchAll]);

  // Apply the date filter to orders before aggregating
  const filteredOrders = useMemo(() => {
    if (dateMode === "all") return orders;
    if (dateMode === "today") {
      if (!todayStr) return orders;
      return orders.filter((o) => localDateString(o.timestamp) === todayStr);
    }
    if (dateMode === "specific") {
      if (!specificDate) return orders;
      return orders.filter((o) => localDateString(o.timestamp) === specificDate);
    }
    return orders;
  }, [orders, dateMode, todayStr, specificDate]);

  const clusters: LocationCluster[] = useMemo(
    () => aggregateLocations(filteredOrders, subs),
    [filteredOrders, subs]
  );

  const totalCustomers = clusters.reduce((s, c) => s + c.customers.length, 0);
  const totalOrders = clusters.reduce((s, c) => s + c.totalOrders, 0);
  const totalRevenue = clusters.reduce((s, c) => s + c.totalRevenue, 0);

  // Orders with NO pincode at all — flag them so the user knows
  const ordersMissingPincode = filteredOrders.filter(
    (o) => !String(o.deliveryPinCode ?? "").trim()
  ).length;

  const dateModeLabel: Record<DateFilter, string> = {
    today: "Today",
    all: "All time",
    specific: "Specific date",
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-[#E31E24]">
            Locations
          </p>
          <h1 className="mt-0.5 text-2xl font-bold text-gray-900 dark:text-white">
            Where your customers are · {dateModeLabel[dateMode]}
            {dateMode === "specific" && specificDate ? ` (${specificDate})` : ""}
          </h1>
          {!loading && (
            <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
              From Bhookr Orders sheet · {clusters.length} neighbourhood
              {clusters.length === 1 ? "" : "s"} · last updated{" "}
              {lastUpdated?.toLocaleTimeString("en-IN", {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </p>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={dateMode}
            onChange={(e) => setDateMode(e.target.value as DateFilter)}
            aria-label="Date filter"
            className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 focus:border-[#E31E24] focus:outline-none focus:ring-1 focus:ring-[#E31E24] dark:border-gray-800 dark:bg-gray-900 dark:text-white"
          >
            <option value="all">📅 All time</option>
            <option value="today">📅 Today</option>
            <option value="specific">📅 Specific date…</option>
          </select>
          {dateMode === "specific" && (
            <div className="flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-2 py-1.5 text-sm dark:border-gray-800 dark:bg-gray-900">
              <Calendar className="h-4 w-4 text-gray-400" />
              <input
                type="date"
                value={specificDate}
                max={todayStr}
                onChange={(e) => setSpecificDate(e.target.value)}
                className="bg-transparent text-sm text-gray-900 focus:outline-none dark:text-white"
              />
              {specificDate && (
                <button
                  type="button"
                  onClick={() => setSpecificDate("")}
                  className="text-xs text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
                >
                  clear
                </button>
              )}
            </div>
          )}
          <button
            onClick={() => fetchAll()}
            disabled={refreshing}
            className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:opacity-60 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200 dark:hover:bg-gray-800"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>
      </div>

      {error && (
        <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 dark:border-red-900/40 dark:bg-red-950/30">
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-600 dark:text-red-400" />
          <div className="text-sm">
            <p className="font-semibold text-red-900 dark:text-red-200">
              Couldn&apos;t load locations
            </p>
            <p className="mt-0.5 text-red-800 dark:text-red-300/80">{error}</p>
          </div>
        </div>
      )}

      {ordersMissingPincode > 0 && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-2 text-xs text-amber-800 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-300">
          ⚠️ {ordersMissingPincode} order
          {ordersMissingPincode === 1 ? " is" : "s are"} missing a pincode in the
          sheet — those aren&apos;t shown on the map.
        </div>
      )}

      {/* KPI strip */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <KpiCard label="Neighbourhoods" value={clusters.length} icon={MapPin} />
        <KpiCard label="Customers" value={totalCustomers} icon={Users} />
        <KpiCard label="Orders" value={totalOrders} icon={ShoppingBag} />
        <KpiCard label="Revenue" value={formatINR(totalRevenue)} icon={ShoppingBag} tone="primary" />
      </div>

      {/* Map + list grid */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[2fr,1fr]">
        <div className="h-[500px] overflow-hidden rounded-xl border border-gray-200 bg-gray-50 dark:border-gray-800 dark:bg-gray-950 lg:h-[600px]">
          {loading ? (
            <div className="flex h-full items-center justify-center text-sm text-gray-500">
              Loading orders + map…
            </div>
          ) : clusters.length === 0 ? (
            <div className="flex h-full items-center justify-center px-6 text-center text-sm text-gray-500">
              No customer locations in this window. Try switching to All time, or
              pick a different date.
            </div>
          ) : (
            <LocationsMap
              clusters={clusters}
              highlightedPincode={highlightedPincode}
            />
          )}
        </div>

        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
          <div className="border-b border-gray-200 px-4 py-3 dark:border-gray-800">
            <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
              Top neighbourhoods
            </h2>
            <p className="text-[11px] text-gray-500 dark:text-gray-400">
              Click a row to highlight on the map
            </p>
          </div>
          <ul className="max-h-[550px] divide-y divide-gray-100 overflow-y-auto dark:divide-gray-800">
            {loading ? (
              <li className="px-4 py-3 text-sm text-gray-500">Loading…</li>
            ) : clusters.length === 0 ? (
              <li className="px-4 py-3 text-sm text-gray-500">No data</li>
            ) : (
              clusters.map((c) => (
                <li
                  key={c.pincode}
                  onMouseEnter={() => setHighlightedPincode(c.pincode)}
                  onMouseLeave={() => setHighlightedPincode(null)}
                  className={`cursor-pointer px-4 py-3 transition ${
                    highlightedPincode === c.pincode
                      ? "bg-red-50 dark:bg-red-950/30"
                      : "hover:bg-gray-50 dark:hover:bg-gray-800/40"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-gray-900 dark:text-white">
                        {c.area}
                        {!c.known && (
                          <span className="ml-1 rounded-full bg-amber-100 px-1.5 py-0.5 text-[9px] font-medium text-amber-800 dark:bg-amber-950/40 dark:text-amber-300">
                            approx.
                          </span>
                        )}
                      </p>
                      <p className="text-[11px] text-gray-500 dark:text-gray-400">
                        Pincode {c.pincode} · {c.customers.length} customer
                        {c.customers.length === 1 ? "" : "s"} · {c.totalOrders}{" "}
                        order{c.totalOrders === 1 ? "" : "s"}
                      </p>
                    </div>
                    <p className="shrink-0 text-sm font-semibold text-gray-900 dark:text-white">
                      {formatINR(c.totalRevenue)}
                    </p>
                  </div>
                </li>
              ))
            )}
          </ul>
        </div>
      </div>

      <p className="text-xs text-gray-400">
        Pins are placed at the centre of each pincode area (approximate).
        Subscriptions in your sheet currently have empty delivery addresses, so
        only Order-customer locations appear here. Once subscription delivery
        fields are filled, those will appear too.
      </p>
    </div>
  );
}

function KpiCard({
  label,
  value,
  icon: Icon,
  tone = "default",
}: {
  label: string;
  value: string | number;
  icon: React.ComponentType<{ className?: string }>;
  tone?: "default" | "primary";
}) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
          {label}
        </p>
        <Icon
          className={`h-4 w-4 ${
            tone === "primary" ? "text-[#E31E24]" : "text-gray-400"
          }`}
        />
      </div>
      <p className="mt-2 text-2xl font-bold text-gray-900 dark:text-white">{value}</p>
    </div>
  );
}
