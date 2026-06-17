"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  Calendar,
  IndianRupee,
  RefreshCw,
  ShoppingBag,
  Sparkles,
  TrendingUp,
  Users,
} from "lucide-react";
import type { LeadRow, LeadsApiResponse } from "@/lib/crm/leads";
import {
  aggregateByCustomer,
  formatINR,
  type SubscriptionRow,
  type SubscriptionsApiResponse,
} from "@/lib/crm/subscriptions";
import type { OrderRow, OrdersApiResponse } from "@/lib/crm/orders";
import {
  PIPELINE_CHANGED_EVENT,
  PIPELINE_STATUSES,
  effectiveStatus,
  loadPipeline,
  type PipelineMap,
} from "@/lib/crm/pipeline";

type DateFilter = "today" | "all" | "specific";

interface KpiCardProps {
  label: string;
  value: string | number;
  sub?: string;
  icon: React.ComponentType<{ className?: string }>;
  tone?: "default" | "primary";
}

function KpiCard({ label, value, sub, icon: Icon, tone = "default" }: KpiCardProps) {
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
      {sub && <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{sub}</p>}
    </div>
  );
}

function BreakdownBar({
  label,
  icon,
  count,
  total,
  pill,
}: {
  label: string;
  icon?: string;
  count: number;
  total: number;
  pill: string;
}) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-xs">
        <span className="inline-flex items-center gap-1 font-medium text-gray-700 dark:text-gray-300">
          {icon && <span>{icon}</span>}
          {label}
        </span>
        <span className="text-gray-500 dark:text-gray-400">
          {count} · {pct}%
        </span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
        <div
          className={`h-full rounded-full ${pill.split(" ")[0]}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

/** YYYY-MM-DD in local timezone */
function localDateString(input: Date | string | number | null | undefined): string {
  if (input === null || input === undefined || input === "") return "";
  const d = input instanceof Date ? input : new Date(input);
  if (Number.isNaN(d.getTime())) return "";
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

export default function CrmAnalyticsPage() {
  const [leads, setLeads] = useState<LeadRow[]>([]);
  const [subs, setSubs] = useState<SubscriptionRow[]>([]);
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [pipeline, setPipeline] = useState<PipelineMap>({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const [dateMode, setDateMode] = useState<DateFilter>("all");
  const [specificDate, setSpecificDate] = useState<string>("");
  const [todayStr, setTodayStr] = useState<string>("");

  const fetchAll = useCallback(async (silent = false) => {
    if (!silent) setRefreshing(true);
    setError(null);
    try {
      const [leadsRes, subsRes, ordersRes] = await Promise.all([
        fetch("/api/crm/leads", { cache: "no-store" }),
        fetch("/api/crm/subscriptions", { cache: "no-store" }),
        fetch("/api/crm/orders", { cache: "no-store" }),
      ]);

      const leadsData = (await leadsRes.json()) as LeadsApiResponse;
      const subsData = (await subsRes.json()) as SubscriptionsApiResponse;
      const ordersData = (await ordersRes.json()) as OrdersApiResponse;

      setLeads(leadsData.success ? leadsData.rows : []);
      setSubs(subsData.success ? subsData.rows : []);
      setOrders(ordersData.success ? ordersData.rows : []);
      setLastUpdated(new Date());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load analytics");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
    setPipeline(loadPipeline());
    setTodayStr(localDateString(new Date()));

    const handler = () => setPipeline(loadPipeline());
    window.addEventListener(PIPELINE_CHANGED_EVENT, handler);
    return () => window.removeEventListener(PIPELINE_CHANGED_EVENT, handler);
  }, [fetchAll]);

  // Pick the right "date key" for each item across the 3 datasets
  function inDateRange(iso: string | number | null | undefined): boolean {
    if (dateMode === "all") return true;
    const key = localDateString(iso);
    if (!key) return false;
    if (dateMode === "today") return key === todayStr;
    if (dateMode === "specific") return specificDate ? key === specificDate : true;
    return true;
  }

  // Date-filtered slices
  const filteredLeads = useMemo(() => leads.filter((l) => inDateRange(l.timestamp)), [leads, dateMode, todayStr, specificDate]);
  const filteredSubs = useMemo(() => subs.filter((s) => inDateRange(s.timestamp)), [subs, dateMode, todayStr, specificDate]);
  const filteredOrders = useMemo(() => orders.filter((o) => inDateRange(o.timestamp)), [orders, dateMode, todayStr, specificDate]);

  const verifiedEmails = useMemo(() => {
    const set = new Set<string>();
    for (const s of subs) {
      if (String(s.paymentStatus ?? "").toLowerCase() === "success") {
        set.add(String(s.email ?? "").toLowerCase().trim());
      }
    }
    return set;
  }, [subs]);

  // --- Pipeline breakdown for the date-filtered leads ---
  const pipelineStats = useMemo(() => {
    const counts: Record<string, number> = {
      new: 0,
      follow_up: 0,
      trial_requested: 0,
      hot_prospect: 0,
      future_prospect: 0,
      converted: 0,
      sale_rejected: 0,
    };
    for (const lead of filteredLeads) {
      const eff = effectiveStatus(String(lead.email ?? ""), pipeline, verifiedEmails);
      counts[eff.status] = (counts[eff.status] ?? 0) + 1;
    }
    const inProgress =
      (counts.follow_up ?? 0) +
      (counts.trial_requested ?? 0) +
      (counts.hot_prospect ?? 0) +
      (counts.future_prospect ?? 0);
    return { counts, total: filteredLeads.length, inProgress };
  }, [filteredLeads, pipeline, verifiedEmails]);

  // --- Money / funnel / lifecycle metrics ---
  const stats = useMemo(() => {
    const customers = aggregateByCustomer(filteredSubs);

    const totalLeads = filteredLeads.length;
    const step7 = filteredLeads.filter((l) => Number(l.lastStepCompleted) >= 7).length;
    const reachedCheckout = filteredLeads.filter(
      (l) =>
        l.checkoutVisited === true || l.checkoutVisited === "true" || l.checkoutVisited === "TRUE"
    ).length;

    const totalSubs = filteredSubs.length;
    const successfulSubs = filteredSubs.filter(
      (s) => String(s.paymentStatus).toLowerCase() === "success"
    );
    const subRevenue = successfulSubs.reduce(
      (sum, s) => sum + (Number(s.amountPaid) || 0),
      0
    );
    const activeSubs = filteredSubs.filter(
      (s) => String(s.status).toLowerCase() === "active"
    ).length;
    const expiredSubs = filteredSubs.filter(
      (s) => String(s.status).toLowerCase() === "expired"
    ).length;
    const cancelledSubs = filteredSubs.filter(
      (s) => String(s.status).toLowerCase() === "cancelled"
    ).length;

    const planCounts: Record<string, number> = {};
    for (const s of successfulSubs) {
      const key = String(s.subscriptionType || "unknown").toLowerCase() || "unknown";
      planCounts[key] = (planCounts[key] || 0) + 1;
    }

    const totalOrders = filteredOrders.length;
    const successfulOrders = filteredOrders.filter(
      (o) => String(o.paymentStatus).toLowerCase() === "success"
    );
    const orderRevenue = successfulOrders.reduce(
      (sum, o) => sum + (Number(o.grandTotal) || 0),
      0
    );
    const totalItemsSold = successfulOrders.reduce(
      (sum, o) => sum + (Number(o.itemCount) || 0),
      0
    );

    const conversionRate =
      step7 > 0 ? Math.round((customers.length / step7) * 100) : 0;
    const avgOrderValue =
      successfulOrders.length > 0
        ? Math.round(orderRevenue / successfulOrders.length)
        : 0;
    const avgSubscriptionValue =
      successfulSubs.length > 0
        ? Math.round(subRevenue / successfulSubs.length)
        : 0;
    const totalRevenue = subRevenue + orderRevenue;

    return {
      totalLeads,
      step7,
      reachedCheckout,
      totalCustomers: customers.length,
      conversionRate,
      activeSubs,
      expiredSubs,
      cancelledSubs,
      totalSubs,
      subRevenue,
      totalOrders,
      orderRevenue,
      totalItemsSold,
      avgOrderValue,
      avgSubscriptionValue,
      totalRevenue,
      planCounts,
    };
  }, [filteredLeads, filteredSubs, filteredOrders]);

  const dateModeLabel: Record<DateFilter, string> = {
    today: "Today",
    all: "All time",
    specific: "Specific date",
  };

  const dateSubtitle =
    dateMode === "today"
      ? `Today (${todayStr})`
      : dateMode === "specific"
      ? specificDate
        ? `${specificDate}`
        : "Pick a date above"
      : "All time";

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-[#E31E24]">
            Analytics
          </p>
          <h1 className="mt-0.5 text-2xl font-bold text-gray-900 dark:text-white">
            Business overview · {dateSubtitle}
          </h1>
          {!loading && (
            <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
              Reflects live sheet data + your local pipeline status changes · last updated{" "}
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
            <option value="today">📅 Today</option>
            <option value="all">📅 All time</option>
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
            disabled={refreshing || loading}
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
              Couldn&apos;t load analytics
            </p>
            <p className="mt-0.5 text-red-800 dark:text-red-300/80">{error}</p>
          </div>
        </div>
      )}

      {loading ? (
        <div className="rounded-xl border border-gray-200 bg-white p-12 text-center text-sm text-gray-500 dark:border-gray-800 dark:bg-gray-900">
          Loading all data from Google Sheets…
        </div>
      ) : (
        <>
          {/* Pipeline overview — driven by Master Pipeline statuses */}
          <section>
            <h2 className="mb-3 text-sm font-semibold text-gray-700 dark:text-gray-300">
              Pipeline (from Master Pipeline status changes)
            </h2>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <KpiCard
                label="Total leads"
                value={pipelineStats.total}
                sub={`In window: ${dateModeLabel[dateMode]}`}
                icon={Users}
                tone="primary"
              />
              <KpiCard
                label="🆕 New (uncontacted)"
                value={pipelineStats.counts.new ?? 0}
                sub="Awaiting first call"
                icon={Sparkles}
              />
              <KpiCard
                label="In progress"
                value={pipelineStats.inProgress}
                sub="Follow-up + Trial + Hot + Future"
                icon={TrendingUp}
              />
              <KpiCard
                label="✅ Converted"
                value={pipelineStats.counts.converted ?? 0}
                sub={`❌ Rejected: ${pipelineStats.counts.sale_rejected ?? 0}`}
                icon={ShoppingBag}
              />
            </div>

            <div className="mt-3 rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
              <h3 className="mb-4 text-sm font-semibold text-gray-700 dark:text-gray-300">
                Status breakdown
              </h3>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {PIPELINE_STATUSES.map((s) => (
                  <BreakdownBar
                    key={s.value}
                    icon={s.icon}
                    label={s.label}
                    count={pipelineStats.counts[s.value] || 0}
                    total={pipelineStats.total}
                    pill={
                      s.value === "new"
                        ? "bg-sky-500"
                        : s.value === "follow_up"
                        ? "bg-indigo-500"
                        : s.value === "trial_requested"
                        ? "bg-purple-500"
                        : s.value === "hot_prospect"
                        ? "bg-orange-500"
                        : s.value === "future_prospect"
                        ? "bg-teal-500"
                        : s.value === "converted"
                        ? "bg-emerald-500"
                        : "bg-red-500"
                    }
                  />
                ))}
              </div>
            </div>
          </section>

          {/* Money in */}
          <section>
            <h2 className="mb-3 text-sm font-semibold text-gray-700 dark:text-gray-300">
              Money in
            </h2>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <KpiCard
                label="Total revenue"
                value={formatINR(stats.totalRevenue)}
                sub="Subs + Orders combined"
                icon={IndianRupee}
                tone="primary"
              />
              <KpiCard
                label="Subscription revenue"
                value={formatINR(stats.subRevenue)}
                sub={`from ${stats.totalCustomers} paying customers`}
                icon={TrendingUp}
              />
              <KpiCard
                label="Order revenue"
                value={formatINR(stats.orderRevenue)}
                sub={`${stats.totalOrders} orders · ${stats.totalItemsSold} items`}
                icon={ShoppingBag}
              />
              <KpiCard
                label="Avg order value"
                value={formatINR(stats.avgOrderValue)}
                sub={`Avg sub: ${formatINR(stats.avgSubscriptionValue)}`}
                icon={Sparkles}
              />
            </div>
          </section>

          {/* Funnel (form → checkout → conversion) */}
          <section>
            <h2 className="mb-3 text-sm font-semibold text-gray-700 dark:text-gray-300">
              Form funnel
            </h2>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <KpiCard label="Total leads" value={stats.totalLeads} sub="Anyone who started the form" icon={Users} />
              <KpiCard
                label="Step 7 completed"
                value={stats.step7}
                sub={`${stats.totalLeads > 0 ? Math.round((stats.step7 / stats.totalLeads) * 100) : 0}% finish rate`}
                icon={TrendingUp}
              />
              <KpiCard
                label="Reached checkout"
                value={stats.reachedCheckout}
                sub="Visited payment page"
                icon={ShoppingBag}
              />
              <KpiCard
                label="Conversion rate"
                value={`${stats.conversionRate}%`}
                sub={`${stats.totalCustomers} of ${stats.step7} converted`}
                icon={Sparkles}
                tone="primary"
              />
            </div>
          </section>

          {/* Subscription lifecycle + Plan popularity */}
          <section className="grid gap-4 lg:grid-cols-2">
            <div className="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
              <h3 className="mb-4 text-sm font-semibold text-gray-700 dark:text-gray-300">
                Subscription lifecycle
              </h3>
              <div className="space-y-3">
                <BreakdownBar
                  label="Active"
                  count={stats.activeSubs}
                  total={stats.totalSubs}
                  pill="bg-emerald-500"
                />
                <BreakdownBar
                  label="Expired"
                  count={stats.expiredSubs}
                  total={stats.totalSubs}
                  pill="bg-gray-400"
                />
                <BreakdownBar
                  label="Cancelled"
                  count={stats.cancelledSubs}
                  total={stats.totalSubs}
                  pill="bg-red-500"
                />
              </div>
              <p className="mt-4 text-xs text-gray-400">
                {stats.totalSubs} total subscriptions in window
              </p>
            </div>

            <div className="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
              <h3 className="mb-4 text-sm font-semibold text-gray-700 dark:text-gray-300">
                Plan type popularity (successful payments)
              </h3>
              <div className="space-y-3">
                {Object.keys(stats.planCounts).length === 0 ? (
                  <p className="text-sm text-gray-500">No plan data in this window.</p>
                ) : (
                  Object.entries(stats.planCounts)
                    .sort((a, b) => b[1] - a[1])
                    .map(([plan, count]) => (
                      <BreakdownBar
                        key={plan}
                        label={plan
                          .replace(/_/g, " ")
                          .replace(/\b\w/g, (c) => c.toUpperCase())}
                        count={count}
                        total={Object.values(stats.planCounts).reduce((s, n) => s + n, 0)}
                        pill="bg-[#E31E24]"
                      />
                    ))
                )}
              </div>
            </div>
          </section>

          <p className="text-xs text-gray-400">
            Pipeline counts reflect status changes saved in this browser. Revenue
            and form-funnel numbers come live from the Google Sheets.
          </p>
        </>
      )}
    </div>
  );
}
