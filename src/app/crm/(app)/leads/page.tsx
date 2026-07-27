"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  AlertCircle,
  ArrowRight,
  Download,
  Plus,
  RefreshCw,
} from "lucide-react";
import {
  LEAD_COLUMNS,
  formatTimestamp,
  humanize,
  type LeadRow,
  type LeadsApiResponse,
} from "@/lib/crm/leads";
import {
  type SubscriptionRow,
  type SubscriptionsApiResponse,
} from "@/lib/crm/subscriptions";
import {
  PIPELINE_CHANGED_EVENT,
  PIPELINE_STATUSES,
  effectiveStatus,
  getStatusMeta,
  fetchPipelineApi,
  type PipelineMap,
  type PipelineStatus,
} from "@/lib/crm/pipeline";


const REFRESH_INTERVAL_MS = 60_000;

const STATUS_FILTER_OPTIONS: { value: PipelineStatus | "all"; label: string }[] = [
  { value: "all", label: "All statuses" },
  ...PIPELINE_STATUSES.map((s) => ({
    value: s.value,
    label: `${s.icon} ${s.label}`,
  })),
];

type SortBy = "newest" | "oldest" | "name";

const SORT_OPTIONS: { value: SortBy; label: string }[] = [
  { value: "newest", label: "Newest first" },
  { value: "oldest", label: "Oldest first" },
  { value: "name", label: "Name A–Z" },
];

function tsValue(v: string | number | null | undefined): number {
  if (v === null || v === undefined || v === "") return 0;
  const d = new Date(v as string | number);
  return Number.isNaN(d.getTime()) ? 0 : d.getTime();
}

function renderCell(row: LeadRow, key: keyof LeadRow): React.ReactNode {
  const value = row[key];

  if (key === "timestamp" || key === "subscriptionStartDate") {
    return formatTimestamp(value as string | number);
  }

  if (key === "checkoutVisited") {
    const yes = value === true || value === "true" || value === "TRUE";
    return yes ? (
      <span className="inline-flex items-center rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-medium text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300">
        Yes
      </span>
    ) : (
      <span className="inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-medium text-gray-600 dark:bg-gray-800 dark:text-gray-400">
        No
      </span>
    );
  }

  if (key === "status") {
    const status = String(value || "lead").toLowerCase();
    const styles: Record<string, string> = {
      lead: "bg-sky-100 text-sky-800 dark:bg-sky-950/40 dark:text-sky-300",
      contacted: "bg-indigo-100 text-indigo-800 dark:bg-indigo-950/40 dark:text-indigo-300",
      hot: "bg-orange-100 text-orange-800 dark:bg-orange-950/40 dark:text-orange-300",
      converted: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300",
      lost: "bg-red-100 text-red-800 dark:bg-red-950/40 dark:text-red-300",
    };
    return (
      <span
        className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium capitalize ${
          styles[status] ?? styles.lead
        }`}
      >
        {humanize(status)}
      </span>
    );
  }

  const humanizeKeys: (keyof LeadRow)[] = [
    "goal",
    "diet",
    "foodPreference",
    "physicalState",
    "subscriptionType",
    "gender",
  ];
  if (humanizeKeys.includes(key)) {
    return humanize(value as string) || (
      <span className="text-gray-300 dark:text-gray-600">—</span>
    );
  }

  if (key === "height") {
    return value ? `${value} cm` : <span className="text-gray-300 dark:text-gray-600">—</span>;
  }
  if (key === "weight") {
    return value ? `${value} kg` : <span className="text-gray-300 dark:text-gray-600">—</span>;
  }

  return value === null || value === undefined || value === "" ? (
    <span className="text-gray-300 dark:text-gray-600">—</span>
  ) : (
    String(value)
  );
}

export default function CrmLeadsPage() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<PipelineStatus | "all">("all");
  const [step7Only, setStep7Only] = useState(true);
  const [sortBy, setSortBy] = useState<SortBy>("newest");

  const [rows, setRows] = useState<LeadRow[]>([]);
  const [subs, setSubs] = useState<SubscriptionRow[]>([]);
  const [pipeline, setPipeline] = useState<PipelineMap>({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchAll = useCallback(async (silent = false, force = false) => {
    if (!silent) setRefreshing(true);
    setError(null);
    try {
      const leadsUrl = force ? "/api/crm/leads?refresh=true" : "/api/crm/leads";
      const subsUrl = force ? "/api/crm/subscriptions?refresh=true" : "/api/crm/subscriptions";

      const [leadsRes, subsRes, pipelineData] = await Promise.all([
        fetch(leadsUrl, { cache: "no-store" }),
        fetch(subsUrl, { cache: "no-store" }),
        fetchPipelineApi(),
      ]);
      const leadsData = (await leadsRes.json()) as LeadsApiResponse;
      const subsData = (await subsRes.json()) as SubscriptionsApiResponse;
      if (!leadsRes.ok || !leadsData.success) {
        throw new Error(leadsData.error || `Leads request failed`);
      }
      setRows(Array.isArray(leadsData.rows) ? leadsData.rows : []);
      setSubs(subsData.success && Array.isArray(subsData.rows) ? subsData.rows : []);
      setPipeline(pipelineData);
      setLastUpdated(new Date());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load leads");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
    const handler = () => {
      fetchPipelineApi().then(setPipeline);
    };
    window.addEventListener(PIPELINE_CHANGED_EVENT, handler);
    return () => window.removeEventListener(PIPELINE_CHANGED_EVENT, handler);
  }, [fetchAll]);

  useEffect(() => {
    const interval = setInterval(() => {
      if (typeof document !== "undefined" && document.visibilityState === "visible") {
        fetchAll(true);
      }
    }, REFRESH_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [fetchAll]);

  const verifiedEmails = useMemo(() => {
    const set = new Set<string>();
    for (const s of subs) {
      if (String(s.paymentStatus ?? "").toLowerCase() === "success") {
        set.add(String(s.email ?? "").toLowerCase().trim());
      }
    }
    return set;
  }, [subs]);

  const annotated = useMemo(() => {
    return rows.map((row) => {
      const eff = effectiveStatus(String(row.email ?? ""), pipeline, verifiedEmails);
      return { row, status: eff.status, source: eff.source };
    });
  }, [rows, pipeline, verifiedEmails]);

  const filtered = useMemo(() => {
    const matching = annotated.filter(({ row, status }) => {
      if (step7Only && Number(row.lastStepCompleted) < 7) return false;
      if (statusFilter !== "all" && status !== statusFilter) return false;
      if (search.trim()) {
        const haystack = [row.name, row.email, row.phoneNumber]
          .map((v) => String(v ?? ""))
          .join(" ")
          .toLowerCase();
        if (!haystack.includes(search.trim().toLowerCase())) {
          return false;
        }
      }
      return true;
    });

    const sorted = [...matching];
    if (sortBy === "newest") {
      sorted.sort((a, b) => tsValue(b.row.timestamp) - tsValue(a.row.timestamp));
    } else if (sortBy === "oldest") {
      sorted.sort((a, b) => tsValue(a.row.timestamp) - tsValue(b.row.timestamp));
    } else if (sortBy === "name") {
      sorted.sort((a, b) =>
        String(a.row.name ?? "").localeCompare(String(b.row.name ?? ""), "en", { sensitivity: "base" })
      );
    }
    return sorted;
  }, [annotated, search, statusFilter, step7Only, sortBy]);

  const verifiedCount = annotated.filter((a) => a.source === "online").length;
  const localCount = annotated.filter((a) => a.source === "local").length;

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-[#E31E24]">
            Leads
          </p>
          <h1 className="mt-0.5 text-2xl font-bold text-gray-900 dark:text-white">
            {loading ? "Loading…" : `${filtered.length} of ${rows.length} leads`}
          </h1>
          {!loading && (
            <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
              {verifiedCount} converted online · {localCount} marked locally · last
              updated{" "}
              {lastUpdated?.toLocaleTimeString("en-IN", {
                hour: "2-digit",
                minute: "2-digit",
                second: "2-digit",
              })}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => fetchAll(false, true)}
            disabled={refreshing}
            className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:opacity-60 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200 dark:hover:bg-gray-800"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
            Refresh
          </button>
          <button
            disabled
            title="Coming soon"
            className="inline-flex cursor-not-allowed items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-400 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-600"
          >
            <Download className="h-4 w-4" />
            Export
          </button>
          <button
            disabled
            title="Coming soon"
            className="inline-flex cursor-not-allowed items-center gap-2 rounded-lg bg-gray-200 px-3 py-2 text-sm font-semibold text-gray-500 dark:bg-gray-800 dark:text-gray-500"
          >
            <Plus className="h-4 w-4" />
            New Lead
          </button>
        </div>
      </div>

      {error && (
        <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 dark:border-red-900/40 dark:bg-red-950/30">
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-600 dark:text-red-400" />
          <div className="text-sm">
            <p className="font-semibold text-red-900 dark:text-red-200">
              Couldn&apos;t load leads
            </p>
            <p className="mt-0.5 text-red-800 dark:text-red-300/80">{error}</p>
          </div>
        </div>
      )}

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name, email, or phone…"
          className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-[#E31E24] focus:outline-none focus:ring-1 focus:ring-[#E31E24] dark:border-gray-800 dark:bg-gray-900 dark:text-white sm:max-w-sm"
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as PipelineStatus | "all")}
          className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 focus:border-[#E31E24] focus:outline-none focus:ring-1 focus:ring-[#E31E24] dark:border-gray-800 dark:bg-gray-900 dark:text-white"
        >
          {STATUS_FILTER_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as SortBy)}
          aria-label="Sort by"
          className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 focus:border-[#E31E24] focus:outline-none focus:ring-1 focus:ring-[#E31E24] dark:border-gray-800 dark:bg-gray-900 dark:text-white"
        >
          {SORT_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              Sort: {opt.label}
            </option>
          ))}
        </select>
        <label className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-200">
          <input
            type="checkbox"
            checked={step7Only}
            onChange={(e) => setStep7Only(e.target.checked)}
            className="h-4 w-4 rounded border-gray-300 text-[#E31E24] focus:ring-[#E31E24]"
          />
          Step 7 only
        </label>
      </div>

      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900">
        <div className="overflow-x-auto">
          <table className="min-w-full border-collapse text-sm">
            <thead className="sticky top-0 bg-gray-50 dark:bg-gray-950">
              <tr>
                <th className="border-b border-gray-200 px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-500 dark:border-gray-800 dark:text-gray-400">
                  #
                </th>
                <th
                  style={{ minWidth: "150px" }}
                  className="whitespace-nowrap border-b border-gray-200 px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-500 dark:border-gray-800 dark:text-gray-400"
                >
                  Pipeline status
                </th>
                {LEAD_COLUMNS.map((col) => (
                  <th
                    key={col.key}
                    style={{ minWidth: col.width }}
                    className="whitespace-nowrap border-b border-gray-200 px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-500 dark:border-gray-800 dark:text-gray-400"
                  >
                    {col.label}
                  </th>
                ))}
                <th className="sticky right-0 border-b border-gray-200 bg-gray-50 px-3 py-2 text-right text-[11px] font-semibold uppercase tracking-wider text-gray-500 dark:border-gray-800 dark:bg-gray-950 dark:text-gray-400">
                  View
                </th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td
                    colSpan={LEAD_COLUMNS.length + 3}
                    className="px-3 py-12 text-center text-sm text-gray-500"
                  >
                    Loading leads from Google Sheet…
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td
                    colSpan={LEAD_COLUMNS.length + 3}
                    className="px-3 py-12 text-center text-sm text-gray-500"
                  >
                    {rows.length === 0
                      ? "No leads in the sheet yet."
                      : "No leads match your filters."}
                  </td>
                </tr>
              ) : (
                filtered.map(({ row, status, source }, idx) => {
                  const emailKey = String(row.email ?? "").toLowerCase().trim();
                  const meta = getStatusMeta(status);
                  const href = `/crm/leads/${encodeURIComponent(emailKey)}`;
                  return (
                    <tr
                      key={`${row.email}-${idx}`}
                      className="cursor-pointer odd:bg-white even:bg-gray-50 hover:bg-red-50/40 dark:odd:bg-gray-900 dark:even:bg-gray-950 dark:hover:bg-red-950/20"
                      onClick={(e) => {
                        const target = e.target as HTMLElement;
                        if (target.closest("a, button")) return;
                        window.location.href = href;
                      }}
                    >
                      <td className="border-b border-gray-100 px-3 py-2 text-xs text-gray-400 dark:border-gray-800">
                        {idx + 1}
                      </td>
                      <td className="whitespace-nowrap border-b border-gray-100 px-3 py-2 dark:border-gray-800">
                        <span
                          className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ${meta.pill}`}
                        >
                          <span>{meta.icon}</span>
                          {meta.shortLabel}
                        </span>
                        {source === "online" && (
                          <div className="mt-0.5 text-[10px] text-emerald-700 dark:text-emerald-400">
                            via Razorpay
                          </div>
                        )}
                        {source === "local" && (
                          <div className="mt-0.5 text-[10px] text-gray-400">local</div>
                        )}
                      </td>
                      {LEAD_COLUMNS.map((col) => (
                        <td
                          key={col.key}
                          className="whitespace-nowrap border-b border-gray-100 px-3 py-2 text-gray-700 dark:border-gray-800 dark:text-gray-200"
                        >
                          {renderCell(row, col.key)}
                        </td>
                      ))}
                      <td className="sticky right-0 border-b border-gray-100 bg-white px-3 py-2 text-right dark:border-gray-800 dark:bg-gray-900">
                        <div className="flex items-center justify-end gap-1.5">
                          <a
                            href="https://dashboard.razorpay.com/app/invoices"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 rounded-md border border-gray-200 bg-white px-2 py-1 text-xs font-semibold text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200 dark:hover:bg-gray-800"
                            title="Open Razorpay Invoices Dashboard"
                          >
                            💳 Invoice
                          </a>
                          <Link
                            href={href}
                            className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-semibold text-[#E31E24] hover:bg-red-50 dark:hover:bg-red-950/30"
                          >
                            Open <ArrowRight className="h-3 w-3" />
                          </Link>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
