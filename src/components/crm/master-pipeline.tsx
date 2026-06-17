"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import {
  AlertCircle,
  ArrowRight,
  Calendar,
  RefreshCw,
} from "lucide-react";
import {
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
  loadPipeline,
  setPipelineStatus,
  type PipelineMap,
  type PipelineStatus,
} from "@/lib/crm/pipeline";
import { getCurrentRole, type CrmRole } from "@/lib/crm/auth";
import { ConvertModal } from "@/components/crm/convert-modal";

const REFRESH_INTERVAL_MS = 60_000;

type SortBy = "newest" | "oldest" | "name";

const SORT_OPTIONS: { value: SortBy; label: string }[] = [
  { value: "newest", label: "Newest first" },
  { value: "oldest", label: "Oldest first" },
  { value: "name", label: "Name A–Z" },
];

type DateFilter = "today" | "all" | "specific";

function tsValue(v: string | number | null | undefined): number {
  if (v === null || v === undefined || v === "") return 0;
  const d = new Date(v as string | number);
  return Number.isNaN(d.getTime()) ? 0 : d.getTime();
}

/** YYYY-MM-DD in the local timezone */
function localDateString(input: Date | string | number | null | undefined): string {
  if (input === null || input === undefined || input === "") return "";
  const d = input instanceof Date ? input : new Date(input);
  if (Number.isNaN(d.getTime())) return "";
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

export function MasterPipeline() {
  const [leads, setLeads] = useState<LeadRow[]>([]);
  const [subs, setSubs] = useState<SubscriptionRow[]>([]);
  const [pipeline, setPipeline] = useState<PipelineMap>({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const [role, setRole] = useState<CrmRole | null>(null);
  const [filter, setFilter] = useState<PipelineStatus | "all">("all");
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<SortBy>("newest");

  const [dateMode, setDateMode] = useState<DateFilter>("today");
  const [specificDate, setSpecificDate] = useState<string>("");
  const [todayStr, setTodayStr] = useState<string>("");

  const [convertingLead, setConvertingLead] = useState<{
    email: string;
    name: string;
  } | null>(null);

  const fetchAll = useCallback(async (silent = false) => {
    if (!silent) setRefreshing(true);
    setError(null);
    try {
      const [leadsRes, subsRes] = await Promise.all([
        fetch("/api/crm/leads", { cache: "no-store" }),
        fetch("/api/crm/subscriptions", { cache: "no-store" }),
      ]);
      const leadsData = (await leadsRes.json()) as LeadsApiResponse;
      const subsData = (await subsRes.json()) as SubscriptionsApiResponse;
      if (!leadsRes.ok || !leadsData.success) {
        throw new Error(leadsData.error || "Leads request failed");
      }
      setLeads(Array.isArray(leadsData.rows) ? leadsData.rows : []);
      setSubs(subsData.success && Array.isArray(subsData.rows) ? subsData.rows : []);
      setLastUpdated(new Date());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load leads");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    setRole(getCurrentRole());
    fetchAll();
    setPipeline(loadPipeline());
    setTodayStr(localDateString(new Date()));

    const handler = () => setPipeline(loadPipeline());
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

  const annotatedLeads = useMemo(() => {
    return leads.map((lead) => {
      const eff = effectiveStatus(String(lead.email ?? ""), pipeline, verifiedEmails);
      return {
        lead,
        status: eff.status,
        source: eff.source,
        dateKey: localDateString(lead.timestamp),
      };
    });
  }, [leads, pipeline, verifiedEmails]);

  // Apply date filter first so chip counts reflect the date window.
  const dateFilteredLeads = useMemo(() => {
    if (dateMode === "all") return annotatedLeads;
    if (dateMode === "today") {
      if (!todayStr) return annotatedLeads;
      return annotatedLeads.filter((a) => a.dateKey === todayStr);
    }
    if (dateMode === "specific") {
      if (!specificDate) return annotatedLeads;
      return annotatedLeads.filter((a) => a.dateKey === specificDate);
    }
    return annotatedLeads;
  }, [annotatedLeads, dateMode, todayStr, specificDate]);

  const counts = useMemo(() => {
    const map: Record<PipelineStatus | "all", number> = {
      all: dateFilteredLeads.length,
      new: 0,
      follow_up: 0,
      trial_requested: 0,
      hot_prospect: 0,
      future_prospect: 0,
      converted: 0,
      sale_rejected: 0,
    };
    for (const a of dateFilteredLeads) map[a.status]++;
    return map;
  }, [dateFilteredLeads]);

  const visible = useMemo(() => {
    const matching = dateFilteredLeads.filter((a) => {
      if (filter !== "all" && a.status !== filter) return false;
      if (search.trim()) {
        const haystack = [a.lead.name, a.lead.email, a.lead.phoneNumber]
          .map((v) => String(v ?? ""))
          .join(" ")
          .toLowerCase();
        if (!haystack.includes(search.trim().toLowerCase())) return false;
      }
      return true;
    });

    const sorted = [...matching];
    if (sortBy === "newest") {
      sorted.sort((a, b) => tsValue(b.lead.timestamp) - tsValue(a.lead.timestamp));
    } else if (sortBy === "oldest") {
      sorted.sort((a, b) => tsValue(a.lead.timestamp) - tsValue(b.lead.timestamp));
    } else if (sortBy === "name") {
      sorted.sort((a, b) =>
        String(a.lead.name ?? "").localeCompare(String(b.lead.name ?? ""), "en", { sensitivity: "base" })
      );
    }
    return sorted;
  }, [dateFilteredLeads, filter, search, sortBy]);

  const handleStatusChange = (email: string, name: string, newStatus: PipelineStatus) => {
    if (!role) return;
    if (newStatus === "converted") {
      // Use the rich modal for converted so we can capture plan / amount / method
      setConvertingLead({ email, name });
      return;
    }
    setPipelineStatus(email, newStatus, role);
    const meta = getStatusMeta(newStatus);
    toast.success(`${meta.icon} Moved to ${meta.label}`, {
      description: name || email,
    });
  };

  const dateModeLabel: Record<DateFilter, string> = {
    today: "Today",
    all: "All time",
    specific: "Specific date",
  };

  const dateEmptyReason =
    dateMode === "today" && dateFilteredLeads.length === 0
      ? `No leads captured today (${todayStr}). Try "All time" or pick a date.`
      : dateMode === "specific" && specificDate && dateFilteredLeads.length === 0
      ? `No leads on ${specificDate}.`
      : null;

  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900 sm:p-5">
      {/* Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-[#E31E24]">
            Master pipeline
          </p>
          <h2 className="mt-0.5 text-xl font-bold text-gray-900 dark:text-white sm:text-2xl">
            {loading
              ? "Loading…"
              : `${visible.length} of ${dateFilteredLeads.length} leads`}
          </h2>
          {!loading && (
            <p className="mt-0.5 text-[11px] text-gray-500 dark:text-gray-400">
              {dateModeLabel[dateMode]}
              {dateMode === "specific" && specificDate ? ` · ${specificDate}` : ""}
              {" · "}status changes save locally · last updated{" "}
              {lastUpdated?.toLocaleTimeString("en-IN", {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </p>
          )}
        </div>
        <button
          onClick={() => fetchAll()}
          disabled={refreshing}
          className="inline-flex items-center gap-2 self-start rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:opacity-60 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200 dark:hover:bg-gray-800"
        >
          <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      {error && (
        <div className="mt-3 flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 p-3 dark:border-red-900/40 dark:bg-red-950/30">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-600 dark:text-red-400" />
          <p className="text-sm text-red-800 dark:text-red-300">{error}</p>
        </div>
      )}

      {/* Filter chips */}
      <div className="mt-4 flex flex-wrap gap-1.5">
        <FilterChip
          active={filter === "all"}
          onClick={() => setFilter("all")}
          label="All"
          count={counts.all}
          pill="bg-gray-900 text-white dark:bg-white dark:text-gray-900"
          inactivePill="bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300"
        />
        {PIPELINE_STATUSES.map((s) => (
          <FilterChip
            key={s.value}
            active={filter === s.value}
            onClick={() => setFilter(s.value)}
            icon={s.icon}
            label={s.shortLabel}
            count={counts[s.value]}
            pill={s.pill}
            inactivePill="bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300"
          />
        ))}
      </div>

      {/* Search + Date + Sort */}
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search name, email, phone…"
          className="flex-1 min-w-[200px] rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-[#E31E24] focus:outline-none focus:ring-1 focus:ring-[#E31E24] dark:border-gray-800 dark:bg-gray-950 dark:text-white sm:max-w-sm"
        />

        <select
          value={dateMode}
          onChange={(e) => setDateMode(e.target.value as DateFilter)}
          aria-label="Date filter"
          className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 focus:border-[#E31E24] focus:outline-none focus:ring-1 focus:ring-[#E31E24] dark:border-gray-800 dark:bg-gray-950 dark:text-white"
        >
          <option value="today">📅 Today&apos;s leads</option>
          <option value="all">📅 All time</option>
          <option value="specific">📅 Pick specific date…</option>
        </select>

        {dateMode === "specific" && (
          <div className="flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-2 py-1.5 text-sm dark:border-gray-800 dark:bg-gray-950">
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

        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as SortBy)}
          aria-label="Sort by"
          className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 focus:border-[#E31E24] focus:outline-none focus:ring-1 focus:ring-[#E31E24] dark:border-gray-800 dark:bg-gray-950 dark:text-white"
        >
          {SORT_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              Sort: {opt.label}
            </option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div className="mt-3 overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-800">
        <table className="min-w-full border-collapse text-sm">
          <thead className="bg-gray-50 dark:bg-gray-950">
            <tr>
              <Th>#</Th>
              <Th>Name</Th>
              <Th>Contact</Th>
              <Th>Plan interest</Th>
              <Th>Captured</Th>
              <Th>Status</Th>
              <Th align="right">View</Th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={7} className="px-3 py-10 text-center text-sm text-gray-500">
                  Loading leads from Google Sheet…
                </td>
              </tr>
            ) : visible.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-3 py-10 text-center text-sm text-gray-500">
                  {dateEmptyReason ?? "No leads match this filter."}
                </td>
              </tr>
            ) : (
              visible.map((a, idx) => {
                const emailKey = String(a.lead.email ?? "").toLowerCase().trim();
                const meta = getStatusMeta(a.status);
                const href = `/crm/leads/${encodeURIComponent(emailKey)}`;
                const isOnlineConverted = a.status === "converted" && a.source === "online";

                return (
                  <tr
                    key={`${emailKey}-${idx}`}
                    className="border-t border-gray-100 odd:bg-white even:bg-gray-50 hover:bg-red-50/40 dark:border-gray-800 dark:odd:bg-gray-900 dark:even:bg-gray-950 dark:hover:bg-red-950/20"
                  >
                    <Td className="text-xs text-gray-400">{idx + 1}</Td>
                    <Td>
                      <Link
                        href={href}
                        className="font-medium text-gray-900 hover:text-[#E31E24] hover:underline dark:text-white"
                      >
                        {a.lead.name || "—"}
                      </Link>
                    </Td>
                    <Td>
                      <div className="text-xs text-gray-600 dark:text-gray-300">
                        <div className="truncate max-w-[200px]">{a.lead.email}</div>
                        <div>{String(a.lead.phoneNumber ?? "—")}</div>
                      </div>
                    </Td>
                    <Td>
                      <div className="text-xs text-gray-600 dark:text-gray-300">
                        <div>{humanize(a.lead.subscriptionType) || "—"}</div>
                        <div className="text-gray-400">{String(a.lead.plan ?? "")}</div>
                      </div>
                    </Td>
                    <Td className="text-xs text-gray-600 dark:text-gray-300">
                      {formatTimestamp(a.lead.timestamp)}
                    </Td>
                    <Td>
                      <div className="flex flex-col items-start gap-1">
                        <span
                          className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ${meta.pill}`}
                        >
                          <span>{meta.icon}</span>
                          {meta.shortLabel}
                        </span>
                        {isOnlineConverted ? (
                          <span className="text-[10px] text-emerald-700 dark:text-emerald-400">
                            via Razorpay
                          </span>
                        ) : (
                          role === "admin" && (
                            <select
                              value={a.status}
                              onChange={(e) =>
                                handleStatusChange(
                                  emailKey,
                                  String(a.lead.name ?? ""),
                                  e.target.value as PipelineStatus
                                )
                              }
                              className="rounded border border-gray-200 bg-white px-1.5 py-0.5 text-[11px] dark:border-gray-700 dark:bg-gray-950 dark:text-gray-200"
                            >
                              {PIPELINE_STATUSES.map((s) => (
                                <option key={s.value} value={s.value}>
                                  {s.icon} {s.shortLabel}
                                </option>
                              ))}
                            </select>
                          )
                        )}
                      </div>
                    </Td>
                    <Td align="right">
                      <Link
                        href={href}
                        className="inline-flex items-center gap-1 rounded-md border border-gray-200 px-2 py-1 text-xs font-semibold text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800"
                      >
                        Open <ArrowRight className="h-3 w-3" />
                      </Link>
                    </Td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {convertingLead && (
        <ConvertModal
          email={convertingLead.email}
          name={convertingLead.name}
          role={role}
          onClose={() => setConvertingLead(null)}
          onSuccess={() => {
            toast.success("✅ Marked as converted", {
              description: convertingLead.name || convertingLead.email,
            });
          }}
        />
      )}
    </section>
  );
}

function FilterChip({
  active,
  onClick,
  icon,
  label,
  count,
  pill,
  inactivePill,
}: {
  active: boolean;
  onClick: () => void;
  icon?: string;
  label: string;
  count: number;
  pill: string;
  inactivePill: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium transition ${
        active ? pill : inactivePill
      }`}
    >
      {icon && <span>{icon}</span>}
      <span>{label}</span>
      <span
        className={`rounded-full px-1.5 py-0 text-[10px] font-bold ${
          active ? "bg-white/20" : "bg-white/60 dark:bg-gray-900/60"
        }`}
      >
        {count}
      </span>
    </button>
  );
}

function Th({
  children,
  align = "left",
}: {
  children: React.ReactNode;
  align?: "left" | "right";
}) {
  return (
    <th
      className={`whitespace-nowrap border-b border-gray-200 px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-gray-500 dark:border-gray-800 dark:text-gray-400 ${
        align === "right" ? "text-right" : "text-left"
      }`}
    >
      {children}
    </th>
  );
}

function Td({
  children,
  align = "left",
  className = "",
}: {
  children: React.ReactNode;
  align?: "left" | "right";
  className?: string;
}) {
  return (
    <td
      className={`whitespace-nowrap px-3 py-2 text-gray-700 dark:text-gray-200 ${
        align === "right" ? "text-right" : "text-left"
      } ${className}`}
    >
      {children}
    </td>
  );
}
