"use client";

/**
 * MasterPipeline — PERFORMANCE REDESIGN
 *
 * WHAT CHANGED vs. the original:
 * 1. Removed 4× raw fetch() calls → replaced with useDashboardData() (TanStack Query)
 *    - Data is fetched ONCE and shared across all CRM pages
 *    - On re-mount, data renders from in-memory cache — no network request
 * 2. Removed setInterval(60s) → React Query's refetchInterval handles background refresh
 * 3. Removed PIPELINE_CHANGED_EVENT listener → useInvalidateDashboard() for cache busting
 * 4. Added useDebounce(300ms) on search — filter only runs 300ms after typing stops
 * 5. Lazy-loaded ConvertModal and ReportModal — ~23KB removed from initial bundle
 * 6. Removed loading spinner for cached data — skeleton shows on first load only
 * 7. Role read is synchronous (useMemo) — no extra render cycle
 */

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { toast } from "sonner";
import {
  AlertCircle,
  ArrowRight,
  BarChart3,
  Calendar,
  ChevronDown,
  Download,
  FileSpreadsheet,
  FileText,
  RefreshCw,
  StickyNote,
} from "lucide-react";
import {
  formatTimestamp,
  humanize,
  type LeadRow,
} from "@/lib/crm/leads";
import { deduplicateAndMergeLeads } from "@/lib/crm/leads-aggregator";
import { type SubscriptionRow } from "@/lib/crm/subscriptions";
import {
  PIPELINE_STATUSES,
  cleanPhoneKey,
  effectiveStatus,
  getStatusMeta,
  setPipelineStatusApi,
  type PipelineMap,
  type PipelineStatus,
} from "@/lib/crm/pipeline";
import { getCurrentRole, type CrmRole } from "@/lib/crm/auth";
import { NoteModal } from "@/components/crm/note-modal";
import { type AnnotatedLead } from "@/lib/crm/report-generator";
import { PipelineTableSkeleton } from "@/components/crm/skeletons";
import {
  useDashboardData,
  usePipelineData,
  useRefreshDashboard,
  useInvalidateDashboard,
} from "@/hooks/crm/use-dashboard-data";
import { useDebounce } from "@/hooks/use-debounce";

// ── Lazy-load heavy modals (~23KB) — only downloaded when user opens them ────
const ConvertModal = dynamic(
  () => import("@/components/crm/convert-modal").then((m) => ({ default: m.ConvertModal })),
  { ssr: false }
);
const ReportModal = dynamic(
  () => import("@/components/crm/report-modal").then((m) => ({ default: m.ReportModal })),
  { ssr: false }
);

// ── Types ─────────────────────────────────────────────────────────────────────

type SortBy = "newest" | "oldest" | "name";
type DateFilter = "all" | "today" | "single" | "range";
type LeadSourceFilter = "all" | "website" | "client_form" | "ads";

const SORT_OPTIONS: { value: SortBy; label: string }[] = [
  { value: "newest", label: "Newest first" },
  { value: "oldest", label: "Oldest first" },
  { value: "name", label: "Name A–Z" },
];

// ── Utilities ─────────────────────────────────────────────────────────────────

function tsValue(v: string | number | null | undefined): number {
  if (v === null || v === undefined || v === "") return 0;
  const d = new Date(v as string | number);
  return Number.isNaN(d.getTime()) ? 0 : d.getTime();
}

function parseLeadDate(input: Date | string | number | null | undefined): Date | null {
  if (input === null || input === undefined || input === "") return null;
  if (input instanceof Date) return Number.isNaN(input.getTime()) ? null : input;

  const str = String(input).trim();
  if (!str) return null;

  // Handle epoch milliseconds or seconds string (e.g. "1710000000000")
  if (/^\d{10,13}$/.test(str)) {
    const num = Number(str);
    const d = new Date(num > 1e11 ? num : num * 1000);
    if (!Number.isNaN(d.getTime())) return d;
  }

  // Handle DD/MM/YYYY or D/M/YYYY or DD-MM-YYYY (e.g. "06/08/2026" or "06/08/2026 10:36:00")
  const ddmmyyyy = str.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})(?:\s+(\d{1,2}):(\d{2})(?::(\d{2}))?)?/);
  if (ddmmyyyy) {
    const p1 = parseInt(ddmmyyyy[1] || "0", 10);
    const p2 = parseInt(ddmmyyyy[2] || "0", 10);
    const year = parseInt(ddmmyyyy[3] || "0", 10);
    const hh = parseInt(ddmmyyyy[4] || "0", 10);
    const mm = parseInt(ddmmyyyy[5] || "0", 10);
    const ss = parseInt(ddmmyyyy[6] || "0", 10);

    // If p1 > 12, p1 MUST be day, p2 MUST be month
    if (p1 > 12) {
      return new Date(year, p2 - 1, p1, hh, mm, ss);
    }
    // Default Indian format: p1 = day, p2 = month
    return new Date(year, p2 - 1, p1, hh, mm, ss);
  }

  // Standard JS Date constructor fallback (ISO strings like "2026-08-06T10:36:00.000Z")
  const stdDate = new Date(str);
  if (!Number.isNaN(stdDate.getTime())) return stdDate;

  return null;
}

function localDateString(input: Date | string | number | null | undefined): string {
  const d = parseLeadDate(input);
  if (!d) return "";
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function renderAdSourceBadge(lead: LeadRow) {
  const src = String(lead.utmSource || "").toLowerCase().trim();
  const sub = String(lead.utmSubSource || "").trim();

  if (src.includes("meta") || src.includes("facebook") || src.includes("fb") || src.includes("ig") || src.includes("instagram")) {
    return (
      <div className="flex flex-col gap-0.5">
        <span className="inline-flex w-fit items-center gap-1 rounded-md bg-purple-50 px-2 py-0.5 text-xs font-semibold text-purple-700 dark:bg-purple-950/40 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
          📢 Meta / IG Ad
        </span>
        {sub && <span className="text-[10px] text-purple-600 dark:text-purple-400 font-medium truncate max-w-[120px]">{sub}</span>}
      </div>
    );
  }

  if (src.includes("google") || src.includes("gads") || src.includes("adwords")) {
    return (
      <div className="flex flex-col gap-0.5">
        <span className="inline-flex w-fit items-center gap-1 rounded-md bg-blue-50 px-2 py-0.5 text-xs font-semibold text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
          🎯 Google Ad
        </span>
        {sub && <span className="text-[10px] text-blue-600 dark:text-blue-400 font-medium truncate max-w-[120px]">{sub}</span>}
      </div>
    );
  }

  if (src) {
    return (
      <div className="flex flex-col gap-0.5">
        <span className="inline-flex w-fit items-center gap-1 rounded-md bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
          📣 {humanize(src)}
        </span>
        {sub && <span className="text-[10px] text-amber-600 dark:text-amber-400 font-medium truncate max-w-[120px]">{sub}</span>}
      </div>
    );
  }

  if (lead.leadSource === "both") {
    return (
      <span className="inline-flex w-fit items-center gap-1 rounded-md bg-indigo-50 px-2 py-0.5 text-xs font-medium text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
        🔗 Web + Client Form
      </span>
    );
  }

  if (lead.leadSource === "client_form") {
    return (
      <span className="inline-flex w-fit items-center gap-1 rounded-md bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
        📑 Client Form
      </span>
    );
  }

  return (
    <span className="inline-flex w-fit items-center gap-1 rounded-md bg-gray-50 px-2 py-0.5 text-xs font-medium text-gray-600 dark:bg-gray-800 dark:text-gray-400 border border-gray-200 dark:border-gray-700">
      🌐 Direct Website
    </span>
  );
}

// ── MasterPipeline ────────────────────────────────────────────────────────────

export function MasterPipeline() {
  // ── Role (synchronous, no useEffect) ─────────────────────────────────────
  const role = useMemo<CrmRole | null>(() => {
    if (typeof window === "undefined") return null;
    return getCurrentRole();
  }, []);

  // ── React Query data ──────────────────────────────────────────────────────
  const {
    data: dashData,
    isLoading: dashLoading,
    isError: dashError,
    error: dashErrorMsg,
    isFetching,
    dataUpdatedAt,
  } = useDashboardData();

  const { data: pipelineData } = usePipelineData();
  const refreshMutation = useRefreshDashboard();
  const invalidatePipeline = useInvalidateDashboard();

  // ── UI state ──────────────────────────────────────────────────────────────
  const [filter, setFilter] = useState<PipelineStatus | "all">("all");
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<SortBy>("newest");
  const [dateMode, setDateMode] = useState<DateFilter>("all");
  const [singleDate, setSingleDate] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [sourceFilter, setSourceFilter] = useState<LeadSourceFilter>("all");
  const [exportOpen, setExportOpen] = useState(false);
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [reportInitialMode, setReportInitialMode] = useState<"today" | "range">("today");
  const [convertingLead, setConvertingLead] = useState<{
    email: string;
    name: string;
  } | null>(null);
  const [noteModalLead, setNoteModalLead] = useState<{
    email: string;
    name?: string;
    notes?: string;
    status?: PipelineStatus;
  } | null>(null);

  // Debounce search: only run filter pass 300ms after typing stops
  const debouncedSearch = useDebounce(search, 300);

  // Today's date string — computed once, stable
  const todayStr = useMemo(() => localDateString(new Date()), []);

  // ── Derived data from React Query ─────────────────────────────────────────
  const leads = useMemo<LeadRow[]>(() => {
    if (!dashData) return [];
    const websiteRows: LeadRow[] = Array.isArray(dashData.leads?.rows)
      ? dashData.leads.rows.map((r) => ({ ...r, leadSource: "website" }))
      : [];
    const clientFormRows: LeadRow[] = Array.isArray(dashData.clientForm?.rows)
      ? dashData.clientForm.rows.map((r: LeadRow) => ({ ...r, leadSource: "client_form" }))
      : [];
    return deduplicateAndMergeLeads(websiteRows, clientFormRows);
  }, [dashData]);

  const subs = useMemo<SubscriptionRow[]>(() => {
    if (!dashData?.subscriptions?.rows) return [];
    return Array.isArray(dashData.subscriptions.rows) ? dashData.subscriptions.rows : [];
  }, [dashData]);

  const pipeline = useMemo<PipelineMap>(() => {
    return pipelineData?.data ?? {};
  }, [pipelineData]);

  const lastUpdated = useMemo(() => {
    if (!dataUpdatedAt) return null;
    return new Date(dataUpdatedAt);
  }, [dataUpdatedAt]);

  // ── Computed lead data (all memoized) ────────────────────────────────────
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
      const eff = effectiveStatus(String(lead.email ?? ""), pipeline, verifiedEmails, lead.phoneNumber);
      return {
        lead,
        status: eff.status,
        source: eff.source,
        dateKey: localDateString(lead.timestamp),
      };
    });
  }, [leads, pipeline, verifiedEmails]);

  const dateFilteredLeads = useMemo(() => {
    if (dateMode === "all") return annotatedLeads;
    if (dateMode === "today") {
      if (!todayStr) return annotatedLeads;
      return annotatedLeads.filter((a) => a.dateKey === todayStr);
    }
    if (dateMode === "single") {
      if (!singleDate) return annotatedLeads;
      return annotatedLeads.filter((a) => a.dateKey === singleDate);
    }
    if (dateMode === "range") {
      return annotatedLeads.filter((a) => {
        if (!a.dateKey) return false;
        if (startDate && a.dateKey < startDate) return false;
        if (endDate && a.dateKey > endDate) return false;
        return true;
      });
    }
    return annotatedLeads;
  }, [annotatedLeads, dateMode, todayStr, singleDate, startDate, endDate]);

  const counts = useMemo(() => {
    const map: Record<PipelineStatus | "all", number> = {
      all: dateFilteredLeads.length,
      new: 0, pending: 0, follow_up: 0, trial_requested: 0,
      hot_prospect: 0, future_prospect: 0, converted: 0, sale_rejected: 0,
    };
    for (const a of dateFilteredLeads) map[a.status]++;
    return map;
  }, [dateFilteredLeads]);

  // ── VISIBLE rows — uses debouncedSearch, not live search ─────────────────
  // WHY: Without debounce, every keystroke triggers this useMemo over potentially
  // hundreds of rows. At 300ms debounce, the filter runs at most once per typing pause.
  const visible = useMemo(() => {
    const matching = dateFilteredLeads.filter((a) => {
      if (sourceFilter !== "all") {
        if (sourceFilter === "ads") {
          const src = String(a.lead.utmSource || "").trim();
          const sub = String(a.lead.utmSubSource || "").trim();
          if (!src && !sub) return false;
        } else if ((a.lead.leadSource || "website") !== sourceFilter) {
          return false;
        }
      }
      if (filter !== "all" && a.status !== filter) return false;
      if (debouncedSearch.trim()) {
        const haystack = [a.lead.name, a.lead.email, a.lead.phoneNumber]
          .map((v) => String(v ?? ""))
          .join(" ")
          .toLowerCase();
        if (!haystack.includes(debouncedSearch.trim().toLowerCase())) return false;
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
  }, [dateFilteredLeads, filter, debouncedSearch, sortBy, sourceFilter]);

  // ── Handlers ──────────────────────────────────────────────────────────────

  const handleRefresh = useCallback(() => {
    refreshMutation.mutate(undefined, {
      onSuccess: () => toast.success("Data refreshed from Google Sheets"),
      onError: () => toast.error("Refresh failed — using cached data"),
    });
  }, [refreshMutation]);

  const handleStatusChange = useCallback(
    async (email: string, name: string, newStatus: PipelineStatus) => {
      if (!role) return;
      if (newStatus === "converted") {
        setConvertingLead({ email, name });
        return;
      }
      const success = await setPipelineStatusApi(email, newStatus, role);
      if (success) {
        const meta = getStatusMeta(newStatus);
        toast.success(`${meta.icon} Moved to ${meta.label}`, {
          description: name || email,
        });
        // Invalidate pipeline query → React Query background-refetches pipeline
        invalidatePipeline();
      } else {
        toast.error("Failed to update status in the database");
      }
    },
    [role, invalidatePipeline]
  );

  const exportToCsv = useCallback(() => {
    if (visible.length === 0) {
      toast.error("No leads available to export");
      return;
    }

    const headers = [
      "No.", "Name", "Email", "Phone Number", "Plan Interest",
      "Status", "Timestamp", "Subscription Type", "Plan",
      "Checkout Visited", "Last Step Completed",
    ];

    const rows = visible.map((item, idx) => [
      idx + 1,
      item.lead.name || "",
      item.lead.email || "",
      item.lead.phoneNumber || "",
      item.lead.subscriptionType || "",
      item.status,
      item.lead.timestamp ? new Date(item.lead.timestamp).toLocaleString("en-IN") : "",
      item.lead.subscriptionType || "",
      item.lead.plan || "",
      item.lead.checkoutVisited !== undefined ? String(item.lead.checkoutVisited) : "",
      item.lead.lastStepCompleted !== undefined ? String(item.lead.lastStepCompleted) : "",
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map((row) =>
        row.map((val) => {
          const strVal = String(val);
          return `"${strVal.replace(/"/g, '""')}"`;
        }).join(",")
      ),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute(
      "download",
      `bhookr_leads_${dateMode}_${new Date().toISOString().split("T")[0]}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("CSV export downloaded successfully!");
  }, [visible, dateMode]);

  const exportToPdf = useCallback(() => {
    if (visible.length === 0) {
      toast.error("No leads available to export");
      return;
    }

    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      toast.error("Popup blocked! Please allow popups to view/print PDF.");
      return;
    }

    const dateRangeStr =
      dateMode === "today"
        ? `Today (${todayStr})`
        : dateMode === "range"
        ? `${startDate || "any"} to ${endDate || "any"}`
        : "All time";

    const rowsHtml = visible
      .map(
        (item, idx) => `
      <tr>
        <td>${idx + 1}</td>
        <td><strong>${item.lead.name || "—"}</strong></td>
        <td>${item.lead.email || "—"}</td>
        <td>${item.lead.phoneNumber || "—"}</td>
        <td>${humanize(item.lead.subscriptionType) || "—"}${item.lead.plan ? ` (${item.lead.plan})` : ""}</td>
        <td>${formatTimestamp(item.lead.timestamp)}</td>
        <td><span class="status-badge status-${item.status}">${item.status.toUpperCase()}</span></td>
      </tr>
    `
      )
      .join("");

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>BHOOKR CRM Leads Report</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; color: #1a1a1a; margin: 40px 30px; font-size: 13px; line-height: 1.4; }
          .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #e31e24; padding-bottom: 15px; margin-bottom: 25px; }
          .brand { font-size: 22px; font-weight: 800; letter-spacing: -0.5px; color: #e31e24; text-transform: uppercase; }
          .brand span { color: #333333; font-weight: 400; }
          .report-info { text-align: right; font-size: 11px; color: #666; }
          .title { font-size: 18px; font-weight: 700; margin-top: 0; margin-bottom: 5px; color: #111; }
          .filters-summary { background-color: #f8f9fa; border: 1px solid #e9ecef; border-radius: 6px; padding: 10px 15px; margin-bottom: 20px; display: flex; gap: 20px; font-size: 12px; }
          .filters-summary div strong { color: #495057; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
          th { background-color: #f1f3f5; color: #495057; font-weight: 600; text-transform: uppercase; font-size: 10px; letter-spacing: 0.5px; border-bottom: 2px solid #dee2e6; padding: 8px 10px; text-align: left; }
          td { padding: 8px 10px; border-bottom: 1px solid #dee2e6; font-size: 11px; vertical-align: top; }
          tr:nth-child(even) td { background-color: #fafbfe; }
          .status-badge { display: inline-block; padding: 2px 6px; border-radius: 4px; font-size: 9px; font-weight: 700; letter-spacing: 0.3px; }
          .status-new { background-color: #e0f2fe; color: #0369a1; }
          .status-follow_up { background-color: #e0e7ff; color: #4338ca; }
          .status-trial_requested { background-color: #f3e8ff; color: #6b21a8; }
          .status-hot_prospect { background-color: #ffedd5; color: #c2410c; }
          .status-future_prospect { background-color: #ccfbf1; color: #0f766e; }
          .status-converted { background-color: #dcfce7; color: #15803d; }
          .status-sale_rejected { background-color: #fee2e2; color: #b91c1c; }
          @media print { body { margin: 0; } .no-print { display: none; } table { page-break-inside: auto; } tr { page-break-inside: avoid; page-break-after: auto; } thead { display: table-header-group; } }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            <div class="brand">BHOOKR <span>CRM</span></div>
            <div class="report-info" style="text-align: left; margin-top: 3px;">Fresh Meal Subscriptions</div>
          </div>
          <div class="report-info">
            <div>Generated: ${new Date().toLocaleString("en-IN")}</div>
            <div>Staff Role: ${role || "admin"}</div>
          </div>
        </div>
        <div class="title">Leads Report</div>
        <div class="filters-summary">
          <div><strong>Date Filter:</strong> ${dateRangeStr}</div>
          <div><strong>Status Filter:</strong> ${filter === "all" ? "All Statuses" : filter.toUpperCase()}</div>
          <div><strong>Leads Found:</strong> ${visible.length}</div>
        </div>
        <table>
          <thead><tr><th style="width:5%">#</th><th style="width:20%">Name</th><th style="width:20%">Email</th><th style="width:15%">Phone</th><th style="width:15%">Plan Interest</th><th style="width:15%">Captured Date</th><th style="width:10%">Status</th></tr></thead>
          <tbody>${rowsHtml}</tbody>
        </table>
        <script>window.onload = function() { setTimeout(function() { window.print(); }, 500); }</script>
      </body>
      </html>
    `;

    printWindow.document.open();
    printWindow.document.write(htmlContent);
    printWindow.document.close();
  }, [visible, dateMode, todayStr, startDate, endDate, role, filter]);

  // ── Derived UI state ──────────────────────────────────────────────────────
  const dateModeLabel: Record<DateFilter, string> = {
    all: "All time", today: "Today", single: "Specific date", range: "Date range",
  };

  const dateEmptyReason =
    dateMode === "today" && dateFilteredLeads.length === 0
      ? `No leads captured today (${todayStr}). Try "All time" or pick a specific date.`
      : dateMode === "single" && singleDate && dateFilteredLeads.length === 0
      ? `No leads captured on ${singleDate}.`
      : dateMode === "range" && (startDate || endDate) && dateFilteredLeads.length === 0
      ? `No leads between ${startDate || "any"} and ${endDate || "any"}.`
      : null;

  const isRefreshing = refreshMutation.isPending || isFetching;

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900 sm:p-5">
      {/* Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-[#E31E24]">
            Master pipeline
          </p>
          <h2 className="mt-0.5 text-xl font-bold text-gray-900 dark:text-white sm:text-2xl">
            {dashLoading
              ? "Loading…"
              : `${visible.length} of ${dateFilteredLeads.length} leads`}
          </h2>
          {!dashLoading && (
            <p className="mt-0.5 text-[11px] text-gray-500 dark:text-gray-400">
              {dateModeLabel[dateMode]}
              {dateMode === "single" && singleDate
                ? ` · ${singleDate}`
                : dateMode === "range" && (startDate || endDate)
                ? ` · ${startDate || "any"} to ${endDate || "any"}`
                : ""}
              {" · "}status changes save to database · last updated{" "}
              {lastUpdated?.toLocaleTimeString("en-IN", {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2 self-start">
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:opacity-60 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200 dark:hover:bg-gray-800"
          >
            <RefreshCw className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
            Refresh
          </button>

          <div className="relative">
            <button
              onClick={() => setExportOpen(!exportOpen)}
              className="inline-flex items-center gap-2 rounded-lg border border-[#E31E24]/30 bg-red-50/50 px-3.5 py-2 text-sm font-semibold text-[#E31E24] shadow-sm transition hover:bg-red-100/60 dark:border-[#E31E24]/40 dark:bg-red-950/30 dark:text-red-400 dark:hover:bg-red-900/40"
            >
              <BarChart3 className="h-4 w-4" />
              Reports &amp; Export
              <ChevronDown className="h-3.5 w-3.5 opacity-70" />
            </button>

            {exportOpen && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setExportOpen(false)}
                />
                <div className="absolute right-0 mt-1.5 w-56 origin-top-right rounded-xl border border-gray-200 bg-white p-1.5 shadow-xl ring-1 ring-black/5 focus:outline-none dark:border-gray-800 dark:bg-gray-950 z-50">
                  <div className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-gray-400">
                    Lead Reports &amp; Analytics
                  </div>
                  <button
                    onClick={() => {
                      setReportInitialMode("today");
                      setReportModalOpen(true);
                      setExportOpen(false);
                    }}
                    className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm font-semibold text-gray-800 hover:bg-red-50 hover:text-[#E31E24] dark:text-gray-200 dark:hover:bg-red-950/40"
                  >
                    ⚡ 1. Today Report
                  </button>
                  <button
                    onClick={() => {
                      setReportInitialMode("range");
                      setReportModalOpen(true);
                      setExportOpen(false);
                    }}
                    className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm font-semibold text-gray-800 hover:bg-red-50 hover:text-[#E31E24] dark:text-gray-200 dark:hover:bg-red-950/40"
                  >
                    📅 2. Date Range Report
                  </button>
                  <div className="my-1 border-t border-gray-100 dark:border-gray-800" />
                  <button
                    onClick={() => {
                      exportToCsv();
                      setExportOpen(false);
                    }}
                    className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm text-gray-600 hover:bg-gray-50 dark:text-gray-400 dark:hover:bg-gray-800"
                  >
                    📄 Export Raw CSV (Excel)
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Error banner */}
      {dashError && (
        <div className="mt-3 flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 p-3 dark:border-red-900/40 dark:bg-red-950/30">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-600 dark:text-red-400" />
          <p className="text-sm text-red-800 dark:text-red-300">
            {dashErrorMsg?.message ?? "Failed to load leads — showing cached data if available."}
          </p>
        </div>
      )}

      {/* Lead Source Switcher */}
      <div className="mt-4 flex flex-wrap items-center gap-2 border-b border-gray-100 pb-3 dark:border-gray-800">
        <span className="text-xs font-semibold uppercase tracking-wider text-gray-400">
          Source:
        </span>
        <div className="inline-flex rounded-xl bg-gray-100 p-1 dark:bg-gray-800">
          {[
            { key: "all", label: "📂 All Sources" },
            { key: "website", label: "🌐 Website Leads" },
            { key: "client_form", label: "📑 Client Form" },
            { key: "ads", label: "📢 Ad Leads" },
          ].map(({ key, label }) => (
            <button
              key={key}
              type="button"
              onClick={() => setSourceFilter(key as LeadSourceFilter)}
              className={`rounded-lg px-3 py-1 text-xs font-semibold transition ${
                sourceFilter === key
                  ? "bg-white text-gray-900 shadow-sm dark:bg-gray-900 dark:text-white"
                  : "text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

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
          <option value="all" className="bg-white text-gray-900 dark:bg-gray-900 dark:text-white">📅 All time</option>
          <option value="today" className="bg-white text-gray-900 dark:bg-gray-900 dark:text-white">📅 Today&apos;s leads</option>
          <option value="single" className="bg-white text-gray-900 dark:bg-gray-900 dark:text-white">📅 Specific date…</option>
          <option value="range" className="bg-white text-gray-900 dark:bg-gray-900 dark:text-white">📅 Date range…</option>
        </select>

        {dateMode === "single" && (
          <div className="flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-sm dark:border-gray-800 dark:bg-gray-950">
            <span className="text-xs text-gray-400 font-medium">Date:</span>
            <input
              type="date"
              value={singleDate}
              max={todayStr}
              onChange={(e) => setSingleDate(e.target.value)}
              className="bg-transparent text-sm text-gray-900 focus:outline-none dark:text-white"
            />
            {singleDate && (
              <button
                type="button"
                onClick={() => setSingleDate("")}
                className="text-xs text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 font-medium ml-1"
                title="Clear date"
              >
                ✕
              </button>
            )}
          </div>
        )}

        {dateMode === "range" && (
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-sm dark:border-gray-800 dark:bg-gray-950">
              <span className="text-xs text-gray-400 font-medium">From:</span>
              <input
                type="date"
                value={startDate}
                max={endDate || todayStr}
                onChange={(e) => setStartDate(e.target.value)}
                className="bg-transparent text-sm text-gray-900 focus:outline-none dark:text-white"
              />
            </div>
            <div className="flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-sm dark:border-gray-800 dark:bg-gray-950">
              <span className="text-xs text-gray-400 font-medium">To:</span>
              <input
                type="date"
                value={endDate}
                min={startDate}
                max={todayStr}
                onChange={(e) => setEndDate(e.target.value)}
                className="bg-transparent text-sm text-gray-900 focus:outline-none dark:text-white"
              />
            </div>
            {(startDate || endDate) && (
              <button
                type="button"
                onClick={() => { setStartDate(""); setEndDate(""); }}
                className="text-xs text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 font-medium bg-gray-50 hover:bg-gray-100 dark:bg-gray-800 dark:hover:bg-gray-750 px-2 py-1.5 rounded-lg border border-gray-200 dark:border-gray-800"
              >
                Clear
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
            <option key={opt.value} value={opt.value} className="bg-white text-gray-900 dark:bg-gray-900 dark:text-white">
              Sort: {opt.label}
            </option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div className="mt-3 overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-800">
        {dashLoading ? (
          <PipelineTableSkeleton rows={8} />
        ) : (
          <table className="min-w-full border-collapse text-sm">
            <thead className="bg-gray-50 dark:bg-gray-950">
              <tr>
                <Th>#</Th>
                <Th>Name</Th>
                <Th>Contact</Th>
                <Th>Plan interest</Th>
                <Th>Ad / Source</Th>
                <Th>Captured</Th>
                <Th>Status</Th>
                <Th align="right">View</Th>
              </tr>
            </thead>
            <tbody>
              {visible.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-3 py-10 text-center text-sm text-gray-500">
                    {dateMode === "today"
                      ? "No leads received today yet. Select 'All time' or 'Date range' above to view past leads."
                      : dateEmptyReason ?? "No leads match this filter."}
                  </td>
                </tr>
              ) : (
                visible.map((a, idx) => {
                  const emailKey = String(a.lead.email ?? "").toLowerCase().trim() || cleanPhoneKey(a.lead.phoneNumber);
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
                        <div className="flex flex-col gap-0.5">
                          <Link
                            href={href}
                            className="font-medium text-gray-900 hover:text-[#E31E24] hover:underline dark:text-white"
                          >
                            {a.lead.name || "—"}
                          </Link>
                          {a.lead.leadSource === "client_form" ? (
                            <span className="inline-flex w-fit items-center gap-1 rounded-md bg-purple-50 px-1.5 py-0.2 text-[10px] font-semibold text-purple-700 dark:bg-purple-950/40 dark:text-purple-300">
                              📑 Client Form
                            </span>
                          ) : (
                            <span className="inline-flex w-fit items-center gap-1 rounded-md bg-blue-50 px-1.5 py-0.2 text-[10px] font-semibold text-blue-700 dark:bg-blue-950/40 dark:text-blue-300">
                              🌐 Website Lead
                            </span>
                          )}
                        </div>
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
                      <Td>{renderAdSourceBadge(a.lead)}</Td>
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
                            role && role !== "auditor" && (
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
                                  <option key={s.value} value={s.value} className="bg-white text-gray-900 dark:bg-gray-900 dark:text-white">
                                    {s.icon} {s.shortLabel}
                                  </option>
                                ))}
                              </select>
                            )
                          )}
                        </div>
                      </Td>
                      <Td align="right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() =>
                              setNoteModalLead({
                                email: emailKey,
                                name: String(a.lead.name ?? ""),
                                notes: pipeline[emailKey]?.notes || "",
                                status: a.status,
                              })
                            }
                            className={`inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-semibold transition ${
                              pipeline[emailKey]?.notes
                                ? "bg-amber-100 text-amber-800 border border-amber-300 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-700/60"
                                : "border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 hover:text-amber-600 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200 dark:hover:bg-gray-800"
                            }`}
                            title={
                              pipeline[emailKey]?.notes
                                ? `Note: ${pipeline[emailKey]?.notes}`
                                : "Add / Edit Note"
                            }
                          >
                            <StickyNote className="h-3.5 w-3.5" />
                            Note
                          </button>
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
                            className="inline-flex items-center gap-1 rounded-md border border-gray-200 bg-white px-2 py-1 text-xs font-semibold text-gray-700 hover:bg-[#E31E24] hover:text-white hover:border-[#E31E24] dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200 dark:hover:bg-[#E31E24] dark:hover:text-white transition-colors"
                            title="View full details of this customer"
                          >
                            👁️ View Details <ArrowRight className="h-3 w-3" />
                          </Link>
                        </div>
                      </Td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* Lazy-loaded modals — only mounted when user opens them */}
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
            invalidatePipeline();
          }}
        />
      )}

      {noteModalLead && (
        <NoteModal
          isOpen={!!noteModalLead}
          email={noteModalLead.email}
          name={noteModalLead.name}
          initialNotes={noteModalLead.notes}
          currentStatus={noteModalLead.status}
          onClose={() => {
            setNoteModalLead(null);
            invalidatePipeline();
          }}
        />
      )}

      {reportModalOpen && (
        <ReportModal
          isOpen={reportModalOpen}
          onClose={() => setReportModalOpen(false)}
          allAnnotatedLeads={annotatedLeads as AnnotatedLead[]}
          todayStr={todayStr}
          role={role}
          initialMode={reportInitialMode}
        />
      )}
    </section>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function FilterChip({
  active, onClick, icon, label, count, pill, inactivePill,
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
